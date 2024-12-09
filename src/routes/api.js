const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llmController');

router.get('/test-litellm', llmController.testLiteLLM);

module.exports = router;
