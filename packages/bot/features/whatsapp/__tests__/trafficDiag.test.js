'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTrafficDiag } = require('../trafficDiag');

test('counts frames, upserts and decrypt failures, then resets on flush', () => {
  const d = createTrafficDiag();
  d.stanza({ attrs: { from: '120363000000000000@g.us' } });
  d.stanza({ attrs: { from: '919876543210@s.whatsapp.net' } });
  d.upsert([
    { message: { conversation: 'hi' } },
    { messageStubType: 1, messageStubParameters: ['Bad MAC'] },
    { messageStubType: 1, messageStubParameters: ['Bad MAC'] },
  ], 'notify');
  d.upsert([{ messageStubType: 21, messageStubParameters: ['Taxi 98765 43210'] }], 'append'); // group rename
  d.pass();

  assert.deepEqual(d.flush(), {
    stanzas: 2, groupStanzas: 1, upserts: 4, notify: 3, noBody: 3, passed: 1, failures: { 'Bad MAC': 2, stub_21: 1 },
  });
  assert.deepEqual(d.flush(), { stanzas: 0, groupStanzas: 0, upserts: 0, notify: 0, noBody: 0, passed: 0, failures: {} });
});
