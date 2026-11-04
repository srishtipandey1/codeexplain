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
    <div className="flex h-full flex-col bg-zinc-50/70 p-5 dark:bg-zinc-950/30">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Knowledge check</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Quick quiz
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Test your understanding of the current code.</p>
        </div>
        
        {/* Difficulty Picker */}
        <div className="flex items-center gap-2">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
            disabled={isLoading}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none transition-colors focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value="easy">Easy Mode</option>
            <option value="medium">Medium Mode</option>
            <option value="hard">Hard Mode</option>
          </select>
          <button
            onClick={() => onGenerateQuiz(difficulty)}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-400 cursor-pointer"
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
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Preparing questions from your code...</span>
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <Award className="mb-4 h-10 w-10 text-violet-400 dark:text-violet-500" />
            <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Ready when you are</h4>
            <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Choose a difficulty and generate a short quiz based on the code in your editor.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Scorecard banner */}
            {isSubmitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 font-mono text-base font-semibold shrink-0">
                  {score}/{questions.length}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {score === questions.length ? 'Perfect Score!' : score >= questions.length / 2 ? 'Great Job!' : 'Keep Practicing!'}
                  </span>
                  <span className="mt-1 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
                    Your answers have been checked. Scroll below to read thorough logic explanations.
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="ml-auto flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
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
                <div key={q.id} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  {/* Type Label */}
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <span className="rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium capitalize text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                      {q.type.replaceAll('_', ' ')}
                    </span>
                    <span className="text-xs font-medium text-zinc-500">Question {idx + 1}</span>
                  </div>

                  {/* Question Title */}
                  <p className="text-base font-medium leading-6 text-zinc-800 dark:text-zinc-100">
                    {q.question}
                  </p>

                  {/* Code snippet display inside quiz */}
                  {q.codeSnippet && (
                    <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-5 text-zinc-100">
                      <code>{q.codeSnippet}</code>
                    </pre>
                  )}

                  {/* Options List */}
                  <div className="mt-1 flex flex-col gap-2">
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
                          className={`flex items-center justify-between rounded-lg border px-3.5 py-3 text-left text-sm font-medium leading-5 transition-colors cursor-pointer ${optionStyle}`}
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
                      className="mt-1 flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300"
                    >
                      <AlertCircle className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Explanation</span>
                        <span className="mt-1 leading-6 text-zinc-600 dark:text-zinc-300">{q.explanation}</span>
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
                className="mt-2 w-full rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-400 cursor-pointer"
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
