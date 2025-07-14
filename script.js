// script.js - Frontend Application Logic with Firestore Integration

// --- Global Variables & Constants ---
// Backend URL for your chat endpoint
// UPDATED: Using the live Render backend URL
const BACKEND_CHAT_URL = 'https://elderease-chatbot.onrender.com/chat';
// Backend URLs for Firestore operations
// UPDATED: Using the live Render backend URL
const BACKEND_SAVE_CHAT_URL = 'https://elderease-chatbot.onrender.com/save-chat';
const BACKEND_LOAD_CHAT_URL = 'https://elderease-chatbot.onrender.com/load-chat';
const BACKEND_CLEAR_CHAT_URL = 'https://elderease-chatbot.onrender.com/clear-chat';

// GEMINI_MODEL is still defined, but the backend controls the actual model used.
const GEMINI_MODEL = 'gemini-1.5-flash-latest'; 

let currentLanguage = 'en'; // Default language
let isRecording = false; // Voice input status
let recognition; // Web Speech Recognition API instance
let synthesis = window.speechSynthesis; // Web Speech Synthesis API instance

// To store chat history that will be sent to the backend for context
let chatHistory = []; 

// NEW: User ID for persistent chat history
let userId = localStorage.getItem('elderEaseUserId');
if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('elderEaseUserId', userId);
    console.log('New user ID generated:', userId);
} else {
    console.log('Existing user ID:', userId);
}


// --- DOM Element References ---
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.querySelector('.send-btn');
const voiceBtn = document.querySelector('.voice-btn');
const languageToggleBtn = document.querySelector('.language-toggle');
const statusText = document.getElementById('statusText');
const quickActionButtons = document.querySelectorAll('.quick-btn');
const clearChatBtn = document.getElementById('clearChatBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');


