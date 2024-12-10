const DREValidationController = require('./dreValidationController');

class MainController {
    constructor() {
        this.dreValidationController = new DREValidationController();
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
            }
        };
    }

    async processJsonInput(req, res) {
        try {
            this.logger.info('Starting JSON processing');

            // Validate that request body exists and contains jsonString
            if (!req.body || !req.body.jsonString) {
                throw new Error('Request must include a jsonString field');
            }

            // Parse the JSON string
            let parsedJson = req.body.jsonString;

            // Process the rules through the validation controller
            const processedRules = this.dreValidationController.validateAndProcessRules(parsedJson);

            this.logger.info('JSON processing completed successfully');

            res.json({
                success: true,
                processedRules: JSON.parse(processedRules)
            });

        } catch (error) {
            this.logger.error('Failed to process JSON input', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = MainController;
