const fs = require('fs').promises;
const path = require('path');
const DREValidationController = require('./dreValidationController');
const DreRuleTranslationController = require('./dreRuleTranslationController');
const Logger = require('../helpers/Logger');

class MainController {
    constructor() {
        this.dreValidationController = new DREValidationController();
        this.dreRuleTranslationController = new DreRuleTranslationController();
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

            // get the first processed rules if there are any
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

            // Translate the first processed rule to a Flow
            const flowPath = await this.dreRuleTranslationController.generateFlowMetadata(firstProcessedRule);

            this.logger.info('JSON processing completed successfully');

            // Read flow content
            try {
                const flowContent = await fs.readFile(flowPath, 'utf8');
                const flowFileName = path.basename(flowPath);

                res.json({
                    success: true,
                    fileName: flowFileName,
                    flowContent: flowContent
                });
            } catch (fileError) {
                throw new Error(`Error reading flow file: ${fileError.message}`);
            }

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
