const express = require('express');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
console.log('process.env.LITELLM_API_BASE', process.env.LITELLM_API_BASE);

// Configure LiteLLM API client
const liteLLM = axios.create({
    baseURL: process.env.LITELLM_API_BASE,
    headers: {
        'Authorization': `Bearer ${process.env.LITELLM_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test LiteLLM connection
app.get('/api/test-litellm', async (req, res) => {
    try {
        const response = await liteLLM.post('/chat/completions', {
            model: process.env.LITELLM_MODEL,
            messages: [
                { role: "user", content: "Say hello world" }
            ]
        });
        res.json({ 
            success: true, 
            response: response.data.choices[0].message.content 
        });
    } catch (error) {
        console.error('LiteLLM API Error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to connect to LiteLLM' 
        });
    }
});

// Start the server
app.listen(PORT, () => {
    if (!process.env.LITELLM_API_KEY) {
        console.warn('Warning: LITELLM_API_KEY is not set in environment variables');
    }
    if (!process.env.LITELLM_API_BASE) {
        console.warn('Warning: LITELLM_API_BASE is not set in environment variables');
    }
    console.log(`Server is running on http://localhost:${PORT}`);
});
