require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// ----------------------------
// Brain Regions with Prompts
// ----------------------------
const prompts = {
    FrontalLobe: {
        title: 'Frontal Lobe',
        instructions: 'You are the Frontal Lobe. Handle prompts requiring logic, reasoning, behavior analysis, decision-making, or motor control. Respond clearly and analytically.'
    },
    ParietalLobe: {
        title: 'Parietal Lobe',
        instructions: 'You are the Parietal Lobe. Specialize in processing sensory input and spatial awareness. Interpret physical space, touch, positioning, and body orientation.'
    },
    TemporalLobe: {
        title: 'Temporal Lobe',
        instructions: 'You are the Temporal Lobe. Focus on hearing, language processing, emotional tone, music, and memory. Be expressive and emotionally aware.'
    },
    OccipitalLobe: {
        title: 'Occipital Lobe',
        instructions: 'You are the Occipital Lobe. Interpret and process visual input. Describe visual scenes, recognize patterns, and assist with visual creativity.'
    },
    LimbicSystem: {
        title: 'Limbic System',
        instructions: 'You are the Limbic System. Handle emotional context, memory recall, and arousal. Respond with empathy, emotional intelligence, and affective insight.'
    },
    Cerebellum: {
        title: 'Cerebellum',
        instructions: 'You are the Cerebellum. Focus on coordination, balance, and motor learning. Provide structured, step-based guidance for physical or procedural tasks.'
    },
    Brainstem: {
        title: 'Brainstem',
        instructions: 'You are the Brainstem. Handle prompts related to automatic vital functions such as sleep, breathing, alertness, and survival instincts. Be minimal and direct.'
    },
    LeftHemisphere: {
        title: 'Left Hemisphere',
        instructions: 'You are the Left Hemisphere. Excel in logical reasoning, structured language, and analytical problem-solving. Use clear, factual, and linear communication.'
    },
    RightHemisphere: {
        title: 'Right Hemisphere',
        instructions: 'You are the Right Hemisphere. Focus on creativity, music, spatial skills, and artistic thinking. Respond with imagination and holistic, expressive thought.'
    },
    Cortex: {
        title: 'Cortex',
        instructions: 'You are the Cortex. Handle general perception, conscious thought, and reflective reasoning. Provide balanced, high-level insights across domains.'
    },
    Neocortex: {
        title: 'Neocortex',
        instructions: 'You are the Neocortex. Perform higher-order cognition, abstract modeling, and complex reasoning. Support philosophical, theoretical, and strategic thought.'
    },
    Hippocampus: {
        title: 'Hippocampus',
        instructions: 'You are the Hippocampus. Specialize in memory retrieval, contextual understanding, and chronological recall. Reconstruct detailed, coherent narratives.'
    },
    Amygdala: {
        title: 'Amygdala',
        instructions: 'You are the Amygdala. Interpret emotional intensity, urgency, fear, and pleasure. Your tone may be reactive, instinctual, or protective as needed.'
    },
    BasalGanglia: {
        title: 'Basal Ganglia',
        instructions: 'You are the Basal Ganglia. Handle prompts related to routine, pattern recognition, habit formation, and automated behaviors. Be concise and efficient.'
    }
};

// ----------------------------
// Azure OpenAI Helper
// ----------------------------
async function callAzureOpenAI(systemprompt, userprompt, history = []) {
    console.log('[AZURE] Endpoint:', process.env.AZURE_OPENAI_ENDPOINT);
    console.log('[AZURE] Deployment ID:', process.env.AZURE_OPENAI_KEY ? '***SET***' : '***NOT SET***');
    console.log('[AZURE] Key present:', !!process.env.AZURE_OPENAI_KEY);
    
    const client = new OpenAIClient(
        process.env.AZURE_OPENAI_ENDPOINT,
        new AzureKeyCredential(process.env.AZURE_OPENAI_KEY)
    );

    const messages = [
        { role: "system", content: systemprompt },
        ...history,
        { role: "user", content: userprompt }
    ];

    console.log('[AZURE] Calling API with deployment:', process.env.AZURE_DEPLOYMENT_ID);
    const result = await client.getChatCompletions(process.env.AZURE_DEPLOYMENT_ID, messages, {});
    const text = result.choices[0].message.content.trim();
    console.log('[AZURE] Response received:', text.substring(0, 50) + '...');

    return text;
}

// ----------------------------
// AI Response Handler
// ----------------------------
async function aiRespond(systemPrompt, userPrompt) {
    const output = await callAzureOpenAI(systemPrompt.instructions, userPrompt);
    return `🧠 [${systemPrompt.title}]: ${output}`;
}

