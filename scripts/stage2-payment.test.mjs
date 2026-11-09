import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import * as vue from 'vue';

// Component-only evidence. No login, backend request, build output, or WeChat claim.
const source = fs.readFileSync(new URL('../apps/resident-miniapp/src/features/mall/Stage2Payment.vue', import.meta.url), 'utf8');
const code = ts.transpileModule(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport {data,paid,title,description,status,refresh,pay,cancel,busy}', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
async function page(trade, overrides = {}) {
  const owner = vue.ref('A:1'), module = { exports: {} }, scope = vue.effectScope();
  const props = vue.reactive({ options: { tradeId: '701' }, visible: true }), modals = [];
  scope.run(() => vm.runInNewContext(code, {
    module, exports: module.exports, defineProps: () => props,
    Date, Number, Math, Error, performance: { now: () => 1000 }, setInterval: () => 1, clearInterval() {}, uni: { showModal: value => modals.push(value) },
    require: id => id === 'vue' ? { ...vue, onUnmounted() {} }
      : id.endsWith('/stage2-mall') ? { stage2Mall: { summary: async () => structuredClone(trade), ...overrides } }
        : id.endsWith('/stage2-http') ? { stage2Owner: () => owner.value } : {},
  }));
  await new Promise(resolve => setImmediate(resolve));
  return { model: module.exports, owner, props, modals, close: () => scope.stop() };
}
const base = { tradeId: '701', status: 'PAID', paymentStatus: 'SUCCEEDED', closeStatus: 'NONE', protection: null,
  amountCent: 3801, paidAmountCent: 3801, paidAt: '2026-10-29T01:00:00Z', lastVerifiedAt: '2026-10-29T01:02:00Z',
  payDeadline: '2026-10-29T01:15:00Z', serverTime: '2026-10-29T01:02:00Z', orders: [], allowedActions: [] };

test('ordinary success requires channel paid time and actual amount as well as completed local state', async () => {
  for (const [label, change, expected] of [
    ['complete', {}, true], ['missing time', { paidAt: null }, false], ['invalid time', { paidAt: 'invalid' }, false],
    ['wrong actual amount', { paidAmountCent: 3800 }, false], ['local pending', { status: 'PAY_CONFIRMING' }, false],
    ['late paid protection', { protection: 'LATE_PAYMENT_AFTER_RELEASE' }, false],
    ['client callback only', { paymentStatus: 'UNKNOWN', paidAt: null, paidAmountCent: null }, false],
  ]) {
    const f = await page({ ...base, ...change });
    try { assert.equal(f.model.paid.value, expected, label); } finally { f.close(); }
  }
});
test('paid time is shown independently of verification time, and a Member change clears it', async () => {
  const f = await page(base);
  try {
    assert.equal(f.model.data.value.paidAt, '2026-10-29T01:00:00Z');
    assert.notEqual(f.model.data.value.paidAt, f.model.data.value.lastVerifiedAt);
    assert.match(source, /data\.paidAt/);
    assert.match(source, /模拟实付/);
    f.owner.value = 'B:2'; assert.equal(f.model.data.value, undefined); assert.equal(f.model.paid.value, false);
  } finally { f.close(); }
});
test('a trusted channel result outside this stage remains an explicit isolated result', async () => {
  const f = await page({ ...base, protection: 'CHANNEL_RESULT_OUT_OF_SCOPE', allowedActions: ['REFRESH'] });
  try {
    assert.equal(f.model.paid.value, false);
    assert.equal(f.model.title.value, '收到超出本期范围的结果，需人工核实');
    assert.match(f.model.description.value, /保留原付款/);
    assert.doesNotMatch(f.model.description.value, /后台持续查询|已退款|已分账|已到账/);
  } finally { f.close(); }
});
const settle = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const waiting = id => ({ ...base, tradeId: id, status: 'WAIT_PAY', paymentStatus: 'UNPAID', paidAt: null, paidAmountCent: null, allowedActions: ['REFRESH', 'PAY', 'CANCEL'] });
test('an old refresh cannot replace the next original Trade view', async () => {
  const old = deferred(); const f = await page(base, { summary: async id => ({ ...base, tradeId: id }), refresh: () => old.promise });
  try { const pending = f.model.refresh(); f.props.options = { tradeId: '702' }; await settle(); assert.equal(f.model.data.value.tradeId, '702'); old.resolve({ trade: base }); await pending; assert.equal(f.model.data.value.tradeId, '702'); } finally { f.close(); }
});
test('an old refresh error cannot trigger another read for the next Trade', async () => {
  const old = deferred(), reads = []; const f = await page(base, { summary: async id => { reads.push(id); return { ...base, tradeId: id } }, refresh: () => old.promise });
  try { const pending = f.model.refresh(); f.props.options = { tradeId: '702' }; await settle(); old.reject(new Error('old original Trade transport failed')); await pending; assert.deepEqual(reads, ['701', '702']); assert.equal(f.model.data.value.tradeId, '702'); } finally { f.close(); }
});
test('a preparation completing after an object switch cannot launch payment for the next Trade', async () => {
  const old = deferred(), launches = []; const f = await page(waiting('701'), { summary: async id => waiting(id), prepare: () => old.promise, launch: async id => { launches.push(id); return { trade: waiting(id) } } });
  try { const pending = f.model.pay(); f.props.options = { tradeId: '702' }; await settle(); old.resolve({ trade: waiting('701'), launchReady: true }); await pending; assert.deepEqual(launches, []); assert.equal(f.model.data.value.tradeId, '702'); } finally { f.close(); }
});
test('confirmation of a cancellation dialog from the previous object cannot cancel it after switching', async () => {
  const cancellations = []; const f = await page(waiting('701'), { summary: async id => waiting(id), cancel: async id => { cancellations.push(id); return { trade: waiting(id) } } });
  try { f.model.cancel(); assert.equal(f.modals.length, 1); f.props.options = { tradeId: '702' }; await settle(); f.modals[0].success({ confirm: true }); await settle(); assert.deepEqual(cancellations, []); assert.equal(f.model.data.value.tradeId, '702'); } finally { f.close(); }
});
test('switching A to B and back to A does not revive an old preparation', async () => {
  const old = deferred(), launches = []; const f = await page(waiting('701'), { summary: async id => waiting(id), prepare: () => old.promise, launch: async id => { launches.push(id); return { trade: waiting(id) } } });
  try { const pending = f.model.pay(); f.props.options = { tradeId: '702' }; await settle(); f.props.options = { tradeId: '701' }; await settle(); old.resolve({ trade: waiting('701'), launchReady: true }); await pending; assert.deepEqual(launches, []); } finally { f.close(); }
});
test('the old action finishing cannot unlock an action belonging to the next object', async () => {
  const a = deferred(), b = deferred(), requests = []; const f = await page(base, { summary: async id => ({ ...base, tradeId: id }), refresh: id => { requests.push(id); return id === '701' ? a.promise : b.promise } });
  try { const first = f.model.refresh(); f.props.options = { tradeId: '702' }; await settle(); const second = f.model.refresh(); assert.deepEqual(requests, ['701', '702']); a.resolve({ trade: base }); await first; assert.equal(f.model.busy.value, true); b.resolve({ trade: { ...base, tradeId: '702' } }); await second; assert.equal(f.model.busy.value, false); assert.equal(f.model.data.value.tradeId, '702'); } finally { f.close(); }
});
test('a read started before a successful refresh cannot restore an older payable view', async () => {
  const old = deferred(); let calls = 0; const f = await page(waiting('701'), { summary: async () => ++calls === 1 ? waiting('701') : old.promise, refresh: async () => ({ trade: base }) });
  try { f.props.options = { tradeId: '701' }; await settle(); await f.model.refresh(); assert.equal(f.model.paid.value, true); old.resolve(waiting('701')); await settle(); assert.equal(f.model.paid.value, true); } finally { f.close(); }
});
test('a preparation response after logout cannot republish private data or launch a payment', async () => {
  const old = deferred(), launches = []; const f = await page(waiting('701'), { prepare: () => old.promise, launch: async id => { launches.push(id); return { trade: waiting(id) } } });
  try { const pending = f.model.pay(); f.owner.value = 'B:2'; old.resolve({ trade: waiting('701'), launchReady: true }); await pending; assert.deepEqual(launches, []); assert.equal(f.model.data.value, undefined); } finally { f.close(); }
});
