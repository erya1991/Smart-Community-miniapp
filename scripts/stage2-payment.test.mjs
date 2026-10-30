import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import * as vue from 'vue';

// Component-only evidence. No login, backend request, build output, or WeChat claim.
const source = fs.readFileSync(new URL('../apps/resident-miniapp/src/features/mall/Stage2Payment.vue', import.meta.url), 'utf8');
const code = ts.transpileModule(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport {data,paid,title,status}', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
async function page(trade) {
  const owner = vue.ref('A:1'), module = { exports: {} }, scope = vue.effectScope();
  scope.run(() => vm.runInNewContext(code, {
    module, exports: module.exports, defineProps: () => vue.reactive({ options: { tradeId: '701' }, visible: true }),
    Date, Number, Math, Error, performance: { now: () => 1000 }, setInterval: () => 1, clearInterval() {}, uni: {},
    require: id => id === 'vue' ? { ...vue, onUnmounted() {} }
      : id.endsWith('/stage2-mall') ? { stage2Mall: { summary: async () => structuredClone(trade) } }
        : id.endsWith('/stage2-http') ? { stage2Owner: () => owner.value } : {},
  }));
  await new Promise(resolve => setImmediate(resolve));
  return { model: module.exports, owner, close: () => scope.stop() };
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
