const fs = require('fs').promises;
const path = require('path');
const liteLLM = require('../config/litellm');
const config = require('../config/config');

class DreRuleTranslationController {
  constructor() {
    // Initialize logger
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

  async translateDreRuleToFlow(req, res) {
    let dreRuleCriteria = await this.extractDreRuleFromJson('sampleFile.json');
    console.log('Extraction complete: ' + JSON.stringify(dreRuleCriteria));
    await this.generateFlow(dreRuleCriteria, res);
  }
  
  async extractDreRuleFromJson(filename) {
    try {
      // Construct the full path to the JSON file
      const filePath = path.join(__dirname, filename);
  
      // Read the JSON file
      const jsonData = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(jsonData);
  
      // Extract the specified keys
      const extractedData = data.map(item => ({
        ObjectName: item.DRE__Object_Name__c,
        Event: item.DRE__Event__c,
        Name: item.Name,
        Description: item.DRE__Description__c,
        Order: item.DRE__Order__c
      }));
  
      console.log('Extracted data:', JSON.stringify(extractedData, null, 2));
      return extractedData;
    } catch (error) {
      console.error('Error processing JSON file:', error);
      throw error;
    }
  }
  
  async generateFlow(dreRuleCriteria, res) {
    const flowMetaPath = path.join(__dirname, '../../', config.flowMeta.path);
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
  
                Format the response as a complete Flow metadata XML file. Only return the Flow metadata xml content. The return xml should be ready to deploy to Salesforce.`
    }
  
    const response = await liteLLM.post('/chat/completions', {
          model: config.litellm.model,
          messages: [
            prompt,
            {
                role: "user",
                content: JSON.stringify(dreRuleCriteria)
            },
            {
                role: "user",
                content: await fs.readFile(flowMetaPath, 'utf8')
            }
          ]
      });
      res.json({ 
          success: true, 
          response: response.data.choices[0].message.content 
      });
  }
}

module.exports = DreRuleTranslationController
