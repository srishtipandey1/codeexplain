import React, { useState } from 'react';
import JSZip from 'jszip';
import { 
  Folder, FolderOpen, File, Upload, Plus, Code, Trash2, 
  ChevronRight, ChevronDown, Check, RefreshCw
} from 'lucide-react';

export interface FileItem {
  name: string;
  path: string;
  content: string;
  isDirectory: boolean;
  isOpen?: boolean;
  children?: FileItem[];
}

interface FileExplorerProps {
  files: FileItem[];
  selectedPath: string;
  onSelectFile: (file: FileItem) => void;
  onAddFile: (name: string, content: string, isDir: boolean, parentPath?: string) => void;
  onDeleteFile: (path: string) => void;
  onUploadZip: (files: FileItem[]) => void;
}

export const SAMPLE_CODE_TEMPLATES: Record<string, { name: string; ext: string; content: string }> = {
  python: {
    name: 'Recursive Mergesort & Analyzer',
    ext: 'py',
    content: `import sys
import time

class SortingVisualizer:
    def __init__(self, capacity: int = 100):
        self.capacity = capacity
        self.operations = 0

    def merge_sort(self, arr: list) -> list:
        """
        Standard recursive merge sort algorithm with linear helper space.
        Time Complexity: O(n log n)
        Space Complexity: O(n)
        """
        if len(arr) <= 1:
            return arr
            
        mid = len(arr) // 2
        left = self.merge_sort(arr[:mid])
        right = self.merge_sort(arr[mid:])
        
        return self._merge(left, right)

    def _merge(self, left: list, right: list) -> list:
        result = []
        i = j = 0
        
        while i < len(left) and j < len(right):
            self.operations += 1
            if left[i] < right[j]:
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
                
        result.extend(left[i:])
        result.extend(right[j:])
        return result

if __name__ == "__main__":
    sorter = SortingVisualizer()
    unsorted_data = [64, 34, 25, 12, 22, 11, 90]
    print(f"Original: {unsorted_data}")
    sorted_data = sorter.merge_sort(unsorted_data)
    print(f"Sorted: {sorted_data}")
    print(f"Total comparison operations: {sorter.operations}")
`
  },
  rust: {
    name: 'Concurrent Web Scraper',
    ext: 'rs',
    content: `use std::thread;
use std::time::Duration;
use std::sync::{Arc, Mutex};

struct Scraper {
    target_urls: Vec<String>,
    visited_count: Arc<Mutex<usize>>,
}

impl Scraper {
    fn new(urls: Vec<String>) -> Self {
        Scraper {
            target_urls: urls,
            visited_count: Arc::new(Mutex::new(0)),
        }
    }

    fn run_concurrently(&self) {
        let mut handles = vec![];

        for url in &self.target_urls {
            let visited_clone = Arc::clone(&self.visited_count);
            let url_str = url.clone();
            
            let handle = thread::spawn(move || {
                println!("Scraping node: {}...", url_str);
                // Simulate HTTP request latency
                thread::sleep(Duration::from_millis(600));
                
                let mut num = visited_clone.lock().unwrap();
                *num += 1;
                println!("Successfully completed: {} (Current total: {})", url_str, *num);
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }
    }
}

fn main() {
    let endpoints = vec![
        "https://api.example.com/v1".to_string(),
        "https://api.example.com/v2".to_string(),
        "https://api.example.com/v3".to_string(),
    ];
    let scraper = Scraper::new(endpoints);
    scraper.run_concurrently();
}
`
  },
  typescript: {
    name: 'LRU Cache Design Pattern',
    ext: 'ts',
    content: `class LRUNode<K, V> {
  public prev: LRUNode<K, V> | null = null;
  public next: LRUNode<K, V> | null = null;
  constructor(public key: K, public value: V) {}
}

export class LRUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, LRUNode<K, V>>();
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  public get(key: K): V | null {
    const node = this.cache.get(key);
    if (!node) return null;
    
    this.moveToHead(node);
    return node.value;
  }

  public put(key: K, value: V): void {
    const existingNode = this.cache.get(key);
    if (existingNode) {
      existingNode.value = value;
      this.moveToHead(existingNode);
    } else {
      const newNode = new LRUNode(key, value);
      if (this.cache.size >= this.capacity) {
        this.evictLeastRecentlyUsed();
      }
      this.cache.set(key, newNode);
      this.addToHead(newNode);
    }
  }

  private moveToHead(node: LRUNode<K, V>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
  }

  private addToHead(node: LRUNode<K, V>): void {
    node.next = this.head;
    node.prev = null;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private evictLeastRecentlyUsed(): void {
    if (!this.tail) return;
    this.cache.delete(this.tail.key);
    this.removeNode(this.tail);
  }
}
`
  },
  go: {
    name: 'Goroutines Token bucket',
    ext: 'go',
    content: `package main

import (
	"fmt"
	"sync"
	"time"
)

type TokenBucket struct {
	capacity   int
	tokens     int
	refillRate time.Duration
	mutex      sync.Mutex
}

func NewTokenBucket(capacity int, refillRate time.Duration) *TokenBucket {
	tb := &TokenBucket{
		capacity:   capacity,
		tokens:     capacity,
		refillRate: refillRate,
	}
	go tb.startRefillLoop()
	return tb
}

func (tb *TokenBucket) startRefillLoop() {
	ticker := time.NewTicker(tb.refillRate)
	for range ticker.C {
		tb.mutex.Lock()
		if tb.tokens < tb.capacity {
			tb.tokens++
			fmt.Printf("[Bucket] Token added. Total tokens: %d\\n", tb.tokens)
		}
		tb.mutex.Unlock()
	}
}

func (tb *TokenBucket) Consume() bool {
	tb.mutex.Lock()
	defer tb.mutex.Unlock()
	if tb.tokens > 0 {
		tb.tokens--
		return true
	}
	return false
}

func main() {
	bucket := NewTokenBucket(3, 1*time.Second)
	var wg sync.WaitGroup

	for i := 1; i <= 5; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			time.Sleep(200 * time.Millisecond)
			if bucket.Consume() {
				fmt.Printf("[Worker %d] Acquired token! Processing request...\\n", workerID)
			} else {
				fmt.Printf("[Worker %d] Blocked (No tokens available)\\n", workerID)
			}
		}(i)
	}
	wg.Wait()
}
`
  }
};

