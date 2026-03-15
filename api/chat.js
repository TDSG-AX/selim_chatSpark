const searchEngine = require('./lib/search');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_INSTRUCTION_BASE = `당신은 '(데모) OOOO패키지' 지원사업의 전문 AI 가이드입니다.
사용자의 질문에 대해 제공된 [검색된 관련 자료]를 바탕으로 친절하고 구체적으로 답변해주세요.

[상담 지침 및 대화 규칙]
1. **짧은 대화와 맥락 파악 (Context-First):** 장황하게 설명하지 마세요. 질문의 의도가 불명확하다면, 상황을 파악하기 위한 짧고 가벼운 질문을 되물어 사용자의 맥락을 먼저 구체화하세요. (최대 2~3문장 이내 유지)
2. 친근하지만 전문적인 어조를 유지하세요.
3. 점포철거비(최대 600만원), 전직장려수당(최대 100만원), 사업화지원(최대 2000만원) 등 핵심 수치를 적극적으로 활용하세요.
4. **서비스 추천 및 바로가기:** 사용자의 맥락이 파악되어 특정 지원 사업이 적합하다고 판단되면, 해당 서비스를 강력히 추천하고 반드시 답변 맨 끝에 더미 링크 버튼을 HTML 태그로 제공하세요. (작성 예시: <br><br><a href="#" class="action-btn" style="display:inline-block; text-decoration:none;">👉 0000 신청 바로가기</a>)
5. 출처 언급: 가능한 경우 정보의 출처(파일명 등)를 가볍게 언급하여 신뢰도를 높이세요.
6. 정보 부족 시: 답변하기 모호하거나 애매한 부분은 "자세한 사항은 전문 상담사를 통해 안내해 드리겠습니다"라고 명시하세요.
7. **상담사 연결 트리거 (Smart Breakout & Lead):**
   - 사용자가 명시적으로 상담원 연결이나 구체적 신청을 원할 때
   - 몇 번의 대화 후에도 사용자의 상황이 복잡하여 상담사 개입이 필요할 때
   답변의 맨 마지막에 \`[INQUIRY_COMPLETE]\` 코드를 반드시 포함하세요. (단, 사용자가 이름/연락처 입력 단계에서 엉뚱한 질문을 던지면 리드 수집을 멈추고 유연하게 다시 질문에 답변하세요.)`;

module.exports = async function handler(req, res) {
  // Allow all origins for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.chatspark;
  const { contents } = req.body;

  if (!contents || !Array.isArray(contents)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  // 1. 마지막 사용자 메시지 추출 및 검색
  const lastUserMessage = contents[contents.length - 1]?.parts[0]?.text || "";
  const searchResults = searchEngine.search(lastUserMessage, 3);
  
  const contextText = searchResults.length > 0 
    ? searchResults.map(r => `[정보원: ${r.source}]\n${r.text}`).join('\n\n---\n\n')
    : "관련된 상세 자료를 찾지 못했습니다. 일반적인 지식 범주 내에서 답변하거나 고객센터 안내를 해주세요.";

  const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION_BASE}\n\n[검색된 관련 자료]\n${contextText}`;

  if (!apiKey) {
    console.warn("chatspark API Key is missing. Using mock response.");
    return res.status(200).json({ 
      text: `(테스트 모드: 검색 결과 기반 시뮬레이션)\n${searchResults[0]?.text.substring(0, 100) || "안녕하세요!"}...` 
    });
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: dynamicSystemInstruction }] }
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