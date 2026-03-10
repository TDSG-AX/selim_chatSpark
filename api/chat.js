// api/chat.js - Vercel Serverless Function (ChatSpark version)
//
// ⚠️ Vercel 환경변수 설정 필요:
// GEMINI_API_KEY: Google AI Studio (https://aistudio.google.com/app/apikey)

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_INSTRUCTION = `당신은 ChatSpark의 AI 어시스턴트입니다.
사용자의 질문에 친절하고 정확하게 답변해주세요.

[대화 규칙]
1. 답변은 너무 길지 않게 핵심만 전달하세요 (최대 3~4문장 권장).
2. 친근하지만 전문적인 어조를 유지하세요.
3. 한국어로 자연스럽게 대화하세요.`;

module.exports = async function handler(req, res) {
  // Allow all origins for local dev, or restrict to your new domain later
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. Using mock response for development.");
    // Provide a mock response so the UI can be tested without an API key immediately
    return res.status(200).json({ reply: "안녕하세요! 현재 API 키가 설정되지 않아 테스트 모드로 동작 중입니다. 질문하신 내용은 잘 접수되었습니다!" });
  }

  // Expecting a simple { message, history } format from our script.js
  const { message, history } = req.body;

  if (!message) return res.status(400).json({ error: 'Message is required' });

  // Convert our script.js history format to Gemini's expected contents format
  let contents = [];

  if (history && Array.isArray(history)) {
    contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
  } else {
    contents = [{ role: 'user', parts: [{ text: message }] }];
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

    if (response.status === 429) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    }

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return res.status(200).json({ reply: data.candidates[0].content.parts[0].text });

  } catch (error) {
    console.error('Gemini API error:', error);
    return res.status(500).json({ error: 'Failed to get AI response' });
  }
};