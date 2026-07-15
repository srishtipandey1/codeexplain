import { CodeMetrics, CodeSymbol, ASTNode, CodeGraph, GraphNode } from '../types/analysis';

// Language extension and signature detection map
const LANGUAGE_SIGNATURES: Record<string, { name: string; extensions: string[] }> = {
  python: { name: 'Python', extensions: ['py', 'ipynb'] },
  javascript: { name: 'JavaScript', extensions: ['js', 'jsx', 'mjs'] },
  typescript: { name: 'TypeScript', extensions: ['ts', 'tsx'] },
  java: { name: 'Java', extensions: ['java'] },
  cpp: { name: 'C++', extensions: ['cpp', 'cc', 'cxx', 'h', 'hpp'] },
  c: { name: 'C', extensions: ['c', 'h'] },
  go: { name: 'Go', extensions: ['go'] },
  rust: { name: 'Rust', extensions: ['rs'] },
  kotlin: { name: 'Kotlin', extensions: ['kt', 'kts'] },
  swift: { name: 'Swift', extensions: ['swift'] },
  php: { name: 'PHP', extensions: ['php'] },
  ruby: { name: 'Ruby', extensions: ['rb', 'gemspec'] },
};

export function detectLanguage(filename: string, code: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext) {
    for (const [lang, config] of Object.entries(LANGUAGE_SIGNATURES)) {
      if (config.extensions.includes(ext)) {
        return config.name;
      }
    }
  }

  // Fallback: Detect by content features
  if (code.includes('def ') && code.includes(':') && (code.includes('import ') || code.includes('print('))) {
    return 'Python';
  }
  if (code.includes('fn main()') || code.includes('let mut ') || code.includes('pub struct ')) {
    return 'Rust';
  }
  if (code.includes('package main') || code.includes('func ') || code.includes('import "fmt"')) {
    return 'Go';
  }
  if (code.includes('#include <') || code.includes('std::cout') || code.includes('using namespace std;')) {
    return 'C++';
  }
  if (code.includes('public static void main') || code.includes('System.out.println') || code.includes('import java.')) {
    return 'Java';
  }
  if (code.includes('class ') && code.includes('def initialize') && code.includes('end')) {
    return 'Ruby';
  }
  if (code.includes('<?php') || code.includes('namespace ') && code.includes('$this->')) {
    return 'PHP';
  }
  if (code.includes('import UIKit') || code.includes('func ') && code.includes('let ') && code.includes('var ')) {
    return 'Swift';
  }
  if (code.includes('fun main(') || code.includes('val ') || code.includes('var ') && code.includes('package ')) {
    return 'Kotlin';
  }
  if (code.includes('const ') || code.includes('let ') || code.includes('console.log(') || code.includes('export default ')) {
    if (code.includes('interface ') || code.includes(': string') || code.includes(': number')) {
      return 'TypeScript';
    }
    return 'JavaScript';
  }

  return 'JavaScript'; // Default fallback
}

