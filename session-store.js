const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

class SessionStore {
    constructor(directory = () => path.join(process.env.BRAIN_DATA_DIR || path.join(__dirname, 'data'), 'sessions')) {
        this.directory = directory;
        this.busy = new Set();
    }
    file(id) {
        if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            throw Object.assign(new Error('Unknown conversation.'), { status: 404 });
        }
        return path.join(this.directory(), `${id}.json`);
    }
    save(session) {
        fs.mkdirSync(this.directory(), { recursive: true });
        const file = this.file(session.id);
        fs.writeFileSync(`${file}.tmp`, JSON.stringify(session), { mode: 0o600 });
        fs.renameSync(`${file}.tmp`, file);
    }
    create() {
        const session = { id: randomUUID(), title: 'New conversation', messages: [], updatedAt: new Date().toISOString() };
        this.save(session);
        return session;
    }
    get(id) {
        try { return JSON.parse(fs.readFileSync(this.file(id), 'utf8')); }
        catch (error) {
            if (error.code === 'ENOENT') throw Object.assign(new Error('Unknown conversation.'), { status: 404 });
            throw error;
        }
    }
    assertAvailable(id) {
        if (this.busy.has(id)) throw Object.assign(new Error('Conversation is busy. Wait for its response to finish.'), { status: 409 });
    }
    begin(id) {
        this.assertAvailable(id);
        const session = this.get(id);
        this.busy.add(id);
        return session;
    }
    finish(id) { this.busy.delete(id); }
    append(session, prompt, result) {
        if (!session.messages.length) session.title = prompt.slice(0, 60);
        session.messages.push({ role: 'user', content: prompt }, { role: 'assistant', content: result.response, ...result });
        session.messages = session.messages.slice(-100);
        session.updatedAt = new Date().toISOString();
        this.save(session);
    }
    clear(id) {
        this.assertAvailable(id);
        const session = this.get(id);
        session.messages = [];
        session.title = 'New conversation';
        session.updatedAt = new Date().toISOString();
        this.save(session);
        return session;
    }
    delete(id) {
        this.assertAvailable(id);
        this.get(id);
        fs.unlinkSync(this.file(id));
    }
}

module.exports = { SessionStore };
