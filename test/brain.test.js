const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const vm = require('node:vm');
const { getConfiguration } = require('../ai-client');
const { app, getBrainUI } = require('../brain');

test('provider configuration preserves deployment names and arbitrary model IDs', () => {
    assert.equal(getConfiguration({ OPENAI_API_KEY: 'test', OPENAI_MODEL: 'gpt-6.1-terra' }).model, 'gpt-6.1-terra');
    assert.equal(getConfiguration({ OPENAI_API_KEY: 'test', OPENAI_MODEL: 'gpt-7-example' }).model, 'gpt-7-example');
    for (const endpoint of ['https://example.openai.azure.com/', 'https://example.openai.azure.com/openai/v1/']) {
        assert.deepEqual(getConfiguration({
            AZURE_OPENAI_ENDPOINT: endpoint, AZURE_OPENAI_KEY: 'test', AZURE_DEPLOYMENT_ID: 'my-gpt6'
        }), { apiKey: 'test', baseURL: 'https://example.openai.azure.com/openai/v1/', model: 'my-gpt6' });
    }
    assert.throws(() => getConfiguration({ AI_PROVIDER: 'azure' }), /AZURE_OPENAI_ENDPOINT/);
    assert.throws(() => getConfiguration({ AI_PROVIDER: 'unknown' }), /AI_PROVIDER/);
});

test('browser script parses and renders model output as text', () => {
    const html = getBrainUI();
    new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
    assert.ok(html.includes("buffer.indexOf('\\n\\n')"));
    assert.ok(!html.includes('innerHTML'));
});

test('browser consumes fragmented UTF-8 SSE frames safely', async () => {
    const elements = Object.fromEntries(['send', 'response', 'prompt'].map(id => [id, { value: 'Hello' }]));
    const nodes = [];
    elements.response.replaceChildren = () => {};
    const text = 'data: ignored\n\n: heartbeat\n\nevent: region\ndata: {"selectedRegion":"FrontalLobe"}\n\n' +
        'event: delta\ndata: {"text":"🧠 <script>alert(1)</script>"}\n\n' +
        'event: done\ndata: {"response":"🧠 <script>alert(1)</script>"}\n\n';
    // Byte-sized chunks split delimiters, JSON, and the multibyte emoji.
    const bytes = new TextEncoder().encode(text);
    const context = vm.createContext({
        document: {
            getElementById: id => elements[id],
            createElement: () => { const node = { style: {}, textContent: '' }; nodes.push(node); return node; }
        },
        TextDecoder,
        fetch: async () => ({ ok: true, body: new ReadableStream({
            start(controller) {
                for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
                controller.close();
            }
        }) })
    });
    vm.runInContext(getBrainUI().match(/<script>([\s\S]*?)<\/script>/)[1], context);
    await context.sendPrompt();
    assert.equal(nodes[0].textContent, '🧠 Triaged To: FrontalLobe');
    assert.equal(nodes[1].textContent, '🧠 <script>alert(1)</script>');
    assert.equal(elements.send.disabled, false);
});

