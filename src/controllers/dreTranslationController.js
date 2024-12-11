const liteLLM = require('../config/litellm');
const config = require('../config/config');
const Logger = require('../helpers/Logger');
const DreRuleTranslationController = require('./dreRuleTranslationController');
const DRECriteriaTranslationController = require('./dreCriteriaTranslationController');
const DREResultTranslationController = require('./dreResultTranslationController');

/**
 * @class DRETranslationController
 * @description Main controller for translating DRE Rules into Salesforce Flow criteria
 */
class DRETranslationController {
    constructor() {
        this.logger = new Logger('DRETranslationController');
        this.ruleTranslator = new DreRuleTranslationController();
        this.criteriaTranslator = new DRECriteriaTranslationController();
        this.resultTranslator = new DREResultTranslationController();
    }

    /**
     * @description Translates a DRE rule into Salesforce Flow criteria by generating and processing prompts
     * @param {Object} dreRuleJson - The DRE rule JSON object to translate
     * @returns {Promise<Object>} The translated flow criteria
     * @throws {Error} If translation process fails
     */
    async translateRule(dreRuleJson) {
        this.logger.info('Starting DRE rule translation process', {
            ruleName: dreRuleJson.Name
        });

        try {
            // Generate all necessary prompts
            const [rulePrompts, criteriaPrompts, resultPrompts] = await Promise.all([
                this.ruleTranslator.generatePrompts(dreRuleJson),
                this.criteriaTranslator.generatePrompts(dreRuleJson),
                this.resultTranslator.generatePrompts(dreRuleJson)
            ]);

            this.logger.debug('Generated all translation prompts', {
                rulePromptsCount: rulePrompts.length,
                criteriaPromptsCount: criteriaPrompts.length,
                resultPromptsCount: resultPrompts.length
            });

            // Add complete DRE JSON as additional context to each prompt set
            const dreJsonPrompt = {
                role: "user",
                content: "Complete DRE Rule JSON for context:\n" + JSON.stringify(dreRuleJson, null, 2)
            };

            // Process prompts with LiteLLM, including complete DRE JSON
            const [ruleTranslation, criteriaTranslation, resultTranslation] = await Promise.all([
                this._processPrompts([...rulePrompts, dreJsonPrompt]),
                this._processPrompts([...criteriaPrompts, dreJsonPrompt]),
                this._processPrompts([...resultPrompts, dreJsonPrompt])
            ]);

            // Combine all translations into final result
            const flowCriteria = {
                rule: this._parseResponse(ruleTranslation),
                criteria: this._parseResponse(criteriaTranslation),
                results: this._parseResponse(resultTranslation)
            };

            this.logger.info('DRE rule translation completed successfully', {
                ruleName: dreRuleJson.Name
            });

            return flowCriteria;
        } catch (error) {
            this.logger.error('DRE rule translation failed', error, {
                ruleName: dreRuleJson.Name
            });
            throw error;
        }
    }

    /**
     * @private
     * @description Process a series of prompts using LiteLLM API
     * @param {Array} prompts - Array of prompt messages
     * @returns {Promise<string>} The LLM response content
     * @throws {Error} If LiteLLM API call fails
     */
    async _processPrompts(prompts) {
        try {
            const response = await liteLLM.post('/chat/completions', {
                model: config.litellm.model,
                messages: prompts,
                temperature: 0.2, // Lower temperature for more consistent outputs
                max_tokens: 2000 // Ensure enough tokens for complete responses
            });

            return response.data.choices[0]?.message?.content;
        } catch (error) {
            this.logger.error('Failed to process prompts with LiteLLM', error);
            throw error;
        }
    }

    /**
     * @private
     * @description Parse LLM response content into JSON
     * @param {string} response - The response content from LLM
     * @returns {Object} Parsed JSON object
     * @throws {Error} If JSON parsing fails
     */
    _parseResponse(response) {
        try {
            return JSON.parse(response || '{}');
        } catch (error) {
            this.logger.error('Failed to parse LLM response', error, {
                response: response
            });
            return {};
        }
    }
}

module.exports = DRETranslationController;
