export interface CodeMetrics {
  loc: number;
  functionsCount: number;
  classesCount: number;
  cyclomaticComplexity: number;
  commentRatio: number;
  maintainabilityIndex: number;
}

export interface CodeSymbol {
  id: string;
  name: string;
  type: 'function' | 'class' | 'variable' | 'import';
  lineStart: number;
  lineEnd: number;
  explanation: string;
  dependencies: string[];
}

export interface ASTNode {
  id: string;
  type: string;
  label: string;
  value?: string;
  line?: number;
  children?: ASTNode[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'function' | 'class' | 'variable' | 'module' | 'external';
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface CodeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AnalysisReport {
  language: string;
  metrics: CodeMetrics;
  symbols: CodeSymbol[];
  ast: ASTNode;
  overview: {
    purpose: string;
    howItWorks: string;
    executionFlow: string;
  };
  explanation: {
    stepByStep: string[];
    lineByLine: Array<{ line: number; code: string; explanation: string }>;
  };
  complexity: {
    time: string;
    space: string;
    timeExplanation: string;
    spaceExplanation: string;
  };
  quality: {
    bugs: string[];
    edgeCases: string[];
    securityConcerns: string[];
    performanceImprovements: string[];
    cleanCodeSuggestions: string[];
  };
  refactored: {
    code: string;
    changes: string[];
  };
  personas: {
    beginner: string;
    expert: string;
    interview: string;
  };
  graphs: {
    dependencyGraph: CodeGraph;
    callGraph: CodeGraph;
    importsGraph: CodeGraph;
  };
  summary: string;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'predict_output' | 'bug_finding' | 'complexity' | 'completion';
  question: string;
  codeSnippet?: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