export default function FileExplorer({ 
  files, 
  selectedPath, 
  onSelectFile, 
  onAddFile, 
  onDeleteFile, 
  onUploadZip 
}: FileExplorerProps) {
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({ 'root': true });

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setZipLoading(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const parsedFiles: FileItem[] = [];

      // Extract all file and folder records
      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          const content = await zipEntry.async('string');
          parsedFiles.push({
            name: zipEntry.name.split('/').pop() || zipEntry.name,
            path: zipEntry.name,
            content,
            isDirectory: false
          });
        }
      }

      onUploadZip(parsedFiles);
    } catch (err) {
      console.error('Error reading zip project:', err);
      alert('Failed to read and parse the ZIP archive. Please ensure it is a valid ZIP format.');
    } finally {
      setZipLoading(false);
    }
  };

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleCreate = (isDir: boolean) => {
    if (!newFileName.trim()) return;
    onAddFile(newFileName, '// New file input\n', isDir);
    setNewFileName('');
    setIsCreatingFile(false);
    setIsCreatingFolder(false);
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py': return <span className="text-emerald-500 font-mono font-extrabold text-xs w-5 text-center">py</span>;
      case 'js': case 'jsx': return <span className="text-yellow-500 font-mono font-extrabold text-xs w-5 text-center">js</span>;
      case 'ts': case 'tsx': return <span className="text-blue-500 font-mono font-extrabold text-xs w-5 text-center">ts</span>;
      case 'rs': return <span className="text-orange-600 font-mono font-extrabold text-xs w-5 text-center">rs</span>;
      case 'go': return <span className="text-cyan-500 font-mono font-extrabold text-xs w-5 text-center">go</span>;
      case 'java': return <span className="text-red-500 font-mono font-extrabold text-xs w-5 text-center">jv</span>;
      case 'cpp': case 'hpp': return <span className="text-indigo-500 font-mono font-extrabold text-xs w-5 text-center">c+</span>;
      case 'c': case 'h': return <span className="text-slate-400 font-mono font-extrabold text-xs w-5 text-center">c</span>;
      case 'rb': return <span className="text-red-600 font-mono font-extrabold text-xs w-5 text-center">rb</span>;
      case 'php': return <span className="text-purple-500 font-mono font-extrabold text-xs w-5 text-center">ph</span>;
      case 'kt': return <span className="text-violet-500 font-mono font-extrabold text-xs w-5 text-center">kt</span>;
      case 'swift': return <span className="text-orange-500 font-mono font-extrabold text-xs w-5 text-center">sw</span>;
      default: return <File className="h-4 w-4 text-neutral-400" />;
    }
  };

  const renderTree = (items: FileItem[], depth = 0) => {
    return items.map(item => {
      const isSelected = item.path === selectedPath;
      if (item.isDirectory) {
        const isExpanded = !!expandedDirs[item.path];
        return (
          <div key={item.path} className="flex flex-col">
            <button
              onClick={() => toggleDir(item.path)}
              className="group flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              style={{ paddingLeft: `${depth * 14 + 10}px` }}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              {isExpanded ? <FolderOpen className="h-4 w-4 text-neutral-500 shrink-0" /> : <Folder className="h-4 w-4 text-neutral-500 shrink-0" />}
              <span className="truncate font-extrabold">{item.name}</span>
            </button>
            {isExpanded && item.children && (
              <div className="flex flex-col">
                {renderTree(item.children, depth + 1)}
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div
            key={item.path}
            className={`group flex w-full items-center justify-between px-3 py-1.5 text-sm font-bold transition-colors ${
              isSelected 
                ? 'bg-neutral-250 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50' 
                : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-850'
            }`}
            style={{ paddingLeft: `${depth * 14 + 18}px` }}
          >
            <button
              onClick={() => onSelectFile(item)}
              className="flex w-full items-center gap-2 text-left"
            >
              {getFileIcon(item.name)}
              <span className={`truncate ${isSelected ? 'font-black text-zinc-950 dark:text-white' : ''}`}>{item.name}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(item.path);
              }}
              className="hidden opacity-0 group-hover:block group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    });
  };

  return (
    <div className="flex h-full flex-col bg-zinc-50 border-r border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
      {/* Explorer Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
        <span className="text-sm font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Workspace</span>
        <div className="flex gap-1.5">
          {/* New file button */}
          <button 
            onClick={() => {
              setIsCreatingFile(prev => !prev);
              setIsCreatingFolder(false);
            }} 
            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
            title="Create File"
          >
            <Plus className="h-4 w-4" />
          </button>
          {/* Upload zip input */}
          <label className="cursor-pointer rounded p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-200" title="Upload zip project">
            <input type="file" accept=".zip" onChange={handleZipUpload} className="hidden" />
            {zipLoading ? <RefreshCw className="h-4 w-4 animate-spin text-zinc-400" /> : <Upload className="h-4 w-4" />}
          </label>
        </div>
      </div>

      {/* Inline File Creation Input */}
      {(isCreatingFile || isCreatingFolder) && (
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-850">
          <input
            type="text"
            placeholder={isCreatingFile ? 'filename.py...' : 'folder_name...'}
            value={newFileName}
            onChange={e => setNewFileName(e.target.value)}
            className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate(isCreatingFolder);
              if (e.key === 'Escape') {
                setIsCreatingFile(false);
                setIsCreatingFolder(false);
                setNewFileName('');
              }
            }}
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <button 
              onClick={() => {
                setIsCreatingFile(false);
                setIsCreatingFolder(false);
                setNewFileName('');
              }}
              className="rounded px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleCreate(isCreatingFolder)}
              className="rounded-lg bg-zinc-900 text-white px-3 py-1 text-xs font-bold hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto py-2">
        {files.length > 0 ? (
          renderTree(files)
        ) : (
          <div className="p-5 text-center text-sm font-bold text-zinc-400">
            No files in workspace. Click '+' to add, or upload a zip project.
          </div>
        )}
      </div>

      {/* Code Templates Section */}
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block mb-2.5">Preset Examples</span>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(SAMPLE_CODE_TEMPLATES).map(([key, value]) => (
            <button
              key={key}
              onClick={() => onAddFile(`${key}_example.${value.ext}`, value.content, false)}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs font-bold text-left hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Code className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="truncate font-bold text-zinc-650 dark:text-zinc-300">{value.name.split(' ')[0]} ({value.ext})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
