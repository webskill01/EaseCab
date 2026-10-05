'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createManualLlm } = require('../manualLlm');

const CATALOG = [{ id: 'c-hdw', name: 'Haridwar' }, { id: 'c-chd', name: 'Chandigarh' }];

test('maps answered strings to catalog ids by city name (case-insensitive)', async () => {
  const llm = createManualLlm({ hardiwar: 'haridwar', chd: 'Chandigarh', ajitwal: null });
  const m = await llm.resolveBatch(['hardiwar', 'chd', 'ajitwal', 'unanswered'], CATALOG);
  assert.deepStrictEqual([...m], [['hardiwar', 'c-hdw'], ['chd', 'c-chd']]);
});

test('a name outside the catalog is skipped, never invented', async () => {
  const llm = createManualLlm({ kasol: 'Kasol' });
  const m = await llm.resolveBatch(['kasol'], CATALOG);
  assert.strictEqual(m.size, 0);
  assert.deepStrictEqual(llm.unknownNames(), ['Kasol']);
});
