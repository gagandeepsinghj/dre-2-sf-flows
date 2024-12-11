const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llmController');
const DREResultTranslationController = require('../controllers/dreResultTranslationController');
const FlowDeploymentController = require('../controllers/flowDeploymentController');
const MainController = require('../controllers/mainController');

// Initialize controllers
const flowDeploymentController = new FlowDeploymentController();
const mainController = new MainController();

// Test endpoint
router.get('/test-litellm', llmController.testLiteLLM);

// Main processing endpoint
router.post('/migrate-dre-rule', mainController.processJsonInput.bind(mainController));

// Flow Deployment endpoint
router.post('/deploy-flow', flowDeploymentController.deployFlow.bind(flowDeploymentController));

module.exports = router;
