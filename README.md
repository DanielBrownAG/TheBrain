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
- Stop generation, retry the latest prompt, and copy answers

### Response controls

- **Stop generating** cancels the active request during triage, collaboration, or answer streaming. Text already displayed stays visible and can be copied. Incomplete turns are not saved.
- **Retry** resends the latest attempt with its original prompt, region, and collaboration setting, even if you have since edited the form. For a completed answer, it regenerates the latest turn using the preceding conversation context and replaces that answer only after success. Its previous feedback and perspectives are replaced too. A failed or cancelled regeneration keeps the saved answer intact. Switching or clearing conversations resets the controls to that conversation's latest answer.
- **Copy answer** copies the latest displayed text, including partial output. Saved answers also have individual copy buttons. If the browser denies clipboard access, a message explains how to copy manually.

Retry uses the normal model calls and API usage for the chosen mode. In API requests, include `retryOf` with the latest saved answer's `requestId`, its original `prompt`, and `sessionId` to regenerate that turn. A stale answer ID returns HTTP 409, and changing the original prompt returns HTTP 400. Failed attempts without a saved answer can be resubmitted normally.

### Conversation history

The web interface creates conversations and lets you switch, clear, or delete them. Conversations survive browser refreshes and server restarts. Both triage and the answering region receive the last 10 completed turns from the selected conversation. Failed or cancelled turns are not saved, and concurrent writes to the same conversation return HTTP 409.

History is stored as local JSON files in `data/sessions/` (excluded from Git). Set `BRAIN_DATA_DIR` to move the data directory. Each conversation retains up to 50 completed turns; older turns are discarded. The browser stores conversation IDs and titles in local storage. Clearing removes a conversation's messages; deleting removes its server file and browser entry.

- `POST /sessions`: create a conversation; returns its `id` and empty `messages` (HTTP 201).
- `GET /sessions/:id`: retrieve a conversation and its saved messages.
- `DELETE /sessions/:id/messages`: clear its history.
- `DELETE /sessions/:id`: delete it (HTTP 204).
- Include `sessionId` in `/brainprompt` requests to use and save conversation context. Omit it for stateless requests.

Conversation IDs act as access tokens: anyone who has an ID can read or delete that conversation. This is a local, single-user app, without account authentication. Multiple server processes sharing a data directory are not supported. The app continues to send `store: false` to the model provider; local history is managed by this application. See [OpenAI conversation state guidance](https://developers.openai.com/api/docs/guides/conversation-state).

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

### Collaboration between regions

Enable **Collaborate across 2–3 regions** in the UI, or send `"collaborate": true` to `/brainprompt`. Triage selects two or three distinct complementary regions, each drafts a perspective, and the Cortex combines them into one answer. The final synthesis streams to the browser; expandable perspectives show each region's contribution and are saved with the conversation.

Collaboration uses 4–5 model calls per prompt (triage, 2–3 perspectives, synthesis), compared with 2 in ordinary mode. It is off by default. It increases latency and token usage. Cancellation stops further work; failure in any stage produces an error and does not save the turn.

Collaborative responses add `selectedRegions` (primary region first) and `contributions` (`region`, `text` pairs). The original `selectedRegion` field remains the primary region. Streaming adds `contributor` (work starting) and `contribution` (completed perspective) events before the final answer's `delta` events. Triage rejects duplicate, unknown, or excessive regions.

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

### Routing controls and feedback

The **Answering region** dropdown lets you choose a region instead of automatic routing. In the API, pass `"region": "Cortex"` (or another exact region identifier) to `/brainprompt`. Single-region overrides skip triage and use one model call. With collaboration enabled, the chosen region must be the primary contributor; triage still chooses its partners. Responses identify overrides with `"triagedBy": "UserOverride"`.

Saved answers show their regions and a **Wrong region** button. Choose a corrected region and optionally explain why. Feedback is saved on the answer and can be updated; it does not automatically change routing or train a model. Clear/delete conversation controls also remove its feedback. Older saved answers without request IDs still display but cannot receive feedback.

Session-backed responses include a `requestId`. Submit feedback using `PUT /sessions/:id/feedback/:requestId`:

```json
{ "expectedRegion": "TemporalLobe", "note": "The question was about interpreting language." }
```

The corrected region must differ from the answer's primary region, and notes are limited to 1,000 characters. Feedback for unknown conversations or answers returns HTTP 404; feedback while a conversation is generating returns HTTP 409.

### Routing evaluation

The dataset in `eval/routing-cases.json` contains 15 examples covering all 14 regions and a contextual follow-up. Some examples accept multiple reasonable regions. Run:

```bash
npm run eval:routing
npm run eval:routing -- --output data/evaluations/baseline.json
npm run eval:routing -- --include-feedback --baseline data/evaluations/baseline.json --output data/evaluations/current.json
```

**These commands call the configured model and incur API usage:** one triage call per case, with no answer generation. `--include-feedback` adds corrections from local conversations and sends the associated prompt and recent context to the provider. Without it, only the built-in examples are used. Reports default to `data/evaluations/latest.json` and contain accuracy, per-case results, errors, and model information. Exit status is 1 if any case fails. A baseline comparison measures accuracy changes only on matching case IDs and expected regions. Keep baseline reports to compare changes to the routing prompt or model. Small evaluation sets indicate regressions; they do not establish general routing quality.

## Project Structure

```
BasicBrainAI/
├── brain.js          # Main application file with all brain regions and routes
├── ai-client.js      # Model/provider configuration and generation
├── session-store.js  # Local conversation storage
├── eval/             # Routing dataset and evaluation command
├── test/             # Local tests (no paid API calls)
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
