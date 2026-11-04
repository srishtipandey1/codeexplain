import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Terminal, Code, Cpu, ShieldAlert, Award, FileText,
  RotateCcw, Copy, Check, ChevronRight, MessageSquare, Flame, 
  HelpCircle, Sliders, Play, Maximize2, Minimize2, RefreshCw,
  Search, ListCollapse, Command, Sun, Moon, Info, Zap, HelpCircle as QuizIcon,
  XCircle, X
} from 'lucide-react';

import CommandPalette from './components/CommandPalette';
import FileExplorer, { FileItem, SAMPLE_CODE_TEMPLATES } from './components/FileExplorer';
import InteractiveVisualization from './components/InteractiveVisualization';
import QuizPanel from './components/QuizPanel';
import ExportUtility from './components/ExportUtility';
import { AnalysisReport, QuizQuestion, ChatMessage } from './types/analysis';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(240); // px
  const [rightPanelWidth, setRightPanelWidth] = useState(480); // px
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  // File structure state
  const [files, setFiles] = useState<FileItem[]>([
    {
      name: 'sorting_example.py',
      path: 'sorting_example.py',
      content: SAMPLE_CODE_TEMPLATES.python.content,
      isDirectory: false
    }
  ]);
  const [selectedPath, setSelectedPath] = useState('sorting_example.py');
  const [selectedFileContent, setSelectedFileContent] = useState(SAMPLE_CODE_TEMPLATES.python.content);
  const [editorLanguage, setEditorLanguage] = useState('python');

  // Analysis Result cache
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'overview' | 'explanation' | 'quality' | 'optimize' | 'visuals' | 'quiz'>('overview');

  // Click-to-Explain inline state
  const [clickedLine, setClickedLine] = useState<{ line: number; explanation: string } | null>(null);

  // Synchronized AI + Editor Interaction features
  const [selectedContext, setSelectedContext] = useState<{
    name: string;
    type: 'function' | 'variable' | 'class' | 'import';
    code: string;
    lineStart: number;
    lineEnd: number;
  } | null>(null);
  const [isExplainingFunc, setIsExplainingFunc] = useState(false);
  const [highlightedSymbol, setHighlightedSymbol] = useState<string | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const reportRef = useRef<AnalysisReport | null>(null);

  useEffect(() => {
    reportRef.current = analysisReport;
  }, [analysisReport]);

  const getFallbackVariableInfo = (name: string) => {
    const nameLower = name.toLowerCase();
    if (['i', 'j', 'k', 'idx', 'index'].includes(nameLower)) {
      return { type: 'Integer', role: 'Loop iteration counter / Array index' };
    }
    if (['temp', 'tmp', 'swap'].includes(nameLower)) {
      return { type: 'Temporary storage', role: 'Intermediate value placeholder for variable swaps' };
    }
    if (['sum', 'total', 'accumulator'].includes(nameLower)) {
      return { type: 'Number', role: 'Aggregator to compute running totals' };
    }
    if (['count', 'cnt', 'size', 'len', 'length'].includes(nameLower)) {
      return { type: 'Integer', role: 'Tracks size, length, or boundary counts' };
    }
    if (['err', 'error', 'exception'].includes(nameLower)) {
      return { type: 'Error Object', role: 'Tracks failure state or exception data' };
    }
    if (['isactive', 'found', 'ok', 'success', 'flag'].includes(nameLower)) {
      return { type: 'Boolean', role: 'Conditional state flag' };
    }
    return null;
  };

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isQuizLoading, setIsQuizLoading] = useState(false);

  // Chat memory state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Monaco editor reference
  const editorRef = useRef<any>(null);

  // Shortcut triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update theme class
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sync editor content when selected file changes
  const activeFile = files.find(f => f.path === selectedPath);
  useEffect(() => {
    if (activeFile) {
      setSelectedFileContent(activeFile.content);
      // Auto-detect Monaco editor language
      const ext = activeFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'py') setEditorLanguage('python');
      else if (ext === 'js' || ext === 'jsx') setEditorLanguage('javascript');
      else if (ext === 'ts' || ext === 'tsx') setEditorLanguage('typescript');
      else if (ext === 'rs') setEditorLanguage('rust');
      else if (ext === 'go') setEditorLanguage('go');
      else if (ext === 'java') setEditorLanguage('java');
      else if (ext === 'cpp' || ext === 'hpp') setEditorLanguage('cpp');
      else if (ext === 'c') setEditorLanguage('c');
      else if (ext === 'rb') setEditorLanguage('ruby');
      else if (ext === 'php') setEditorLanguage('php');
      else if (ext === 'kt') setEditorLanguage('kotlin');
      else if (ext === 'swift') setEditorLanguage('swift');
      else setEditorLanguage('javascript');

      // Clear selected interaction state on file change
      setSelectedContext(null);
      if (editorRef.current && decorationsRef.current.length > 0) {
        editorRef.current.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
      setHighlightedSymbol(null);
    }
  }, [selectedPath, files]);

  // Scroll chat window to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setSelectedFileContent(value);
      // Update in-memory file structure
      setFiles(prev => prev.map(f => f.path === selectedPath ? { ...f, content: value } : f));
    }
  };

  // Register Monaco line clicking
  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    
    // Add single-click line click explanation lookup
    editor.onMouseDown((e: any) => {
      if (e.target.position) {
        const lineNum = e.target.position.lineNumber;
        handleEditorLineClick(lineNum);
      }
    });

    // Register hover providers for variable type & role inference!
    const languages = [
      'python', 'javascript', 'typescript', 'go', 'rust', 
      'java', 'cpp', 'c', 'php', 'ruby', 'kotlin', 'swift'
    ];
    languages.forEach(lang => {
      monaco.languages.registerHoverProvider(lang, {
        provideHover: (model, position) => {
          const report = reportRef.current;
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const varName = word.word;
          // Search in report symbols (prefer variables matching this name, or any matched symbol)
          let matchedSymbol = null;
          if (report && report.symbols) {
            matchedSymbol = report.symbols.find(
              (sym: any) => sym.name === varName && sym.type === 'variable' && position.lineNumber >= sym.lineStart && position.lineNumber <= sym.lineEnd
            ) || report.symbols.find(
              (sym: any) => sym.name === varName && position.lineNumber >= sym.lineStart && position.lineNumber <= sym.lineEnd
            ) || report.symbols.find(
              (sym: any) => sym.name === varName
            );
          }

          if (!matchedSymbol) {
            const fallback = getFallbackVariableInfo(varName);
            if (fallback) {
              return {
                range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                contents: [
                  { value: `**Variable:** \`${varName}\` *(Inferred local)*` },
                  { value: `**Type:** \`${fallback.type}\`` },
                  { value: `**Role:** ${fallback.role}` },
                ]
              };
            }
            return null;
          }

          const title = matchedSymbol.type === 'variable' ? `Variable: \`${varName}\`` : `${matchedSymbol.type.toUpperCase()}: \`${varName}\``;
          const linesText = matchedSymbol.lineStart === matchedSymbol.lineEnd
            ? `Line ${matchedSymbol.lineStart}`
            : `Lines ${matchedSymbol.lineStart} to ${matchedSymbol.lineEnd}`;

          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**${title}**` },
              { value: `**Inferred Role & Type:**` },
              { value: `${matchedSymbol.explanation}` },
              { value: `*Scope: ${linesText}*` }
            ]
          };
        }
      });
    });
  };

  const handleEditorLineClick = (lineNum: number) => {
    if (!analysisReport) return;

    // Check if line falls within a function symbol
    const activeFunc = analysisReport.symbols.find(
      sym => sym.type === 'function' && lineNum >= sym.lineStart && lineNum <= sym.lineEnd
    );

    if (activeFunc) {
      const funcCode = selectedFileContent.split('\n').slice(activeFunc.lineStart - 1, activeFunc.lineEnd).join('\n');
      setSelectedContext({
        name: activeFunc.name,
        type: 'function',
        code: funcCode,
        lineStart: activeFunc.lineStart,
        lineEnd: activeFunc.lineEnd
      });
      setClickedLine(null);

      // Trigger automatic focused AI explanation of this function only
      explainFunctionOnly(activeFunc.name, activeFunc.lineStart, activeFunc.lineEnd, funcCode);
    } else {
      // Check if it's a class declaration line
      const activeClass = analysisReport.symbols.find(
        sym => sym.type === 'class' && lineNum >= sym.lineStart && lineNum <= sym.lineEnd
      );

      if (activeClass) {
        const classCode = selectedFileContent.split('\n').slice(activeClass.lineStart - 1, activeClass.lineEnd).join('\n');
        setSelectedContext({
          name: activeClass.name,
          type: 'class',
          code: classCode,
          lineStart: activeClass.lineStart,
          lineEnd: activeClass.lineEnd
        });
        setClickedLine(null);
      } else {
        // Default clicked line explanation bubble
        const lineExplanation = analysisReport.explanation.lineByLine.find(l => l.line === lineNum);
        if (lineExplanation) {
          setClickedLine({
            line: lineNum,
            explanation: lineExplanation.explanation
          });
        } else {
          setClickedLine({
            line: lineNum,
            explanation: `Line ${lineNum}: Active statement executing logic in execution frame.`
          });
        }
      }
    }
  };

  const explainFunctionOnly = async (funcName: string, start: number, end: number, funcCode: string) => {
    setIsExplainingFunc(true);
    setIsChatExpanded(true);

    const loadingId = `explain_loading_${Date.now()}`;
    setChatMessages(prev => [
      ...prev,
      {
        id: loadingId,
        role: 'assistant',
        content: `### 🔍 Focused AI Explanation: \`${funcName}()\` (Lines ${start} to ${end})\nAnalyzing parameter signatures and control-flow complexity...`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedFileContent,
          language: editorLanguage,
          history: [],
          message: `Explain the function \`${funcName}\` only. Focus strictly on its code:
\`\`\`${editorLanguage}
${funcCode}
\`\`\`
Provide:
1. **Core Purpose**: What this function achieves.
2. **Step-by-Step Logic**: Brief, clear description of the operations.
3. **Complexity Profile**: Time and space complexity details for this block.
Keep it elegant, technical, and directly focused on the function.`
        })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();

      setChatMessages(prev => prev.map(msg => msg.id === loadingId ? {
        ...msg,
        content: data.response
      } : msg));
    } catch (err) {
      setChatMessages(prev => prev.map(msg => msg.id === loadingId ? {
        ...msg,
        content: `### ❌ Error\nFailed to generate focused explanation for function \`${funcName}\`. Please try again.`
      } : msg));
    } finally {
      setIsExplainingFunc(false);
    }
  };

  const handleToggleDependencies = (symbolName: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    if (highlightedSymbol === symbolName) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      setHighlightedSymbol(null);
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    // Word boundaries find match
    const matches = model.findMatches(symbolName, true, false, true, null, false);
    const newDecorations = matches.map((match: any) => ({
      range: match.range,
      options: {
        isWholeLine: true,
        className: 'bg-violet-500/10 border-l-4 border-violet-500 dark:border-violet-400 dark:bg-violet-500/15',
        marginClassName: 'bg-violet-500/20'
      }
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
    setHighlightedSymbol(symbolName);

    if (matches.length > 0) {
      editor.revealLineInCenter(matches[0].range.startLineNumber);
    }
  };

  // Trigger analysis pipeline
  const runAnalysisPipeline = async () => {
    setIsAnalyzing(true);
    setClickedLine(null);
    setQuizQuestions([]);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedFileContent,
          filename: activeFile?.name || 'code_input',
          language: editorLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Analysis request failed (${response.status}).`);
      }

      const report: AnalysisReport = await response.json();
      setAnalysisReport(report);
      setActiveAnalysisTab('overview');
      
      // Auto-populate chat welcoming context
      setChatMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `### Welcome to CodeExplain analysis! 🚀
I've successfully calculated metrics, parsed the AST, and generated deep diagnostic cards for **${report.language}** code.

* **Loc:** ${report.metrics.loc} lines
* **Cyclomatic Complexity:** ${report.metrics.cyclomaticComplexity}
* **Maintainability Index:** ${report.metrics.maintainabilityIndex}/100

Feel free to ask follow-up questions! Try clicking **"Can this be optimized?"** or **"Explain recursion."** in the pills below.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } catch (err) {
      console.error('Analysis request failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to analyze the code. Check the server output for details.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Chat message submit
  const sendChatMessage = async (presetPrompt?: string) => {
    const textToSend = presetPrompt || chatInput;
    if (!textToSend.trim() || isChatSending) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!presetPrompt) setChatInput('');
    setIsChatSending(true);

    try {
      // Intercept message with context
      let apiMessage = textToSend;
      if (selectedContext) {
        apiMessage = `[CONTEXT: Focusing on ${selectedContext.type} \`${selectedContext.name}\` (Lines ${selectedContext.lineStart} to ${selectedContext.lineEnd}). Code block:\n\`\`\`${editorLanguage}\n${selectedContext.code}\n\`\`\`]\n\nQuestion: ${textToSend}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedFileContent,
          language: editorLanguage,
          history: chatMessages.concat(userMsg),
          message: apiMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `AI service request failed (${response.status}).`);
      }

      const data = await response.json();
      setChatMessages(prev => [...prev, {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        id: `ai_err_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to fetch explanation from AI service.'}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Generate Coding Quiz
  const handleGenerateQuiz = async (difficulty: 'easy' | 'medium' | 'hard') => {
    setIsQuizLoading(true);
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedFileContent,
          language: editorLanguage,
          difficulty
        })
      });

      if (!response.ok) throw new Error('Quiz generation failed.');
      const data = await response.json();
      setQuizQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
      alert('Failed to generate interactive quiz.');
    } finally {
      setIsQuizLoading(false);
    }
  };

  // Specific Action dispatchers
  const runPresetAction = async (action: string) => {
    if (action === 'analyze') {
      runAnalysisPipeline();
    } else if (action === 'optimize') {
      setIsAnalyzing(true);
      try {
        const res = await fetch('/api/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: selectedFileContent, language: editorLanguage })
        });
        const data = await res.json();
        // Insert optimized code into files
        setFiles(prev => prev.map(f => f.path === selectedPath ? { ...f, content: data.optimizedCode } : f));
        setSelectedFileContent(data.optimizedCode);
        alert('Code optimized successfully inside Editor!');
      } catch (e) {
        alert('Failed to optimize.');
      } finally {
        setIsAnalyzing(false);
      }
    } else if (action === 'refactor') {
      setIsAnalyzing(true);
      try {
        const res = await fetch('/api/refactor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: selectedFileContent, language: editorLanguage })
        });
        const data = await res.json();
        setFiles(prev => prev.map(f => f.path === selectedPath ? { ...f, content: data.refactoredCode } : f));
        setSelectedFileContent(data.refactoredCode);
        alert('Code refactored and updated cleanly!');
      } catch (e) {
        alert('Failed to refactor.');
      } finally {
        setIsAnalyzing(false);
      }
    } else if (action === 'quiz') {
      setActiveAnalysisTab('quiz');
      handleGenerateQuiz('medium');
    } else if (action === 'complexity') {
      setActiveAnalysisTab('overview');
      runAnalysisPipeline();
    } else if (action === 'clear') {
      setFiles([{ name: 'sorting_example.py', path: 'sorting_example.py', content: SAMPLE_CODE_TEMPLATES.python.content, isDirectory: false }]);
      setSelectedPath('sorting_example.py');
      setAnalysisReport(null);
      setChatMessages([]);
      setClickedLine(null);
    }
  };

  // Replace editor code with refactored code block
  const handleApplyRefactoring = () => {
    if (analysisReport?.refactored?.code) {
      setFiles(prev => prev.map(f => f.path === selectedPath ? { ...f, content: analysisReport.refactored.code } : f));
      setSelectedFileContent(analysisReport.refactored.code);
      setClickedLine(null);
    }
  };

  return (
    <div className={`flex h-screen w-screen flex-col overflow-hidden font-sans ${isDarkMode ? 'dark bg-[#09090b] text-zinc-100' : 'bg-zinc-50 text-zinc-800'}`}>
      
      {/* 1. Header Navigation Bar */}
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-5 dark:border-zinc-800 dark:bg-[#09090b] shrink-0 select-none shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm">
            <Code className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans text-base font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">CodeExplain</span>
            <span className="text-[11px] text-zinc-500 font-mono font-bold leading-none">/ workspace / core-engine</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Command Palette Hint */}
          <button
            onClick={() => setIsCmdOpen(true)}
            className="flex items-center gap-2.5 rounded-lg border border-zinc-300 bg-zinc-50/50 px-3.5 py-2 text-sm font-bold text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200 transition-all cursor-pointer shadow-sm"
          >
            <Command className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">Command Menu</span>
            <kbd className="hidden sm:inline-flex items-center rounded-md border border-zinc-300 bg-zinc-100 px-2 py-0.5 font-mono text-[10px] dark:border-zinc-800 dark:bg-zinc-850 text-zinc-500 font-bold">Ctrl+K</kbd>
          </button>

          {/* Quick Run Trigger */}
          <button
            onClick={runAnalysisPipeline}
            disabled={isAnalyzing}
            className="flex items-center gap-2 rounded-lg bg-zinc-950 px-5 py-2 text-sm font-extrabold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all shadow-md cursor-pointer active:scale-[0.98]"
          >
            {isAnalyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analyze Code
          </button>

          {/* Light/Dark Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Toggle Visual Theme"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* 2. Three-Column Resizable Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Column: File Explorer */}
        <aside className="hidden md:flex flex-col select-none" style={{ width: `${leftPanelWidth}px` }}>
          <FileExplorer
            files={files}
            selectedPath={selectedPath}
            onSelectFile={(f) => setSelectedPath(f.path)}
            onAddFile={(name, content, isDir) => {
              const newFile: FileItem = { name, path: name, content, isDirectory: isDir };
              setFiles(prev => [...prev, newFile]);
              if (!isDir) setSelectedPath(name);
            }}
            onDeleteFile={(p) => {
              setFiles(prev => prev.filter(f => f.path !== p));
              if (selectedPath === p) setSelectedPath('');
            }}
            onUploadZip={(extracted) => {
              setFiles(extracted);
              if (extracted.length > 0) {
                setSelectedPath(extracted[0].path);
              }
            }}
          />
        </aside>

        {/* Center Column: Monaco Editor + Bottom Chat Drawer */}
        <main className="flex-1 flex flex-col min-w-0 border-r border-zinc-200 bg-white dark:bg-[#09090b] dark:border-zinc-800">
          
          {/* Active File Tab Header */}
          <div className="flex h-11 items-center justify-between border-b border-zinc-200/60 px-4 bg-zinc-50/50 dark:bg-zinc-950/20 select-none">
            <span className="font-mono text-sm text-zinc-500 dark:text-zinc-400 font-bold truncate max-w-[250px]">
              {activeFile?.name || 'pasted_input'} &bull; <span className="uppercase text-xs text-zinc-500 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md font-bold">{editorLanguage}</span>
            </span>
            <div className="flex gap-2">
              <span className="text-xs text-zinc-400 font-mono font-medium">Double-click or click line to inspect details</span>
            </div>
          </div>

          {/* Interactive Symbol Navigator Bar */}
          {analysisReport && analysisReport.symbols && (
            <div className="flex items-center gap-3 px-4 h-10 border-b border-zinc-200/60 bg-zinc-100/50 dark:bg-zinc-950/10 select-none overflow-x-auto shrink-0">
              <span className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest shrink-0">Registry:</span>
              <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
                {analysisReport.symbols
                  .filter(sym => ['function', 'class', 'variable'].includes(sym.type))
                  .map(sym => {
                    const isSelected = selectedContext?.name === sym.name;
                    const isHighlighted = highlightedSymbol === sym.name;

                    let typeBg = 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700';
                    let labelPrefix = '';

                    if (sym.type === 'function') {
                      typeBg = isSelected
                        ? 'bg-violet-600 text-white dark:bg-violet-500'
                        : 'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-900/40';
                      labelPrefix = 'ƒ ';
                    } else if (sym.type === 'class') {
                      typeBg = isSelected
                        ? 'bg-amber-600 text-white dark:bg-amber-500'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-900/40';
                      labelPrefix = 'class ';
                    } else if (sym.type === 'variable') {
                      typeBg = isHighlighted
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                        : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800';
                      labelPrefix = 'var ';
                    }

                    return (
                      <button
                        key={sym.id}
                        onClick={() => {
                          if (sym.type === 'variable') {
                            handleToggleDependencies(sym.name);
                          } else {
                            if (editorRef.current) {
                              editorRef.current.revealLineInCenter(sym.lineStart);
                              handleEditorLineClick(sym.lineStart);
                            }
                          }
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-bold font-mono shrink-0 transition-all flex items-center gap-1.5 border border-transparent cursor-pointer ${typeBg}`}
                        title={
                          sym.type === 'variable'
                            ? `Click to toggle line highlights. Inferred Type/Role: ${sym.explanation}`
                            : `Click to jump to line ${sym.lineStart} & analyze ${sym.type}`
                        }
                      >
                        <span>{labelPrefix}</span>
                        <strong className="font-extrabold">{sym.name}</strong>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Monaco Editor Container */}
          <div className="flex-1 relative min-h-[220px]">
            <Editor
              height="100%"
              language={editorLanguage}
              theme={isDarkMode ? 'vs-dark' : 'light'}
              value={selectedFileContent}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, monospace',
                minimap: { enabled: false },
                lineNumbers: 'on',
                bracketPairColorization: { enabled: true },
                wordWrap: 'on',
                automaticLayout: true,
                padding: { top: 12 }
              }}
            />

            {/* Click-to-Explain line popup card */}
            <AnimatePresence>
              {clickedLine && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute bottom-4 left-4 right-4 z-20 rounded-xl border border-zinc-200 bg-white/95 p-5 shadow-xl backdrop-blur-md dark:border-zinc-850 dark:bg-zinc-950/95"
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-2.5 dark:border-zinc-850">
                    <span className="flex items-center gap-2 text-sm font-extrabold text-zinc-900 dark:text-zinc-100 font-sans">
                      <Zap className="h-4 w-4 text-violet-500" /> Line {clickedLine.line} Inspector
                    </span>
                    <button 
                      onClick={() => setClickedLine(null)} 
                      className="rounded-lg px-2.5 py-1 text-zinc-500 hover:bg-zinc-105 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white text-xs font-bold transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="text-sm text-zinc-700 leading-relaxed dark:text-zinc-200 font-bold">
                    {clickedLine.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Panel: AI Chat with Session memory */}
          <div className={`border-t border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/40 flex flex-col transition-all duration-200 ${
            isChatExpanded ? 'h-[550px]' : 'h-[340px]'
          }`}>
            {/* Chat Controls bar */}
            <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-5 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 select-none">
              <span className="flex items-center gap-2.5 text-base font-extrabold text-zinc-700 dark:text-zinc-200">
                <MessageSquare className="h-5 w-5 text-violet-500" /> Conversational Memory Chat
              </span>
              <button
                onClick={() => setIsChatExpanded(!isChatExpanded)}
                className="rounded-md p-2 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <ListCollapse className="h-5 w-5" />
              </button>
            </div>

            {/* Chat conversation list */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                  <Terminal className="h-10 w-10 text-zinc-400 dark:text-zinc-500 mb-4" />
                  <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                    Pasted or uploaded code? Click "Analyze Code" above, or ask follow-up questions to trace control limits.
                  </span>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex flex-col max-w-[85%] rounded-2xl px-5 py-3.5 text-sm md:text-[15px] shadow-sm border ${
                    msg.role === 'user'
                      ? 'bg-violet-600 border-violet-700 text-white self-end'
                      : 'bg-white border-zinc-200/80 text-zinc-850 self-start dark:bg-zinc-900/60 dark:border-zinc-800 dark:text-zinc-100'
                  }`}>
                    <span className={`text-xs font-extrabold font-mono uppercase tracking-widest mb-2 ${
                      msg.role === 'user' ? 'text-violet-100' : 'text-violet-600 dark:text-violet-400'
                    }`}>
                      {msg.role === 'user' ? 'You' : 'CodeExplain AI'}
                    </span>
                    <div className={`prose prose-sm md:prose-base font-sans leading-relaxed whitespace-pre-wrap break-words ${
                      msg.role === 'user' ? 'text-white prose-invert font-medium' : 'text-zinc-800 dark:text-zinc-100 dark:prose-invert font-medium'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isChatSending && (
                <div className="bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3.5 text-sm md:text-[15px] font-bold text-zinc-400 self-start animate-pulse">
                  AI is thinking...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Contextual Active Code Selection Bar */}
            {selectedContext && (
              <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/50 flex items-center justify-between text-sm font-extrabold text-zinc-700 dark:text-zinc-200 gap-4 shrink-0 shadow-sm">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="h-3 w-3 rounded-full bg-violet-500 animate-pulse animate-duration-1000" />
                  <span className="truncate text-sm font-bold">
                    Focus: <strong className="text-zinc-900 dark:text-white font-mono text-xs">{selectedContext.name}()</strong> <span className="text-zinc-500 dark:text-zinc-400 font-normal">({selectedContext.type}, lines {selectedContext.lineStart}-{selectedContext.lineEnd})</span>
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleToggleDependencies(selectedContext.name)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm ${
                      highlightedSymbol === selectedContext.name
                        ? 'bg-violet-600 text-white dark:bg-violet-500'
                        : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                    title="Highlight all references in the editor"
                  >
                    {highlightedSymbol === selectedContext.name ? 'Highlighting...' : 'Show Dependencies'}
                  </button>
                  <button
                    onClick={() => explainFunctionOnly(selectedContext.name, selectedContext.lineStart, selectedContext.lineEnd, selectedContext.code)}
                    disabled={isExplainingFunc}
                    className="px-3.5 py-2 rounded-lg bg-zinc-200 text-zinc-700 hover:bg-zinc-300 text-sm font-bold dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    Explain Function
                  </button>
                  <button
                    onClick={() => {
                      setSelectedContext(null);
                      if (highlightedSymbol) {
                        handleToggleDependencies(highlightedSymbol); // clear highlights
                      }
                    }}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                    title="Clear selected context"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Prompt pills helper */}
            <div className="px-5 py-2.5 flex gap-2.5 overflow-x-auto border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 shrink-0">
              {[
                { label: 'Why is this O(n)?', query: 'Explain the formal time and space complexity and tell me why it is bounded by O(n).' },
                { label: 'Can this be optimized?', query: 'Can you write a more optimized version of this code to reduce execution overhead?' },
                { label: 'Rewrite recursively', query: 'Show me how to rewrite this code using recursive calls instead of iterative loops.' },
                { label: 'Generate tests', query: 'Generate a concise, runnable test suite for this code. Return only the complete test code; omit headings, a test plan, coverage summaries, and tables.' }
              ].map((pill, idx) => (
                <button
                  key={idx}
                  onClick={() => sendChatMessage(pill.query)}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-850 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white shrink-0 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Chat Input panel */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 flex gap-3 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask follow-up questions (e.g. Explain like I am 10, write tests...)"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 transition-all shadow-inner font-medium"
                onKeyDown={e => {
                  if (e.key === 'Enter') sendChatMessage();
                }}
              />
              <button
                onClick={() => sendChatMessage()}
                disabled={isChatSending}
                className="rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 px-6 text-base font-extrabold transition-all shrink-0 cursor-pointer shadow-md active:scale-[0.98]"
              >
                Send
              </button>
            </div>
          </div>
        </main>

        {/* Right Column: AI Analysis Reports, Visualizers & Quizzes */}
        <aside className="w-full md:flex flex-col overflow-hidden" style={{ width: `${rightPanelWidth}px` }}>
          
          {/* Analysis Menu Tabs */}
          <div className="flex border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40 select-none">
            {(['overview', 'explanation', 'quality', 'optimize', 'visuals', 'quiz'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveAnalysisTab(tab)}
                className={`flex-1 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeAnalysisTab === tab
                    ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 bg-white/40 dark:bg-zinc-900/40'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 hover:bg-white/20 dark:hover:bg-zinc-900/20'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center h-full py-28 text-center px-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="mb-5 text-indigo-600 dark:text-indigo-400"
                >
                  <RefreshCw className="h-10 w-10" />
                </motion.div>
                <span className="text-sm font-extrabold text-neutral-800 dark:text-neutral-100 uppercase tracking-widest">
                  Running Analysis Pipeline
                </span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 max-w-sm px-4 leading-relaxed">
                  Parsing AST structures, compiling logical execution graphs, and running diagnostics...
                </span>
                
                {/* Visual loading bars */}
                <div className="w-56 bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full mt-5 overflow-hidden relative">
                  <motion.div
                    className="bg-indigo-600 h-full absolute left-0 top-0"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  />
                </div>
              </div>
            ) : !analysisReport ? (
              <div className="flex flex-col items-center justify-center h-full py-28 text-center px-6">
                <Sparkles className="h-12 w-12 text-zinc-400 dark:text-zinc-600 mb-4" />
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Ready for Input
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs leading-relaxed font-medium">
                  Select a preset template or upload your project. Then, click <strong className="text-zinc-900 dark:text-zinc-100">"Analyze Code"</strong> above to bootstrap the diagnostic ecosystem!
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeAnalysisTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="p-4 flex flex-col gap-5"
                >
                  
                  {/* OVERVIEW TAB */}
                  {activeAnalysisTab === 'overview' && (
                    <div className="flex flex-col gap-4">
                      {/* Metric Widgets Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">LOC</span>
                          <span className="text-2xl font-extrabold font-mono text-zinc-900 dark:text-white">{analysisReport.metrics.loc}</span>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">Complexity</span>
                          <span className="text-2xl font-extrabold font-mono text-zinc-900 dark:text-white">{analysisReport.metrics.cyclomaticComplexity}</span>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">Maintainability</span>
                          <span className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{analysisReport.metrics.maintainabilityIndex}/100</span>
                        </div>
                      </div>

                      {/* Complexity proof */}
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30 flex flex-col gap-3 shadow-sm">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Algorithmic Bounds</span>
                        <div className="flex gap-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">Time Complexity</span>
                            <span className="font-mono text-lg font-bold text-zinc-900 dark:text-white">{analysisReport.complexity.time}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">Space Complexity</span>
                            <span className="font-mono text-lg font-bold text-zinc-900 dark:text-white">{analysisReport.complexity.space}</span>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mt-1">
                          {analysisReport.complexity.timeExplanation}
                        </p>
                      </div>

                      {/* Glass Cards */}
                      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40 flex flex-col gap-2 shadow-sm">
                        <span className="text-sm font-extrabold text-zinc-900 dark:text-white">Purpose</span>
                        <p className="text-sm text-zinc-650 dark:text-zinc-300 leading-relaxed">
                          {analysisReport.overview.purpose}
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40 flex flex-col gap-2 shadow-sm">
                        <span className="text-sm font-extrabold text-zinc-900 dark:text-white">How It Works</span>
                        <p className="text-sm text-zinc-650 dark:text-zinc-300 leading-relaxed">
                          {analysisReport.overview.howItWorks}
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40 flex flex-col gap-2 shadow-sm">
                        <span className="text-sm font-extrabold text-zinc-900 dark:text-white">Execution Flow</span>
                        <p className="text-sm text-zinc-650 dark:text-zinc-300 leading-relaxed">
                          {analysisReport.overview.executionFlow}
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40 flex flex-col gap-2 shadow-sm">
                        <span className="text-sm font-extrabold text-zinc-900 dark:text-white">Summary</span>
                        <p className="text-sm text-zinc-650 dark:text-zinc-300 leading-relaxed">
                          {analysisReport.summary}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* EXPLANATIONS TAB */}
                  {activeAnalysisTab === 'explanation' && (
                    <div className="flex flex-col gap-4">
                      {/* Step-by-Step list */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase text-zinc-500 tracking-widest">Step-by-Step Logic</span>
                        <div className="flex flex-col gap-2 mt-1">
                          {analysisReport.explanation.stepByStep.map((step, idx) => (
                            <div key={idx} className="flex gap-3 items-start p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900">
                              <span className="h-5 w-5 bg-zinc-100 border border-zinc-200 text-zinc-650 rounded-full flex items-center justify-center font-mono text-[10px] font-bold dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 shrink-0">{idx + 1}</span>
                              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Line-by-Line explanations preview list */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase text-zinc-500 tracking-widest">Critical Line Analysis</span>
                        <div className="flex flex-col border border-zinc-200 rounded overflow-hidden dark:border-zinc-800 bg-zinc-50/30">
                          {analysisReport.explanation.lineByLine.slice(0, 8).map((l, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => {
                                if (editorRef.current) {
                                  editorRef.current.revealLineInCenter(l.line);
                                  editorRef.current.setPosition({ lineNumber: l.line, column: 1 });
                                }
                                handleEditorLineClick(l.line);
                              }}
                              className="flex flex-col p-3 border-b border-zinc-200 hover:bg-zinc-100 cursor-pointer dark:border-zinc-850 dark:hover:bg-zinc-850"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-[10px] text-zinc-500 font-bold">Line {l.line}</span>
                                <span className="text-[8px] font-mono font-bold text-zinc-400">Click to jump</span>
                              </div>
                              <code className="font-mono text-[10px] text-zinc-800 bg-zinc-100 rounded px-1.5 py-0.5 mt-1 dark:bg-zinc-900 dark:text-zinc-200 truncate">
                                {l.code}
                              </code>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">{l.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Educational Cognitive Personas */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-xs font-semibold uppercase text-zinc-500 tracking-widest">Target Explanations</span>
                        <div className="rounded border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block mb-1">Beginner Mode (ELIF10)</span>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-350 leading-relaxed">{analysisReport.personas.beginner}</p>
                        </div>
                        <div className="rounded border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block mb-1">Expert Systems Engineer</span>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-350 leading-relaxed">{analysisReport.personas.expert}</p>
                        </div>
                        <div className="rounded border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block mb-1">FAANG Technical Interview preparation</span>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-350 leading-relaxed">{analysisReport.personas.interview}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QUALITY & DIAGNOSTICS TAB */}
                  {activeAnalysisTab === 'quality' && (
                    <div className="flex flex-col gap-4">
                      {/* Potential Bugs */}
                      <div className="rounded border border-red-200 bg-red-50/10 p-4 dark:border-red-900/20">
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 shrink-0" /> Potential Defects & Bugs
                        </span>
                        <div className="flex flex-col gap-1.5 mt-2.5">
                          {analysisReport.quality.bugs.length === 0 ? (
                            <span className="text-[10px] text-zinc-400">No core logic defects identified.</span>
                          ) : (
                            analysisReport.quality.bugs.map((bug, idx) => (
                              <p key={idx} className="text-[11px] text-zinc-650 dark:text-zinc-300 leading-relaxed">&bull; {bug}</p>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Edge Cases */}
                      <div className="rounded border border-orange-200 bg-orange-50/10 p-4 dark:border-orange-900/20">
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 block">Out-of-Bound Edge Cases</span>
                        <div className="flex flex-col gap-1.5 mt-2">
                          {analysisReport.quality.edgeCases.map((edge, idx) => (
                            <p key={idx} className="text-[11px] text-zinc-650 dark:text-zinc-300 leading-relaxed">&bull; {edge}</p>
                          ))}
                        </div>
                      </div>

                      {/* Security concerns */}
                      <div className="rounded border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Security Analysis</span>
                        <div className="flex flex-col gap-1.5 mt-2">
                          {analysisReport.quality.securityConcerns.map((sec, idx) => (
                            <p key={idx} className="text-[11px] text-zinc-650 dark:text-zinc-300 leading-relaxed">&bull; {sec}</p>
                          ))}
                        </div>
                      </div>

                      {/* Clean code suggestions */}
                      <div className="rounded border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">SOLID & Clean Code Principles</span>
                        <div className="flex flex-col gap-1.5 mt-2">
                          {analysisReport.quality.cleanCodeSuggestions.map((suggestion, idx) => (
                            <p key={idx} className="text-[11px] text-zinc-650 dark:text-zinc-300 leading-relaxed">&bull; {suggestion}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OPTIMIZE TAB */}
                  {activeAnalysisTab === 'optimize' && (
                    <div className="flex flex-col gap-4">
                      {/* Performance Suggestions */}
                      <div className="rounded border border-emerald-200 bg-emerald-50/10 p-4 dark:border-emerald-900/20">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Cpu className="h-4 w-4 shrink-0" /> Execution Speed & Performance
                        </span>
                        <div className="flex flex-col gap-1.5 mt-2.5">
                          {analysisReport.quality.performanceImprovements.map((opt, idx) => (
                            <p key={idx} className="text-[11px] text-zinc-650 dark:text-zinc-300 leading-relaxed">&bull; {opt}</p>
                          ))}
                        </div>
                      </div>

                      {/* Comparison view or Refactored version code */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">Refactored Version</span>
                          <button
                            onClick={handleApplyRefactoring}
                            className="flex items-center gap-1.5 rounded border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-700 hover:border-zinc-400 dark:border-zinc-850 dark:bg-zinc-900 dark:text-zinc-300 transition-colors"
                          >
                            <Copy className="h-3 w-3" /> Apply to Editor
                          </button>
                        </div>
                        <pre className="rounded bg-zinc-950 p-4 text-[10.5px] font-mono text-zinc-100 overflow-x-auto border border-zinc-800 max-h-[300px]">
                          <code>{analysisReport.refactored.code}</code>
                        </pre>
                        
                        <div className="rounded border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/20 flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">Key improvements made</span>
                          <div className="flex flex-col gap-1 mt-1">
                            {analysisReport.refactored.changes.map((change, idx) => (
                              <p key={idx} className="text-[11px] text-zinc-650 dark:text-zinc-350">&bull; {change}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VISUALS TAB */}
                  {activeAnalysisTab === 'visuals' && (
                    <div className="flex flex-col h-full">
                      <InteractiveVisualization
                        ast={analysisReport.ast}
                        dependencyGraph={analysisReport.graphs.dependencyGraph}
                        callGraph={analysisReport.graphs.callGraph}
                        importsGraph={analysisReport.graphs.importsGraph}
                        onSymbolSelect={(name) => {
                          // Search code in editor to find definition line
                          const idx = selectedFileContent.toLowerCase().indexOf(name.toLowerCase());
                          if (idx !== -1) {
                            const precedingLines = selectedFileContent.substring(0, idx).split('\n');
                            const lineNum = precedingLines.length;
                            if (editorRef.current) {
                              editorRef.current.revealLineInCenter(lineNum);
                              editorRef.current.setPosition({ lineNumber: lineNum, column: 1 });
                            }
                            handleEditorLineClick(lineNum);
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* QUIZ TAB */}
                  {activeAnalysisTab === 'quiz' && (
                    <div className="flex flex-col h-full">
                      <QuizPanel
                        questions={quizQuestions}
                        isLoading={isQuizLoading}
                        onGenerateQuiz={handleGenerateQuiz}
                      />
                    </div>
                  )}

                  {/* EXPORT OPTIONS */}
                  <div className="mt-4 border-t border-zinc-200/60 pt-4 dark:border-zinc-800">
                    <ExportUtility report={analysisReport} />
                  </div>

                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </aside>

      </div>

      {/* Raycast Keyboard Command Palette */}
      <CommandPalette
        isOpen={isCmdOpen}
        onClose={() => setIsCmdOpen(false)}
        onSelectAction={runPresetAction}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

    </div>
  );
}
