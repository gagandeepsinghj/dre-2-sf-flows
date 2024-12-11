const liteLLM = require('../config/litellm');
const config = require('../config/config');
const Logger = require('../helpers/Logger');
const fs = require('fs').promises;
const path = require('path');

class FlowGenerationController {
    constructor() {
        this.logger = new Logger('FlowGenerationController');
    }

    /**
     * Private method to create a combined system prompt from markdown guide and expert prompt
     * @returns {Promise<string>} Combined system prompt
     * @private
     */
    async _getSystemPrompt() {
        try {
            const markdownPath = path.join(process.cwd(), 'src', 'prompts', 'SalesforceFlowExpert.md');
            const markdownContent = await fs.readFile(markdownPath, 'utf8');

            return markdownContent;
        } catch (error) {
            this.logger.error('Error loading system prompt', error);
            // Fallback to base expert prompt if markdown fails to load
            return '';
        }
    }

    /**
     * Private method to generate a Salesforce Flow based on provided instructions
     * @param {Object} instructions - The rule-related instructions for flow generation
     * @returns {Promise<Object>} Object containing filename and flowContent
     * @private
     */
    async _generateFlow(instructions) {
        try {
            this.logger.info('Starting flow generation from instructions');

            if (!instructions || typeof instructions !== 'object') {
                throw new Error('Invalid instructions provided');
            }

            // Get combined system prompt
            const systemPrompt = await this._getSystemPrompt();

            this.logger.debug('Sending request to LiteLLM', {
                model: config.litellm.model,
                instructions
            });

            const response = await liteLLM.post('/chat/completions', {
                model: config.litellm.model,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            instructions,
                            request: "Generate a Salesforce Flow based on these instructions following the provided guide and output format requirements"
                        })
                    }
                ]
            });

            let responseContent = response.data.choices[0].message.content.trim();

            // Clean up the response content
            responseContent = responseContent
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
                .replace(/\n/g, '\\n') // Escape newlines
                .replace(/\r/g, '\\r') // Escape carriage returns
                .replace(/\t/g, '\\t'); // Escape tabs

            // Parse the cleaned response
            let flowInfo;
            try {
                flowInfo = JSON.parse(responseContent);
            } catch (parseError) {
                this.logger.error('Failed to parse LLM response', {
                    response: responseContent,
                    error: parseError.message
                });
                throw new Error(`Invalid response format: ${parseError.message}`);
            }

            // Validate against required output format
            if (!flowInfo.filename || typeof flowInfo.filename !== 'string') {
                throw new Error('Invalid flow info: missing or invalid filename');
            }
            if (!flowInfo.flowContent || typeof flowInfo.flowContent !== 'string') {
                throw new Error('Invalid flow info: missing or invalid flowContent');
            }

            // Validate XML structure requirements
            const requiredXmlElements = [
                '<Flow xmlns="http://soap.sforce.com/2006/04/metadata">',
                '<apiVersion>62.0</apiVersion>',
                '<status>Active</status>',
                '<processType>AutoLaunchedFlow</processType>'
            ];

            for (const element of requiredXmlElements) {
                if (!flowInfo.flowContent.includes(element)) {
                    throw new Error(`Missing required XML element: ${element}`);
                }
            }

            // Unescape newlines in the content
            flowInfo.flowContent = flowInfo.flowContent.replace(/\\n/g, '\n');

            this.logger.info('Flow generation completed successfully');
            return flowInfo;

        } catch (error) {
            this.logger.error('Error generating flow', error);
            throw error;
        }
    }

    /**
     * Private method to save the generated flow to the filesystem
     * @param {Object} flowInfo - Object containing filename and flowContent
     * @returns {Promise<string>} Path to the saved flow file
     * @private
     */
    async _saveFlow(flowInfo) {
        try {
            this.logger.info('Saving generated flow');

            const flowsDir = path.join(process.cwd(), 'dre-2-sf-flows/flows');
            await fs.mkdir(flowsDir, { recursive: true });

            const flowPath = path.join(flowsDir, flowInfo.filename);
            await fs.writeFile(flowPath, flowInfo.flowContent, 'utf8');

            this.logger.info('Flow saved successfully', { path: flowPath });
            return flowPath;

        } catch (error) {
            this.logger.error('Error saving flow', error);
            throw error;
        }
    }

    /**
     * Public method to generate and save a Salesforce Flow based on provided instructions
     * @param {Object} instructions - The rule-related instructions for flow generation
     * @returns {Promise<Object>} Object containing the flow information and file path
     * @public
     */
    async generateAndSaveFlow(instructions) {
        try {
            this.logger.info('Starting flow generation and save process');

            // Generate the flow using private method
            const flowInfo = await this._generateFlow(instructions);

            // Save the flow using private method
            const flowPath = await this._saveFlow(flowInfo);

            return {
                filename: flowInfo.filename,
                flowContent: flowInfo.flowContent,
                path: flowPath
            };

        } catch (error) {
            this.logger.error('Error in flow generation and save process', error);
            throw error;
        }
    }
}

module.exports = FlowGenerationController;
