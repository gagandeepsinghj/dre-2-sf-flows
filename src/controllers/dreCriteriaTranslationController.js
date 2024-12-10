const liteLLM = require('../config/litellm');
const config = require('../config/config');
const fs = require('fs').promises;
const path = require('path');
const Logger = require('../helpers/Logger');

/**
 * @class DRECriteriaTranslationController
 * @description Controller responsible for translating DRE Filter Groups and Filters into Salesforce Flow nodes
 */
class DRECriteriaTranslationController {
    constructor() {
        this.logger = new Logger('DRECriteriaTranslationController');
    }

    /**
     * @description Translates DRE filters and their associated filter groups into flow node criteria
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
    async translateFiltersToFlowCriteria(req, res) {
        this.logger.info('Starting DRE filters translation process');
        try {
            this.logger.debug('Extracting filter groups');
            const filterGroups = await this._extractFilterGroups();
            this.logger.debug('Filter groups extracted', { groupCount: filterGroups.length });

            this.logger.debug('Translating DRE filters');
            const translatedFilters = await this._translateDREFilters(filterGroups);
            this.logger.debug('Filters translated', { translatedCount: translatedFilters.length });

            this.logger.debug('Generating flow criteria');
            const flowCriteria = await this._generateFlowCriteria(translatedFilters);
            this.logger.debug('Flow criteria generated', { criteriaLength: flowCriteria.length });

            this.logger.info('Translation process completed successfully');
            res.json({
                success: true,
                translatedFilters,
                flowCriteria: flowCriteria
            });
        } catch (error) {
            this.logger.error('Translation process failed', error, {
                endpoint: 'translateFiltersToFlowCriteria'
            });
            res.status(500).json({
                success: false,
                error: 'Failed to translate DRE filters to flow criteria',
                details: error.message
            });
        }
    }

    /**
     * @private
     * @description Extracts filter groups and their associated filters from DRERules.json
     * @returns {Promise<Array>} Array of filter groups with their associated filters
     * @throws {Error} If file reading or parsing fails
     */
    async _extractFilterGroups() {
        const rulesPath = path.join(__dirname, '../../DRERules.json');
        this.logger.debug('Reading DRE rules file', { path: rulesPath });

        try {
            const dreRules = JSON.parse(await fs.readFile(rulesPath, 'utf8'));
            this.logger.debug('DRE rules file parsed successfully', { ruleCount: dreRules.length });

            const filterGroups = dreRules.flatMap(rule => {
                const groups = rule.DRE__DRE_Filter_Groups__r?.records || [];
                return groups.map(group => ({
                    Id: group.Id,
                    Name: group.Name,
                    DRE__Condition__c: group.DRE__Condition__c,
                    DRE__Object_Name__c: group.DRE__Object_Name__c,
                    DRE__Object_Path__c: group.DRE__Object_Path__c,
                    filters: rule.DRE__DRE_Filters__r?.records.filter(f =>
                        f.DRE__DRE_Group__c === group.Id && f.DRE__IsActive__c === true
                    ) || []
                }));
            });

            this.logger.debug('Filter groups extracted', {
                groupCount: filterGroups.length,
                totalFilters: filterGroups.reduce((acc, group) => acc + group.filters.length, 0)
            });

            return filterGroups;
        } catch (error) {
            this.logger.error('Failed to extract filter groups', error, { rulesPath });
            throw error;
        }
    }

