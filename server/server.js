// server/server.js
// This script sets up a Node.js Express server to proxy requests to the Gemini API
// AND integrates Google Cloud Firestore for persistent chat history.

// Load environment variables from .env file
require('dotenv').config();

// Import necessary modules
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// NEW: Import Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001; // Render will use its own PORT env var

// --- Middleware Setup ---
app.use(cors());
app.use(express.json());

// --- Firebase Admin SDK Initialization ---
// IMPORTANT: Now reading service account credentials from environment variable
try {
    const firebaseServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!firebaseServiceAccountJson) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
    }

    // Parse the JSON string from the environment variable
    const serviceAccount = JSON.parse(firebaseServiceAccountJson);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully from environment variable.');
} catch (error) {
    console.error('ERROR: Failed to initialize Firebase Admin SDK. Make sure FIREBASE_SERVICE_ACCOUNT_JSON environment variable is set and contains valid JSON.', error);
    // In a production environment, you might want a more graceful exit or logging.
    // For now, we'll exit to prevent the server from running incorrectly.
    process.exit(1);
}

// Get a reference to the Firestore database
const db = admin.firestore();

// --- Gemini API Configuration (Backend Side) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash-latest';

if (!GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY environment variable is not set!");
    // For Render, this means you forgot to set it in Render's environment variables.
    // For local, it means you forgot it in .env.
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
let generativeModel;

function initializeGenerativeModel() {
    if (!generativeModel) {
        generativeModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        console.log(`Backend: Generative model initialized with model: ${GEMINI_MODEL}`);
    }
    return generativeModel;
}

initializeGenerativeModel();

// --- API Endpoint for Chat ---
app.post('/chat', async (req, res) => {
    const { message, history, language, userId } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required in the request body.' });
    }
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required for chat history.' });
    }

    try {
        const model = initializeGenerativeModel();
        
        const fullHistory = [
            {
                role: "user",
                parts: [{ text: `You are ElderEase, an AI assistant for elderly people in India.
                                   Answer in ${language === 'hi' ? 'Hindi' : 'English'} language.
                                   Keep responses simple, step-by-step, and use emojis.
                                   Focus on tech help for seniors.
                                   If the user asks something completely unrelated to tech help for seniors, gently redirect them to tech assistance or suggest they contact a human for other needs.
                                   Example: If user asks "What is the capital of France?", respond with something like "That's an interesting question! My main purpose is to help seniors with technology. Can I help you with WhatsApp or phone problems instead? 📱"` }],
            },
            {
                role: "model",
                parts: [{ text: `Understood. I will provide simple, step-by-step tech assistance for seniors in India, responding in ${language === 'hi' ? 'Hindi' : 'English'} with emojis, and redirecting non-tech questions. How can I help?` }],
            },
            ...(history || [])
        ];

        const chatSession = model.startChat({
            history: fullHistory,
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7,
                topP: 0.95,
                topK: 60,
            },
        });

        const result = await chatSession.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({ response: text });

    } catch (error) {
        console.error('Backend Gemini API Error:', error);
        res.status(500).json({ error: 'Failed to get response from AI. Please try again.', details: error.message });
    }
});

// --- API Endpoint to Save Chat History ---
app.post('/save-chat', async (req, res) => {
    const { userId, history } = req.body;

    if (!userId || !history) {
        return res.status(400).json({ error: 'User ID and history are required.' });
    }

    try {
        await db.collection('chats').doc(userId).set({
            history: JSON.stringify(history),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.status(200).json({ message: 'Chat history saved successfully.' });
    } catch (error) {
        console.error('Error saving chat history to Firestore:', error);
        res.status(500).json({ error: 'Failed to save chat history.' });
    }
});

// --- API Endpoint to Load Chat History ---
app.get('/load-chat/:userId', async (req, res) => {
    const userId = req.params.userId;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        const docRef = db.collection('chats').doc(userId);
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            const history = JSON.parse(data.history);
            res.status(200).json({ history: history });
        } else {
            res.status(200).json({ history: [] });
        }
    } catch (error) {
        console.error('Error loading chat history from Firestore:', error);
        res.status(500).json({ error: 'Failed to load chat history.' });
    }
});

// --- API Endpoint to Clear Chat History ---
app.delete('/clear-chat/:userId', async (req, res) => {
    const userId = req.params.userId;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        const docRef = db.collection('chats').doc(userId);
        await docRef.delete();

        res.status(200).json({ message: 'Chat history cleared successfully.' });
    } catch (error) {
        console.error('Error clearing chat history from Firestore:', error);
        res.status(500).json({ error: 'Failed to clear chat history.' });
    }
});


// --- Start the Server ---
app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
