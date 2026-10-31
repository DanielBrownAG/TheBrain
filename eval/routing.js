const fs = require('node:fs');
const path = require('node:path');

function feedbackCases(directory) {
    if (!fs.existsSync(directory)) return [];
    const cases = [];
    for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.json'))) {
        const session = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
        session.messages.forEach((message, index) => {
            if (!message.feedback || message.role !== 'assistant' || session.messages[index - 1]?.role !== 'user') return;
            cases.push({
                id: `feedback:${session.id}:${message.requestId}`,
                prompt: session.messages[index - 1].content,
                history: session.messages.slice(Math.max(0, index - 21), index - 1).map(({ role, content }) => ({ role, content })),
                expectedRegions: [message.feedback.expectedRegion]
            });
        });
    }
    return cases;
}

async function evaluateRouting(cases, route, regions) {
    if (!Array.isArray(cases) || !cases.length) throw new Error('Evaluation requires at least one case.');
    const ids = new Set();
    for (const item of cases) {
        if (!item.id || ids.has(item.id) || typeof item.prompt !== 'string' || !item.prompt.trim() ||
            !Array.isArray(item.expectedRegions) || !item.expectedRegions.length ||
            item.expectedRegions.some(region => !Object.hasOwn(regions, region))) throw new Error('Invalid routing evaluation case.');
        ids.add(item.id);
    }
    const results = [];
    for (const item of cases) {
        try {
            const selectedRegion = (await route(item.prompt, { history: item.history || [] })).trim();
            results.push({ id: item.id, expectedRegions: item.expectedRegions, selectedRegion,
                passed: Object.hasOwn(regions, selectedRegion) && item.expectedRegions.includes(selectedRegion) });
        } catch (error) {
            results.push({ id: item.id, expectedRegions: item.expectedRegions, passed: false, error: error.message });
        }
    }
    const passed = results.filter(result => result.passed).length;
    return { total: results.length, passed, accuracy: passed / results.length, results };
}

function compareBaseline(report, baseline) {
    // Compare the same cases and expectations so adding feedback does not skew the comparison.
    const previous = new Map((baseline.results || []).map(result => [result.id, result]));
    const comparable = report.results.filter(result => previous.has(result.id) &&
        JSON.stringify([...result.expectedRegions].sort()) === JSON.stringify([...previous.get(result.id).expectedRegions].sort()));
    if (!comparable.length) throw new Error('Baseline contains no matching evaluation cases.');
    const before = comparable.filter(result => previous.get(result.id).passed).length / comparable.length;
    const after = comparable.filter(result => result.passed).length / comparable.length;
    return { matchingCases: comparable.length, previousAccuracy: before, currentAccuracy: after, change: after - before };
}

async function main(args = process.argv.slice(2)) {
    const { PrefrontalCortex, prompts } = require('../brain');
    const { getConfiguration } = require('../ai-client');
    const root = process.env.BRAIN_DATA_DIR || path.join(__dirname, '..', 'data');
    let output = path.join(root, 'evaluations', 'latest.json');
    let baselinePath;
    let includeFeedback = false;
    for (let index = 0; index < args.length; index++) {
        if (args[index] === '--include-feedback') includeFeedback = true;
        else if (['--output', '--baseline'].includes(args[index]) && args[index + 1] && !args[index + 1].startsWith('--')) {
            if (args[index] === '--output') output = args[++index];
            else baselinePath = args[++index];
        } else throw new Error('Usage: npm run eval:routing -- [--include-feedback] [--output file] [--baseline file]');
    }
    const cases = [...require('./routing-cases.json'), ...(includeFeedback ? feedbackCases(path.join(root, 'sessions')) : [])];
    const baseline = baselinePath ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
    const { model, baseURL } = getConfiguration();
    const report = { timestamp: new Date().toISOString(), model, baseURL, ...await evaluateRouting(cases, PrefrontalCortex, prompts) };
    if (baseline) report.comparison = compareBaseline(report, baseline);
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`Routing: ${report.passed}/${report.total} passed (${(report.accuracy * 100).toFixed(1)}%). Report: ${output}`);
    if (report.comparison) console.log(`Change on ${report.comparison.matchingCases} matching cases: ${(report.comparison.change * 100).toFixed(1)} percentage points.`);
    for (const result of report.results.filter(result => !result.passed)) {
        console.log(`${result.id}: ${result.error || result.selectedRegion}; expected ${result.expectedRegions.join(' or ')}`);
    }
    if (report.passed !== report.total) process.exitCode = 1;
    return report;
}

module.exports = { evaluateRouting, compareBaseline, feedbackCases, main };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
