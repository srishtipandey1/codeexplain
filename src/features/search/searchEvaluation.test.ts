import assert from 'node:assert/strict';
import test from 'node:test';
import { runSearchEvaluation } from './searchEvaluation';

test('evaluates a labeled code-and-documentation benchmark with retrieval metrics', () => {
  const report = runSearchEvaluation(3);

  assert.equal(report.corpusFileCount, 6);
  assert.equal(report.queryCount, 11);
  assert.ok(report.corpusChunkCount > report.corpusFileCount);
  assert.ok(report.metrics.precisionAtK >= 0 && report.metrics.precisionAtK <= 1);
  assert.ok(report.metrics.recallAtK >= 0 && report.metrics.recallAtK <= 1);
  assert.ok(report.metrics.meanReciprocalRank >= 0 && report.metrics.meanReciprocalRank <= 1);
  assert.ok(report.metrics.ndcgAtK >= 0 && report.metrics.ndcgAtK <= 1);
  assert.ok(report.metrics.recallAtK >= 0.7);
  assert.ok(report.metrics.meanReciprocalRank >= 0.7);
});

test('rejects invalid evaluation cutoffs', () => {
  assert.throws(() => runSearchEvaluation(0), RangeError);
  assert.throws(() => runSearchEvaluation(1.5), RangeError);
});
