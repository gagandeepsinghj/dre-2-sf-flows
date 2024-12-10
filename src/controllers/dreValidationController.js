/**
 * @class DREValidationController
 * @description Controller responsible for validating DRE Rules and extracting result groups
 */
class DREValidationController {
    constructor() {
        this.logger = {
            info: (message, context = {}) => {
                console.log(`[INFO] ${new Date().toISOString()} - ${message}`, context);
            },
            error: (message, error, context = {}) => {
                console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, {
                    error: error.message,
                    stack: error.stack,
                    ...context
                });
            },
            debug: (message, context = {}) => {
                console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, context);
            }
        };
    }

    /**
     * @description Validates that the DRE type is "Automation"
     * @param {Array} dreRules Array of DRE rules to validate
     * @throws {Error} If DRE type is not "Automation"
     */
    validateDREType(dreRules) {
        for (const rule of dreRules) {
            if (rule.DRE__Type__c !== "Automation") {
                throw new Error(`Currently, "${rule.DRE__Type__c}" rule type is not supported. Only Automation type is supported.`);
            }
        }
    }

    /**
     * @description Filters out inactive DRE filters while preserving all other data
     * @param {Array} dreRules Array of DRE rules to filter
     * @returns {Array} Complete array of DRE rules with only active filters
     */
    filterInactiveRecords(dreRules) {
        return dreRules.map(rule => {
            // Create a deep copy of the rule
            const processedRule = JSON.parse(JSON.stringify(rule));
            
            // Only filter the DRE__DRE_Filters__r records if they exist
            if (processedRule.DRE__DRE_Filters__r && 
                Array.isArray(processedRule.DRE__DRE_Filters__r.records)) {
                processedRule.DRE__DRE_Filters__r = {
                    ...processedRule.DRE__DRE_Filters__r,
                    records: processedRule.DRE__DRE_Filters__r.records.filter(record => 
                        record.DRE__IsActive__c === true
                    )
                };
            }
            
            return processedRule;
        });
    }

    /**
     * @description Combines validation and filtering into a single operation
     * @param {Array} dreRules Array of DRE rules to process
     * @returns {string} JSON string of validated and filtered DRE rules
     * @throws {Error} If validation fails or processing encounters an error
     */
    validateAndProcessRules(dreRules) {
        try {
            this.logger.debug('Starting DRE rules validation and processing');
            
            // Validate the DRE type
            this.validateDREType(dreRules);
            
            // Filter inactive records and return the result
            const processedRules = this.filterInactiveRecords(dreRules);
            
            this.logger.info('Successfully validated and processed DRE rules', {
                ruleCount: processedRules.length
            });

            // Use JSON.stringify with formatting for better console output
            console.log(JSON.stringify(processedRules, null, 2));
            
            return JSON.stringify(processedRules);
        } catch (error) {
            this.logger.error('Failed to validate and process DRE rules', error);
            throw error;
        }
    }
}

module.exports = DREValidationController;
