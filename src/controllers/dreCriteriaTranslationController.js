const Logger = require('../helpers/Logger');

/**
 * @class DRECriteriaTranslationController
 * @description Controller responsible for generating prompts for DRE Filter Groups and Filters translation
 */
class DRECriteriaTranslationController {
    constructor() {
        this.logger = new Logger('DRECriteriaTranslationController');
    }

    /**
     * @description Generates prompts for translating DRE rule filters
     * @param {Object} dreRule - The DRE rule object containing filter groups and filters
     * @returns {Promise<Array>} Array of prompt messages for LiteLLM
     * @throws {Error} If prompt generation process fails
     */
    async generatePrompts(dreRule) {
        this.logger.info('Generating prompts for DRE rule filters', { ruleName: dreRule.Name });

        try {
            // Extract filter groups from the rule
            const filterGroups = (dreRule.DRE__DRE_Filter_Groups__r?.records || []).map(group => ({
                Id: group.Id,
                Name: group.Name,
                DRE__Condition__c: group.DRE__Condition__c,
                DRE__Object_Name__c: group.DRE__Object_Name__c,
                DRE__Object_Path__c: group.DRE__Object_Path__c,
                filters: dreRule.DRE__DRE_Filters__r?.records.filter(f =>
                    f.DRE__DRE_Group__c === group.Id && f.DRE__IsActive__c === true
                ) || []
            }));

            this.logger.debug('Filter groups extracted', {
                groupCount: filterGroups.length,
                totalFilters: filterGroups.reduce((acc, group) => acc + group.filters.length, 0)
            });

            // Generate prompts for filter translation
            const prompts = [
                {
                    role: "system",
                    content: "You are a Salesforce Flow expert specializing in decision criteria. Analyze these DRE Filter Groups and translate them into clear, human-readable conditions. For each group:\n" +
                        "1. Identify the object being queried\n" +
                        "2. Specify any parent-child relationships in the object path\n" +
                        "3. List all filter conditions and their operators\n" +
                        "4. Explain how the conditions should be combined (AND/OR)\n" +
                        "5. Describe the business logic these filters implement\n" +
                        "Format the response as structured JSON with 'objectInfo', 'conditions', 'logicOperator', and 'businessLogic' properties." +
                        "Return a JSON array of the translated filter groups."
                },
                {
                    role: "user",
                    content: JSON.stringify(filterGroups, null, 2)
                }
            ];

            this.logger.debug('Generated prompts for filter translation', {
                promptCount: prompts.length
            });

            return prompts;
        } catch (error) {
            this.logger.error('Failed to generate prompts for rule filters', error, {
                ruleName: dreRule.Name
            });
            throw error;
        }
    }
}

module.exports = DRECriteriaTranslationController;