test('JSON and SSE routes with the actual SDK against a local upstream', async (t) => {
    let mode = 'success';
    let calls = [];
    let release;
    let upstreamClosed;
    const output = (text) => ({
        id: 'resp_test', object: 'response', status: 'completed',
        output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text, annotations: [] }] }]
    });
    const upstream = http.createServer(async (req, res) => {
        let body = '';
        for await (const chunk of req) body += chunk;
        const data = JSON.parse(body);
        calls.push({ url: req.url, ...data });
        const triage = data.instructions.includes('sole job');
        if (!data.stream) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(output(triage ? (mode === 'bad-region' ? 'constructor' : 'FrontalLobe') : 'Hello 🧠')));
            return;
        }
        res.setHeader('Content-Type', 'text/event-stream');
        const event = (type, extra = {}) => res.write(`data: ${JSON.stringify({ type, ...extra })}\n\n`);
        event('response.output_text.delta', { delta: 'Hello ' });
        if (mode === 'paused') {
            res.on('close', () => upstreamClosed?.());
            await new Promise(resolve => { release = resolve; });
        }
        if (res.destroyed) return;
        if (mode === 'failed') event('response.failed');
        else if (mode !== 'truncated') {
            event('response.output_text.delta', { delta: '🧠' });
            event('response.completed', { response: output('Hello 🧠') });
        }
        res.end();
    });
    upstream.listen(0, '127.0.0.1');
    await once(upstream, 'listening');
    const previous = { ...process.env };
    Object.assign(process.env, {
        AI_PROVIDER: 'openai', OPENAI_API_KEY: 'fixture-key', OPENAI_MODEL: 'gpt-6-astra',
        OPENAI_BASE_URL: `http://127.0.0.1:${upstream.address().port}/v1`
    });
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => {
        release?.();
        server.closeAllConnections(); server.close();
        upstream.closeAllConnections(); upstream.close();
        for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
        Object.assign(process.env, previous);
    });
    const post = (body) => fetch(`http://127.0.0.1:${server.address().port}/brainprompt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });

    await t.test('invalid prompts and stream flags fail before API calls', async () => {
        for (const body of [{}, { prompt: 2 }, { prompt: ' ' }, { prompt: 'hi', stream: 'true' }]) {
            assert.equal((await post(body)).status, 400);
        }
        assert.equal(calls.length, 0);
    });
    await t.test('JSON contract is preserved with Responses API requests', async () => {
        const response = await post({ prompt: 'Hello' });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            triagedBy: 'PrefrontalCortex', selectedRegion: 'FrontalLobe', response: '🧠 [Frontal Lobe]: Hello 🧠'
        });
        assert.equal(calls.length, 2);
        for (const call of calls) {
            assert.equal(call.url, '/v1/responses');
            assert.equal(call.model, 'gpt-6-astra');
            assert.equal(call.store, false);
            assert.equal(call.temperature, undefined);
        }
    });
    await t.test('SSE sends deltas and final metadata', async () => {
        const response = await post({ prompt: 'Hello', stream: true });
        assert.match(response.headers.get('content-type'), /text\/event-stream/);
        const text = await response.text();
        assert.match(text, /event: region/);
        assert.match(text, /event: delta\ndata: {"text":"Hello "}/);
        assert.match(text, /event: done/);
        assert.match(text, /Hello 🧠/);
    });
    await t.test('Azure requests use the v1 path and configured deployment', async () => {
        Object.assign(process.env, {
            AI_PROVIDER: 'azure', AZURE_OPENAI_ENDPOINT: `http://127.0.0.1:${upstream.address().port}`,
            AZURE_OPENAI_KEY: 'fixture-key', AZURE_DEPLOYMENT_ID: 'my-gpt6-deployment'
        });
        try {
            assert.equal((await post({ prompt: 'Hello' })).status, 200);
            assert.equal(calls.at(-1).url, '/openai/v1/responses');
            assert.equal(calls.at(-1).model, 'my-gpt6-deployment');
        } finally {
            process.env.AI_PROVIDER = 'openai';
        }
    });
    for (const failure of ['bad-region', 'failed', 'truncated']) {
        await t.test(`${failure} emits an error without a done event`, async () => {
            mode = failure;
            const text = await (await post({ prompt: 'Hello', stream: true })).text();
            assert.match(text, /event: error/);
            assert.doesNotMatch(text, /event: done/);
        });
    }
    await t.test('deltas arrive before completion and disconnect aborts upstream', async () => {
        mode = 'paused';
        const closed = new Promise(resolve => { upstreamClosed = resolve; });
        const response = await post({ prompt: 'Hello', stream: true });
        const reader = response.body.getReader();
        let text = '';
        while (!text.includes('Hello ')) {
            const chunk = await reader.read();
            assert.equal(chunk.done, false);
            text += new TextDecoder().decode(chunk.value);
        }
        assert.doesNotMatch(text, /event: done/);
        await reader.cancel();
        await Promise.race([closed, new Promise((_, reject) => {
            const timer = setTimeout(() => reject(new Error('Upstream was not cancelled')), 3000);
            timer.unref();
        })]);
        release();
    });
});