    /**
     * @private
     * @description Translates DRE filters into human-readable conditions
     * @param {Array} filterGroups - Array of filter groups with their filters
     * @returns {Promise<Array>} Translated filters with condition descriptions
     * @throws {Error} If LLM API call fails
     */
    async _translateDREFilters(filterGroups) {
        this.logger.debug('Starting DRE filters translation', { groupCount: filterGroups.length });

        const prompt = {
            role: "system",
            content: "You are a Salesforce data operations expert. Analyze these DRE Filter Groups and translate them into clear, human-readable conditions. For each group:\n" +
                "1. Identify the objects being filtered\n" +
                "2. Specify the parent objects and path to the lookup relationship if this is filtering related object\n" +
                "3. Specify the condition type (Exists, Not Exists, etc.)\n" +
                "4. List the specific fields being evaluated\n" +
                "5. Explain the business logic behind each condition\n" +
                "Format the response as structured JSON with 'conditionType', 'objects', 'fields', and 'businessLogic' properties." +
                "Return a JSON array of the translated filters." +
                "Order the filters in the same sequence as Filter Group order."
        };

        try {
            this.logger.debug('Making LiteLLM API call for translation');
            const response = await liteLLM.post('/chat/completions', {
                model: config.litellm.model,
                messages: [
                    prompt,
                    {
                        role: "user",
                        content: JSON.stringify(filterGroups, null, 2)
                    }
                ]
            });

            this.logger.debug('LiteLLM API call successful', {
                status: response.status,
                modelUsed: config.litellm.model
            });

            let translatedContent;
            try {
                translatedContent = JSON.parse(response.data.choices[0]?.message?.content || '[]');
            } catch (parseError) {
                this.logger.error('Failed to parse LLM response', parseError);
                translatedContent = [];
            }

            const translatedFilters = translatedContent;

            this.logger.debug('Filters translation completed', {
                translatedCount: translatedFilters.length
            });

            return translatedFilters;
        } catch (error) {
            this.logger.error('Failed to translate DRE filters', error, {
                model: config.litellm.model,
                groupCount: filterGroups.length
            });
            throw error;
        }
    }

    /**
     * @private
     * @description Generates flow criteria using LLM based on translated filters
     * @param {Array} translatedFilters - Array of translated filters with their conditions
     * @returns {Promise<string>} Generated flow criteria instructions
     * @throws {Error} If LLM API call fails
     */
    async _generateFlowCriteria(translatedFilters) {
        const flowMetaPath = path.join(__dirname, '../../', config.flowMeta.path);
        this.logger.debug('Reading Flow metadata file', { path: flowMetaPath });

        const prompt = {
            role: "system",
            content: `You are a Salesforce Flow expert specializing in generating deployable Flow metadata XML. Create decision criteria that implements the specified conditions following these requirements:

1. XML Structure:
- Use API version 62.0
- Include proper decision element tags
- Include proper condition requirements

2. Required Flow Components:
- Decision nodes with proper condition formulas
- Proper node positioning using locationX/Y coordinates
- Clear connector references between nodes

3. Best Practices:
- Use unique, descriptive names for all elements
- Include clear labels and descriptions
- Follow the node positioning guidelines
- Include defaultConnectorLabel for all decision elements

4. Decision Criteria Requirements:
- Follow the pattern from given flow metadata definition
- Implement proper condition formulas based on filter logic
- Use proper Salesforce formula syntax

5. Validation:
- Validate all xml nodes against Salesforce Flow metadata specifications
- Remove any unsupported nodes or attributes
- Ensure proper formula syntax for all conditions

Format the response as Flow decision criteria XML elements. Only return the decision criteria xml content.`
        };

        try {
            this.logger.debug('Making LiteLLM API call for flow criteria generation');
            const response = await liteLLM.post('/chat/completions', {
                model: config.litellm.model,
                messages: [
                    prompt,
                    {
                        role: "user",
                        content: JSON.stringify(translatedFilters, null, 2)
                    },
                    {
                        role: "user",
                        content: await fs.readFile(flowMetaPath, 'utf8')
                    }
                ]
            });

            this.logger.debug('Flow criteria generation completed', {
                status: response.status,
                responseLength: response.data.choices[0].message.content.length
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            this.logger.error('Failed to generate flow criteria', error, {
                model: config.litellm.model,
                translatedFilterCount: translatedFilters.length
            });
            throw error;
        }
    }
}

module.exports = DRECriteriaTranslationController;
