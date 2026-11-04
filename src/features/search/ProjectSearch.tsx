import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Search, Sparkles } from 'lucide-react';
import type { FileItem } from '../../components/FileExplorer';
import { buildProjectSearchIndex, expandSearchQueryLocally, extractProjectConcepts, rewriteSearchQuery, searchProjectIndex, type ProjectSearchKind } from './searchEngine';

interface ProjectSearchProps {
  files: FileItem[];
  onOpenResult: (filePath: string, line: number) => void;
}

const EXAMPLE_QUERIES = [
  'where is input validated',
  'how are errors handled',
  'find sorting logic',
  'how do I configure deployment',
];

export default function ProjectSearch({ files, onOpenResult }: ProjectSearchProps) {
  const [query, setQuery] = useState('');
  const [localExpansions, setLocalExpansions] = useState<string[]>([]);
  const [searchKind, setSearchKind] = useState<ProjectSearchKind | 'all'>('all');
  const searchIndex = useMemo(() => buildProjectSearchIndex(files), [files]);
  const concepts = useMemo(() => extractProjectConcepts(searchIndex), [searchIndex]);
  const rewrittenQuery = useMemo(() => rewriteSearchQuery(query), [query]);
  const results = useMemo(
    () => searchProjectIndex(searchIndex, query, 8, searchKind),
    [searchIndex, query, searchKind],
  );
  const fileCounts = useMemo(() => {
    const counts = { code: 0, documentation: 0 };
    const countFiles = (items: FileItem[]) => {
      for (const file of items) {
        if (file.isDirectory) {
          countFiles(file.children ?? []);
        } else if (file.content.trim()) {
          if (/\.(md|mdx|rst|txt)$/i.test(file.path)) counts.documentation++;
          else counts.code++;
        }
      }
    };
    countFiles(files);
    return counts;
  }, [files]);
  const searchedFileCount = searchKind === 'all' ? fileCounts.code + fileCounts.documentation : fileCounts[searchKind];

  useEffect(() => {
    setLocalExpansions([]);
  }, [query]);

  const handleLocalExpansion = () => {
    setLocalExpansions(expandSearchQueryLocally(query));
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Local project search</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Search code and documentation
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Find matching code or project docs by concept. Results are ranked locally; use Chat for questions and explanations.
        </p>
      </header>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search concepts, functions, errors, or setup…"
          aria-label="Search code and documentation"
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-3 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-violet-500"
        />
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleLocalExpansion}
          disabled={!query.trim()}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/70"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Suggest related terms (local)
        </button>
        {localExpansions.length > 0 && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900 dark:bg-violet-950/20">
            <p className="text-xs font-semibold text-violet-800 dark:text-violet-300">Local NLP query suggestions</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {localExpansions.map(expansion => (
                <button
                  key={expansion}
                  type="button"
                  onClick={() => setQuery(expansion)}
                  className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-left text-xs text-zinc-700 hover:border-violet-400 dark:border-violet-900 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  {expansion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Search scope">
        {([
          { id: 'all', label: `All (${fileCounts.code + fileCounts.documentation})` },
          { id: 'code', label: `Code (${fileCounts.code})` },
          { id: 'documentation', label: `Docs (${fileCounts.documentation})` },
        ] as const).map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSearchKind(option.id)}
            aria-pressed={searchKind === option.id}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${searchKind === option.id
              ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
              : 'border-zinc-200 bg-white text-zinc-600 hover:border-violet-300 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {rewrittenQuery && rewrittenQuery !== query.trim().toLowerCase() && (
        <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Search terms: <span className="font-mono text-zinc-700 dark:text-zinc-300">{rewrittenQuery}</span>
        </p>
      )}

      {concepts.length > 0 && (
        <section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Concepts found in code</h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Heuristic matches</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {concepts.map(concept => (
              <button
                key={concept.label}
                onClick={() => setQuery(concept.query)}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:border-violet-300 hover:text-violet-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:text-violet-300"
                title={`Found in ${concept.fileCount} file${concept.fileCount === 1 ? '' : 's'} across ${concept.chunkCount} code sections`}
              >
                {concept.label}
                <span className="text-zinc-400 dark:text-zinc-500">
                  {concept.fileCount} {concept.fileCount === 1 ? 'file' : 'files'}
                </span>
              </button>
            ))}
          </div>
        </section>
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
            <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Relevant {searchKind === 'documentation' ? 'documentation' : searchKind === 'code' ? 'code' : 'files'}
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {results.length} results across {searchedFileCount} files
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
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                        {result.kind === 'documentation' ? 'Documentation' : 'Code'}
                      </span>
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
              No matching {searchKind === 'documentation' ? 'documentation' : searchKind === 'code' ? 'code' : 'files'} found. Try different wording or another search scope.
            </p>
          )}
        </section>
      )}

      <p className="border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        BM25 search and concept-based query suggestions run locally. No external API or paid service is used for project search.
      </p>
    </div>
  );
}
