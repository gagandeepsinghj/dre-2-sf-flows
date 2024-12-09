# DRE to Salesforce Flow Converter

A service that converts DRE (Decision Rule Engine) Rules to Salesforce Flows using AI.

## 🚀 Live Demo

Access the production application at: [https://dre-2-sf-flows.onrender.com/](https://dre-2-sf-flows.onrender.com/)

## 🛠️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/gagandeepsinghj/dre-2-sf-flows.git
   cd dre-2-sf-flows
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment:
   - Generate a new API key from the LiteLLM dashboard
   - Update the `.env` file with your API key and other configurations:
     ```
     LITELLM_API_KEY=your-key-goes-here
     LITELLM_API_BASE=https://ai-gw.corp.claritisoftware.net
     LITELLM_MODEL=gpt-4
     ```

## 🚀 Running the Application

### Development Mode
Start the development server with hot-reload: `npm run dev`
