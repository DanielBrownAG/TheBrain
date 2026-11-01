const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { getBrainUI, prompts } = require('../brain');

function element(tag = 'div') {
    return {
        tag, children: [], style: {}, value: '', textContent: '',
        append(...nodes) { this.children.push(...nodes); },
        replaceChildren(...nodes) { this.children = nodes; },
        setAttribute() {},
        get options() { return this.children; }
    };
}

test('browser restores chats, sends overrides, renders perspectives, and saves feedback', async () => {
    const ids = ['send', 'response', 'prompt', 'conversation', 'new-chat', 'clear-chat', 'delete-chat', 'collaborate', 'contributions', 'status', 'region', 'history', 'stop', 'retry', 'copy'];
    const elements = Object.fromEntries(ids.map(id => [id, element()]));
    elements.region.children = Object.entries(prompts).map(([id, prompt]) => ({ value: id, textContent: prompt.title }));
    elements.prompt.value = 'Help me reflect';
    elements.region.value = 'Cortex';
    const saved = new Map([['brain-conversations', JSON.stringify([{ id: 'session-one', title: 'Existing chat' }])]]);
    let session = { id: 'session-one', title: 'Existing chat', messages: [] };
    const requests = [];
    const copied = [];
    const context = vm.createContext({
        document: { getElementById: id => elements[id], createElement: tag => element(tag) },
        TextDecoder,
        AbortController,
        navigator: { clipboard: { writeText: async text => copied.push(text) } },
        localStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) },
        fetch: async (url, options = {}) => {
            requests.push({ url, ...options });
            const body = options.body ? JSON.parse(options.body) : {};
            if (url === '/brainprompt') {
                assert.equal(body.region, 'Cortex');
                assert.equal(body.sessionId, session.id);
                const result = { selectedRegion: 'Cortex', triagedBy: 'UserOverride', requestId: 'answer-one',
                    response: 'A thoughtful answer', sessionId: session.id,
                    contributions: [{ region: 'Cortex', text: '<b>Perspective</b>' }] };
                session.messages.push({ role: 'user', content: body.prompt }, { role: 'assistant', content: result.response, ...result });
                const bytes = new TextEncoder().encode(`event: done\ndata: ${JSON.stringify(result)}\n\n`);
                return { ok: true, body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) };
            }
            if (options.method === 'PUT') {
                session.messages[1].feedback = body;
                return { ok: true, json: async () => body };
            }
            if (url === '/sessions' && options.method === 'POST') {
                session = { id: 'session-two', title: 'New conversation', messages: [] };
            }
            if (options.method === 'DELETE' && !url.endsWith('/messages')) return { ok: true, status: 204 };
            if (options.method === 'DELETE') session.messages = [];
            return { ok: true, json: async () => session };
        }
    });
    vm.runInContext(getBrainUI().match(/<script>([\s\S]*?)<\/script>/)[1], context);
    await context.loadConversations();
    assert.equal(elements.conversation.value, session.id);
    await context.sendPrompt();
    assert.equal(elements.send.disabled, false);
    assert.equal(elements.stop.disabled, true);
    assert.equal(elements.retry.disabled, false);
    await context.copyAnswer();
    assert.equal(copied.at(-1), 'A thoughtful answer');
    const copySaved = elements.history.children.find(node => node.tag === 'button' && node.textContent === 'Copy answer');
    await copySaved.onclick();
    assert.equal(copied.length, 2);
    assert.ok(elements.history.children.some(node => node.textContent.includes('(chosen by you)')));
    const perspective = elements.history.children.find(node => node.tag === 'details');
    assert.equal(perspective.children[1].textContent, '<b>Perspective</b>');
    const feedback = elements.history.children.find(node => node.tag === 'div');
    const [button, form, status] = feedback.children;
    button.onclick();
    assert.equal(form.hidden, false);
    form.children[1].value = 'TemporalLobe';
    form.children[2].value = 'Language fits better';
    await form.onsubmit({ preventDefault() {} });
    assert.match(status.textContent, /Routing feedback saved/);
    assert.equal(requests.find(request => request.method === 'PUT').url, '/sessions/session-one/feedback/answer-one');
    await context.clearConversation();
    assert.equal(elements.history.children.length, 0);
    assert.equal(elements.retry.disabled, true);
    assert.equal(elements.copy.disabled, true);
    await context.deleteConversation();
    assert.equal(elements.conversation.value, 'session-two');
    assert.ok(!saved.get('brain-conversations').includes('session-one'));
});

function controlsBrowser(generate) {
    const ids = ['send', 'response', 'prompt', 'conversation', 'new-chat', 'clear-chat', 'delete-chat', 'collaborate', 'contributions', 'status', 'region', 'history', 'stop', 'retry', 'copy'];
    const elements = Object.fromEntries(ids.map(id => [id, element()]));
    elements.prompt.value = 'Original prompt';
    elements.region.value = 'Cortex';
    elements.region.children = Object.entries(prompts).map(([value, prompt]) => ({ value, textContent: prompt.title }));
    elements.collaborate.checked = true;
    const session = { id: 'fixture-session', title: 'Test conversation', messages: [] };
    const requests = [];
    const copied = [];
    const context = vm.createContext({
        document: { getElementById: id => elements[id], createElement: tag => element(tag) },
        TextDecoder, AbortController,
        navigator: { clipboard: { writeText: async text => copied.push(text) } },
        localStorage: { getItem: () => null, setItem() {} },
        fetch: async (url, options = {}) => {
            if (url.startsWith('/sessions/')) return { ok: true, json: async () => session };
            assert.equal(url, '/brainprompt');
            const body = JSON.parse(options.body);
            requests.push({ body, signal: options.signal });
            return generate(body, options.signal, session);
        }
    });
    vm.runInContext(getBrainUI().match(/<script>([\s\S]*?)<\/script>/)[1], context);
    vm.runInContext("currentSessionId = 'fixture-session'", context);
    return { context, elements, session, requests, copied };
}

