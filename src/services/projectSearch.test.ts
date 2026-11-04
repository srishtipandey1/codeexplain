import assert from 'node:assert/strict';
import test from 'node:test';
import type { FileItem } from '../components/FileExplorer';
import { buildProjectSearchIndex, rewriteSearchQuery, searchProjectIndex } from './projectSearch';

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

test('returns no results for empty or unrelated queries', () => {
  const index = buildProjectSearchIndex(files);

  assert.deepEqual(searchProjectIndex(index, '  '), []);
  assert.deepEqual(searchProjectIndex(index, 'weather forecast'), []);
});
