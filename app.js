const express = require('express');
const path = require('path');
const config = require('./src/config/config');
const apiRoutes = require('./src/routes/api');

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes
app.use('/api', apiRoutes);

// Start the server
app.listen(config.port, () => {
    if (!config.litellm.apiKey) {
        console.warn('Warning: LITELLM_API_KEY is not set in environment variables');
    }
    if (!config.litellm.apiBase) {
        console.warn('Warning: LITELLM_API_BASE is not set in environment variables');
    }
    console.log(`Server is running on http://localhost:${config.port}`);
});
