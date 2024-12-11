const fs = require('fs').promises;
const path = require('path');
const DREValidationController = require('./dreValidationController');
const DRETranslationController = require('./dreTranslationController');
const FlowGenerationController = require('./flowGenerationController');
const Logger = require('../helpers/Logger');

class MainController {
    constructor() {
        this.dreValidationController = new DREValidationController();
        this.dreTranslationController = new DRETranslationController();
        this.flowGenerationController = new FlowGenerationController();
        this.logger = new Logger('MainController');
    }

    async processJsonInput(req, res) {
        try {
            this.logger.info('Starting JSON processing');

            // Validate that request body exists and contains jsonString
            if (!req.body || !req.body.jsonString) {
                throw new Error('Request must include a jsonString field');
            }

            // Parse the JSON string
            let parsedJson;
            try {
                parsedJson = JSON.parse(req.body.jsonString);
            } catch (parseError) {
                throw new Error(`Invalid JSON format: ${parseError.message}`);
            }

            // Process the rules through the validation controller
            const processedRules = this.dreValidationController.validateAndProcessRules(parsedJson);

            // Get the first processed rule if there are any
            let firstProcessedRule;
            try {
                firstProcessedRule = JSON.parse(processedRules)[0];
                if (!firstProcessedRule) {
                    throw new Error('No valid rules found in processed data');
                }
            } catch (parseError) {
                throw new Error(`Error processing rules: ${parseError.message}`);
            }

            this.logger.debug('First processed rule', { firstProcessedRule });

            // Get flow criteria using DRETranslationController
            const flowCriteria = await this.dreTranslationController.translateRule(firstProcessedRule);
            this.logger.debug('Flow criteria generated', JSON.stringify(flowCriteria, null, 2));

            // Generate and save flow using FlowGenerationController
            const flowResult = await this.flowGenerationController.generateAndSaveFlow(flowCriteria);
            this.logger.debug('Flow generated and saved', {
                fileName: flowResult.filename,
                path: flowResult.path
            });

            this.logger.info('JSON processing completed successfully');

            res.json({
                success: true,
                fileName: flowResult.filename,
                flowContent: flowResult.flowContent
            });

        } catch (error) {
            this.logger.error('Failed to process JSON input', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = MainController;
