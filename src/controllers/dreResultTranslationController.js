const liteLLM = require('../config/litellm');
const config = require('../config/config');
const fs = require('fs').promises;
const path = require('path');
const Logger = require('../helpers/Logger');

/**
 * @class DREResultTranslationController
 * @description Controller responsible for translating DRE Result Groups and Results into Salesforce Flow nodes
 */
class DREResultTranslationController {
    constructor() {
        this.logger = new Logger('DREResultTranslationController');
    }

    /**
     * @description Translates a specific DRE rule and its result groups into flow nodes
     * @param {Object} dreRule - The DRE rule object containing result groups and results
     * @param {string} flowDefinitionPath - Path to the flow definition file
     * @returns {Promise<string>} Generated flow nodes
     * @throws {Error} If translation process fails
     */
    async translateRuleToFlowNodes(dreRule, flowDefinitionPath) {
        this.logger.info('Starting DRE rule translation process', { ruleName: dreRule.Name });
        try {
            const resultGroups = (dreRule.DRE__DRE_Result_Groups__r?.records || []).map(group => ({
                Id: group.Id,
                Name: group.Name,
                DRE__Description__c: group.DRE__Description__c,
                results: dreRule.DRE__DRE_Results__r?.records.filter(r =>
                    r.DRE__DRE_Group__c === group.Id && r.DRE__IsActive__c === true
                ) || []
            }));

            this.logger.debug('Result groups extracted from rule', {
                groupCount: resultGroups.length,
                totalResults: resultGroups.reduce((acc, group) => acc + group.results.length, 0)
            });

            const translatedGroups = await this._translateDREGroups(resultGroups);
            this.logger.debug('Groups translated', { translatedCount: translatedGroups.length });

            const flowNodes = await this._generateFlowNodes(translatedGroups, flowDefinitionPath);
            this.logger.debug('Flow nodes generated', { nodesLength: flowNodes.length });

            return flowNodes;
        } catch (error) {
            this.logger.error('Rule translation process failed', error, {
                ruleName: dreRule.Name
            });
            throw error;
        }
    }

