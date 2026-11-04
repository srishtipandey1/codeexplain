import { useMemo } from 'react';
import { runSearchEvaluation } from './searchEvaluation';

const METRICS = [
  { key: 'precisionAtK', label: 'Precision@3', description: 'Relevant results in the top three' },
  { key: 'recallAtK', label: 'Recall@3', description: 'Known relevant results recovered' },
  { key: 'meanReciprocalRank', label: 'MRR', description: 'How early the first relevant result appears' },
  { key: 'ndcgAtK', label: 'NDCG@3', description: 'Rank-aware relevance quality' },
] as const;

export default function SearchEvaluationPanel() {
  const report = useMemo(() => runSearchEvaluation(), []);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Information retrieval benchmark</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Evaluate search quality
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          A reproducible, human-labeled benchmark tests the local BM25 baseline across code and documentation. AI-generated expansions are not included in these scores.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {METRICS.map(metric => (
          <article key={metric.key} className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{metric.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {report.metrics[metric.key].toFixed(3)}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">{metric.description}</p>
          </article>
        ))}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Benchmark cases</h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {report.queryCount} queries · {report.corpusFileCount} files · {report.corpusChunkCount} chunks
          </span>
        </div>
        <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
          {report.cases.map(item => (
            <div key={item.query} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{item.query}</p>
              <span className={`text-xs font-medium ${item.firstRelevantRank ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {item.firstRelevantRank ? `Relevant result at rank ${item.firstRelevantRank}` : 'No relevant result in top 3'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
        This is a curated 11-query smoke benchmark for demonstrating standard retrieval metrics—not a claim of broad real-world accuracy. Add judged queries from target repositories before comparing systems or reporting general performance.
      </p>
    </div>
  );
}
