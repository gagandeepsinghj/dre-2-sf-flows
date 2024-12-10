/**
 * @class Logger
 * @description A reusable logger class that provides consistent logging functionality across the application
 */
class Logger {
    /**
     * @description Creates a new logger instance
     * @param {string} context - The context (e.g., class name) where the logger is being used
     */
    constructor(context) {
        this.context = context;
    }

    /**
     * @description Formats a log message with timestamp and context
     * @private
     * @param {string} level - Log level (INFO, ERROR, DEBUG)
     * @param {string} message - The message to log
     * @param {Object} additionalContext - Additional context to include in the log
     * @returns {string} Formatted log message
     */
    _formatMessage(level, message, additionalContext = {}) {
        const timestamp = new Date().toISOString();
        return `[${level}] ${timestamp} [${this.context}] - ${message}`;
    }

    /**
     * @description Logs an info message
     * @param {string} message - The message to log
     * @param {Object} context - Additional context to include in the log
     */
    info(message, context = {}) {
        console.log(this._formatMessage('INFO', message), context);
    }

    /**
     * @description Logs an error message
     * @param {string} message - The error message
     * @param {Error} error - The error object
     * @param {Object} context - Additional context to include in the log
     */
    error(message, error, context = {}) {
        console.error(this._formatMessage('ERROR', message), {
            error: error.message,
            stack: error.stack,
            ...context
        });
    }

    /**
     * @description Logs a debug message
     * @param {string} message - The message to log
     * @param {Object} context - Additional context to include in the log
     */
    debug(message, context = {}) {
        console.debug(this._formatMessage('DEBUG', message), context);
    }
}

module.exports = Logger;
