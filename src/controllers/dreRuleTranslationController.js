const fs = require('fs').promises;
const path = require('path');
const liteLLM = require('../config/litellm');
const config = require('../config/config');

async function extractDreValuesFromJson(filename) {
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

async function genereateUserPromptForDreRule(){
    try {
        let data = await extractDreValuesFromJson('sampleFile.json');
        console.log('Extraction complete');
        // create user prompt with extracted data

       return formatPrompt(data);

    } catch (error) {
        console.error('Error while genereating user prompt:', error);
    }
}

function formatPrompt(extractedData){
  let formattedPrompt = '';
  if (extractedData) {
    formattedPrompt = `Event: ${extractedData.Event}
                       Object Name: ${extractedData.ObjectName}
                       Description: ${extractedData.Description}
                       Name: ${extractedData.Name}
                       Order: ${extractedData.Order}`;
    console.log(formattedPrompt);
    return formattedPrompt;
  } else {
    console.error ('Extracted DRE rule data is empty');
    return formattedPrompt;
  }
}

async function makeRequestWithUserPrompt(req, res){
    const response = await liteLLM.post('/chat/completions', {
        model: config.litellm.model,
        messages: [
            { role: "system", content: "You are a helpful assitant" },
            { role: "user", content: await genereateUserPromptForDreRule() }
        ]
    });
    res.json({ 
        success: true, 
        response: response.data.choices[0].message.content 
    });
}

module.exports = {makeRequestWithUserPrompt, genereateUserPromptForDreRule};