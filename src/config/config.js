require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    litellm: {
        apiKey: process.env.LITELLM_API_KEY,
        apiBase: process.env.LITELLM_API_BASE,
        model: process.env.LITELLM_MODEL
    }
};
