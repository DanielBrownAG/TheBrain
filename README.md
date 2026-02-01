# 🧠 BasicBrainAI

An AI application that routes user prompts to specialized "brain regions," each with distinct personalities and expertise. Think of it as a multi-specialized AI system inspired by human brain anatomy.

## Description

BasicBrainAI uses Azure OpenAI to intelligently triage user prompts to the most appropriate brain region for handling. Each region is equipped with specialized instructions that shape how it responds to queries.

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

- Node.js >= 14.0.0
- An Azure OpenAI instance with API credentials

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Azure OpenAI credentials:
   ```
   AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
   AZURE_OPENAI_KEY=<your-api-key>
   AZURE_DEPLOYMENT_ID=<your-deployment-id>
   PORT=3000
   ```

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
- **@azure/openai** - Azure OpenAI SDK

## Development

For development with automatic server restart on file changes:
```bash
npm run dev
```

This uses `nodemon` to watch for file changes and automatically restart the server.

## Features

✨ **Multi-Specialized AI** - 14 distinct brain regions with unique personalities
🧠 **Intelligent Routing** - Prefrontal Cortex triage system
🎨 **Creative & Analytical** - Balances both left and right hemisphere thinking
📚 **Memory & Context** - Specialized memory and historical recall
🛡️ **Emotional Intelligence** - Limbic system for emotional understanding
⚡ **Instant Responses** - Fast Azure OpenAI integration

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
