const fs = require('fs').promises;
const path = require('path');
const liteLLM = require('../config/litellm');
const config = require('../config/config');
const Logger = require('../helpers/Logger');

class DreRuleTranslationController {
  constructor() {
    this.logger = new Logger('DreRuleTranslationController');
  }

  async translateDreRuleToFlow(req, res) {
    this.logger.info('Starting DRE rule translation to flow');
    // Extract the DRE rule criteria from the request JSON get the first Object if there are multiple
    let dreRule = req.body[0];
    this.logger.debug('DRE rule extracted', { dreRule });
    // Validate the DRE rule to be a json object
    if (!dreRule || typeof dreRule !== 'object') {
      this.logger.error('Invalid DRE rule provided');
      return res.status(400).json({
        success: false,
        error: 'Invalid DRE rule provided'
      });
    }
  }

  async buildRuleCriteria(DREJson) {
    try {
      this.logger.info('Extracting DRE rule from JSON');
      if (!DREJson || typeof DREJson !== 'object') {
        throw new Error('Invalid JSON provided');
      }

      const prompt = {
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
      };

      this.logger.debug('Sending request to LiteLLM', { model: config.litellm.model });
      const response = await liteLLM.post('/chat/completions', {
        model: config.litellm.model,
        messages: [
          prompt,
          {
            role: "user",
            content: JSON.stringify(DREJson)
          }
        ]
      });

      const dreRuleCriteria = JSON.parse(response.data.choices[0].message.content);
      this.logger.info('DRE rule extracted successfully', { dreRuleCriteria });
      return dreRuleCriteria;
    } catch (error) {
      this.logger.error('Error processing JSON', error);
      throw error;
    }
  }

  async generateFlow(dreRuleCriteria) {
    try {
      this.logger.info('Starting flow generation', { dreRuleCriteria });
      const prompt = {
        role: "system",
        content: "You are a Salesforce Flow expert. Generate a Flow metadata file following these requirements:\n" +
          "1. Create valid XML for a Record-Triggered Flow\n" +
          "2. Use API version 62.0\n" +
          "3. Set processType to AutoLaunchedFlow\n" +
          "4. Set status to Active\n" +
          "5. Use SystemModeWithSharing for runInMode\n\n" +
          "IMPORTANT: Return ONLY a JSON object in this exact format:\n" +
          '{"fileName": "name_of_flow.flow-meta.xml", "content": "your_xml_content_here"}\n\n' +
          "Notes:\n" +
          "- Escape all special characters in the XML content\n" +
          "- Do not use backticks or template literals\n" +
          "- Ensure the response is valid JSON\n" +
          "- Use double quotes for JSON properties\n" +
          "- Replace all newlines in XML with \\n"
      };

      this.logger.debug('Sending request to LiteLLM', { model: config.litellm.model });
      const response = await liteLLM.post('/chat/completions', {
        model: config.litellm.model,
        messages: [
          prompt,
          {
            role: "user",
            content: JSON.stringify(dreRuleCriteria)
          }
        ]
      });

      let responseContent = response.data.choices[0].message.content.trim();

      // Clean up the response content
      responseContent = responseContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
      responseContent = responseContent.replace(/\n/g, '\\n'); // Properly escape newlines
      responseContent = responseContent.replace(/\r/g, '\\r'); // Properly escape carriage returns
      responseContent = responseContent.replace(/\t/g, '\\t'); // Properly escape tabs

      // Attempt to parse the cleaned response
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

      // Validate the required fields
      if (!flowInfo.fileName || typeof flowInfo.fileName !== 'string') {
        throw new Error('Invalid flow info: missing or invalid fileName');
      }
      if (!flowInfo.content || typeof flowInfo.content !== 'string') {
        throw new Error('Invalid flow info: missing or invalid content');
      }

      // Unescape newlines in the content for file writing
      flowInfo.content = flowInfo.content.replace(/\\n/g, '\n');

      this.logger.info('Flow generation completed successfully');
      return flowInfo;
    } catch (error) {
      this.logger.error('Error generating flow', error);
      throw error;
    }
  }

  async generateFlowMetadata(dreRuleJson) {
    try {
      this.logger.info('Starting flow metadata generation from DRE Rule JSON');

      if (!dreRuleJson || typeof dreRuleJson !== 'object') {
        throw new Error('Invalid DRE Rule JSON provided');
      }

      const ruleCriteria = await this.buildRuleCriteria(dreRuleJson);
      this.logger.debug('Rule Criteria extracted', { ruleCriteria });

      const flowInfo = await this.generateFlow(ruleCriteria);
      this.logger.debug('Flow metadata generated', { flowInfo });

      const fileName = flowInfo.fileName || 'generated_flow.flow-meta.xml';
      const flowContent = flowInfo.content;

      const flowsDir = path.join(process.cwd(), 'dre-2-sf-flows/flows');
      await fs.mkdir(flowsDir, { recursive: true });

      const flowMetaPath = path.join(flowsDir, fileName);
      await fs.writeFile(flowMetaPath, flowContent, 'utf8');

      this.logger.info('Flow metadata generated successfully', { path: flowMetaPath });
      return flowMetaPath;

    } catch (error) {
      this.logger.error('Error generating flow metadata', error);
      throw new Error(`Failed to generate flow metadata: ${error.message}`);
    }
  }
}

module.exports = DreRuleTranslationController;
