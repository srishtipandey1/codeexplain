import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import type { FileItem } from './FileExplorer';
import { buildProjectSearchIndex, rewriteSearchQuery, searchProjectIndex } from '../services/projectSearch';

interface ProjectSearchProps {
  files: FileItem[];
  onOpenResult: (filePath: string, line: number) => void;
}

const EXAMPLE_QUERIES = [
  'where is input validated',
  'how are errors handled',
  'find sorting logic',
];

export default function ProjectSearch({ files, onOpenResult }: ProjectSearchProps) {
  const [query, setQuery] = useState('');
  const searchIndex = useMemo(() => buildProjectSearchIndex(files), [files]);
  const rewrittenQuery = useMemo(() => rewriteSearchQuery(query), [query]);
  const results = useMemo(() => searchProjectIndex(searchIndex, query), [searchIndex, query]);
  const fileCount = useMemo(() => {
    const countFiles = (items: FileItem[]): number => items.reduce(
      (count, file) => count + (file.isDirectory
        ? countFiles(file.children ?? [])
        : Number(Boolean(file.content.trim()))),
      0,
    );
    return countFiles(files);
  }, [files]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Workspace search</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Find code by intent
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Describe behavior or a concept to find relevant functions across your files.
        </p>
      </header>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="e.g. where is user input checked?"
          aria-label="Search code by natural language"
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-3 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-violet-500"
        />
      </label>

      {rewrittenQuery && rewrittenQuery !== query.trim().toLowerCase() && (
        <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Search terms: <span className="font-mono text-zinc-700 dark:text-zinc-300">{rewrittenQuery}</span>
        </p>
      )}

      {!query.trim() ? (
        <section>
          <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Try a search</h3>
          <div className="mt-2 flex flex-col gap-2">
            {EXAMPLE_QUERIES.map(example => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm text-zinc-600 transition-colors hover:border-violet-300 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:text-violet-300"
              >
                {example}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section aria-live="polite">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Relevant code</h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {results.length} results across {fileCount} files
            </span>
          </div>
          {results.length ? (
            <div className="flex flex-col gap-3">
              {results.map((result, index) => (
                <article
                  key={`${result.filePath}:${result.lineStart}:${result.symbol}`}
                  className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400" title={result.filePath}>
                        {result.filePath}
                      </p>
                      <h4 className="mt-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {result.symbol}
                      </h4>
                    </div>
                    <span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                      {index + 1}
                    </span>
                  </div>
                  <pre className="mt-3 max-h-32 overflow-hidden rounded-lg bg-zinc-50 p-2.5 font-mono text-xs leading-5 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                    <code>{result.snippet}</code>
                  </pre>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                      Matched {result.matchedTerms.slice(0, 4).join(', ')}
                    </p>
                    <button
                      onClick={() => onOpenResult(result.filePath, result.lineStart)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
                    >
                      Open line {result.lineStart}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm leading-6 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
              No matching code found. Try describing a function, identifier, or behavior using different words.
            </p>
          )}
        </section>
      )}

      <p className="border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Queries are simplified locally; BM25 ranks matching code chunks. Source stays in this workspace.
      </p>
    </div>
  );
}
