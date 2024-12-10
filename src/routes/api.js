const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llmController');
const DREResultTranslationController = require('../controllers/dreResultTranslationController');
const FlowDeploymentController = require('../controllers/flowDeploymentController');

// Initialize controllers
const dreResultTranslationController = new DREResultTranslationController();
const flowDeploymentController = new FlowDeploymentController();

// Test endpoint
router.get('/test-litellm', llmController.testLiteLLM);

// DRE Results Translation endpoint
router.get('/translate-dre-results', dreResultTranslationController.translateResultsToFlowNodes.bind(dreResultTranslationController));

// Flow Deployment endpoint
router.get('/deploy-flow', flowDeploymentController.deployFlow.bind(flowDeploymentController));

module.exports = router;
