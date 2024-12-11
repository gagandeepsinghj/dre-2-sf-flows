# Salesforce Flow Expert Guide

## Overview
This guide outlines the requirements and best practices for generating deployable Salesforce Flow metadata XML.

## Core Requirements

### 1. XML Structure
- API version 62.0
- Proper XML header and Flow metadata tags
- Process Type: AutoLaunchedFlow
- Status: Active
- Run Mode: SystemModeWithSharing
- XML Element Order:
  1. apiVersion
  2. environments
  3. interviewLabel
  4. label
  5. processMetadataValues
  6. processType
  7. recordCreates
  8. recordUpdates
  9. start
  10. status
  11. variables
  12. decisions
  13. assignments (only when necessary)
  14. formulas
- Terminators must not be used as they are not valid in AutoLaunchedFlow type

### 2. Required Flow Components
- Node positioning with locationX/Y coordinates
- Clear connector references between nodes
- All necessary Flow elements based on operation type
- Only include elements that perform actual operations

### 3. Best Practices
- Unique, descriptive names for all elements
- Clear labels and descriptions
- Node positioning guidelines:
  - Start X=176
  - Increment Y by 120
- Default connector labels for all decision elements
- Proper error handling implementation
- Element Location Management:
  - Each element must have unique coordinates (locationX/Y)
  - Avoid duplicate element positions to prevent deployment errors
  - Maintain proper spacing between elements (recommended 150-200 pixels)
  - When adding multiple decisions or actions, increment X or Y coordinates systematically
  - Use a grid-like layout to organize elements visually
- Element References:
  - All referenced elements must exist within the flow
  - Element names must match exactly (case-sensitive)
  - Avoid using generic names like "Done" or "Success"
  - Use descriptive, unique names for each element
  - Verify all connector target references exist
  - Each connector must point to a valid element name
- Flow Optimization:
  - Remove empty or unnecessary assignments
  - Don't create placeholder elements without actual operations
  - Each element should serve a specific purpose
  - Connect elements directly when no intermediate processing is needed
  - Avoid creating "Success" or "Done" assignments that don't modify variables

### 4. Validation Requirements
- XML nodes validated against Salesforce Flow metadata specifications
- No unsupported nodes or attributes
- Proper formula syntax for all conditions
- Flow "processType" and flow elements validation
- AutoLaunchedFlow must not include screens or choices
- Element Reference Validation:
  - All connector targetReference values must match existing element names
  - Element names must be unique within the flow
  - References must be case-sensitive exact matches
  - No dangling or invalid references allowed
  - All referenced elements must be defined before being referenced
- Assignment Validation:
  - Each assignment element MUST contain at least one assignmentItems element
  - assignmentItems must specify:
    - assignToReference (the field or variable to assign to)
    - operator (e.g., Assign, Add, Subtract)
    - value (the value to assign)
  - Remove assignments that don't modify variables or fields
  - Don't use assignments as flow markers or status indicators

### 5. Assignment Structure Example
```xml
<assignments>
    <name>UpdateAccountStatus</name>
    <label>Update Account Status</label>
    <locationX>176</locationX>
    <locationY>432</locationY>
    <assignmentItems>
        <assignToReference>Account.Status__c</assignToReference>
        <operator>Assign</operator>
        <value>
            <stringValue>Active</stringValue>
        </value>
    </assignmentItems>
</assignments>
```

## Use Cases

### 1. Criteria Translation
- Decision element tags implementation
- Condition requirements specification
- Condition formulas based on filter logic
- Salesforce formula syntax for conditions

### 2. Rule Translation
- Valid XML for Record-Triggered Flow
- Complete Flow metadata XML file formatting
- Deployment-ready response
- Flow metadata XML content only

### 3. Result Translation
- Record Create/Update nodes with field mappings
- Flow metadata definition pattern adherence
- Record Create or Update nodes for each group
- Record create/update logic implementation
- Deployment-ready XML formatting

## Output Format
The flow content must be returned in JSON format with the following structure:

```json
{
    "filename": "FlowName.flow-meta.xml",
    "flowContent": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<Flow xmlns=\"http://soap.sforce.com/2006/04/metadata\">\n    <!-- Flow content here -->\n</Flow>"
}
```

### Example Output
```json
{
    "filename": "AccountUpdateFlow.flow-meta.xml",
    "flowContent": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<Flow xmlns=\"http://soap.sforce.com/2006/04/metadata\">\n    <apiVersion>62.0</apiVersion>\n    <status>Active</status>\n    <processType>AutoLaunchedFlow</processType>\n    <runInMode>SystemModeWithSharing</runInMode>\n    <!-- Additional flow elements here -->\n</Flow>"
}
```

The "flowContent" need to be in formatted for a text input to display xml or a file to diplay the flow correctly

## Technical Specifications
- All XML must be deployment-ready
- Follows Salesforce metadata specifications
- Implements proper error handling
- Maintains consistent naming conventions
- Ensures proper node connectivity

### Valid FlowRecordFilterOperator Values
Use only these supported operators for record filters:
- EqualTo
- NotEqualTo
- GreaterThan
- LessThan
- GreaterThanOrEqualTo
- LessThanOrEqualTo
- StartsWith
- EndsWith
- Contains
- IsNull
