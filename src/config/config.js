require('dotenv').config({ path: '.env.example' });

module.exports = {
    port: process.env.PORT || 3000,
    litellm: {
        apiKey: process.env.LITELLM_API_KEY,
        apiBase: process.env.LITELLM_API_BASE,
        model: process.env.LITELLM_MODEL
    },
    flowMeta: {
        path: process.env.FLOW_META_PATH || 'Code_Enforcement_Inspection_Closed_duplicate_violation.flow-meta.xml'
    }
};