// --- Language-specific content (messages object - NO CHANGES HERE) ---
const messages = {
    welcome: {
        en: `🙏 Namaste! Welcome to ElderEase!
        You can ask me anything:
        • How to use WhatsApp?
        • How to send money via UPI?
        • How to solve phone problems?`,
        hi: `🙏 नमस्ते! ElderEase में आपका स्वागत है!
        आप मुझसे कुछ भी पूछ सकते हैं:
        • WhatsApp कैसे चलाएं?
        • UPI से पैसे कैसे भेजें?
        • Phone की problem कैसे solve करें?`
    },
    readyStatus: {
        en: '🟢 Ready to help • मदद के लिए तैयार',
        hi: '🟢 मदद के लिए तैयार • Ready to help'
    },
    thinkingStatus: {
        en: '🤔 Thinking...',
        hi: '🤔 सोच रहा हूं...'
    },
    responseSentStatus: {
        en: '✅ Response sent!',
        hi: '✅ जवाब दिया!'
    },
    listeningStatus: {
        en: '🎤 Listening...',
        hi: '🎤 सुन रहा हूं...'
    },
    voiceNotAvailable: {
        en: 'Voice recognition not available in your browser!',
        hi: 'Voice recognition आपके browser में available नहीं है!'
    },
    apiError: {
        en: '😔 Oops! I\'m having trouble connecting to the AI. Please check your internet and try again. If it persists, the service might be temporarily unavailable.',
        hi: '😔 माफ़ करें! मुझे इस समय AI से कनेक्ट करने में परेशानी हो रही है। कृपया अपना इंटरनेट जांचें और फिर से कोशिश करें। यदि यह बना रहता है, तो सेवा अस्थायी रूप से अनुपलब्ध हो सकती है।'
    },
    defaultFallback: {
        en: `I'm trying to help you! 🤔

        Please tell me what you need help with:
        • WhatsApp
        • UPI Payment
        • Phone Problems
        • Sending Photos
        • Emergency Help

        Or tap the Quick Help buttons! 👆`,
        hi: `मैं आपकी मदद करने की कोशिश कर रहा हूं! 🤔

        कृपया मुझे बताएं कि आपको किस चीज में मदद चाहिए:
        • WhatsApp
        • UPI Payment
        • Phone की Problems
        • Photo भेजना
        • Emergency Help

        या फिर Quick Help के buttons दबाएं!👆`
    },
    whatsapp: {
        en: `WhatsApp steps:
        1️⃣ Install from Play Store.
        2️⃣ Enter phone number.
        3️⃣ Verify OTP.
        4️⃣ Add contact & message.
        🎯 For video calls, tap the video icon next to name!`,
        hi: `WhatsApp के लिए ये steps follow करें:
        1️⃣ Play Store से WhatsApp install करें
        2️⃣ अपना phone number डालें
        3️⃣ OTP verify करें
        4️⃣ Contact add करके message भेजें
        🎯 Video call के लिए contact के name के सामने video icon दबाएं!`
    },
    upi: {
        en: `UPI Payment:
        1️⃣ Open UPI app (PhonePe, Google Pay).
        2️⃣ Tap 'Send Money'.
        3️⃣ Select contact or UPI ID.
        4️⃣ Enter amount.
        5️⃣ Enter UPI PIN.
        ⚠️ Warning: Never share your PIN!`,
        hi: `UPI Payment के लिए:
        1️⃣ अपना UPI app खोलें (PhonePe, Google Pay, Paytm)
        2️⃣ 'Send Money' या 'भेजें' दबाएं
        3️⃣ Contact select करें या UPI ID डालें
        4️⃣ Amount enter करें
        5️⃣ UPI PIN डालें
        ⚠️ सावधान: कभी भी अपना PIN किसी को न बताएं!`
    },
    phone_issues: {
        en: `Phone issues (e.g., hanging):
        1️⃣ Hold power button 10 secs (restart).
        2️⃣ Don't run too many apps.
        3️⃣ Clean phone storage.
        4️⃣ Install updates.
        💡 If problem persists, visit service center!`,
        hi: `Phone hang होने पर:
        1️⃣ Power button 10 seconds दबाके रखें (restart होगा)
        2️⃣ बहुत सारे apps एक साथ न चलाएं
        3️⃣ Phone का storage clean करें
        4️⃣ Updates install करें
        💡 अगर problem बनी रहे तो nearest service center जाएं!`
    },
    photo: {
        en: `To send photos:
        1️⃣ Open WhatsApp chat.
        2️⃣ Tap 📎 (attachment) icon.
        3️⃣ Select 'Gallery' or 'Camera'.
        4️⃣ Choose photo.
        5️⃣ Tap send button.
        📸 You can also take photos directly!`,
        hi: `Photo भेजने के लिए:
        1️⃣ WhatsApp में chat खोलें
        2️⃣ नीचे 📎 (attachment) icon दबाएं
        3️⃣ 'Gallery' या 'Camera' select करें
        4️⃣ 'Photo' choose करें
        5️⃣ Send button दबाएं
        📸 Camera से direct photo भी ले सकते हैं!`
    },
    emergency: {
        en: `In Emergency:
        1️⃣ Dial 112 (free emergency number).
        2️⃣ Police: 100
        3️⃣ Fire: 101
        4️⃣ Ambulance: 108
        🚨 Keep emergency contacts saved. Learn to share location!`,
        hi: `Emergency में:
        1️⃣ 112 dial करें (free emergency number)
        2️⃣ Police के लिए 100
        3️⃣ Fire के लिए 101
        4️⃣ Ambulance के लिए 108
        🚨 Emergency contacts family में save करके रखें। Location share करना भी सीखें!`
    },
    clean: {
        en: `To clean phone:
        1️⃣ Go to Settings.
        2️⃣ Find 'Storage'.
        3️⃣ Tap 'Clean'.
        3️⃣ Clear cache.
        4️⃣ Delete unused apps.
        🧹 Do this weekly to keep phone fast!`,
        hi: `Phone clean करने के लिए:
        1️⃣ Settings में जाएं
        2️⃣ 'Storage' या 'भंडारण' खोजें
        3️⃣ 'Clean' या 'साफ करें' दबाएं
        4️⃣ Cache clear करें
        5️⃣ Unused apps delete करें
        🧹 हर हफ्ते ये करें phone fast रखने के लिए!`
    }
};

// --- API Service Functions ---

/**
 * Calls the backend API with the user's message and chat history.
 * This function is now responsible for communicating with your Node.js Express server.
 * @param {string} userMessage - The message from the user.
 * @returns {Promise<string>} The bot's response.
 */
