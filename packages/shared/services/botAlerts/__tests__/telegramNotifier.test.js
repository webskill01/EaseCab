'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createTelegramNotifier } = require('../telegramNotifier');

test('returns null when token or chat id is missing', () => {
  assert.equal(createTelegramNotifier({ token: '', chatId: '1' }), null);
  assert.equal(createTelegramNotifier({ token: 't', chatId: undefined }), null);
});

test('posts the text to the chat, and a failed send never throws or logs the token', async () => {
  const calls = [];
  const warns = [];
  const notify = createTelegramNotifier({
    token: 'SECRET',
    chatId: '42',
    logger: { warn: (...a) => warns.push(a) },
    fetchImpl: async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body) }); throw new Error(`boom ${url}`); },
  });

  await notify('hello');

  assert.deepEqual(calls[0].body, { chat_id: '42', text: 'hello' });
  assert.equal(warns.length, 1);
  assert.ok(!JSON.stringify(warns).includes('SECRET'));
});
