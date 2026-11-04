import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Code, Cpu, ShieldAlert, Award, FileText,
  RotateCcw, Copy, Check, ChevronRight, MessageSquare, Flame, 
  HelpCircle, Sliders, Play, Maximize2, Minimize2, RefreshCw,
  Search, Command, Sun, Moon, Info, Zap, HelpCircle as QuizIcon,
  XCircle, X
} from 'lucide-react';

import CommandPalette from '../components/CommandPalette';
import FileExplorer, { FileItem, SAMPLE_CODE_TEMPLATES } from '../components/FileExplorer';
import InteractiveVisualization from '../features/visualization/InteractiveVisualization';
import QuizPanel from '../features/learning/QuizPanel';
import ExportUtility from '../components/ExportUtility';
import ProjectSearch from '../features/search/ProjectSearch';
import SearchEvaluationPanel from '../features/search/SearchEvaluationPanel';
import { AnalysisReport, QuizQuestion, ChatMessage } from '../types/analysis';
import WelcomePage from './WelcomePage';

export default function App() {
  const [hasEnteredWorkspace, setHasEnteredWorkspace] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(240); // px
  const [rightPanelWidth, setRightPanelWidth] = useState(480); // px

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
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'search' | 'chat' | 'evaluation' | 'overview' | 'explanation' | 'quality' | 'optimize' | 'visuals' | 'quiz'>('search');
  const [pendingSearchJump, setPendingSearchJump] = useState<{ path: string; line: number } | null>(null);

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
  const chatInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!pendingSearchJump || pendingSearchJump.path !== selectedPath || !editorRef.current) return;

    const frame = requestAnimationFrame(() => {
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (!editor || !model) return;

      const line = Math.min(pendingSearchJump.line, model.getLineCount());
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
      setPendingSearchJump(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [pendingSearchJump, selectedPath, selectedFileContent]);

  // Scroll chat window to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeAnalysisTab, chatMessages]);

  useEffect(() => {
    if (activeAnalysisTab === 'chat') {
      chatInputRef.current?.focus();
    }
  }, [activeAnalysisTab]);

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
    setActiveAnalysisTab('chat');

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `AI service request failed (${response.status}).`);
      }
      const data = await response.json();

      setChatMessages(prev => prev.map(msg => msg.id === loadingId ? {
        ...msg,
        content: data.response
      } : msg));
    } catch (err) {
      setChatMessages(prev => prev.map(msg => msg.id === loadingId ? {
        ...msg,
        content: `Failed to explain \`${funcName}\`: ${err instanceof Error ? err.message : 'AI service request failed.'}`
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
    const textToSend = presetPrompt ?? chatInput;
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
    if (action === 'search') {
      setActiveAnalysisTab('search');
    } else if (action === 'analyze') {
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

  if (!hasEnteredWorkspace) {
    return <WelcomePage onStart={() => setHasEnteredWorkspace(true)} />;
  }

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
            <span className="text-[11px] text-zinc-500 font-mono font-bold leading-none">CODE WORKSPACE</span>
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
            <span className="hidden sm:inline">Quick actions</span>
            <kbd className="hidden sm:inline-flex items-center rounded-md border border-zinc-300 bg-zinc-100 px-2 py-0.5 font-mono text-[10px] dark:border-zinc-800 dark:bg-zinc-850 text-zinc-500 font-bold">Ctrl+K</kbd>
          </button>

          {/* Quick Run Trigger */}
          <button
            onClick={runAnalysisPipeline}
            disabled={isAnalyzing}
            className="flex items-center gap-2 rounded-lg bg-zinc-950 px-5 py-2 text-sm font-extrabold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all shadow-md cursor-pointer active:scale-[0.98]"
          >
            {isAnalyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analyze file
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
              <span className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest shrink-0">Symbols:</span>
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

        </main>

        {/* Right Column: AI Analysis Reports, Visualizers & Quizzes */}
        <aside className="w-full md:flex flex-col overflow-hidden" style={{ width: `${rightPanelWidth}px` }}>
          
          <div className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/70">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">CodeExplain tools</p>
            <h2 className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Search, chat &amp; analysis</h2>
          </div>
          <div role="tablist" aria-label="Project tools" className="grid shrink-0 grid-cols-5 gap-1 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/70 select-none">
            {(['search', 'chat', 'evaluation', 'overview', 'explanation', 'quality', 'optimize', 'visuals', 'quiz'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveAnalysisTab(tab)}
                aria-selected={activeAnalysisTab === tab}
                role="tab"
                className={`w-full rounded-lg border px-1.5 py-2 text-center text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                  activeAnalysisTab === tab
                    ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300'
                    : 'border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {tab === 'search' ? 'Search' : tab === 'chat' ? 'Chat' : tab === 'evaluation' ? 'Eval' : tab === 'explanation' ? 'Explain' : tab === 'optimize' ? 'Optimize' : tab}
              </button>
            ))}
          </div>

          <div className={`analysis-panel min-h-0 flex-1 bg-zinc-50/70 dark:bg-zinc-950/30 ${activeAnalysisTab === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {isAnalyzing && activeAnalysisTab !== 'search' && activeAnalysisTab !== 'chat' && activeAnalysisTab !== 'evaluation' ? (
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
                  Reading code structure and preparing a focused explanation...
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
            ) : !analysisReport && activeAnalysisTab !== 'search' && activeAnalysisTab !== 'chat' && activeAnalysisTab !== 'evaluation' ? (
              <div className="flex flex-col items-center justify-center h-full py-28 text-center px-6">
                <Sparkles className="h-12 w-12 text-zinc-400 dark:text-zinc-600 mb-4" />
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Ready for Input
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs leading-relaxed font-medium">
                  Choose a preset or upload a project, then analyze the selected file to explore its structure and behavior.
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
                  className={activeAnalysisTab === 'quiz' || activeAnalysisTab === 'visuals' || activeAnalysisTab === 'chat'
                    ? 'h-full'
                    : 'analysis-content p-5 flex flex-col gap-6'}
                >
                  {activeAnalysisTab === 'evaluation' && <SearchEvaluationPanel />}
                  {activeAnalysisTab === 'search' && (
                    <ProjectSearch
                      files={files}
                      onOpenResult={(path, line) => {
                        setPendingSearchJump({ path, line });
                        setSelectedPath(path);
                      }}
                    />
                  )}
                  {activeAnalysisTab === 'chat' && (
                    <section className="flex h-full min-h-0 flex-col">
                      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/70">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-violet-500" />
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Ask about your code</h3>
                        </div>
                        <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          Conversation context: {activeFile?.name || 'current workspace'} · {editorLanguage}
                        </p>
                      </header>

                      <div
                        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
                        aria-live="polite"
                        aria-label="Chat conversation"
                      >
                        {chatMessages.length === 0 ? (
                          <div className="m-auto flex w-full max-w-sm flex-col items-center text-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
                              <MessageSquare className="h-5 w-5" />
                            </span>
                            <h4 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              Start with {activeFile?.name || 'your code'}
                            </h4>
                            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                              Ask one question about the selected file. Search results stay in the Search tab.
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                              {[
                                'Explain what this file does',
                                'What edge cases should I check?',
                                'Walk me through the main function',
                              ].map(prompt => (
                                <button
                                  key={prompt}
                                  type="button"
                                  onClick={() => sendChatMessage(prompt)}
                                  disabled={isChatSending}
                                  className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-left text-xs text-zinc-600 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:text-violet-300"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          chatMessages.map(msg => (
                            <article
                              key={msg.id}
                              className={`max-w-[95%] rounded-xl border px-3.5 py-3 text-sm leading-6 ${
                                msg.role === 'user'
                                  ? 'self-end border-violet-600 bg-violet-600 text-white'
                                  : 'self-start border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'
                              }`}
                            >
                              <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
                                msg.role === 'user' ? 'text-violet-100' : 'text-violet-600 dark:text-violet-300'
                              }`}>
                                {msg.role === 'user' ? 'You' : 'CodeExplain'}
                              </p>
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            </article>
                          ))
                        )}
                        {isChatSending && (
                          <div className="self-start rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                            CodeExplain is responding…
                          </div>
                        )}
                        <div ref={chatBottomRef} />
                      </div>

                      {selectedContext && (
                        <div className="flex shrink-0 items-center gap-2 border-t border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/70">
                          <span className="min-w-0 flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                            Focus: <span className="font-mono text-zinc-800 dark:text-zinc-200">{selectedContext.name}</span>
                            {' '}· lines {selectedContext.lineStart}–{selectedContext.lineEnd}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleDependencies(selectedContext.name)}
                            className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-violet-300 dark:border-zinc-700 dark:text-zinc-300"
                          >
                            {highlightedSymbol === selectedContext.name ? 'Clear highlights' : 'Show references'}
                          </button>
                        </div>
                      )}

                      <form
                        className="flex shrink-0 gap-2 border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/70"
                        onSubmit={event => {
                          event.preventDefault();
                          void sendChatMessage();
                        }}
                      >
                        <input
                          ref={chatInputRef}
                          type="text"
                          value={chatInput}
                          onChange={event => setChatInput(event.target.value)}
                          placeholder="Ask a question about this file…"
                          aria-label="Message CodeExplain about this file"
                          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                        <button
                          type="submit"
                          disabled={isChatSending || !chatInput.trim()}
                          className="shrink-0 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Send
                        </button>
                      </form>
                    </section>
                  )}
                  
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
                    <div className="flex flex-col gap-6">
                      <div>
                        <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Code walkthrough</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Understand the logic</h2>
                        <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">A guided explanation of the main steps and important lines.</p>
                      </div>

                      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Step by step</h3>
                        <div className="mt-3 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                          {(analysisReport.explanation?.stepByStep ?? []).map((step, idx) => (
                            <div key={idx} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">{idx + 1}</span>
                              <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">{step}</p>
                            </div>
                          ))}
                          {(analysisReport.explanation?.stepByStep?.length ?? 0) === 0 && (
                            <p className="py-2 text-sm text-zinc-500 dark:text-zinc-400">Step-by-step explanation is unavailable for this analysis.</p>
                          )}
                        </div>
                      </section>

                      <section>
                        <div className="mb-3">
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Key lines</h3>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Select a line to jump to it in the editor.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {(analysisReport.explanation?.lineByLine ?? []).slice(0, 8).map((l, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => {
                                if (editorRef.current) {
                                  editorRef.current.revealLineInCenter(l.line);
                                  editorRef.current.setPosition({ lineNumber: l.line, column: 1 });
                                }
                                handleEditorLineClick(l.line);
                              }}
                              className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3.5 transition-colors hover:border-violet-300 hover:bg-violet-50/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-violet-800 dark:hover:bg-violet-950/20"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-medium text-violet-700 dark:text-violet-300">Line {l.line}</span>
                                <span className="text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">Open in editor</span>
                              </div>
                              <code className="overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-zinc-100 px-2.5 py-2 font-mono text-xs text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                                {l.code}
                              </code>
                              <p className="text-sm leading-5 text-zinc-600 dark:text-zinc-400">{l.explanation}</p>
                            </div>
                          ))}
                          {(analysisReport.explanation?.lineByLine?.length ?? 0) === 0 && (
                            <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">No line-by-line explanations were returned.</p>
                          )}
                        </div>
                      </section>

                      <section>
                        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Different perspectives</h3>
                        <div className="flex flex-col gap-2">
                          {[
                            ['Beginner', analysisReport.personas?.beginner],
                            ['Technical', analysisReport.personas?.expert],
                            ['Interview prep', analysisReport.personas?.interview],
                          ].map(([label, explanation]) => (
                            <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                              <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</h4>
                              <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{explanation || `No ${label.toLowerCase()} explanation was returned.`}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}

                  {/* QUALITY & DIAGNOSTICS TAB */}
                  {activeAnalysisTab === 'quality' && (
                    <div className="flex flex-col gap-5">
                      <div>
                        <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Review notes</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Code quality</h2>
                        <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Potential risks and practical improvements based on this code.</p>
                      </div>
                      {([
                        { title: 'Potential bugs', items: analysisReport.quality?.bugs ?? [], tone: 'red', empty: 'No likely bugs were identified.' },
                        { title: 'Edge cases', items: analysisReport.quality?.edgeCases ?? [], tone: 'amber', empty: 'No notable edge cases were identified.' },
                        { title: 'Security', items: analysisReport.quality?.securityConcerns ?? [], tone: 'blue', empty: 'No specific security concerns were identified.' },
                        { title: 'Maintainability', items: analysisReport.quality?.cleanCodeSuggestions ?? [], tone: 'violet', empty: 'No maintainability suggestions were returned.' },
                      ] as const).map(section => (
                        <section key={section.title} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{section.title}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              section.items.length
                                ? section.tone === 'red'
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                                  : section.tone === 'amber'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                    : section.tone === 'blue'
                                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                                      : 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            }`}>
                              {section.items.length ? `${section.items.length} notes` : 'Clear'}
                            </span>
                          </div>
                          {section.items.length ? (
                            <ul className="mt-3 space-y-2.5">
                              {section.items.map((item, idx) => (
                                <li key={idx} className="flex gap-2.5 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{section.empty}</p>
                          )}
                        </section>
                      ))}
                    </div>
                  )}

                  {/* OPTIMIZE TAB */}
                  {activeAnalysisTab === 'optimize' && (
                    <div className="flex flex-col gap-5">
                      <div>
                        <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Suggestions</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Optimization</h2>
                        <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Review the trade-offs before applying any generated changes.</p>
                      </div>

                      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Performance opportunities</h3>
                        </div>
                        {(analysisReport.quality?.performanceImprovements?.length ?? 0) > 0 ? (
                          <ul className="mt-3 space-y-2.5">
                            {analysisReport.quality.performanceImprovements.map((opt, idx) => (
                              <li key={idx} className="flex gap-2.5 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                                {opt}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">No performance suggestions were returned.</p>
                        )}
                      </section>

                      <section>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Suggested implementation</h3>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">AI-generated refactoring for comparison.</p>
                          </div>
                          <button
                            onClick={handleApplyRefactoring}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:border-violet-300 hover:text-violet-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:text-violet-300"
                          >
                            <Copy className="h-3.5 w-3.5" /> Apply
                          </button>
                        </div>
                        <pre className="max-h-[360px] overflow-auto rounded-xl border border-zinc-200 bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-100 dark:border-zinc-800">
                          <code>{analysisReport.refactored?.code || 'No alternative implementation was returned.'}</code>
                        </pre>
                        
                        {(analysisReport.refactored?.changes?.length ?? 0) > 0 && (
                          <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">What changed</h4>
                            <ul className="mt-2 space-y-2">
                              {analysisReport.refactored.changes.map((change, idx) => (
                                <li key={idx} className="flex gap-2.5 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                                  {change}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </section>
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
                  {activeAnalysisTab === 'overview' && (
                    <div className="mt-2 border-t border-zinc-200 pt-5 dark:border-zinc-800">
                      <ExportUtility report={analysisReport} />
                    </div>
                  )}

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