    /**
     * @description Translates DRE result groups and their associated results into flow node prompts
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
    async translateResultsToFlowNodes(req, res) {
        this.logger.info('Starting DRE results translation process');
        try {
            this.logger.debug('Reading DRE rules file');
            const rulesPath = path.join(__dirname, '../../DRERules.json');
            const dreRules = JSON.parse(await fs.readFile(rulesPath, 'utf8'));

            if (!dreRules || dreRules.length === 0) {
                throw new Error('No DRE rules found in the file');
            }

            const firstRule = dreRules[0];
            const flowMetaPath = path.join(__dirname, '../../', config.flowMeta.path);

            const flowNodes = await this.translateRuleToFlowNodes(firstRule, flowMetaPath);

            this.logger.info('Translation process completed successfully');
            res.json({
                success: true,
                flowNodes: flowNodes
            });
        } catch (error) {
            this.logger.error('Translation process failed', error, {
                endpoint: 'translateResultsToFlowNodes'
            });
            res.status(500).json({
                success: false,
                error: 'Failed to translate DRE results to flow nodes',
                details: error.message
            });
        }
    }

    /**
     * @private
     * @description Translates DRE groups into human-readable record operations
     * @param {Array} resultGroups - Array of result groups with their results
     * @returns {Promise<Array>} Translated groups with operation descriptions
     * @throws {Error} If LLM API call fails
     */
    async _translateDREGroups(resultGroups) {
        this.logger.debug('Starting DRE groups translation', { groupCount: resultGroups.length });

        const prompt = {
            role: "system",
            content: "You are a Salesforce data operations expert. Analyze these DRE Result Groups and translate them into clear, human-readable descriptions of record updates and creations. For each group:\n" +
                "1. Identify the objects being modified\n" +
                "2. Specify the parent objects and path to the lookup relationship if this is updating related object\n" +
                "3. Specify if it's a creation or update operation\n" +
                "4. List the specific fields being modified\n" +
                "5. Explain the business logic behind each operation\n" +
                "Format the response as structured JSON with 'operationType', 'objects', 'fields', and 'businessLogic' properties." +
                "Return a JSON array of the translated groups." +
                "Order the groups in the same sequence as Result Group order ."
        };

        try {
            this.logger.debug('Making LiteLLM API call for translation');
            const response = await liteLLM.post('/chat/completions', {
                model: config.litellm.model,
                messages: [
                    prompt,
                    {
                        role: "user",
                        content: JSON.stringify(resultGroups, null, 2)
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

            const translatedGroups = translatedContent?.groups || [];

            this.logger.debug('Groups translation completed', {
                translatedCount: translatedGroups.length
            });

            return translatedGroups;
        } catch (error) {
            this.logger.error('Failed to translate DRE groups', error, {
                model: config.litellm.model,
                groupCount: resultGroups.length
            });
            throw error;
        }
    }

    /**
     * @private
     * @description Generates flow nodes using LLM based on translated result groups
     * @param {Array} translatedGroups - Array of translated result groups with their results
     * @param {string} flowDefinitionPath - Path to the flow definition file
     * @returns {Promise<string>} Generated flow nodes instructions
     * @throws {Error} If LLM API call fails
     */
    async _generateFlowNodes(translatedGroups, flowDefinitionPath) {
        this.logger.debug('Reading Flow metadata file', { path: flowDefinitionPath });

        const prompt = {
            role: "system",
            content: `You are a Salesforce Flow expert specializing in generating deployable Flow metadata XML. Create a complete Flow metadata file that implements the specified record operations following these requirements:

1. XML Structure:
- Use API version 62.0
- Include proper XML header and Flow metadata tags
- Set processType to AutoLaunchedFlow
- Set status to Active
- Use SystemModeWithSharing for runInMode

2. Required Flow Components:
- Record Create/Update nodes with proper field mappings
- Proper node positioning using locationX/Y coordinates
- Clear connector references between nodes

3. Best Practices:
- Use unique, descriptive names for all elements
- Include clear labels and descriptions
- Implement proper error handling
- Follow the node positioning guidelines (start X=176, increment Y by 120)
- Include defaultConnectorLabel for all decision elements

4. Record Create Flow Requirements:
- Follow the pattern from given flow metadata definition
- Append Record Create or Update nodes for each group and append to flow metadata definition to correct location
- Implement proper record create/update logic

5. Validation:
- Validate all xml nodes against Salesforce Flow metadata specifications
- Remove any unsupported nodes or attributes
- Validate the flow "processType" and flow elements, "AutoLaunchedFlow" should not include any screens or choices

Format the response as a complete Flow metadata XML file. Only return the Flow metadata xml content. The return xml should be ready to deploy to Salesforce.`
        };

        try {
            this.logger.debug('Making LiteLLM API call for flow nodes generation');
            const response = await liteLLM.post('/chat/completions', {
                model: config.litellm.model,
                messages: [
                    prompt,
                    {
                        role: "user",
                        content: JSON.stringify(translatedGroups, null, 2)
                    },
                    {
                        role: "user",
                        content: await fs.readFile(flowDefinitionPath, 'utf8')
                    }
                ]
            });

            this.logger.debug('Flow nodes generation completed', {
                status: response.status,
                responseLength: response.data.choices[0].message.content.length
            });

            await fs.writeFile(flowDefinitionPath, response.data.choices[0].message.content, 'utf8');

            return response.data.choices[0].message.content;
        } catch (error) {
            this.logger.error('Failed to generate flow nodes', error, {
                model: config.litellm.model,
                translatedGroupCount: translatedGroups.length
            });
            throw error;
        }
    }
}

module.exports = DREResultTranslationController;
