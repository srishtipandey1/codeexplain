import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Code, Cpu, ShieldCheck, HelpCircle, FileText, Sparkles, Sun, Moon, Trash2 } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export default function CommandPalette({ isOpen, onClose, onSelectAction, isDarkMode, onToggleTheme }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    { id: 'analyze', name: 'Analyze Code', desc: 'Run full deep parsing pipeline', icon: Sparkles },
    { id: 'optimize', name: 'Optimize Code', desc: 'Improve complexity & runtime efficiency', icon: Cpu },
    { id: 'refactor', name: 'Refactor (Clean Code)', desc: 'Improve readability & SOLID design patterns', icon: Code },
    { id: 'complexity', name: 'Explain Big-O Complexity', desc: 'Perform strict time & space analysis', icon: FileText },
    { id: 'tests', name: 'Generate Test Suite', desc: 'Create extensive unit and boundary tests', icon: ShieldCheck },
    { id: 'quiz', name: 'Generate Coding Quiz', desc: 'Create interactive MCQs and code predictions', icon: HelpCircle },
    { id: 'theme', name: isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode', desc: 'Toggle visual theme', icon: isDarkMode ? Sun : Moon },
    { id: 'clear', name: 'Clear Workspace', desc: 'Reset editor and cached analysis', icon: Trash2 },
  ];

  const filtered = commands.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    c.desc.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }

      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) {
          handleSelect(filtered[activeIndex].id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filtered]);

  const handleSelect = (id: string) => {
    if (id === 'theme') {
      onToggleTheme();
    } else {
      onSelectAction(id);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="cmd-palette-overlay" className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#09090b]"
          >
            {/* Search Input */}
            <div className="flex items-center border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <Search className="mr-3 h-5.5 w-5.5 text-zinc-400 dark:text-zinc-500" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                className="w-full bg-transparent text-base font-bold text-zinc-850 placeholder-zinc-400 outline-none dark:text-zinc-200 dark:placeholder-zinc-500"
              />
              <div className="flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-bold text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500 shrink-0">
                <span>ESC</span>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto p-3">
              {filtered.length > 0 ? (
                filtered.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === activeIndex;
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => handleSelect(cmd.id)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 transition-colors ${
                        isSelected
                          ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50'
                          : 'text-zinc-600 dark:text-zinc-450'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400'}`} />
                        <div className="flex flex-col">
                          <span className="text-sm font-extrabold">{cmd.name}</span>
                          <span className="text-xs text-zinc-450 dark:text-zinc-500 font-bold">{cmd.desc}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-bold text-zinc-450 dark:text-zinc-500">⏎ Enter</span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-sm font-bold text-zinc-400 dark:text-zinc-500">
                  No commands found matching "{query}"
                </div>
              )}
            </div>

            {/* Footer hints */}
            <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-3.5 text-xs font-bold text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500">
              <div className="flex items-center gap-2">
                <span>↑↓ Navigate</span>
                <span>•</span>
                <span>⏎ Select</span>
              </div>
              <div>
                <span>Raycast Palette</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
