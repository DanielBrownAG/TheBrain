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
    const ids = ['send', 'response', 'prompt', 'conversation', 'new-chat', 'clear-chat', 'delete-chat', 'collaborate', 'contributions', 'status', 'region', 'history'];
    const elements = Object.fromEntries(ids.map(id => [id, element()]));
    elements.region.children = Object.entries(prompts).map(([id, prompt]) => ({ value: id, textContent: prompt.title }));
    elements.prompt.value = 'Help me reflect';
    elements.region.value = 'Cortex';
    const saved = new Map([['brain-conversations', JSON.stringify([{ id: 'session-one', title: 'Existing chat' }])]]);
    let session = { id: 'session-one', title: 'Existing chat', messages: [] };
    const requests = [];
    const context = vm.createContext({
        document: { getElementById: id => elements[id], createElement: tag => element(tag) },
        TextDecoder,
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
    await context.deleteConversation();
    assert.equal(elements.conversation.value, 'session-two');
    assert.ok(!saved.get('brain-conversations').includes('session-one'));
});
