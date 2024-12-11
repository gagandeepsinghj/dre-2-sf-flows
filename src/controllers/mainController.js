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
            console.log('Request body:', req.body); // Debug request body

            // Validate that request body exists and contains jsonString
            if (!req.body || !req.body.jsonString) {
                console.log('Missing jsonString in request body'); // Debug validation
                throw new Error('Request must include a jsonString field');
            }

            // Parse the JSON string
            let parsedJson;
            try {
                console.log('Attempting to parse JSON string:', req.body.jsonString); // Debug JSON string
                parsedJson = JSON.parse(req.body.jsonString);
                console.log('Successfully parsed JSON:', parsedJson); // Debug parsed JSON
            } catch (parseError) {
                console.error('JSON parsing error:', parseError); // Debug parse error
                throw new Error(`Invalid JSON format: ${parseError.message}`);
            }

            // Process the rules through the validation controller
            console.log('Processing rules through validation controller...'); // Debug validation start
            const processedRules = this.dreValidationController.validateAndProcessRules(parsedJson);
            console.log('Processed rules result:', processedRules); // Debug processed rules

            // get the first processed rules if there are any
            let firstProcessedRule;
            try {
                firstProcessedRule = JSON.parse(processedRules)[0];
                console.log('First processed rule:', firstProcessedRule); // Debug first rule
                if (!firstProcessedRule) {
                    console.log('No valid rules found in processed data'); // Debug no rules
                    throw new Error('No valid rules found in processed data');
                }
            } catch (parseError) {
                console.error('Error processing rules:', parseError); // Debug processing error
                throw new Error(`Error processing rules: ${parseError.message}`);
            }

            this.logger.debug('First processed rule', { firstProcessedRule });

            // Translate the first processed rule to a Flow
            console.log('Generating flow metadata...'); // Debug flow generation start
            // const flowPath = await this.dreRuleTranslationController.generateFlowMetadata(firstProcessedRule);
            const flowPath = '/Users/jasonmah/dre-2-sf-flows/Code_Enforcement_Inspection_Closed_duplicate_violation.flow-meta.xml'
            console.log('Generated flow path:', flowPath); // Debug flow path

            this.logger.info('JSON processing completed successfully');

            // Read flow content
            try {
                console.log('Reading flow file from path:', flowPath); // Debug file reading
                const flowContent = await fs.readFile(flowPath, 'utf8');
                // const flowFileName = path.basename(flowPath);
                const flowFileName = 'Code_Enforcement_Inspection_Closed_duplicate_violation.flow-meta.xml';
                console.log('Flow file name:', flowFileName); // Debug file name
                console.log('Flow content length:', flowContent.length); // Debug content length

                const response = {
                    success: true,
                    fileName: flowFileName,
                    flowContent: flowContent
                };
                console.log('Sending response:', {
                    ...response,
                    flowContent: flowContent.substring(0, 100) + '...' // Log truncated content
                }); // Debug response

                res.json(response);
            } catch (fileError) {
                console.error('Error reading flow file:', fileError); // Debug file error
                throw new Error(`Error reading flow file: ${fileError.message}`);
            }

        } catch (error) {
            console.error('Main controller error:', error); // Debug main error
            this.logger.error('Failed to process JSON input', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = MainController;
