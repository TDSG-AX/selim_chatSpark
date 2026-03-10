// script.js - ChatSpark UI & API logic

const aiChatWindow = document.getElementById('aiChatWindow');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const floatingChatBtn = document.getElementById('floatingChatBtn');

let conversationHistory = [];
let currentStep = 'inquiry';
let leadInfo = { name: '', contact: '', consent: false, chatLog: '' };

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // 1. Add User Message to UI
    appendMessage(text, 'user');

    if (currentStep === 'inquiry') {
        conversationHistory.push({ role: "user", content: text });
    }

    // Clear input & disable during fetch
    chatInput.value = '';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    if (currentStep === 'inquiry') {
        await handleInquiryPhase();
    } else if (currentStep === 'contact_name') {
        handleNamePhase(text);
    } else if (currentStep === 'contact_info') {
        await handleContactPhase(text);
    } else if (currentStep === 'privacy') {
        // If they type instead of clicking buttons, treat it as declining consent and starting new inquiry
        currentStep = 'inquiry';
        conversationHistory.push({ role: "user", content: text });
        await handleInquiryPhase();
    } else if (currentStep === 'done') {
        setTimeout(() => {
            appendMessage("이미 상담 접수가 완료되어 담당자가 곧 연락드릴 예정입니다. 감사합니다. 추가 질문이 있으시면 언제든 챗봇에게 남겨주세요.", 'bot');
            enableInput();
        }, 500);
        currentStep = 'inquiry'; // Reset back to inquiry if they want to chat more
    }
}

async function handleInquiryPhase() {
    const typingIndicator = showTypingIndicator();

    try {
        const payload = {
            contents: conversationHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }))
        };
        console.log("Sending to Gemini:", payload);

        const response = await fetch('https://selim-chat-spark.vercel.app/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        typingIndicator.remove();

        if (response.ok && data.text) {
            let botReply = data.text;
            let triggerFound = false;

            // Check if the AI determined we should move to lead capture
            if (botReply.includes('[INQUIRY_COMPLETE]')) {
                triggerFound = true;
                botReply = botReply.replace('[INQUIRY_COMPLETE]', '').trim();
            }

            if (botReply) {
                appendMessage(botReply, 'bot');
                conversationHistory.push({ role: "model", content: botReply });
            }

            if (triggerFound) {
                currentStep = 'privacy';
                setTimeout(renderConsentButtons, 1000);
            } else {
                enableInput();
            }
        } else {
            console.error("API Error:", data);
            appendMessage("죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", 'bot');
            enableInput();
        }
    } catch (error) {
        console.error("Network Error:", error);
        typingIndicator.remove();
        appendMessage("서버와의 연결이 원활하지 않습니다. 인터넷 연결을 확인해주세요.", 'bot');
        enableInput();
    }
}

function renderConsentButtons() {
    const div = document.createElement('div');
    div.classList.add('message', 'bot-message');
    div.innerHTML = `
        <div class="message-content">
            상세한 상담 안내를 위해 개인정보(이름, 연락처) 수집 및 이용에 동의하십니까?<br><br>
            <button onclick="submitConsent(true)" class="action-btn">예, 동의합니다</button>
            <button onclick="submitConsent(false)" class="action-btn" style="background:#e2e8f0; color:#475569; margin-left:8px;">아니오</button>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.submitConsent = function (agreed) {
    if (agreed) {
        appendMessage("예, 동의합니다", 'user');
        leadInfo.consent = true;
        currentStep = 'contact_name';
        setTimeout(() => appendMessage("감사합니다. 담당자가 연락드릴 식별을 위해 **성함**을 입력해주세요.", 'bot'), 500);
    } else {
        appendMessage("아니오", 'user');
        currentStep = 'inquiry';
        setTimeout(() => appendMessage("동의하지 않으셔도 계속해서 챗봇과 자유롭게 안내를 받으실 수 있습니다. 더 궁금하신 점을 편하게 질문해주세요.", 'bot'), 500);
    }
    enableInput();
}

function handleNamePhase(text) {
    leadInfo.name = text;
    currentStep = 'contact_info';
    setTimeout(() => {
        appendMessage("담당자가 안내 드릴 수 있는 **연락처(전화번호 또는 이메일)**를 남겨주세요.", 'bot');
        enableInput();
    }, 500);
}

async function handleContactPhase(text) {
    leadInfo.contact = text;
    currentStep = 'done';

    // Convert History state to string for the email
    leadInfo.chatLog = conversationHistory.map(msg => `[${msg.role.toUpperCase()}] ${msg.content}`).join('\n');

    console.log("Submitting Lead Info:", leadInfo);

    const typingIndicator = showTypingIndicator();

    try {
        // Send email via our new backend serverless function
        const response = await fetch('https://selim-chat-spark.vercel.app/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leadInfo)
        });

        typingIndicator.remove();

        if (response.ok) {
            appendMessage(`감사합니다, ${leadInfo.name}님! 남겨주신 연락처(${leadInfo.contact})로 담당자가 곧 안내를 드리겠습니다. 추가 궁금한 점이 있다면 언제든 챗봇에게 물어보세요.`, 'bot');
        } else {
            appendMessage("죄송합니다. 시스템 오류로 담당자에게 정상적으로 전달되지 못했습니다. 잠시 후 다시 시도해주시거나 고객센터(1357)로 문의 바랍니다.", 'bot');
        }
    } catch (error) {
        typingIndicator.remove();
        appendMessage("네트워크 연결 문제로 정보를 전달하지 못했습니다.", 'bot');
    }

    enableInput();
}

function enableInput() {
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.focus();
}

function appendMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');

    // Simple marked text replacing linebreaks with <br>

    let formattedText = text;
    // VERY simple markdown bold formatting **text** to <strong>text</strong>
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n/g, '<br>');

    contentDiv.innerHTML = formattedText;

    div.appendChild(contentDiv);

    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator && sender === 'user') {
        chatMessages.insertBefore(div, typingIndicator);
    } else {
        chatMessages.appendChild(div);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.classList.add('typing-indicator');

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.classList.add('typing-dot');
        div.appendChild(dot);
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return div;
}

// Handle opening and closing of the chat window
function toggleChatWindow() {
    aiChatWindow.classList.toggle('active');

    // Toggle the button visibility
    if (aiChatWindow.classList.contains('active')) {
        floatingChatBtn.classList.add('hidden');
        // Auto-focus input when opening
        setTimeout(() => chatInput.focus(), 300);
    } else {
        floatingChatBtn.classList.remove('hidden');
    }
}
