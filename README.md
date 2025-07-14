ElderEase: AI-Powered Senior Tech Support Chatbot
Project Overview
ElderEase is an AI-powered conversational chatbot designed for senior citizens in India, aiming to help them resolve daily technical issues (such as WhatsApp, UPI payments, phone problems, etc.) with simple, step-by-step guidance. This project focuses on empowering seniors in the digital world and making technology more accessible for them.

Key Features
AI-Powered Conversations: Driven by the Google Gemini Large Language Model (LLM), providing relevant and helpful responses.

Multilingual Support: Allows users to interact in both English and Hindi languages.

Persistent Chat History: Securely saves and loads user chat history using Google Cloud Firestore, ensuring seamless and personalized conversations.

Voice Input/Output: Supports both voice input (speech-to-text) and output (text-to-speech) using the Web Speech API.

Responsive UI: A clean, user-friendly, and mobile-responsive interface built with HTML, CSS, and JavaScript.

Theme Toggle: Option to switch between light and dark themes to enhance user experience.

Secure Backend: Utilizes a Node.js/Express.js proxy server to keep sensitive API keys secure.

Technologies Used
Frontend: HTML5, CSS3, JavaScript

Backend: Node.js, Express.js

AI Model: Google Gemini (gemini-1.5-flash-latest)

Database: Google Cloud Firestore

Deployment:

Frontend: Vercel

Backend: Render

How to Run Locally
Clone the repository:

git clone https://github.com/Dhriti-Sharma/ElderEase-Chatbot.git
cd ElderEase-Chatbot

Backend Setup (in the server folder):

cd server

npm install

Create a .env file and add your Gemini API key: GEMINI_API_KEY=YOUR_GEMINI_API_KEY

Download your firebase-service-account.json file from your Firebase project and place it in the server folder.

Start the server: node server.js

Run the Frontend:

Open the index.html file in your web browser.

Deployment
Frontend: Deployed on Vercel.

Backend: Deployed on Render.