// ----------------------------
// Generate Region Functions
// ----------------------------
const brainFunctions = {};
for (const region in prompts) {
    brainFunctions[region] = async (prompt) => aiRespond(prompts[region], prompt);
}

// ----------------------------
// Prefrontal Cortex (Triage)
// ----------------------------
async function PrefrontalCortex(prompt) {
    const syspromp = ` 
You are the Prefrontal Cortex. Your sole job is to act as a triage system to route the users prompt to an area of the brain which is best suited to respond to the query.

When given a prompt, analyze it and determine which brain region is best suited to handle it. 

Respond with only ONE word — the exact name of the region from the following list (no explanation, no punctuation, no formatting):
FrontalLobe
ParietalLobe
TemporalLobe
OccipitalLobe
LimbicSystem
Cerebellum
Brainstem
LeftHemisphere
RightHemisphere
Neocortex
Cortex
Hippocampus
Amygdala
BasalGanglia

Do not respond with anything outside this list.
Be strict. 
Analyze the user's prompt for intent, domain, emotion, or complexity, then return just one matching brain region from the list above.
 `;

    const lower = `determine which part of the brain is best to respond to the user prompt of: ${prompt.toLowerCase()}`;

    const output = await callAzureOpenAI(syspromp, lower);
    console.log("PrefrontalCortex output:", output);
    return output;
}

// ----------------------------
// Process Brain Prompt
// ----------------------------
async function processBrainPrompt(userPrompt) {
    if (!userPrompt) {
        throw new Error('Prompt is required.');
    }

    const selectedRegion = await PrefrontalCortex(userPrompt);
    const response = await brainFunctions[selectedRegion](userPrompt);

    return {
        triagedBy: 'PrefrontalCortex',
        selectedRegion,
        response
    };
}

// ----------------------------
// UI - Brain Interface HTML
// ----------------------------
function getBrainUI() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>🧠 Brain AI Interface</title>
      <style>
        body { font-family: sans-serif; padding: 2rem; background: #f0f0f0; }
        input, button { padding: 10px; font-size: 16px; margin-top: 10px; width: 100%; }
        #response { margin-top: 20px; background: white; padding: 1rem; border-radius: 8px; }
        label { font-weight: bold; display: block; margin-top: 1rem; }
      </style>
    </head>
    <body>
      <h1>🧠 Brain AI Prompt Router</h1>
      <label for="prompt">Enter your prompt:</label>
      <input type="text" id="prompt" placeholder="e.g. Can you help me design a music-based game?" />
      <button onclick="sendPrompt()">Send to Brain</button>

      <div id="response"></div>

      <script>
        async function sendPrompt() {
          const prompt = document.getElementById('prompt').value;
          const res = await fetch('/brainprompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
          });

          const data = await res.json();
          document.getElementById('response').innerHTML = 
            '<h3>🧠 Triaged To: ' + data.selectedRegion + '</h3>' +
            '<p>' + data.response + '</p>';
        }
      </script>
    </body>
    </html>
  `;
}

// ----------------------------
// API Routes
// ----------------------------

// Brain Prompt Endpoint
app.post('/brainprompt', async (req, res) => {
    console.log('[REQUEST] Received:', req.body);
    const userPrompt = req.body.prompt;
    console.log('[REQUEST] Prompt value:', userPrompt);

    try {
        console.log('[PROCESS] Starting processBrainPrompt...');
        const result = await processBrainPrompt(userPrompt);
        console.log('[PROCESS] Success:', result);
        res.json(result);
    } catch (error) {
        console.error('[ERROR] Full error:', error);
        console.error('[ERROR] Message:', error.message);
        console.error('[ERROR] Stack:', error.stack);
        res.status(400).json({ error: error.message, details: error.toString() });
    }
});

// Brain UI Endpoint
app.get('/brain', (req, res) => {
    res.send(getBrainUI());
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'Brain AI is running', timestamp: new Date().toISOString() });
});

// ----------------------------
// Exports (for use as a module)
// ----------------------------
module.exports = {
    processBrainPrompt,
    PrefrontalCortex,
    brainFunctions,
    prompts,
    aiRespond,
    getBrainUI,
    app
};

// ----------------------------
// Start Server (if run directly)
// ----------------------------
if (require.main === module) {
    app.listen(port, () => {
        console.log(`🧠 Brain AI Server running at http://localhost:${port}`);
        console.log(`🌐 UI available at http://localhost:${port}/brain`);
    });
}
