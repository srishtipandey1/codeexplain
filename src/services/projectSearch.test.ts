import assert from 'node:assert/strict';
import test from 'node:test';
import type { FileItem } from '../components/FileExplorer';
import { buildProjectSearchIndex, extractProjectConcepts, rewriteSearchQuery, searchProjectIndex } from './projectSearch';

const files: FileItem[] = [
  {
    name: 'auth.py',
    path: 'auth.py',
    isDirectory: false,
    content: [
      'def validate_user_input(value):',
      '    if not value:',
      '        raise ValueError("required")',
      '    return value.strip()',
      '',
      'def handle_error(error):',
      '    return str(error)',
    ].join('\n'),
  },
  {
    name: 'sorting.py',
    path: 'sorting.py',
    isDirectory: false,
    content: [
      'def merge_sort(items):',
      '    return sorted(items)',
    ].join('\n'),
  },
  {
    name: 'guide.md',
    path: 'docs/guide.md',
    isDirectory: false,
    content: [
      '# Project guide',
      'An overview of the workspace.',
      '',
      '## Deployment',
      'Run npm run build to create production assets.',
    ].join('\n'),
  },
];

test('ranks a matching function for a natural-language query and preserves source lines', () => {
  const index = buildProjectSearchIndex(files);
  const results = searchProjectIndex(index, 'where is user input validated');

  assert.equal(results[0]?.symbol, 'validate_user_input');
  assert.equal(results[0]?.filePath, 'auth.py');
  assert.equal(results[0]?.lineStart, 1);
  assert.ok(results[0]?.matchedTerms.includes('input'));
});

test('expands related error-handling terminology', () => {
  const results = searchProjectIndex(buildProjectSearchIndex(files), 'where do we handle errors');

  assert.equal(results[0]?.symbol, 'handle_error');
});

test('rewrites natural-language framing into concise, deduplicated search terms', () => {
  assert.equal(rewriteSearchQuery('Where can I find the code that sorts a list?'), 'sort list');
  assert.equal(rewriteSearchQuery('show me user input, user input'), 'user input');
  assert.equal(rewriteSearchQuery('where do we handle errors'), 'handle error');
  assert.equal(rewriteSearchQuery('please show me code'), '');
});

test('searches with the rewritten query terms', () => {
  const results = searchProjectIndex(
    buildProjectSearchIndex(files),
    'Could you show me the function that sorts a list?',
  );

  assert.equal(results[0]?.symbol, 'merge_sort');
});

test('extracts code concepts with file and chunk counts', () => {
  const concepts = extractProjectConcepts(buildProjectSearchIndex(files));

  assert.deepEqual(
    concepts.map(({ label, fileCount }) => ({ label, fileCount })),
    [
      { label: 'Error handling', fileCount: 1 },
      { label: 'Input validation', fileCount: 1 },
      { label: 'Sorting', fileCount: 1 },
    ],
  );
  assert.ok(concepts.every(concept => concept.chunkCount > 0));
});

test('searches heading-based documentation chunks and filters by content type', () => {
  const index = buildProjectSearchIndex(files);
  const documentationResults = searchProjectIndex(index, 'how do I build for deployment', 8, 'documentation');
  const codeResults = searchProjectIndex(index, 'how do I build for deployment', 8, 'code');
  const allResults = searchProjectIndex(index, 'how do I build for deployment');

  assert.equal(documentationResults[0]?.filePath, 'docs/guide.md');
  assert.equal(documentationResults[0]?.kind, 'documentation');
  assert.equal(documentationResults[0]?.symbol, 'Deployment');
  assert.equal(documentationResults[0]?.lineStart, 4);
  assert.equal(codeResults.length, 0);
  assert.equal(allResults[0]?.kind, 'documentation');
});

test('returns no results for empty or unrelated queries', () => {
  const index = buildProjectSearchIndex(files);

  assert.deepEqual(searchProjectIndex(index, '  '), []);
  assert.deepEqual(searchProjectIndex(index, 'weather forecast'), []);
});
