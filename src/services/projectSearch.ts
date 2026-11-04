import type { FileItem } from '../components/FileExplorer';

export interface ProjectSearchResult {
  filePath: string;
  symbol: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  score: number;
  matchedTerms: string[];
}

interface SearchDocument extends ProjectSearchResult {
  tokens: string[];
}

export interface ProjectSearchIndex {
  documents: SearchDocument[];
  averageLength: number;
  documentFrequencies: Map<string, number>;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'does', 'for', 'from',
  'how', 'i', 'in', 'is', 'it', 'me', 'of', 'on', 'or', 'the', 'this',
  'to', 'what', 'where', 'which', 'who', 'why', 'with',
]);

const CONCEPT_GROUPS = [
  ['validate', 'validation', 'valid', 'sanitize', 'sanitization', 'input', 'guard'],
  ['error', 'exception', 'failure', 'catch', 'throw', 'raise'],
  ['auth', 'authentication', 'authorization', 'permission', 'token', 'login'],
  ['cache', 'caching', 'memoize', 'memoization', 'ttl'],
  ['sort', 'sorting', 'order', 'ordering', 'merge', 'quick'],
  ['test', 'testing', 'assert', 'assertion', 'mock', 'fixture'],
  ['parse', 'parsing', 'parser', 'decode', 'deserialize'],
];

const DECLARATION_PATTERN =
  /^\s*(?:(?:export|default|async|public|private|protected|static|final|abstract)\s+)*(?:def|fn|func|function|class|interface|struct|enum|type|const|let|var)\s+([A-Za-z_$][\w$]*)/;

function tokenize(value: string): string[] {
  const camelCaseSeparated = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const matches = camelCaseSeparated.toLowerCase().match(/[a-z][a-z0-9]*/g) ?? [];
  return matches
    .map(token => {
      if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3);
      if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2);
      if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
      if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
      return token;
    })
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

function expandQueryTerms(query: string): Set<string> {
  const terms = new Set(tokenize(query));
  for (const group of CONCEPT_GROUPS) {
    const normalizedGroup = group.flatMap(tokenize);
    const matchesGroup = [...terms].some(term =>
      normalizedGroup.some(alias => term === alias || (term.length >= 4 && alias.startsWith(term.slice(0, 4))))
    );
    if (matchesGroup) {
      normalizedGroup.forEach(term => terms.add(term));
    }
  }
  return terms;
}

function createFileChunks(file: FileItem): SearchDocument[] {
  if (file.isDirectory || !file.content.trim()) return [];

  const lines = file.content.split(/\r?\n/);
  const declarations = lines.flatMap((line, index) => {
    const match = line.match(DECLARATION_PATTERN);
    return match ? [{ line: index, indent: line.length - line.trimStart().length, name: match[1] }] : [];
  });

  const ranges: Array<{ start: number; end: number; symbol: string }> = [];
  if (declarations.length) {
    declarations.forEach((declaration, index) => {
      const nextDeclaration = declarations.slice(index + 1).find(candidate => candidate.indent <= declaration.indent);
      const end = Math.min(nextDeclaration?.line ?? lines.length, declaration.line + 79);
      ranges.push({ start: declaration.line, end, symbol: declaration.name });
    });
  } else {
    const chunkSize = 60;
    const overlap = 10;
    for (let start = 0; start < lines.length; start += chunkSize - overlap) {
      ranges.push({
        start,
        end: Math.min(lines.length, start + chunkSize),
        symbol: file.name,
      });
    }
  }

  return ranges.map(({ start, end, symbol }) => {
    const content = lines.slice(start, end).join('\n');
    const searchableText = `${file.path} ${symbol} ${content}`;
    return {
      filePath: file.path,
      symbol,
      lineStart: start + 1,
      lineEnd: end,
      snippet: lines.slice(start, Math.min(end, start + 8)).join('\n'),
      score: 0,
      matchedTerms: [],
      tokens: tokenize(searchableText),
    };
  });
}

function flattenFiles(files: FileItem[]): FileItem[] {
  return files.flatMap(file => [file, ...(file.children ? flattenFiles(file.children) : [])]);
}

export function buildProjectSearchIndex(files: FileItem[]): ProjectSearchIndex {
  const documents = flattenFiles(files).flatMap(createFileChunks);
  const averageLength = documents.reduce((sum, document) => sum + document.tokens.length, 0) / documents.length || 1;
  const documentFrequencies = new Map<string, number>();
  for (const document of documents) {
    for (const term of new Set(document.tokens)) {
      documentFrequencies.set(term, (documentFrequencies.get(term) ?? 0) + 1);
    }
  }
  return { documents, averageLength, documentFrequencies };
}

const QUERY_FILLER_WORDS = new Set([
  'can', 'code', 'could', 'did', 'do', 'find', 'function', 'functions', 'give', 'logic',
  'method', 'methods', 'please', 'show', 'source', 'tell', 'that', 'we', 'you',
]);

export function rewriteSearchQuery(query: string): string {
  return [...new Set(tokenize(query).filter(token => !QUERY_FILLER_WORDS.has(token)))].join(' ');
}

export function searchProjectIndex(index: ProjectSearchIndex, query: string, limit = 8): ProjectSearchResult[] {
  const queryTerms = expandQueryTerms(rewriteSearchQuery(query));
  if (queryTerms.size === 0) return [];

  const { documents, averageLength, documentFrequencies } = index;
  if (documents.length === 0) return [];

  const scored = documents.map(document => {
    const frequencies = new Map<string, number>();
    for (const token of document.tokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);

    let score = 0;
    const matchedTerms: string[] = [];
    for (const term of queryTerms) {
      const frequency = frequencies.get(term) ?? 0;
      if (!frequency) continue;

      matchedTerms.push(term);
      const documentFrequency = documentFrequencies.get(term) ?? 0;
      const inverseFrequency = Math.log(1 + (documents.length - documentFrequency + 0.5) / (documentFrequency + 0.5));
      const lengthNormalization = 1.2 * (1 - 0.75 + 0.75 * document.tokens.length / averageLength);
      score += inverseFrequency * (frequency * 2.2) / (frequency + lengthNormalization);
    }

    return { ...document, score, matchedTerms };
  });

  return scored
    .filter(document => document.score > 0)
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath))
    .slice(0, limit)
    .map(({ tokens: _tokens, ...result }) => result);
}