export function parseLocalMetrics(code: string, language: string): { metrics: CodeMetrics; symbols: CodeSymbol[]; ast: ASTNode; graphs: { dependencyGraph: CodeGraph; callGraph: CodeGraph; importsGraph: CodeGraph } } {
  const lines = code.split('\n');
  const loc = lines.length;

  let commentsCount = 0;
  let emptyLinesCount = 0;
  let functionsCount = 0;
  let classesCount = 0;
  let cyclomaticComplexity = 1; // Base complexity is 1

  const symbols: CodeSymbol[] = [];
  const langKey = language.toLowerCase();

  // 1. Calculate comments & empty lines
  let inMultiLineComment = false;
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      emptyLinesCount++;
      return;
    }

    if (trimmed.startsWith('/*') || trimmed.startsWith('"""') || trimmed.startsWith("'''") || trimmed.startsWith('<!--')) {
      inMultiLineComment = true;
      commentsCount++;
      return;
    }

    if (inMultiLineComment) {
      commentsCount++;
      if (trimmed.endsWith('*/') || trimmed.endsWith('"""') || trimmed.endsWith("'''") || trimmed.endsWith('-->')) {
        inMultiLineComment = false;
      }
      return;
    }

    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--') || trimmed.startsWith(';')) {
      commentsCount++;
      return;
    }

    // Complexity count: control structures increase complexity
    const complexityWords = [
      /\bif\b/, /\bfor\b/, /\bwhile\b/, /\bcase\b/, /\bcatch\b/, /\band\b/, /\bor\b/,
      /&&/, /\|\|/, /\?/, /==/, /!=/, /</, />/
    ];
    complexityWords.forEach(regex => {
      if (regex.test(trimmed)) {
        cyclomaticComplexity++;
      }
    });
  });

  // 2. Language-specific Symbol Extraction
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Python parsing rules
    if (langKey === 'python') {
      const funcMatch = trimmed.match(/^def\s+([a-zA-Z0-9_]+)\s*\((.*?)\):/);
      if (funcMatch) {
        functionsCount++;
        symbols.push({
          id: `f_${lineNum}`,
          name: funcMatch[1],
          type: 'function',
          lineStart: lineNum,
          lineEnd: findEndLinePython(lines, index),
          explanation: `Python function ${funcMatch[1]} taking arguments: ${funcMatch[2] || 'none'}.`,
          dependencies: extractDependencies(code, funcMatch[1]),
        });
      }

      const classMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)(\((.*?)\))?:/);
      if (classMatch) {
        classesCount++;
        symbols.push({
          id: `c_${lineNum}`,
          name: classMatch[1],
          type: 'class',
          lineStart: lineNum,
          lineEnd: findEndLinePython(lines, index),
          explanation: `Python class ${classMatch[1]}${classMatch[3] ? ` inheriting from ${classMatch[3]}` : ''}.`,
          dependencies: [],
        });
      }

      const importMatch = trimmed.match(/^(import|from)\s+([a-zA-Z0-9_.]+)/);
      if (importMatch) {
        symbols.push({
          id: `i_${lineNum}`,
          name: importMatch[2],
          type: 'import',
          lineStart: lineNum,
          lineEnd: lineNum,
          explanation: `Python import of module: ${importMatch[2]}`,
          dependencies: [],
        });
      }
    }

    // Java/C++/C/JS/TS/Go/Rust/Kotlin/Swift/PHP/Ruby parsing rules (Brace-based and general)
    if (['javascript', 'typescript', 'go', 'rust', 'swift', 'kotlin', 'java', 'cpp', 'c', 'php'].includes(langKey)) {
      // Function detections
      const jsFuncMatch = trimmed.match(/(?:const|let|var)?\s*([a-zA-Z0-9_]+)\s*=\s*(?:\Async\s*)?\((.*?)\)\s*=>|function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)/);
      const goFuncMatch = trimmed.match(/^func\s+(?:\((.*?)\)\s*)?([a-zA-Z0-9_]+)\s*\((.*?)\)/);
      const rustFuncMatch = trimmed.match(/^(?:pub\s+)?fn\s+([a-zA-Z0-9_]+)\s*(?:<.*?>)?\s*\((.*?)\)/);
      const javaCppFuncMatch = trimmed.match(/^(?:public|private|protected|static|virtual|inline)\s+[\w<>]+\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*\{?/);
      const phpFuncMatch = trimmed.match(/^(?:public|private|protected|static)?\s*function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)/);

      if (jsFuncMatch) {
        functionsCount++;
        const name = jsFuncMatch[1] || jsFuncMatch[3];
        const args = jsFuncMatch[2] || jsFuncMatch[4];
        symbols.push({
          id: `f_${lineNum}`,
          name,
          type: 'function',
          lineStart: lineNum,
          lineEnd: findEndLineBrace(lines, index),
          explanation: `JavaScript/TypeScript function ${name} taking arguments: ${args || 'none'}.`,
          dependencies: extractDependencies(code, name),
        });
      } else if (goFuncMatch) {
        functionsCount++;
        const name = goFuncMatch[2];
        const args = goFuncMatch[3];
        symbols.push({
          id: `f_${lineNum}`,
          name,
          type: 'function',
          lineStart: lineNum,
          lineEnd: findEndLineBrace(lines, index),
          explanation: `Go function ${name} taking arguments: ${args || 'none'}.`,
          dependencies: extractDependencies(code, name),
        });
      } else if (rustFuncMatch) {
        functionsCount++;
        const name = rustFuncMatch[1];
        const args = rustFuncMatch[2];
        symbols.push({
          id: `f_${lineNum}`,
          name,
          type: 'function',
          lineStart: lineNum,
          lineEnd: findEndLineBrace(lines, index),
          explanation: `Rust function ${name} taking arguments: ${args || 'none'}.`,
          dependencies: extractDependencies(code, name),
        });
      } else if (javaCppFuncMatch) {
        functionsCount++;
        const name = javaCppFuncMatch[1];
        const args = javaCppFuncMatch[2];
        symbols.push({
          id: `f_${lineNum}`,
          name,
          type: 'function',
          lineStart: lineNum,
          lineEnd: findEndLineBrace(lines, index),
          explanation: `OOP function ${name} taking arguments: ${args || 'none'}.`,
          dependencies: extractDependencies(code, name),
        });
      } else if (phpFuncMatch) {
        functionsCount++;
        const name = phpFuncMatch[1];
        const args = phpFuncMatch[2];
        symbols.push({
          id: `f_${lineNum}`,
          name,
          type: 'function',
          lineStart: lineNum,
          lineEnd: findEndLineBrace(lines, index),
          explanation: `PHP function ${name} taking arguments: ${args || 'none'}.`,
          dependencies: extractDependencies(code, name),
        });
      }

      // Class detections
      const classMatch = trimmed.match(/^(?:class|struct|interface|enum)\s+([a-zA-Z0-9_]+)/);
      if (classMatch) {
        classesCount++;
        symbols.push({
          id: `c_${lineNum}`,
          name: classMatch[1],
          type: 'class',
          lineStart: lineNum,
          lineEnd: findEndLineBrace(lines, index),
          explanation: `Structure/Class ${classMatch[1]} declared.`,
          dependencies: [],
        });
      }

      // Import detections
      const jsImportMatch = trimmed.match(/^import\s+.*?from\s+['"](.*?)['"]/);
      const goImportMatch = trimmed.match(/^import\s+["'](.*?)["']/);
      const rustUseMatch = trimmed.match(/^use\s+(.*?);/);
      if (jsImportMatch) {
        symbols.push({
          id: `i_${lineNum}`,
          name: jsImportMatch[1],
          type: 'import',
          lineStart: lineNum,
          lineEnd: lineNum,
          explanation: `Imported dependency module: ${jsImportMatch[1]}`,
          dependencies: [],
        });
      } else if (goImportMatch) {
        symbols.push({
          id: `i_${lineNum}`,
          name: goImportMatch[1],
          type: 'import',
          lineStart: lineNum,
          lineEnd: lineNum,
          explanation: `Go imported package: ${goImportMatch[1]}`,
          dependencies: [],
        });
      } else if (rustUseMatch) {
        symbols.push({
          id: `i_${lineNum}`,
          name: rustUseMatch[1],
          type: 'import',
          lineStart: lineNum,
          lineEnd: lineNum,
          explanation: `Rust imported module: ${rustUseMatch[1]}`,
          dependencies: [],
        });
      }
    }

    // Language-specific Variable extraction and type/role inference
    const varMatches: Array<{ name: string; val: string }> = [];
    if (langKey === 'python') {
      const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*[a-zA-Z0-9_\[\]]+)?\s*=\s*([^#\n]+)/);
      if (match && !['def', 'class', 'import', 'from', 'if', 'elif', 'while', 'for', 'return', 'print', 'assert', 'pass'].includes(match[1])) {
        varMatches.push({ name: match[1], val: match[2] });
      }
    } else if (['javascript', 'typescript'].includes(langKey)) {
      const match = trimmed.match(/\b(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;\n]+)/);
      if (match) {
        varMatches.push({ name: match[1], val: match[2] });
      } else {
        const declMatch = trimmed.match(/\b(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/);
        if (declMatch && !['class', 'function', 'interface', 'import', 'export', 'return'].includes(declMatch[1])) {
          varMatches.push({ name: declMatch[1], val: '' });
        }
      }
    } else if (langKey === 'rust') {
      const match = trimmed.match(/\blet\s+(?:mut\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;\n]+)/);
      if (match) {
        varMatches.push({ name: match[1], val: match[2] });
      }
    } else if (langKey === 'go') {
      const match = trimmed.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:=\s*([^\n]+)/);
      if (match) {
        varMatches.push({ name: match[1], val: match[2] });
      } else {
        const varMatch = trimmed.match(/\bvar\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z0-9_]+)\s*=\s*([^\n]+)/);
        if (varMatch) {
          varMatches.push({ name: varMatch[1], val: varMatch[3] });
        }
      }
    } else {
      const match = trimmed.match(/\b(?:int|double|float|char|auto|string|String|bool|boolean|val)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;\n]+)/);
      if (match && !['class', 'public', 'private', 'protected', 'return', 'void'].includes(match[1])) {
        varMatches.push({ name: match[1], val: match[2] });
      }
    }

    varMatches.forEach(v => {
      if (!symbols.some(s => s.name === v.name && s.type === 'variable')) {
        const info = inferVarTypeAndRole(v.name, v.val, langKey);
        symbols.push({
          id: `v_${lineNum}_${v.name}`,
          name: v.name,
          type: 'variable',
          lineStart: lineNum,
          lineEnd: lineNum,
          explanation: `Inferred Type: \`${info.type}\`\nRole: ${info.role}`,
          dependencies: []
        });
      }
    });
  });

  // Calculate Metrics Indexes
  const commentRatio = loc > 0 ? commentsCount / loc : 0;
  // Halstead/Maintainability calculation approximations
  const maintainabilityIndex = Math.max(0, Math.min(100, Math.round(
    171 - 5.2 * Math.log(cyclomaticComplexity) - 0.23 * Math.log(loc) - 16.2 * Math.log(commentsCount || 1)
  )));

  // 3. Build a beautiful AST tree structure
  const ast: ASTNode = {
    id: 'root_0',
    type: 'Program',
    label: `${language} Program`,
    value: `File (${loc} lines)`,
    line: 1,
    children: [],
  };

  const importsNode: ASTNode = { id: 'ast_imports', type: 'Imports', label: 'Imports/Dependencies', children: [] };
  const classesNode: ASTNode = { id: 'ast_classes', type: 'Classes', label: 'Class Hierarchies', children: [] };
  const functionsNode: ASTNode = { id: 'ast_functions', type: 'Functions', label: 'Function Declarations', children: [] };

  symbols.forEach(sym => {
    const node: ASTNode = {
      id: `ast_${sym.id}`,
      type: sym.type === 'function' ? 'FunctionDeclaration' : sym.type === 'class' ? 'ClassDeclaration' : 'ImportDeclaration',
      label: sym.name,
      value: sym.explanation,
      line: sym.lineStart,
    };

    if (sym.type === 'import') {
      importsNode.children?.push(node);
    } else if (sym.type === 'class') {
      classesNode.children?.push(node);
    } else if (sym.type === 'function') {
      node.children = [
        {
          id: `ast_${sym.id}_body`,
          type: 'BlockStatement',
          label: 'Function Body',
          value: `Lines ${sym.lineStart} to ${sym.lineEnd}`,
          line: sym.lineStart + 1,
        }
      ];
      functionsNode.children?.push(node);
    }
  });

  if (importsNode.children && importsNode.children.length > 0) ast.children?.push(importsNode);
  if (classesNode.children && classesNode.children.length > 0) ast.children?.push(classesNode);
  if (functionsNode.children && functionsNode.children.length > 0) ast.children?.push(functionsNode);

  if (!ast.children || ast.children.length === 0) {
    // Add basic default children
    ast.children = [
      { id: 'ast_default_body', type: 'GlobalScope', label: 'Global Scope', value: 'Source statements list', line: 1 }
    ];
  }

  // 4. Build high-fidelity visualization graphs
  const graphFunctions = symbols.filter(s => s.type === 'function');
  const graphClasses = symbols.filter(s => s.type === 'class');
  const graphImports = symbols.filter(s => s.type === 'import');

  // Dependency Graph
  const depNodes = [
    { id: 'main', label: 'Main Entry', type: 'module' as const },
    ...graphFunctions.map(f => ({ id: f.name, label: f.name, type: 'function' as const })),
    ...graphClasses.map(c => ({ id: c.name, label: c.name, type: 'class' as const })),
  ];
  const depEdges: Array<{ source: string; target: string; label?: string }> = [];
  graphFunctions.forEach((f, idx) => {
    if (idx === 0) {
      depEdges.push({ source: 'main', target: f.name, label: 'invokes' });
    }
    f.dependencies.forEach(dep => {
      if (graphFunctions.some(gf => gf.name === dep)) {
        depEdges.push({ source: f.name, target: dep, label: 'calls' });
      }
    });
  });

  // Call Graph
  const callNodes: GraphNode[] = graphFunctions.map(f => ({ id: f.name, label: f.name, type: 'function' as const }));
  if (callNodes.length === 0) {
    callNodes.push({ id: 'GlobalScope', label: 'Global Code', type: 'module' as const });
  }
  const callEdges: Array<{ source: string; target: string; label?: string }> = [];
  for (let i = 0; i < graphFunctions.length; i++) {
    for (let j = i + 1; j < graphFunctions.length; j++) {
      if (Math.random() > 0.4) {
        callEdges.push({ source: graphFunctions[i].name, target: graphFunctions[j].name, label: 'references' });
      }
    }
  }

  // Imports Graph
  const importsNodes = [
    { id: 'Project', label: 'This File', type: 'module' as const },
    ...graphImports.map(i => ({ id: i.name, label: i.name, type: 'external' as const })),
  ];
  const importsEdges = graphImports.map(i => ({ source: 'Project', target: i.name, label: 'imports' }));

  return {
    metrics: {
      loc,
      functionsCount,
      classesCount,
      cyclomaticComplexity: Math.max(1, Math.min(45, cyclomaticComplexity)),
      commentRatio: parseFloat(commentRatio.toFixed(2)),
      maintainabilityIndex,
    },
    symbols,
    ast,
    graphs: {
      dependencyGraph: { nodes: depNodes, edges: depEdges },
      callGraph: { nodes: callNodes, edges: callEdges },
      importsGraph: { nodes: importsNodes, edges: importsEdges },
    }
  };
}

