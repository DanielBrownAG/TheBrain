require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { generateText } = require('./ai-client');

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
// AI Response Handler
// ----------------------------
async function aiRespond(systemPrompt, userPrompt) {
    const output = await generateText(systemPrompt.instructions, userPrompt);
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
async function PrefrontalCortex(prompt, options = {}) {
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

    const output = await generateText(syspromp, lower, options);
    console.log("PrefrontalCortex output:", output);
    return output;
}

// ----------------------------
// Process Brain Prompt
// ----------------------------
function validatePrompt(prompt) {
    if (typeof prompt !== 'string' || !prompt.trim()) {
        throw new Error('Prompt must be a non-empty string.');
    }
}

async function processBrainPrompt(userPrompt, { onEvent, signal } = {}) {
    validatePrompt(userPrompt);
    const selectedRegion = (await PrefrontalCortex(userPrompt, { signal })).trim();
    if (!Object.hasOwn(prompts, selectedRegion)) {
        throw new Error('Triage returned an unknown brain region.');
    }
    const metadata = { triagedBy: 'PrefrontalCortex', selectedRegion };
    if (onEvent) await onEvent('region', metadata);
    const prefix = `🧠 [${prompts[selectedRegion].title}]: `;
    if (onEvent) await onEvent('delta', { text: prefix });
    const output = await generateText(prompts[selectedRegion].instructions, userPrompt, {
        signal,
        onDelta: onEvent ? (text) => onEvent('delta', { text }) : undefined
    });
    return { ...metadata, response: prefix + output };
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
      <button id="send" onclick="sendPrompt()">Send to Brain</button>

      <div id="response"></div>

      <script>
        async function sendPrompt() {
          const button = document.getElementById('send');
          const container = document.getElementById('response');
          const heading = document.createElement('h3');
          const answer = document.createElement('p');
          answer.style.whiteSpace = 'pre-wrap';
          heading.textContent = 'Routing your prompt…';
          container.replaceChildren(heading, answer);
          button.disabled = true;
          let reader;
          try {
            const res = await fetch('/brainprompt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: document.getElementById('prompt').value, stream: true })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let completed = false;
            while (true) {
              const { value, done } = await reader.read();
              buffer += decoder.decode(value, { stream: !done });
              let boundary;
              while ((boundary = buffer.indexOf('\\n\\n')) !== -1) {
                const frame = buffer.slice(0, boundary);
                buffer = buffer.slice(boundary + 2);
                const lines = frame.split('\\n');
                const event = lines.find(line => line.startsWith('event: '))?.slice(7);
                const raw = lines.find(line => line.startsWith('data: '))?.slice(6);
                if (!raw || !['region', 'delta', 'error', 'done'].includes(event)) continue;
                const data = JSON.parse(raw);
                if (event === 'region') heading.textContent = '🧠 Triaged To: ' + data.selectedRegion;
                if (event === 'delta') answer.textContent += data.text;
                if (event === 'error') throw new Error(data.error);
                if (event === 'done') {
                  completed = true;
                  answer.textContent = data.response;
                }
              }
              if (done) break;
            }
            if (!completed) throw new Error('Connection ended before the response completed.');
          } catch (error) {
            heading.textContent = 'Error: ' + error.message;
          } finally {
            if (reader) await reader.cancel().catch(() => {});
            button.disabled = false;
          }
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
    const controller = new AbortController();
    res.on('close', () => controller.abort());
    try {
        validatePrompt(req.body?.prompt);
        if (req.body.stream !== undefined && typeof req.body.stream !== 'boolean') {
            throw new Error('stream must be a boolean.');
        }
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
    const streaming = req.body.stream === true;
    if (streaming) {
        res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        res.flushHeaders();
    }
    const sendEvent = (event, data) => {
        if (!res.destroyed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    // Keep proxies from timing out while triage/reasoning is running.
    const heartbeat = streaming ? setInterval(() => {
        if (!res.destroyed) res.write(': heartbeat\n\n');
    }, 15000) : undefined;
    try {
        const result = await processBrainPrompt(req.body.prompt, {
            signal: controller.signal,
            onEvent: streaming ? sendEvent : undefined
        });
        if (streaming) {
            sendEvent('done', result);
            res.end();
        } else {
            res.json(result);
        }
    } catch (error) {
        if (controller.signal.aborted) return;
        console.error('[AI ERROR]', error.message);
        if (streaming) {
            sendEvent('error', { error: 'Unable to complete the AI response. Please try again.' });
            res.end();
        } else {
            res.status(502).json({ error: 'Unable to complete the AI response. Please try again.' });
        }
    } finally {
        clearInterval(heartbeat);
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
