const axios = require('axios');
const config = require('./config');

const liteLLM = axios.create({
    baseURL: config.litellm.apiBase,
    headers: {
        'Authorization': `Bearer ${config.litellm.apiKey}`,
        'Content-Type': 'application/json'
    }
});

module.exports = liteLLM;
