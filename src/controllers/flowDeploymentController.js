const jsforce = require('jsforce');
const AdmZip = require('adm-zip');
const Logger = require('../helpers/Logger');

/**
 * @class FlowDeploymentController
 * @description Controller responsible for deploying Flow metadata to Salesforce org using Metadata API
 */
class FlowDeploymentController {
    constructor() {
        this.logger = new Logger('FlowDeploymentController');
    }

    /**
     * @description Deploys a Flow metadata file to Salesforce org using Metadata API
     * @param {Object} req - Express request object with filename and flowContent
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
    async deployFlow(req, res) {
        this.logger.info('Starting Flow deployment process');
        try {
            // Validate request payload
            if (!req.body || !req.body.filename || !req.body.flowContent) {
                throw new Error('Request must include filename and flowContent');
            }

            const { filename, flowContent } = req.body;

            // Validate filename format
            if (!filename.endsWith('.flow-meta.xml')) {
                throw new Error('Invalid filename format. Must end with .flow-meta.xml');
            }
            // Connect to Salesforce
            const conn = await this._getSalesforceConnection();
            this.logger.debug('Connected to Salesforce successfully');

            // Get flow API name from filename
            const flowApiName = filename.replace('.flow-meta.xml', '');
            this.logger.debug('Flow API name extracted', { flowApiName });

            // Create deployment zip
            const zipBuffer = await this._createDeploymentZip(flowContent, flowApiName);
            this.logger.debug('Deployment zip created successfully');

            // Deploy the flow using Metadata API
            const deploymentResult = await this._deployFlowToOrg(conn, zipBuffer);
            this.logger.debug('Flow deployment completed', { result: deploymentResult });

            this.logger.info('Flow deployment process completed successfully');
            res.json({
                success: true,
                message: 'Flow deployed successfully',
                flowApiName,
                deploymentResult
            });
        } catch (error) {
            this.logger.error('Flow deployment process failed', error, {
                endpoint: 'deployFlow'
            });
            res.status(500).json({
                success: false,
                error: 'Failed to deploy Flow',
                details: error.message
            });
        }
    }

    /**
     * @private
     * @description Creates a zip file containing the metadata for deployment
     * @param {string} flowMetadata - Flow metadata XML content
     * @param {string} flowApiName - Flow API name
     * @returns {Promise<Buffer>} Zip file buffer
     */
    async _createDeploymentZip(flowMetadata, flowApiName) {
        const zip = new AdmZip();

        // Add package.xml
        const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>*</members>
        <name>Flow</name>
    </types>
    <version>62.0</version>
</Package>`;
        zip.addFile('package.xml', Buffer.from(packageXml, 'utf8'));

        // Add flow metadata file
        zip.addFile(`flows/${flowApiName}.flow-meta.xml`, Buffer.from(flowMetadata, 'utf8'));

        // Get zip buffer
        return zip.toBuffer();
    }

    /**
     * @private
     * @description Establishes connection to Salesforce
     * @returns {Promise<Connection>} JSForce connection object
     */
    async _getSalesforceConnection() {
        try {
            const conn = new jsforce.Connection({
                loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com'
            });

            await conn.login(
                process.env.SF_USERNAME,
                process.env.SF_PASSWORD + process.env.SF_SECURITY_TOKEN
            );

            return conn;
        } catch (error) {
            this.logger.error('Failed to connect to Salesforce', error);
            throw new Error(`Salesforce connection failed: ${error.message}`);
        }
    }

    /**
     * @private
     * @description Deploys Flow metadata to Salesforce org using Metadata API
     * @param {Connection} conn - JSForce connection object
     * @param {Buffer} zipBuffer - Zip file buffer containing metadata
     * @returns {Promise<Object>} Deployment result
     */
    async _deployFlowToOrg(conn, zipBuffer) {
        try {
            // Deploy using Metadata API
            const result = await new Promise((resolve, reject) => {
                conn.metadata.deploy(zipBuffer, {
                    singlePackage: true,
                    rollbackOnError: true,
                    checkOnly: false
                })
                    .complete(true) // Wait for deployment to complete
                    .then(deployResult => {
                        if (!deployResult.success) {
                            const errors = deployResult.details?.componentFailures || [];
                            const errorMessages = errors.map(e => e.problem || e.message).join(', ');
                            reject(new Error(`Deployment failed: ${errorMessages}`));
                        } else {
                            resolve(deployResult);
                        }
                    })
                    .catch(error => {
                        reject(new Error(`Deployment error: ${error.message}`));
                    });
            });

            return result;
        } catch (error) {
            this.logger.error('Failed to deploy Flow to Salesforce', error);
            throw new Error(`Flow deployment failed: ${error.message}`);
        }
    }
}

module.exports = FlowDeploymentController;