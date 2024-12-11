const Logger = require('../helpers/Logger');

/**
 * @class DREResultTranslationController
 * @description Controller responsible for generating prompts for DRE Result Groups and Results translation
 */
class DREResultTranslationController {
    constructor() {
        this.logger = new Logger('DREResultTranslationController');
    }

    /**
     * @description Generates prompts for translating DRE rule results
     * @param {Object} dreRule - The DRE rule object containing result groups and results
     * @returns {Promise<Array>} Array of prompt messages for LiteLLM
     * @throws {Error} If prompt generation process fails
     */
    async generatePrompts(dreRule) {
        this.logger.info('Generating prompts for DRE rule results', { ruleName: dreRule.Name });

        try {
            // Extract result groups from the rule
            const resultGroups = (dreRule.DRE__DRE_Result_Groups__r?.records || []).map(group => ({
                Id: group.Id,
                Name: group.Name,
                DRE__Description__c: group.DRE__Description__c,
                results: dreRule.DRE__DRE_Results__r?.records.filter(r =>
                    r.DRE__DRE_Group__c === group.Id && r.DRE__IsActive__c === true
                ) || []
            }));

            this.logger.debug('Result groups extracted', {
                groupCount: resultGroups.length,
                totalResults: resultGroups.reduce((acc, group) => acc + group.results.length, 0)
            });

            // Generate prompts for result translation
            const prompts = [
                {
                    role: "system",
                    content: "You are a Salesforce data operations expert. Analyze these DRE Result Groups and translate them into clear, human-readable descriptions of record updates and creations. For each group:\n" +
                        "1. Identify the objects being modified\n" +
                        "2. Specify the parent objects and path to the lookup relationship if this is updating related object\n" +
                        "3. Specify if it's a creation or update operation\n" +
                        "4. List the specific fields being modified\n" +
                        "5. Explain the business logic behind each operation\n" +
                        "Format the response as structured JSON with 'operationType', 'objects', 'fields', and 'businessLogic' properties." +
                        "Return a JSON array of the translated groups." +
                        "Order the groups in the same sequence as Result Group order."
                },
                {
                    role: "user",
                    content: JSON.stringify(resultGroups, null, 2)
                }
            ];

            this.logger.debug('Generated prompts for result translation', {
                promptCount: prompts.length
            });

            return prompts;
        } catch (error) {
            this.logger.error('Failed to generate prompts for rule results', error, {
                ruleName: dreRule.Name
            });
            throw error;
        }
    }
}

module.exports = DREResultTranslationController;
