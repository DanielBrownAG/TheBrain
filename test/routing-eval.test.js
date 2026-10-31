const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateRouting, compareBaseline } = require('../eval/routing');
const cases = require('../eval/routing-cases.json');
const { prompts } = require('../brain');

test('built-in routing dataset covers every region and passes context to the router', async () => {
    const covered = new Set(cases.flatMap(item => item.expectedRegions));
    for (const region of Object.keys(prompts)) assert.ok(covered.has(region), region);
    let index = 0;
    const report = await evaluateRouting(cases, async (prompt, options) => {
        const item = cases[index++];
        assert.equal(prompt, item.prompt);
        assert.deepEqual(options.history, item.history || []);
        return item.expectedRegions[0];
    }, prompts);
    assert.equal(report.total, 15);
    assert.equal(report.accuracy, 1);
});

test('evaluation records wrong routes and API errors as failures', async () => {
    let index = 0;
    const report = await evaluateRouting(cases.slice(0, 3), async () => {
        if (++index === 1) return 'FrontalLobe';
        if (index === 2) return 'constructor';
        throw new Error('Fixture failure');
    }, prompts);
    assert.equal(report.passed, 1);
    assert.equal(report.results[2].error, 'Fixture failure');
    const comparison = compareBaseline(report, {
        results: report.results.map(result => ({ ...result, passed: false }))
    });
    assert.equal(comparison.matchingCases, 3);
    assert.equal(comparison.change, 1 / 3);
    assert.throws(() => compareBaseline(report, { results: [] }), /no matching/);
});

test('evaluation validates the entire dataset before making model calls', async () => {
    let calls = 0;
    await assert.rejects(evaluateRouting([...cases, { id: 'bad', prompt: 'hi', expectedRegions: ['Missing'] }],
        async () => { calls++; }, prompts), /Invalid/);
    assert.equal(calls, 0);
});
