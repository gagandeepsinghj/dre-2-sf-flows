const Logger = require('../helpers/Logger');

/**
 * @class DreRuleTranslationController
 * @description Controller responsible for generating prompts for DRE Rule translation
 */
class DreRuleTranslationController {
  constructor() {
    this.logger = new Logger('DreRuleTranslationController');
  }

  /**
   * @description Generates prompts for translating a DRE rule
   * @param {Object} dreRule - The DRE rule object to translate
   * @returns {Promise<Array>} Array of prompt messages for LiteLLM
   * @throws {Error} If prompt generation process fails
   */
  async generatePrompts(dreRule) {
    this.logger.info('Generating prompts for DRE rule translation', { ruleName: dreRule.Name });

    try {
      // Extract core rule information
      const ruleInfo = {
        Name: dreRule.Name,
        Description: dreRule.DRE__Description__c,
        Type: dreRule.DRE__Type__c,
        IsActive: dreRule.DRE__IsActive__c,
        Object: dreRule.DRE__Object_Name__c,
        TriggerEvent: dreRule.DRE__Trigger_Event__c,
        FilterCriteria: dreRule.DRE__DRE_Filter_Groups__r?.records || [],
        ActionCriteria: dreRule.DRE__DRE_Result_Groups__r?.records || []
      };

      this.logger.debug('Rule information extracted', { ruleInfo });

      // Generate prompts for rule translation
      const prompts = [
        {
          role: "system",
          content: `You are a DRE Rule expert specializing in extracting DRE Rule criteria from a JSON object. Summarize the JSON object into a DRE Rule criteria object following these requirements:
                        1. Required Fields:
                        - Rule Name
                        - Rule Description
                        - Rule Type
                        - Rule Active Status
                        - Rule Object
                        - Rule Trigger Event
                        2. Optional Fields:
                        - Rule Filter Criteria
                        - Rule Action Criteria
                        3. Business Logic:
                        - Extract the rule name from the JSON object
                        - Extract the rule description from the JSON object
                        4. Output:
                        - As JSON Object with the following structure:
                        {
                            "Rule Name": ruleName,
                            "Rule Description": ruleDescription,
                            "Rule Type": ruleType,
                            "Rule Active Status": ruleActiveStatus,
                            "Rule Object": ruleObject,
                            "Rule Trigger Event": ruleTriggerEvent,
                            "Rule Filter Criteria": ruleFilterCriteria,
                            "Rule Action Criteria": ruleActionCriteria,
                            "Business Logic": businessLogic
                        }`
        },
        {
          role: "user",
          content: JSON.stringify(ruleInfo, null, 2)
        }
      ];

      this.logger.debug('Generated prompts for rule translation', {
        promptCount: prompts.length
      });

      return prompts;
    } catch (error) {
      this.logger.error('Failed to generate prompts for rule translation', error, {
        ruleName: dreRule.Name
      });
      throw error;
    }
  }
}

module.exports = DreRuleTranslationController;
