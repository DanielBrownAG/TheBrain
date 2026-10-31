const OpenAI = require('openai');

function getConfiguration(env = process.env) {
    const provider = env.AI_PROVIDER || (env.AZURE_OPENAI_ENDPOINT ? 'azure' : 'openai');
    if (!['azure', 'openai'].includes(provider)) {
        throw new Error('AI_PROVIDER must be azure or openai.');
    }
    if (provider === 'azure') {
        if (!env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_KEY || !env.AZURE_DEPLOYMENT_ID) {
            throw new Error('Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY and AZURE_DEPLOYMENT_ID.');
        }
        const endpoint = env.AZURE_OPENAI_ENDPOINT.replace(/\/+$/, '');
        return {
            apiKey: env.AZURE_OPENAI_KEY,
            baseURL: endpoint.endsWith('/openai/v1') ? `${endpoint}/` : `${endpoint}/openai/v1/`,
            model: env.AZURE_DEPLOYMENT_ID
        };
    }
    if (!env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY.');
    return {
        apiKey: env.OPENAI_API_KEY,
        baseURL: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: env.OPENAI_MODEL || 'gpt-6-astra'
    };
}

async function generateText(instructions, prompt, { onDelta, signal } = {}) {
    const { model, ...configuration } = getConfiguration();
    const client = new OpenAI(configuration);
    const request = { model, instructions, input: prompt, store: false };
    if (!onDelta) {
        const response = await client.responses.create(request, { signal });
        if (response.status !== 'completed') throw new Error('AI response did not complete.');
        if (!response.output_text?.trim()) throw new Error('AI returned no text.');
        return response.output_text.trim();
    }

    const stream = await client.responses.create({ ...request, stream: true }, { signal });
    let text = '';
    let completed = false;
    for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
            text += event.delta;
            await onDelta(event.delta);
        } else if (event.type === 'response.refusal.delta') {
            throw new Error('AI declined to answer this prompt.');
        } else if (['error', 'response.failed', 'response.incomplete'].includes(event.type)) {
            throw new Error('AI response did not complete.');
        } else if (event.type === 'response.completed') {
            completed = true;
        }
    }
    if (!completed) throw new Error('AI stream ended before completion.');
    if (!text.trim()) throw new Error('AI returned no text.');
    return text;
}

module.exports = { generateText, getConfiguration };
