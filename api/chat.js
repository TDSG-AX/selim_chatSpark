// api/chat.js - Vercel Serverless Function (ChatSpark version)
//
// ⚠️ Vercel 환경변수 설정 필요:
// chatspark: Google AI Studio (https://aistudio.google.com/app/apikey)

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_INSTRUCTION = `당신은 '희망리턴패키지 지원사업'의 전문 상담 챗봇 'ChatSpark'입니다.
사용자의 질문에 아래 [상담 기본 자료]를 바탕으로 친절하고 정확하게 답변해주세요.

[상담 지침 및 대화 규칙]
1. 답변은 너무 길지 않게 핵심만 전달하세요 (최대 3~4문장 권장).
2. 친근하지만 전문적인 어조를 유지하세요.
3. **맥락 파악 및 유연성:** 사용자가 이름/연락처 입력 요청을 받았음에도 불구하고 다른 질문을 던진다면, 리드 수집을 강요하지 말고 즉시 사용자의 새로운 질문에 답변하세요. 사용자의 흐름에 맞추는 것이 가장 중요합니다.
4. 정보가 부족하거나 자료에 없는 내용은 "해당 내용은 소상공인24 고객센터(1357) 문의를 권장드립니다"라고 명시하세요.
5. **트리거 규칙:** 사용자가 구체적인 신청 방법, 담당자 상세 상담 등을 다시 원할 때만 답변 끝에 \`[INQUIRY_COMPLETE]\` 를 포함시키세요. 사용자가 대화 중 이탈하거나 다른 주제를 묻는다면 절대로 이 태그를 다시 사용하지 마세요.

[상담 기본 자료 (base01~04)]
- 사업 요약: 경영위기를 겪거나 폐업(예정)인 소상공인의 재기(취업 및 재창업)를 돕는 사업.
1. 경영개선지원: 폐업 전 위기 극복. 매출 10% 감소 또는 저신용자(744점 이하) 대상. 최대 2,000만 원(자부담 50%) 지원. '26.2.27 1차 종료, 하반기 추가 공고 확인 필요.
2. 재창업지원: 폐업 후 재기. 기폐업자/폐업예정자 중 재창업 교육 이수자. 최대 2,000만 원. '26.2.27 1차 종료.
3. 재취업지원: 임금 근로자로 전환 희망. 만 69세 이하 폐업(예정)자. 전직장려수당 최대 100만 원, 취업성공패키지 연계. (상시모집)
4. 원스톱 폐업지원: 비용/법률적 해결. 점포철거비 3.3㎡당 8만 원(최대 200만 원), 사업정리 컨설팅, 법률자문. (상시모집이나 예산 소진 시 마감)

- 공통 서류: 사업자/폐업사실증명원, 소상공인확인서, 국세/지방세 납세증명서, 통장사본. '행정정보 공동이용' 동의 시 서류 간소화.
- 주의사항: 경영개선과 재창업 지원금 중복 수혜 불가. 지원금은 100%가 아닌 자부담 50% 발생(경영/재창업).`;

module.exports = async function handler(req, res) {
  // Allow all origins for local dev, or restrict to your new domain later
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.chatspark;
  if (!apiKey) {
    console.warn("chatspark (API Key) is missing. Using mock response for development.");
    // Provide a mock response so the UI can be tested without an API key immediately
    return res.status(200).json({ text: "안녕하세요! 현재 API 키가 설정되지 않아 테스트 모드로 동작 중입니다. 질문하신 내용은 잘 접수되었습니다!" });
  }

  const { contents } = req.body;

  if (!contents || !Array.isArray(contents)) {
    return res.status(400).json({ error: 'Invalid request body. "contents" array is required.' });
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error Detail:', JSON.stringify(data, null, 2));
      return res.status(response.status).json({
        error: 'Gemini API call failed',
        details: data.error?.message || 'Unknown error'
      });
    }

    // Safety check for candidates (handling safety filter blocks)
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts) {
      console.error('Invalid/Blocked Gemini Response:', JSON.stringify(data, null, 2));
      return res.status(200).json({
        text: "죄송합니다. 해당 질문에 대해 답변을 드릴 수 없습니다. (안전 필터에 의해 차단되었거나 답변을 생성하지 못했습니다.)"
      });
    }

    return res.status(200).json({ text: data.candidates[0].content.parts[0].text });

  } catch (error) {
    console.error('Internal Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};