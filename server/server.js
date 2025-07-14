// server/server.js
// This script sets up a Node.js Express server to proxy requests to the Gemini API.
// It secures your API key by keeping it on the server-side.

// Load environment variables from .env file
require('dotenv').config();

// Import necessary modules
const express = require('express');
const cors = require('cors'); // For Cross-Origin Resource Sharing
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Gemini Node.js SDK

// Initialize Express app
const app = express();
// Define the port for the backend server. It will try to use the PORT environment variable,
// otherwise, it defaults to 3001.
const port = process.env.PORT || 3001;

// --- Middleware Setup ---
// Enable CORS for all origins. In a production environment, you might want to restrict this
// to only your frontend's domain for better security.
app.use(cors());
// Enable Express to parse JSON request bodies. This is needed to receive data from the frontend.
app.use(express.json());

// --- Gemini API Configuration (Backend Side) ---
// Retrieve the API key from environment variables for security.
// The .env file (created in Step 3) will hold this key.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Define the specific Gemini model to be used.
const GEMINI_MODEL = 'gemini-1.5-flash-latest';

// Check if the API key is set. If not, log an error and exit the process.
if (!GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY environment variable is not set in your .env file!");
    console.error("Please create a .env file in the 'server' directory with GEMINI_API_KEY=YOUR_ACTUAL_API_KEY");
    process.exit(1); // Exit with an error code
}

// Initialize the Google Generative AI client with the API key.
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
let generativeModel; // This variable will hold the initialized generative model instance.

/**
 * Initializes the generative model if it hasn't been already.
 * This ensures the model is ready to be used for chat sessions.
 */
function initializeGenerativeModel() {
    if (!generativeModel) {
        generativeModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        console.log(`Backend: Generative model initialized with model: ${GEMINI_MODEL}`);
    }
    return generativeModel;
}

// Initialize the model once when the server starts.
initializeGenerativeModel();

// --- API Endpoint for Chat ---
// This endpoint will receive chat messages from the frontend and send them to Gemini.
app.post('/chat', async (req, res) => {
    // Destructure the request body to get the user's message, chat history, and desired language.
    const { message, history, language } = req.body;

    // Basic validation: Ensure a message is provided.
    if (!message) {
        return res.status(400).json({ error: 'Message is required in the request body.' });
    }

    try {
        // Get the initialized generative model.
        const model = initializeGenerativeModel();
        let chatSession;

        // Prepare the full chat history, including the system instruction.
        // The frontend will send its current conversation history.
        const fullHistory = [
            // System instruction for the AI, dynamically set based on the requested language.
            {
                role: "user", // System instructions are typically given as a user turn
                parts: [{ text: `You are ElderEase, an AI assistant for elderly people in India.
                                   Answer in ${language === 'hi' ? 'Hindi' : 'English'} language.
                                   Keep responses simple, step-by-step, and use emojis.
                                   Focus on tech help for seniors.
                                   If the user asks something completely unrelated to tech help for seniors, gently redirect them to tech assistance or suggest they contact a human for other needs.
                                   Example: If user asks "What is the capital of France?", respond with something like "That's an interesting question! My main purpose is to help seniors with technology. Can I help you with WhatsApp or phone problems instead? 📱"` }],
            },
            // The model's acknowledgment of the system instruction.
            {
                role: "model",
                parts: [{ text: `Understood. I will provide simple, step-by-step tech assistance for seniors in India, responding in ${language === 'hi' ? 'Hindi' : 'English'} with emojis, and redirecting non-tech questions. How can I help?` }],
            },
            // Append the actual conversation history received from the frontend.
            // This ensures the AI maintains context across turns.
            ...(history || [])
        ];

        // Start a new chat session with the prepared history.
        // For each request, we start a new session with the full history to keep it stateless on the backend,
        // as the frontend is responsible for managing the full conversation history.
        chatSession = model.startChat({
            history: fullHistory,
            generationConfig: {
                maxOutputTokens: 500, // Limit response length
                temperature: 0.7,
                topP: 0.95,
                topK: 60,
            },
        });

        // Send the user's current message to the Gemini API.
        const result = await chatSession.sendMessage(message);
        const response = await result.response;
        const text = response.text(); // Extract the text response from the AI.

        // Send the AI's response back to the frontend.
        res.json({ response: text });

    } catch (error) {
        // Log the detailed error on the backend for debugging.
        console.error('Backend Gemini API Error:', error);
        // Send a user-friendly error message to the frontend.
        res.status(500).json({ error: 'Failed to get response from AI. Please try again.', details: error.message });
    }
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
