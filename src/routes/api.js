const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llmController');
const DREResultTranslationController = require('../controllers/dreResultTranslationController');
const FlowDeploymentController = require('../controllers/flowDeploymentController');
const DRERuleTranslationController = require('../controllers/dreRuleTranslationController');
const MainController = require('../controllers/mainController');

// Initialize controllers
const dreResultTranslationController = new DREResultTranslationController();
const flowDeploymentController = new FlowDeploymentController();
const dreRuleTranslationController = new DRERuleTranslationController();
const mainController = new MainController();

// Test endpoint
router.get('/test-litellm', llmController.testLiteLLM);

// Main processing endpoint
router.post('/migrate-dre-rule', mainController.processJsonInput.bind(mainController));

// DRE Results Translation endpoint
router.get('/translate-dre-results', dreResultTranslationController.translateResultsToFlowNodes.bind(dreResultTranslationController));

// Flow Deployment endpoint
router.get('/deploy-flow', flowDeploymentController.deployFlow.bind(flowDeploymentController));

// DRE Rule Translation endpoint
router.get('/translate-dre-rule', dreRuleTranslationController.translateDreRuleToFlow.bind(dreRuleTranslationController));

module.exports = router;
