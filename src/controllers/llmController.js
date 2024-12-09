const liteLLM = require('../config/litellm');
const config = require('../config/config');

async function testLiteLLM(req, res) {
    try {
        const response = await liteLLM.post('/chat/completions', {
            model: config.litellm.model,
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
}

module.exports = {
    testLiteLLM
};
