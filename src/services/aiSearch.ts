export async function expandSearchQuery(query: string): Promise<string[]> {
  const response = await fetch('/api/search/expand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const payload = await response.json().catch(() => null) as { queries?: unknown; error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || `AI query expansion failed (${response.status}).`);
  }
  if (!payload || !Array.isArray(payload.queries) || !payload.queries.every(item => typeof item === 'string')) {
    throw new Error('The server returned an invalid AI query expansion response.');
  }
  return payload.queries;
}
