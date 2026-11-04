import type { FileItem } from '../../components/FileExplorer';
import { buildProjectSearchIndex, searchProjectIndex } from './searchEngine';

const BENCHMARK_FILES: FileItem[] = [
  {
    name: 'auth.ts',
    path: 'src/auth.ts',
    isDirectory: false,
    content: [
      'export function validateUserInput(value: string) {',
      '  if (!value) throw new Error("required");',
      '  return value.trim();',
      '}',
      '',
      'export function authenticateUser(token: string) {',
      '  return verifyToken(token);',
      '}',
    ].join('\n'),
  },
  {
    name: 'cache.ts',
    path: 'src/cache.ts',
    isDirectory: false,
    content: [
      'export function evictExpiredEntries(cache, now: number) {',
      '  for (const [key, entry] of cache) {',
      '    if (entry.expiresAt <= now) cache.delete(key);',
      '  }',
      '}',
      '',
      'export function calculateCacheExpiry(now: number, ttlMs: number) {',
      '  return now + ttlMs;',
      '}',
    ].join('\n'),
  },
  {
    name: 'sort.ts',
    path: 'src/sort.ts',
    isDirectory: false,
    content: [
      'export function mergeSort(items: number[]) {',
      '  return [...items].sort((a, b) => a - b);',
      '}',
      '',
      'export function quickSort(items: number[]) {',
      '  return [...items].sort((a, b) => a - b);',
      '}',
    ].join('\n'),
  },
  {
    name: 'requestParser.ts',
    path: 'src/requestParser.ts',
    isDirectory: false,
    content: [
      'export function parseRequestBody(body: string) {',
      '  return JSON.parse(body);',
      '}',
    ].join('\n'),
  },
  {
    name: 'network.ts',
    path: 'src/network.ts',
    isDirectory: false,
    content: [
      'export async function retryFailedRequest(request, maxRetries: number) {',
      '  for (let attempt = 0; attempt < maxRetries; attempt++) {',
      '    try { return await request(); } catch (error) {',
      '      if (attempt === maxRetries - 1) throw error;',
      '    }',
      '  }',
      '}',
    ].join('\n'),
  },
  {
    name: 'README.md',
    path: 'README.md',
    isDirectory: false,
    content: [
      '# Demo project',
      'A sample workspace for retrieval evaluation.',
      '',
      '## Setup',
      'Install Node.js and dependencies with npm install before getting started.',
      '',
      '## Testing',
      'Run the automated test suite with npm test.',
      '',
      '## Deployment',
      'Run the production build with npm run build before deploying.',
    ].join('\n'),
  },
];

const BENCHMARK_QUERIES = [
  {
    query: 'Where is user data validated?',
    relevant: ['src/auth.ts::validateUserInput'],
  },
  {
    query: 'How are login tokens authenticated?',
    relevant: ['src/auth.ts::authenticateUser'],
  },
  {
    query: 'How does code remove expired cache items?',
    relevant: ['src/cache.ts::evictExpiredEntries'],
  },
  {
    query: 'Where is cache expiry calculated from a TTL?',
    relevant: ['src/cache.ts::calculateCacheExpiry'],
  },
  {
    query: 'Which code sorts a list from smallest to largest?',
    relevant: ['src/sort.ts::mergeSort'],
  },
  {
    query: 'Where is the quick sort algorithm?',
    relevant: ['src/sort.ts::quickSort'],
  },
  {
    query: 'How are JSON request bodies parsed?',
    relevant: ['src/requestParser.ts::parseRequestBody'],
  },
  {
    query: 'How are failed requests retried?',
    relevant: ['src/network.ts::retryFailedRequest'],
  },
  {
    query: 'How do I install dependencies?',
    relevant: ['README.md::Setup'],
  },
  {
    query: 'Which command runs tests?',
    relevant: ['README.md::Testing'],
  },
  {
    query: 'How to build before production deployment?',
    relevant: ['README.md::Deployment'],
  },
];

export interface SearchEvaluationMetrics {
  precisionAtK: number;
  recallAtK: number;
  meanReciprocalRank: number;
  ndcgAtK: number;
}

export interface SearchEvaluationCase {
  query: string;
  relevantCount: number;
  relevantFound: number;
  firstRelevantRank: number | null;
  metrics: {
    precisionAtK: number;
    recallAtK: number;
    reciprocalRank: number;
    ndcgAtK: number;
  };
}

export interface SearchEvaluationReport {
  k: number;
  corpusFileCount: number;
  corpusChunkCount: number;
  queryCount: number;
  metrics: SearchEvaluationMetrics;
  cases: SearchEvaluationCase[];
}

export function runSearchEvaluation(k = 3): SearchEvaluationReport {
  if (!Number.isInteger(k) || k < 1) {
    throw new RangeError('Evaluation cutoff must be a positive integer.');
  }

  const index = buildProjectSearchIndex(BENCHMARK_FILES);
  const cases = BENCHMARK_QUERIES.map(({ query, relevant }) => {
    const relevantSet = new Set(relevant);
    const results = searchProjectIndex(index, query, k);
    const ranks = results.flatMap((result, index) =>
      relevantSet.has(`${result.filePath}::${result.symbol}`) ? [index + 1] : [],
    );
    const relevantFound = ranks.length;
    const firstRelevantRank = ranks[0] ?? null;
    const dcg = ranks.reduce((sum, rank) => sum + 1 / Math.log2(rank + 1), 0);
    const idealRelevantCount = Math.min(relevant.length, k);
    const idealDcg = Array.from({ length: idealRelevantCount }, (_, index) =>
      1 / Math.log2(index + 2),
    ).reduce((sum, value) => sum + value, 0);

    return {
      query,
      relevantCount: relevant.length,
      relevantFound,
      firstRelevantRank,
      metrics: {
        precisionAtK: relevantFound / k,
        recallAtK: relevantFound / relevant.length,
        reciprocalRank: firstRelevantRank ? 1 / firstRelevantRank : 0,
        ndcgAtK: idealDcg ? dcg / idealDcg : 0,
      },
    };
  });

  const average = (metric: 'precisionAtK' | 'recallAtK' | 'ndcgAtK') =>
    cases.reduce((sum, item) => sum + item.metrics[metric], 0) / cases.length;
  const meanReciprocalRank =
    cases.reduce((sum, item) => sum + item.metrics.reciprocalRank, 0) / cases.length;

  return {
    k,
    corpusFileCount: BENCHMARK_FILES.length,
    corpusChunkCount: index.documents.length,
    queryCount: cases.length,
    metrics: {
      precisionAtK: average('precisionAtK'),
      recallAtK: average('recallAtK'),
      meanReciprocalRank,
      ndcgAtK: average('ndcgAtK'),
    },
    cases,
  };
}
