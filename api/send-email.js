// api/send-email.js - Vercel Serverless Function (ChatSpark EmailJS API)
//
// ⚠️ Vercel 환경변수 설정 필요:
// EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY

module.exports = async function handler(req, res) {
    // CORS 처리 (로컬 개발용 허용, 차후 도메인 환경에 맞게 제한 필요)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    console.log("Incoming Lead Data:", req.body);
    const { name, contact, chatLog } = req.body;

    if (!name || !contact) {
        return res.status(400).json({ error: 'Name and contact are required' });
    }

    // 환경 변수 추출
    const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY } = process.env;

    // 환경 변수가 등록되지 않은 경우 (Vercel 배포 전 로컬/테스트 환경)
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
        console.warn("⚠️ EmailJS 환경변수가 설정되지 않았습니다. 성공으로 시뮬레이션 처리합니다.");
        return res.status(200).json({ success: true, message: "Email simulated (no credentials required for test)" });
    }

    try {
        const emailData = {
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY, // EmailJS Public Key
            accessToken: EMAILJS_PRIVATE_KEY,
            template_params: {
                // Precise mapping based on user template
                visitor_name: name,
                contact: contact,
                date: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
                inquiry_summary: chatLog.split('\n')[0] || "희망리턴패키지 상담 문의",
                full_conversation: chatLog,

                // Keep old keys for redundancy
                from_name: name,
                user_name: name,
                user_contact: contact,
                chat_log: chatLog,
                message: chatLog,
                submitted_at: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
                reply_to: contact,
            }
        };

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData)
        });

        if (response.ok) {
            return res.status(200).json({ success: true });
        } else {
            const errText = await response.text();
            console.error("EmailJS Error Response:", errText);
            return res.status(500).json({ error: 'Failed to send email via EmailJS' });
        }

    } catch (error) {
        console.error("Email sending exception:", error);
        return res.status(500).json({ error: 'Internal Server Error sending email' });
    }
};