async function getAIResponse(userMessage) {
    try {
        const response = await fetch(BACKEND_CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                history: chatHistory, // Send the entire chat history for context
                language: currentLanguage, // Send current language for backend's system instruction
                userId: userId // NEW: Send userId to backend
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Backend API Error (chat):', response.status, errorData);
            console.warn('Backend returned an error. Falling back to pattern matching.');
            return messages.apiError[currentLanguage];
        }

        const data = await response.json();
        return data.response;

    } catch (error) {
        console.error('Network or Backend connection error (chat):', error);
        console.warn('Backend connection failed. Falling back to pattern matching.');
        return getPatternResponse(userMessage);
    }
}

/**
 * Saves the current chat history to the backend (Firestore).
 */
async function saveChatHistory() {
    try {
        const response = await fetch(BACKEND_SAVE_CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                history: chatHistory // Send the current chatHistory array
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Backend API Error (save chat):', response.status, errorData);
        } else {
            console.log('Chat history saved successfully.');
        }
    } catch (error) {
        console.error('Network or Backend connection error (save chat):', error);
    }
}

/**
 * Loads chat history for the current user from the backend (Firestore).
 * @returns {Promise<Array>} The loaded chat history.
 */
async function loadChatHistory() {
    try {
        const response = await fetch(`${BACKEND_LOAD_CHAT_URL}/${userId}`);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Backend API Error (load chat):', response.status, errorData);
            return []; // Return empty array on error
        }
        const data = await response.json();
        return data.history || []; // Return history or empty array if null/undefined
    } catch (error) {
        console.error('Network or Backend connection error (load chat):', error);
        return []; // Return empty array on network error
    }
}

/**
 * Clears chat history for the current user from the backend (Firestore).
 */
