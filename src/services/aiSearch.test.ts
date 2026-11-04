import assert from 'node:assert/strict';
import test from 'node:test';
import { expandSearchQuery } from './aiSearch';

test('sends only the user query to the AI expansion endpoint', async t => {
  const originalFetch = globalThis.fetch;
  let requestBody = '';
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body ?? '');
    return new Response(JSON.stringify({ queries: ['validate user input', 'sanitize request data'] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const queries = await expandSearchQuery('where is input checked');

  assert.deepEqual(queries, ['validate user input', 'sanitize request data']);
  assert.deepEqual(JSON.parse(requestBody), { query: 'where is input checked' });
});

test('surfaces API errors without disguising them as successful expansions', async t => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Groq key is missing' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(expandSearchQuery('find validation'), /Groq key is missing/);
});
