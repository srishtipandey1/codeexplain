import type { FileItem } from '../components/FileExplorer';

export type ProjectSearchKind = 'code' | 'documentation';

export interface ProjectConcept {
  label: string;
  query: string;
  fileCount: number;
  chunkCount: number;
}

export interface ProjectSearchResult {
  filePath: string;
  kind: ProjectSearchKind;
  symbol: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  score: number;
  matchedTerms: string[];
}

interface SearchDocument extends ProjectSearchResult {
  tokens: string[];
  concepts: string[];
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
  { label: 'Input validation', query: 'validate input', terms: ['validate', 'validation', 'valid', 'sanitize', 'sanitization', 'input', 'guard'] },
  { label: 'Error handling', query: 'error handling', terms: ['error', 'exception', 'failure', 'catch', 'throw', 'raise'] },
  { label: 'Authentication', query: 'authentication', terms: ['auth', 'authentication', 'authorization', 'permission', 'token', 'login'] },
  { label: 'Caching', query: 'caching', terms: ['cache', 'caching', 'memoize', 'memoization', 'ttl'] },
  { label: 'Sorting', query: 'sorting', terms: ['sort', 'sorting', 'order', 'ordering', 'merge', 'quick'] },
  { label: 'Testing', query: 'testing', terms: ['test', 'testing', 'assert', 'assertion', 'mock', 'fixture'] },
  { label: 'Parsing', query: 'parsing', terms: ['parse', 'parsing', 'parser', 'decode', 'deserialize'] },
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
    const normalizedGroup = group.terms.flatMap(tokenize);
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
  const kind: ProjectSearchKind = /\.(md|mdx|rst|txt)$/i.test(file.path) ? 'documentation' : 'code';
  const ranges: Array<{ start: number; end: number; symbol: string }> = [];

  if (kind === 'documentation') {
    const headings = lines.flatMap((line, index) => {
      const match = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      return match ? [{ line: index, title: match[2] }] : [];
    });
    const sectionStarts = headings.length ? headings.map(heading => heading.line) : [0];
    if (sectionStarts[0] > 0) sectionStarts.unshift(0);

    sectionStarts.forEach((start, index) => {
      const sectionEnd = sectionStarts[index + 1] ?? lines.length;
      const heading = headings.find(item => item.line === start);
      for (let chunkStart = start; chunkStart < sectionEnd; chunkStart += 60) {
        const end = Math.min(sectionEnd, chunkStart + 60);
        ranges.push({
          start: chunkStart,
          end,
          symbol: heading?.title ?? file.name,
        });
      }
    });
  } else {
    const declarations = lines.flatMap((line, index) => {
      const match = line.match(DECLARATION_PATTERN);
      return match ? [{ line: index, indent: line.length - line.trimStart().length, name: match[1] }] : [];
    });

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
        ranges.push({ start, end: Math.min(lines.length, start + chunkSize), symbol: file.name });
      }
    }
  }

  return ranges.map(({ start, end, symbol }) => {
    const content = lines.slice(start, end).join('\n');
    const contentTerms = new Set(tokenize(content));
    const concepts = kind === 'code'
      ? CONCEPT_GROUPS
        .filter(group => group.terms.flatMap(tokenize).some(term => contentTerms.has(term)))
        .map(group => group.label)
      : [];
    const searchableText = `${file.path} ${symbol} ${content}`;
    return {
      filePath: file.path,
      kind,
      symbol,
      lineStart: start + 1,
      lineEnd: end,
      snippet: lines.slice(start, Math.min(end, start + 8)).join('\n'),
      score: 0,
      matchedTerms: [],
      tokens: tokenize(searchableText),
      concepts,
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

export function extractProjectConcepts(index: ProjectSearchIndex): ProjectConcept[] {
  return CONCEPT_GROUPS.map(({ label, query }) => {
    const matchingDocuments = index.documents.filter(document => document.concepts.includes(label));
    return {
      label,
      query,
      fileCount: new Set(matchingDocuments.map(document => document.filePath)).size,
      chunkCount: matchingDocuments.length,
    };
  })
    .filter(concept => concept.chunkCount > 0)
    .sort((left, right) => right.chunkCount - left.chunkCount || left.label.localeCompare(right.label));
}

const QUERY_FILLER_WORDS = new Set([
  'can', 'code', 'could', 'did', 'do', 'find', 'function', 'functions', 'give', 'logic',
  'method', 'methods', 'please', 'show', 'source', 'tell', 'that', 'we', 'you',
]);

export function rewriteSearchQuery(query: string): string {
  return [...new Set(tokenize(query).filter(token => !QUERY_FILLER_WORDS.has(token)))].join(' ');
}

export function searchProjectIndex(
  index: ProjectSearchIndex,
  query: string,
  limit = 8,
  kind: ProjectSearchKind | 'all' = 'all',
): ProjectSearchResult[] {
  const queryTerms = expandQueryTerms(rewriteSearchQuery(query));
  if (queryTerms.size === 0) return [];

  const documents = kind === 'all'
    ? index.documents
    : index.documents.filter(document => document.kind === kind);
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
      const documentFrequency = index.documentFrequencies.get(term) ?? 0;
      const inverseFrequency = Math.log(1 + (index.documents.length - documentFrequency + 0.5) / (documentFrequency + 0.5));
      const lengthNormalization = 1.2 * (1 - 0.75 + 0.75 * document.tokens.length / index.averageLength);
      score += inverseFrequency * (frequency * 2.2) / (frequency + lengthNormalization);
    }

    return { ...document, score, matchedTerms };
  });

  return scored
    .filter(document => document.score > 0)
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath))
    .slice(0, limit)
    .map(({ tokens: _tokens, concepts: _concepts, ...result }) => result);
}
