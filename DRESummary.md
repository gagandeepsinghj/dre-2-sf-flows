# Dynamic Rule Engine (DRE) Overview

## Core Components

### 1. DRE Rule (`DRE__DRE_Rule__c`)
The primary configuration object that defines rule execution parameters:
- **Type**: Automation, Validation, Display, or Batch rules
- **Event**: Trigger timing (e.g., "Created, Updated, Deleted")
- **Object Name**: Target Salesforce object (SObject API Name)
- **Configuration**:
  - IsActive: Rule activation status

### 2. DRE Filter Group (`DRE__DRE_Filter_Group__c`)
Organizes related filters for complex condition evaluation:
- **Object Context**: 
  - Object Name: Target filtering object
  - Object Path: Relationship traversal path
- **Evaluation**:
  - Condition: Filter evaluation method (e.g., "Exists")
  - Object Relationship: Relationship type (e.g., "Lookup", "Record")

### 3. DRE Filter (`DRE__DRE_Filter__c`)
Individual rule conditions:
- **Components**:
  - Field: Evaluation field
  - Operator: Comparison type (e.g., "=", "!=", "CHANGED TO")
  - Value: Comparison value
  - Order: Processing sequence to be evaluated within a Filter Group

### 4. DRE Result Group (`DRE__DRE_Result_Group__c`)
Action definitions when conditions are met:
- **Configuration**:
  - Action Type: Operation type (e.g., "UpdateRecord")
  - Object Name: Target action object
  - Object Path: Target object path
  - Object Relationship: Source-target relationship

### 5. DRE Result (`DRE__DRE_Result__c`)
Specific action implementations:
- **Details**:
  - Field: Target update field
  - Value: New field value
  - Order: Action sequence
  - Check Duplicate: Duplicate verification flag


The DRE provides a configuration-based approach to implement complex business logic without custom code development, enabling dynamic rule management through configuration.