function completedStream(result) {
    return { ok: true, body: new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode(`event: done\ndata: ${JSON.stringify(result)}\n\n`));
        controller.close();
    } }) };
}

async function until(predicate) {
    for (let count = 0; count < 30 && !predicate(); count++) await new Promise(resolve => setImmediate(resolve));
    assert.ok(predicate(), 'Expected browser state was not reached');
}

for (const phase of ['waiting for headers', 'reading partial output']) {
    test(`Stop works while ${phase}; Retry preserves the original settings`, async () => {
        let stopped = false;
        const browser = controlsBrowser((body, signal) => {
            if (stopped) return completedStream({ response: 'Retried answer' });
            if (phase === 'waiting for headers') return new Promise((resolve, reject) => {
                signal.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')), { once: true });
            });
            return { ok: true, body: new ReadableStream({ start(controller) {
                controller.enqueue(new TextEncoder().encode('event: delta\ndata: {"text":"Partial answer 🧠"}\n\n'));
                signal.addEventListener('abort', () => controller.error(new DOMException('Stopped', 'AbortError')), { once: true });
            } }) };
        });
        const { context, elements, requests, copied } = browser;
        const pending = context.sendPrompt();
        await until(() => requests.length === 1);
        assert.equal(elements.stop.disabled, false);
        assert.equal(elements.retry.disabled, true);
        await context.sendPrompt();
        assert.equal(requests.length, 1);
        if (phase === 'reading partial output') {
            await until(() => elements.copy.disabled === false);
            await context.copyAnswer();
            assert.equal(copied.at(-1), 'Partial answer 🧠');
        }
        context.stopGenerating();
        await pending;
        assert.equal(requests[0].signal.aborted, true);
        assert.equal(elements.stop.disabled, true);
        assert.equal(elements.send.disabled, false);
        assert.equal(elements.retry.disabled, false);
        assert.match(elements.status.textContent, /Generation stopped/);
        if (phase === 'reading partial output') assert.equal(elements.response.children[1].textContent, 'Partial answer 🧠');
        stopped = true;
        elements.prompt.value = 'Edited prompt';
        elements.region.value = 'Brainstem';
        elements.collaborate.checked = false;
        await context.sendPrompt(true);
        assert.deepEqual(requests[1].body, requests[0].body);
        assert.equal(elements.response.children[1].textContent, 'Retried answer');
        assert.equal(elements.stop.disabled, true);
    });
}

test('Retry regenerates a saved answer and keeps the original turn after failure', async () => {
    let fail = false;
    const { context, elements, session, requests } = controlsBrowser((body, signal, session) => {
        if (fail) return { ok: false, json: async () => ({ error: 'Fixture service unavailable' }) };
        const result = { requestId: 'saved-answer', response: 'Original answer', sessionId: session.id,
            triagedBy: 'UserOverride', selectedRegion: 'Cortex', selectedRegions: ['Cortex', 'FrontalLobe'] };
        session.messages = [{ role: 'user', content: body.prompt }, { role: 'assistant', content: result.response, ...result }];
        return completedStream(result);
    });
    await context.sendPrompt();
    fail = true;
    elements.prompt.value = 'Unrelated next prompt';
    await context.sendPrompt(true);
    assert.equal(requests[1].body.prompt, 'Original prompt');
    assert.equal(requests[1].body.retryOf, 'saved-answer');
    assert.equal(requests[1].body.region, 'Cortex');
    assert.equal(requests[1].body.collaborate, true);
    assert.equal(session.messages.length, 2);
    assert.equal(session.messages[1].content, 'Original answer');
    assert.equal(elements.retry.disabled, false);
    assert.match(elements.status.textContent, /Fixture service unavailable/);
});

test('Retry reconciles a response saved just before Stop disconnected', async () => {
    let browser;
    let attempts = 0;
    browser = controlsBrowser((body, signal, session) => {
        if (++attempts === 1) return new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => {
                session.messages = [{ role: 'user', content: body.prompt },
                    { role: 'assistant', requestId: 'just-saved', content: 'Finished on the server' }];
                reject(new DOMException('Stopped', 'AbortError'));
            }, { once: true });
        });
        return completedStream({ response: 'Replacement answer' });
    });
    const pending = browser.context.sendPrompt();
    await until(() => browser.requests.length === 1);
    browser.context.stopGenerating();
    await pending;
    await browser.context.sendPrompt(true);
    assert.equal(browser.requests[1].body.retryOf, 'just-saved');
});

test('Copy reports clipboard denial without changing the answer', async () => {
    const { context, elements } = controlsBrowser(() => completedStream({ response: 'Keep this text' }));
    await context.sendPrompt();
    context.navigator.clipboard.writeText = async () => { throw new Error('Permission denied'); };
    await context.copyAnswer();
    assert.match(elements.status.textContent, /copy it manually/);
    assert.equal(elements.response.children[1].textContent, 'Keep this text');
});
