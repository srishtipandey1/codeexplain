import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, HelpCircle, CheckCircle2, XCircle, ChevronRight, 
  RefreshCw, Play, ShieldAlert, Sparkles, AlertCircle
} from 'lucide-react';
import { QuizQuestion } from '../types/analysis';

interface QuizPanelProps {
  questions: QuizQuestion[];
  isLoading: boolean;
  onGenerateQuiz: (difficulty: 'easy' | 'medium' | 'hard') => void;
}

export default function QuizPanel({ questions, isLoading, onGenerateQuiz }: QuizPanelProps) {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleSelectOption = (questionId: string, option: string) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmit = () => {
    if (isSubmitted || questions.length === 0) return;
    
    let correctCount = 0;
    questions.forEach(q => {
      if (userAnswers[q.id]?.trim() === q.correctAnswer?.trim()) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setUserAnswers({});
    setIsSubmitted(false);
    setScore(0);
    onGenerateQuiz(difficulty);
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-5 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Interactive Quiz Mode
          </h3>
        </div>
        
        {/* Difficulty Picker */}
        <div className="flex items-center gap-3">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
            disabled={isLoading}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950 font-semibold text-zinc-700 dark:text-zinc-200 shadow-sm transition-all"
          >
            <option value="easy">Easy Mode</option>
            <option value="medium">Medium Mode</option>
            <option value="hard">Hard Mode</option>
          </select>
          <button
            onClick={() => onGenerateQuiz(difficulty)}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Generate
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="h-10 w-10 animate-spin text-violet-500 mb-4" />
            <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Generating analytical questions from code...</span>
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-zinc-200 rounded-2xl dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 px-6">
            <Award className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h4 className="text-sm font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">No active quiz.</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm leading-relaxed">
              Select a difficulty level and click 'Generate' to create a custom conceptual test based on your current editor code!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Scorecard banner */}
            {isSubmitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-5 rounded-2xl border border-zinc-250 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-950/40 shadow-sm"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 font-mono text-xl font-extrabold shrink-0 shadow-inner">
                  {score}/{questions.length}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                    {score === questions.length ? 'Perfect Score!' : score >= questions.length / 2 ? 'Great Job!' : 'Keep Practicing!'}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Your answers have been checked. Scroll below to read thorough logic explanations.
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="ml-auto flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-bold hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" /> Retry
                </button>
              </motion.div>
            )}

            {/* Questions List */}
            {questions.map((q, idx) => {
              const selectedOpt = userAnswers[q.id];
              const isCorrect = selectedOpt === q.correctAnswer;
              
              return (
                <div key={q.id} className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/25 p-5 dark:border-zinc-850 shadow-sm">
                  {/* Type Label */}
                  <div className="flex items-center justify-between border-b border-zinc-100/60 pb-2 dark:border-zinc-800/40">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/40 px-2.5 py-1 rounded-md">
                      {q.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold text-zinc-400 font-mono">Question {idx + 1}</span>
                  </div>

                  {/* Question Title */}
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-105 leading-relaxed">
                    {q.question}
                  </p>

                  {/* Code snippet display inside quiz */}
                  {q.codeSnippet && (
                    <pre className="rounded-xl bg-zinc-950 p-4 text-xs font-mono text-zinc-100 overflow-x-auto border border-zinc-850 shadow-inner">
                      <code>{q.codeSnippet}</code>
                    </pre>
                  )}

                  {/* Options List */}
                  <div className="flex flex-col gap-3 mt-1">
                    {q.options?.map((opt, optIdx) => {
                      const isOptionSelected = selectedOpt === opt;
                      const isThisCorrectOpt = opt === q.correctAnswer;
                      
                      let optionStyle = 'border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900';
                      let iconIndicator = null;

                      if (isOptionSelected) {
                        optionStyle = 'border-violet-500 bg-violet-50/20 dark:border-violet-500 ring-1 ring-violet-500/20';
                      }

                      if (isSubmitted) {
                        if (isThisCorrectOpt) {
                          optionStyle = 'border-emerald-500 bg-emerald-50/10 dark:border-emerald-600 ring-1 ring-emerald-500/10';
                          iconIndicator = <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
                        } else if (isOptionSelected && !isCorrect) {
                          optionStyle = 'border-red-500 bg-red-50/10 dark:border-red-600 ring-1 ring-red-500/10';
                          iconIndicator = <XCircle className="h-5 w-5 text-red-500 shrink-0" />;
                        } else {
                          optionStyle = 'border-zinc-200 bg-white opacity-50 dark:border-zinc-800 dark:bg-zinc-900';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={isSubmitted}
                          onClick={() => handleSelectOption(q.id, opt)}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-sm text-left font-bold transition-all cursor-pointer ${optionStyle}`}
                        >
                          <span className="truncate pr-4">{opt}</span>
                          {iconIndicator}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Walkthrough */}
                  {isSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 rounded-xl bg-zinc-100/60 p-4 text-xs text-zinc-650 dark:bg-zinc-950/40 dark:text-zinc-350 border border-zinc-200 dark:border-zinc-850 flex gap-3 shadow-sm"
                    >
                      <AlertCircle className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-extrabold text-zinc-800 dark:text-zinc-200">Explanation</span>
                        <span className="mt-1 leading-relaxed text-zinc-600 dark:text-zinc-300">{q.explanation}</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}

            {/* Actions */}
            {!isSubmitted && (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(userAnswers).length < questions.length}
                className="w-full rounded-xl bg-zinc-900 py-3.5 text-sm font-extrabold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 mt-3 transition-all cursor-pointer shadow-md active:scale-[0.99]"
              >
                Submit Answers ({Object.keys(userAnswers).length} / {questions.length})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