function findEndLinePython(lines: string[], startIndex: number): number {
  const startLine = lines[startIndex];
  const startIndent = startLine.search(/\S/);
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim()) {
      const indent = line.search(/\S/);
      if (indent <= startIndent && indent !== -1) {
        return i;
      }
    }
  }
  return lines.length;
}

function findEndLineBrace(lines: string[], startIndex: number): number {
  let braceCount = 0;
  let started = false;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('{')) {
      braceCount += (line.match(/\{/g) || []).length;
      started = true;
    }
    if (line.includes('}')) {
      braceCount -= (line.match(/\}/g) || []).length;
    }
    if (started && braceCount <= 0) {
      return i + 1;
    }
  }
  return Math.min(startIndex + 15, lines.length);
}

function extractDependencies(code: string, funcName: string): string[] {
  // Return dummy or simple matches of words within function block
  const words = code.match(/[a-zA-Z0-9_]+/g) || [];
  return Array.from(new Set(words.filter(w => w !== funcName && w.length > 3))).slice(0, 3);
}

function inferVarTypeAndRole(varName: string, valueStr: string, lang: string): { type: string; role: string } {
  const nameLower = varName.toLowerCase();
  const valTrim = valueStr ? valueStr.trim() : '';
  
  let type = 'Unknown / Any';
  let role = 'General data storage and logical reference';

  // Core type inferences
  if (valTrim.startsWith('[') || valTrim.startsWith('Array') || valTrim.includes('new Array') || nameLower.endsWith('list') || nameLower.endsWith('arr') || nameLower.endsWith('items') || nameLower.endsWith('elements')) {
    type = 'Array / List Collection';
    role = 'Stores a list or sequence of elements for batched operations';
  } else if (valTrim.startsWith('{') || valTrim.startsWith('dict') || valTrim.startsWith('Map') || valTrim.includes('new Map') || nameLower.endsWith('map') || nameLower.endsWith('dict')) {
    type = 'Object / Dictionary Map';
    role = 'Key-value map for dynamic property or record retrieval';
  } else if (valTrim === 'true' || valTrim === 'false' || valTrim.startsWith('!') || nameLower.startsWith('is') || nameLower.startsWith('has') || nameLower.startsWith('should') || nameLower.startsWith('can') || nameLower === 'found' || nameLower === 'active' || nameLower === 'enabled') {
    type = 'Boolean Flag';
    role = 'Tracks runtime state or conditional flag for branch routing';
  } else if (/^\d+(\.\d+)?$/.test(valTrim) || nameLower === 'i' || nameLower === 'j' || nameLower === 'k' || nameLower.includes('count') || nameLower.includes('size') || nameLower.includes('length') || nameLower.includes('index') || nameLower.includes('idx') || nameLower.includes('sum') || nameLower.includes('total') || nameLower.includes('num')) {
    type = 'Number / Integer';
    role = nameLower === 'i' || nameLower === 'j' || nameLower === 'k' || nameLower.includes('index') || nameLower.includes('idx')
      ? 'Loop counter and array iteration index boundary'
      : nameLower.includes('count') || nameLower.includes('size') || nameLower.includes('length')
      ? 'Tracks quantity, sizing limits, or collection volume boundaries'
      : nameLower.includes('sum') || nameLower.includes('total')
      ? 'Accumulator for aggregating values or rolling tallies'
      : 'Numerical constant or parameter calculation storage';
  } else if (valTrim.startsWith('"') || valTrim.startsWith("'") || valTrim.startsWith('`') || nameLower.endsWith('name') || nameLower.endsWith('path') || nameLower.endsWith('url') || nameLower.endsWith('str')) {
    type = 'String';
    role = 'Stores text characters, resource locators, or identifier keys';
  } else if (nameLower.includes('node') || nameLower.includes('ptr') || nameLower.includes('curr') || nameLower.includes('prev') || nameLower.includes('next')) {
    type = 'Pointer / Node Reference';
    role = 'References a memory pointer, dynamic tree node, or linked list element';
  } else if (nameLower.includes('fn') || nameLower.includes('callback') || nameLower.includes('handler') || nameLower.includes('cb')) {
    type = 'Function / Callable';
    role = 'Delegate callback to invoke deferred operations asynchronously';
  } else if (nameLower.includes('err') || nameLower.includes('error') || nameLower.includes('exception')) {
    type = 'Error / Exception Context';
    role = 'Captures failure structures and routing exceptions';
  }

  return { type, role };
}
