import assert from 'node:assert/strict';
import test from 'node:test';
import { expandCodeSearchQuery } from './groq';

test('uses structured Groq output and returns unique trimmed query alternatives', async t => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GROQ_API_KEY;
  let requestBody: {
    response_format?: { type?: string };
    messages?: Array<{ content: string }>;
  } | undefined;
  process.env.GROQ_API_KEY = 'test-key';
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body ?? '{}'));
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            queries: [' validate input ', 'check user data', 'validate input'],
          }),
        },
      }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalApiKey;
  });

  const expansions = await expandCodeSearchQuery('where is input validated');

  assert.deepEqual(expansions, ['validate input', 'check user data']);
  assert.equal(requestBody?.response_format?.type, 'json_schema');
  assert.match(requestBody?.messages?.[1]?.content, /where is input validated/);
});
