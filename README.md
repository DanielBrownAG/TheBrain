# 🧠 BasicBrainAI

An AI application that routes user prompts to specialized "brain regions," each with distinct personalities and expertise. Think of it as a multi-specialized AI system inspired by human brain anatomy.

## Description

BasicBrainAI uses Azure OpenAI or the OpenAI API to intelligently triage user prompts to the most appropriate brain region for handling. Each region is equipped with specialized instructions that shape how it responds to queries. Responses stream into the web interface as they are generated.

## What It Does

1. **Accepts User Prompts** - Users submit queries through a web interface
2. **Intelligent Triaging** - A "Prefrontal Cortex" module analyzes the prompt and determines which brain region should handle it
3. **Specialized Responses** - The selected brain region responds with its unique perspective and expertise

## How It Works

### Brain Regions

The system includes 14 distinct brain regions, each with specialized capabilities:

- **Frontal Lobe** - Logic, reasoning, decision-making, and motor control
- **Parietal Lobe** - Sensory processing and spatial awareness
- **Temporal Lobe** - Hearing, language, emotion, and memory
- **Occipital Lobe** - Visual processing and pattern recognition
- **Limbic System** - Emotional context and memory recall
- **Cerebellum** - Coordination and step-by-step guidance
- **Brainstem** - Vital functions and survival instincts
- **Left Hemisphere** - Logical reasoning and analytical problem-solving
- **Right Hemisphere** - Creativity, music, and artistic thinking
- **Cortex** - General perception and conscious thought
- **Neocortex** - Higher-order cognition and abstract reasoning
- **Hippocampus** - Memory retrieval and narrative reconstruction
- **Amygdala** - Emotional intensity and reactivity
- **Basal Ganglia** - Routine behaviors and pattern recognition

### Architecture

```
User Prompt
    ↓
Prefrontal Cortex (Triage)
    ↓
Selected Brain Region
    ↓
Azure OpenAI API Call
    ↓
Specialized Response
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- An Azure OpenAI deployment supporting the Responses API, or an OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and enter your Azure OpenAI credentials:
   ```
   AI_PROVIDER=azure
   AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
   AZURE_OPENAI_KEY=<your-api-key>
   AZURE_DEPLOYMENT_ID=<your-deployment-id>
   PORT=3000
   ```

   The app uses Azure's `/openai/v1/` endpoint and passes `AZURE_DEPLOYMENT_ID` as the model. Existing Azure environment variable names still work; `AI_PROVIDER` is optional when an Azure endpoint is set.

   To use the OpenAI API instead:
   ```dotenv
   AI_PROVIDER=openai
   OPENAI_API_KEY=<your-api-key>
   OPENAI_MODEL=gpt-6-astra
   PORT=3000
   ```

   `OPENAI_MODEL` accepts exact model IDs, including GPT-6 variants and later models that support the Responses API, without a hardcoded allowlist. The OpenAI default is `gpt-6-astra`; Azure always requires an existing deployment name. Model and regional availability depend on your provider and account. `OPENAI_BASE_URL` optionally overrides the OpenAI API base URL.

### Running the Application

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start at `http://localhost:3000`

## Usage

### Web Interface

Visit `http://localhost:3000/brain` to access the interactive UI where you can:
- Enter your prompt
- Send it to the Brain AI system
- View which region triaged your request
- Read the specialized response
- Watch response text arrive incrementally after triage finishes

### API Endpoints

#### `POST /brainprompt`
Submit a prompt for processing

**Request:**
```json
{
  "prompt": "Can you help me design a music-based game?"
}
```

**Response:**
```json
{
  "triagedBy": "PrefrontalCortex",
  "selectedRegion": "TemporalLobe",
  "response": "🧠 [Temporal Lobe]: <response text>"
}
```

#### `GET /health`
Health check endpoint

**Response:**
```json
{
  "status": "Brain AI is running",
  "timestamp": "2026-02-01T10:30:00.000Z"
}
```

### Streaming API

Include `"stream": true` in `POST /brainprompt` to receive server-sent events instead of JSON. For example:

```bash
curl -N http://localhost:3000/brainprompt -H "Content-Type: application/json" -d '{"prompt":"Help me solve a math problem","stream":true}'
```

Events arrive in this order:

- `region`: `{ "triagedBy": "PrefrontalCortex", "selectedRegion": "FrontalLobe" }`
- `delta`: `{ "text": "..." }` for each response fragment (including the region prefix)
- `done`: the same complete object as the JSON response above

Failures after streaming starts emit an `error` event with an `error` message and close the stream without `done`. Comment heartbeats keep the connection alive during triage/reasoning. Disconnecting cancels upstream generation. Omitting `stream`, or setting it to `false`, retains the JSON contract. Invalid prompts or stream flags return HTTP 400; upstream failures in JSON mode return HTTP 502.

The implementation follows the [OpenAI Responses streaming guide](https://developers.openai.com/api/docs/guides/streaming-responses) and [Azure OpenAI v1 API guidance](https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle).

## Project Structure

```
BasicBrainAI/
├── brain.js          # Main application file with all brain regions and routes
├── package.json      # Dependencies and scripts
├── public/           # Static assets (if any)
└── README.md         # This file
```

## Dependencies

- **express** - Web framework
- **body-parser** - Request parsing middleware
- **dotenv** - Environment variable management
- **openai** - Responses API SDK for OpenAI and Azure OpenAI

## Development

For development with automatic server restart on file changes:
```bash
npm run dev
```

This uses `nodemon` to watch for file changes and automatically restart the server.

Run `npm test` for local integration tests covering JSON responses, incremental streaming, validation, upstream failures, and disconnect cancellation. Tests use a local API fixture and do not require credentials or incur API charges.

## Features

✨ **Multi-Specialized AI** - 14 distinct brain regions with unique personalities
🧠 **Intelligent Routing** - Prefrontal Cortex triage system
🎨 **Creative & Analytical** - Balances both left and right hemisphere thinking
📚 **Memory & Context** - Specialized memory and historical recall
🛡️ **Emotional Intelligence** - Limbic system for emotional understanding
⚡ **Streaming Responses** - Incremental output through the Responses API

## Example Prompts

Try these prompts to see different brain regions in action:

- "Help me solve this math problem" → Frontal Lobe / Left Hemisphere
- "Describe the painting I just saw" → Occipital Lobe / Right Hemisphere  
- "I'm feeling overwhelmed" → Limbic System / Amygdala
- "Help me remember yesterday's meeting" → Hippocampus
- "Teach me the steps to learn guitar" → Cerebellum / Temporal Lobe

## License

MIT

## Contributing

Feel free to extend the brain regions or add new specialized modules!
