// script.js - ChatSpark UI & API logic

const aiChatWindow = document.getElementById('aiChatWindow');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

// Track conversation history to send to the API for context
let conversationHistory = [];

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
    
    // Save to history
    conversationHistory.push({ role: "user", content: text });

    // Clear input & disable during fetch
    chatInput.value = '';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    // 2. Add Typing Indicator to UI
    const typingIndicator = showTypingIndicator();

    try {
        // 3. Call Serverless Function API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: text,
                history: conversationHistory // Passing history for context
            })
        });

        const data = await response.json();

        // 4. Remove Typing Indicator
        typingIndicator.remove();

        if (response.ok && data.reply) {
            appendMessage(data.reply, 'bot');
            conversationHistory.push({ role: "model", content: data.reply });
        } else {
            console.error("API Error:", data);
            appendMessage("죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", 'bot');
        }

    } catch (error) {
        console.error("Network Error:", error);
        typingIndicator.remove();
        appendMessage("서버와의 연결이 원활하지 않습니다. 인터넷 연결을 확인해주세요.", 'bot');
    } finally {
        // Re-enable input
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
    }
}

function appendMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    // Simple marked text replacing linebreaks with <br>
    contentDiv.innerHTML = text.replace(/\n/g, '<br>');
    
    div.appendChild(contentDiv);
    
    // If a typing indicator exists, insert before it. Otherwise append.
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator && sender === 'user') {
        chatMessages.insertBefore(div, typingIndicator);
    } else {
        chatMessages.appendChild(div);
    }
    
    // Auto-scroll to bottom
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

// Ensure the chat window opens gracefully on load
window.addEventListener('DOMContentLoaded', () => {
    // Add small delay for aesthetic fade in
    setTimeout(() => {
        aiChatWindow.classList.add('active');
    }, 800);
});