async function clearChatHistoryBackend() {
    try {
        const response = await fetch(`${BACKEND_CLEAR_CHAT_URL}/${userId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Backend API Error (clear chat):', response.status, errorData);
        } else {
            console.log('Chat history cleared from backend.');
        }
    } catch (error) {
        console.error('Network or Backend connection error (clear chat):', error);
    }
}


// --- UI Management ---

function updateStatus(text) {
    statusText.textContent = text;
    if (!isRecording && !text.includes('Listening')) {
        setTimeout(() => {
            statusText.textContent = messages.readyStatus[currentLanguage];
        }, 3000);
    }
}

function addMessage(text, isUser = false, addToHistory = true) { // NEW: addToHistory parameter
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isUser ? 'user' : 'bot');

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.innerHTML = text.replace(/\n/g, '<br>');

    messageDiv.appendChild(messageContent);
    chatContainer.appendChild(messageDiv);

    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Add message to chatHistory array only if addToHistory is true
    if (addToHistory) {
        // Exclude the initial system instruction/model response from history, as backend will add it
        if (isUser || (!isUser && !text.includes("Understood. I will provide simple, step-by-step tech assistance"))) {
            chatHistory.push({
                role: isUser ? "user" : "model",
                parts: [{ text: text }]
            });
        }
    }
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('typing-indicator');
    typingDiv.id = 'typingIndicator';

    typingDiv.innerHTML = `
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
        <span>ElderEase is typing...</span>
    `;

    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// --- Speech Services (NO CHANGES TO THESE FUNCTIONS) ---
function setupSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            sendMessage();
        };

        recognition.onend = () => {
            isRecording = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '🎤';
            updateStatus(messages.readyStatus[currentLanguage]);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isRecording = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '🎤';
            updateStatus(messages.readyStatus[currentLanguage]);
            if (event.error === 'not-allowed') {
                alert('Microphone access denied. Please allow microphone permissions in your browser settings.');
            } else if (event.error === 'no-speech') {
                console.warn('No speech detected.');
            } else {
                alert(`Speech recognition error: ${event.error}. Please try again.`);
            }
        };
    } else {
        voiceBtn.style.display = 'none';
        console.warn('Web Speech Recognition not supported in this browser.');
    }
}

function toggleVoice() {
    if (!recognition) {
        alert(messages.voiceNotAvailable[currentLanguage]);
        return;
    }

    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
        isRecording = true;
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '🛑';
        updateStatus(messages.listeningStatus[currentLanguage]);
    }
}

function speakResponse(text) {
    if (synthesis) {
        synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        synthesis.speak(utterance);
    }
}

// --- Main Event Handlers & Logic ---

// Fallback to pattern matching for common queries if API fails (NO CHANGES TO THIS FUNCTION)
function getPatternResponse(userMessage) {
    const message = userMessage.toLowerCase();

    if (message.includes('whatsapp') || message.includes('व्हाट्सएप')) {
        return messages.whatsapp[currentLanguage];
    } else if (message.includes('upi') || message.includes('payment') || message.includes('पेमेंट') || message.includes('भुगतान')) {
        return messages.upi[currentLanguage];
    } else if (message.includes('hang') || message.includes('slow') || message.includes('हैंग') || message.includes('धीमा') || message.includes('problem') || message.includes('समस्या')) {
        return messages.phone_issues[currentLanguage];
    } else if (message.includes('photo') || message.includes('फोटो') || message.includes('picture') || message.includes('send image')) {
        return messages.photo[currentLanguage];
    } else if (message.includes('emergency') || message.includes('आपातकाल') || message.includes('इमरजेंसी')) {
        return messages.emergency[currentLanguage];
    } else if (message.includes('clean') || message.includes('साफ') || message.includes('clear') || message.includes('storage')) {
        return messages.clean[currentLanguage];
    } else {
        return messages.defaultFallback[currentLanguage];
    }
}

// sendMessage function (UPDATED to save chat history)
async function sendMessage() {
    const userMessage = userInput.value.trim();

    if (!userMessage) {
        updateStatus(messages.noInputWarning[currentLanguage]);
        speakResponse(messages.noInputWarning[currentLanguage]);
        return;
    }

    addMessage(userMessage, true); // Add user message to UI and chatHistory
    userInput.value = '';

    showTypingIndicator();
    updateStatus(messages.thinkingStatus[currentLanguage]);

    const botResponse = await getAIResponse(userMessage); // Get AI response from backend
    hideTypingIndicator();
    addMessage(botResponse); // Add bot response to UI and chatHistory

    // NEW: Save the updated chat history after each turn
    await saveChatHistory();

    speakResponse(botResponse);
    updateStatus(messages.responseSentStatus[currentLanguage]);
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'hi' ? 'en' : 'hi';
    languageToggleBtn.textContent = currentLanguage === 'hi' ? '🌐 EN/हिं' : '🌐 हिं/EN';
    
    // Clear chat UI, but don't clear history from backend immediately
    clearChatUIOnly(); 

    // Update static UI texts
    document.querySelector('.welcome-message div:first-child').textContent = messages.welcome[currentLanguage].split('\n')[0].trim();
    document.querySelector('.welcome-message div:last-child').innerHTML = messages.welcome[currentLanguage].split('\n').slice(1).join('<br>').trim();

    quickActionButtons.forEach(button => {
        const originalQuestion = button.dataset.question;
        if (currentLanguage === 'hi') {
            if (originalQuestion.includes('WhatsApp')) button.textContent = '📱 WhatsApp';
            else if (originalQuestion.includes('UPI payment')) button.textContent = '💳 UPI Payment';
            else if (originalQuestion.includes('phone is hanging')) button.textContent = '📞 Phone Issues';
            else if (originalQuestion.includes('send photos')) button.textContent = '📸 Photos भेजें';
            else if (originalQuestion.includes('emergency')) button.textContent = '🚨 Emergency';
            else if (originalQuestion.includes('clean my phone')) button.textContent = '🧹 Phone साफ करें';
            else button.textContent = originalQuestion;
        } else {
            button.textContent = originalQuestion;
        }
    });

    userInput.placeholder = currentLanguage === 'hi' ? 'अपना सवाल यहाँ लिखें... Type your question here...' : 'Type your question here... अपना सवाल यहाँ लिखें...';
    document.querySelector('.quick-actions h3').textContent = currentLanguage === 'hi' ? '🚀 तुरंत मदद' : '🚀 Quick Help';
    updateStatus(messages.readyStatus[currentLanguage]);

    if (recognition) {
        recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
    }
    // After changing language, reload history to ensure it's displayed in the new language context
    // This will also re-populate chatHistory array for the AI.
    loadAndDisplayChatHistory(currentLanguage);
}

// NEW: Function to clear only the UI messages, not the backend history
function clearChatUIOnly() {
    const welcomeMessageDiv = document.querySelector('.welcome-message');
    while (chatContainer.firstChild && chatContainer.firstChild !== welcomeMessageDiv) {
        chatContainer.removeChild(chatContainer.firstChild);
    }
    while (welcomeMessageDiv.nextSibling) {
        chatContainer.removeChild(welcomeMessageDiv.nextSibling);
    }
}

// UPDATED: clearChatMessages now also clears backend history
async function clearChatMessages() {
    clearChatUIOnly(); // Clear UI first
    chatHistory = []; // Reset local history

    await clearChatHistoryBackend(); // Clear history from Firestore

    // Display welcome message after clearing
    const welcomeGreeting = messages.welcome[currentLanguage].split('\n')[0].trim();
    const welcomeInstructions = messages.welcome[currentLanguage].split('\n').slice(1).join('\n').trim();
    document.querySelector('.welcome-message div:first-child').textContent = welcomeGreeting;
    document.querySelector('.welcome-message div:last-child').innerHTML = welcomeInstructions.replace(/\n/g, '<br>');

    updateStatus(messages.readyStatus[currentLanguage]);
    speakResponse(welcomeGreeting);
}


// NEW: Function to load and display chat history on page load or language change
async function loadAndDisplayChatHistory(lang) {
    clearChatUIOnly(); // Clear existing messages before loading new ones
    chatHistory = []; // Clear local history before loading

    const loadedHistory = await loadChatHistory();
    if (loadedHistory && loadedHistory.length > 0) {
        // Filter out initial system instructions that backend adds
        // We only want to display actual user/model turns in the UI
        const displayableHistory = loadedHistory.filter(msg => 
            msg.role === 'user' || 
            (msg.role === 'model' && !msg.parts[0].text.includes("Understood. I will provide simple, step-by-step tech assistance"))
        );

        displayableHistory.forEach(msg => {
            addMessage(msg.parts[0].text, msg.role === 'user', false); // Don't add to history again
        });
        chatHistory = loadedHistory; // Set the full loaded history to chatHistory for AI context
    } else {
        // If no history, display the initial welcome message
        const welcomeGreeting = messages.welcome[currentLanguage].split('\n')[0].trim();
        const welcomeInstructions = messages.welcome[currentLanguage].split('\n').slice(1).join('\n').trim();
        document.querySelector('.welcome-message div:first-child').textContent = welcomeGreeting;
        document.querySelector('.welcome-message div:last-child').innerHTML = welcomeInstructions.replace(/\n/g, '<br>');
        
        // Speak welcome message only if no history was loaded
        setTimeout(() => {
            speakResponse(welcomeGreeting);
        }, 1000);
    }
    updateStatus(messages.readyStatus[currentLanguage]);
}


// NEW: Function to toggle light/dark theme (NO CHANGES TO ITS LOGIC)
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    // Save theme preference to localStorage
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.innerHTML = '☀️ Light Mode'; // Change button text/icon for light mode
    } else {
        localStorage.setItem('theme', 'light');
        themeToggleBtn.innerHTML = '🌙 Dark Mode'; // Change button text/icon for dark mode
    }
}


// --- Initial Setup and Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => { // Made async to await loadAndDisplayChatHistory
    userInput.focus();
    setupSpeechRecognition();

    // Check for saved theme preference and apply on load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleBtn.innerHTML = '☀️ Light Mode';
    } else {
        themeToggleBtn.innerHTML = '🌙 Dark Mode';
    }

    // Load and display chat history for the user
    await loadAndDisplayChatHistory(currentLanguage);

    // Set initial quick action button texts
    quickActionButtons.forEach(button => {
        button.textContent = button.dataset.question;
    });

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
    voiceBtn.addEventListener('click', toggleVoice);
    languageToggleBtn.addEventListener('click', toggleLanguage);
    clearChatBtn.addEventListener('click', clearChatMessages);
    themeToggleBtn.addEventListener('click', toggleTheme);


    quickActionButtons.forEach(button => {
        button.addEventListener('click', () => {
            userInput.value = button.dataset.question;
            sendMessage();
        });
    });
});