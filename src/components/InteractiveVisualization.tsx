import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Network, Code, ArrowRight, Layers, Maximize2, 
  ChevronRight, ChevronDown, Check, Info, ZoomIn, Search
} from 'lucide-react';
import { ASTNode, CodeGraph } from '../types/analysis';

interface InteractiveVisualizationProps {
  ast: ASTNode;
  dependencyGraph: CodeGraph;
  callGraph: CodeGraph;
  importsGraph: CodeGraph;
  onSymbolSelect?: (name: string) => void;
}

export default function InteractiveVisualization({
  ast,
  dependencyGraph,
  callGraph,
  importsGraph,
  onSymbolSelect
}: InteractiveVisualizationProps) {
  const [activeTab, setActiveTab] = useState<'graph' | 'ast' | 'flow'>('graph');
  const [activeGraphType, setActiveGraphType] = useState<'call' | 'dependency' | 'imports'>('call');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [astSearch, setAstSearch] = useState('');

  // Get active graph
  const getActiveGraph = (): CodeGraph => {
    switch (activeGraphType) {
      case 'dependency': return dependencyGraph;
      case 'imports': return importsGraph;
      default: return callGraph;
    }
  };

  const graph = getActiveGraph();

  // Standard AST nested element
  const ASTNodeComponent = ({ node, depth = 0 }: { node: ASTNode; depth?: number; key?: string }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const hasChildren = node.children && node.children.length > 0;
    
    const matchesSearch = astSearch 
      ? node.label.toLowerCase().includes(astSearch.toLowerCase()) || 
        node.type.toLowerCase().includes(astSearch.toLowerCase()) || 
        node.value?.toLowerCase().includes(astSearch.toLowerCase())
      : true;

    return (
      <div className={`pl-3 font-mono text-xs ${matchesSearch ? 'opacity-100' : 'opacity-40'}`}>
        <div className="flex items-center gap-1.5 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded px-1 group">
          {hasChildren ? (
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-0.5 text-zinc-400">
              {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}
          <span className="text-violet-600 dark:text-violet-400 font-semibold">{node.type}:</span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium">{node.label}</span>
          {node.value && (
            <span className="text-emerald-600 dark:text-emerald-400 italic font-normal text-[11px] truncate max-w-[200px]">
              &rarr; {node.value}
            </span>
          )}
          {node.line && (
            <span className="ml-auto text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">
              Line {node.line}
            </span>
          )}
        </div>
        {!isCollapsed && hasChildren && node.children && (
          <div className="border-l border-zinc-200 dark:border-zinc-800 ml-2 pl-1.5 my-0.5">
            {node.children.map(child => (
              <ASTNodeComponent key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Generate deterministic layouts for nodes in circular/grid arrangements
  const generateLayout = (nodes: any[]) => {
    const radius = Math.min(200, nodes.length * 12 + 100);
    const centerX = 250;
    const centerY = 180;
    
    return nodes.reduce((acc, node, idx) => {
      const angle = (idx / nodes.length) * 2 * Math.PI;
      acc[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
      return acc;
    }, {} as Record<string, { x: number; y: number }>);
  };

  const layout = generateLayout(graph.nodes);

  // Determine if edge should be highlighted
  const isEdgeHighlighted = (source: string, target: string) => {
    if (!hoveredNode) return false;
    return source === hoveredNode || target === hoveredNode;
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      {/* Tab Selectors */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'graph'
                ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            Dependency Maps
          </button>
          <button
            onClick={() => setActiveTab('ast')}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'ast'
                ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            AST Tree
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'flow'
                ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Execution Flow
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[320px] flex-1 overflow-auto bg-zinc-50/70 p-4 dark:bg-zinc-950/30">
        {activeTab === 'graph' && (
          <div className="flex flex-col h-full">
            {/* Graph sub tab togglers */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
                {(['call', 'dependency', 'imports'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setActiveGraphType(type)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium capitalize ${
                      activeGraphType === type
                        ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                  >
                    {type === 'call' ? 'Call Graph' : type === 'dependency' ? 'Dependency Graph' : 'Imports Graph'}
                  </button>
                ))}
              </div>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Info className="h-3.5 w-3.5" /> Hover a node to trace connections
              </span>
            </div>

            {/* Vector Graph Display */}
            <div className="relative flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 min-h-[300px] flex items-center justify-center">
              <svg className="w-full h-full min-h-[290px]" viewBox="0 0 500 360">
                {/* Arrowhead markers */}
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 2 L 10 5 L 0 8 z" fill="#a3a3a3" />
                  </marker>
                  <marker id="arrow-highlight" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 2 L 10 5 L 0 8 z" fill="#6366f1" />
                  </marker>
                </defs>

                {/* Render Edges */}
                {graph.edges.map((edge, idx) => {
                  const sourcePos = layout[edge.source];
                  const targetPos = layout[edge.target];
                  if (!sourcePos || !targetPos) return null;
                  
                  const isHighlighted = isEdgeHighlighted(edge.source, edge.target);

                  return (
                    <g key={`edge_${idx}`}>
                      <path
                        d={`M ${sourcePos.x} ${sourcePos.y} Q ${(sourcePos.x + targetPos.x) / 2 + 10} ${(sourcePos.y + targetPos.y) / 2 - 15} ${targetPos.x} ${targetPos.y}`}
                        fill="none"
                        stroke={isHighlighted ? '#6366f1' : '#e5e5e5'}
                        strokeWidth={isHighlighted ? 2.2 : 1}
                        className="transition-colors duration-150"
                        markerEnd={isHighlighted ? 'url(#arrow-highlight)' : 'url(#arrow)'}
                        strokeDasharray={edge.label === 'imports' ? '4 3' : undefined}
                      />
                      {isHighlighted && edge.label && (
                        <text
                          x={(sourcePos.x + targetPos.x) / 2}
                          y={(sourcePos.y + targetPos.y) / 2 - 10}
                          fill="#4f46e5"
                          className="text-[10px] font-mono font-medium text-center"
                          textAnchor="middle"
                        >
                          {edge.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Render Nodes */}
                {graph.nodes.map(node => {
                  const pos = layout[node.id];
                  if (!pos) return null;

                  const isHovered = hoveredNode === node.id;
                  const isSelected = selectedNode === node.id;
                  
                  // Color styling based on types
                  const isMain = node.id === 'main' || node.id === 'Project';
                  const isFunction = node.type === 'function';
                  const isClass = node.type === 'class';

                  let fillCol = 'fill-white dark:fill-zinc-900';
                  let strokeCol = 'stroke-zinc-300 dark:stroke-zinc-800';
                  if (isMain) {
                    fillCol = 'fill-emerald-50/80 dark:fill-emerald-950/40';
                    strokeCol = 'stroke-emerald-400 dark:stroke-emerald-600';
                  } else if (isFunction) {
                    fillCol = 'fill-indigo-50/80 dark:fill-indigo-950/40';
                    strokeCol = 'stroke-indigo-400 dark:stroke-indigo-600';
                  } else if (isClass) {
                    fillCol = 'fill-amber-50/80 dark:fill-amber-950/40';
                    strokeCol = 'stroke-amber-400 dark:stroke-amber-600';
                  }

                  if (isHovered) {
                    strokeCol = 'stroke-indigo-600 dark:stroke-indigo-400';
                  }

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => {
                        setSelectedNode(node.id);
                        if (onSymbolSelect) onSymbolSelect(node.label);
                      }}
                      className="cursor-pointer group"
                    >
                      <circle
                        r={isMain ? 14 : 11}
                        className={`${fillCol} ${strokeCol} transition-all duration-150`}
                        strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                      />
                      <text
                        y="22"
                        className="text-[10px] font-mono font-medium fill-zinc-700 dark:fill-zinc-300 pointer-events-none"
                        textAnchor="middle"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Node explanation overlays */}
              {selectedNode && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg border border-zinc-200 bg-white/95 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950/95">
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">Selected Node: {selectedNode}</span>
                    <span className="text-xs text-zinc-500">Trace highlighted links above for calling connections.</span>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="rounded px-1.5 py-0.5 border border-zinc-200 text-zinc-500 hover:text-zinc-800">Clear</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ast' && (
          <div className="flex flex-col h-full">
            {/* AST search bar */}
            <div className="relative mb-3.5">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search AST nodes (e.g. FunctionDeclaration, main)..."
                value={astSearch}
                onChange={e => setAstSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-violet-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* AST Tree view */}
            <div className="min-h-[280px] rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <ASTNodeComponent node={ast} depth={0} />
            </div>
          </div>
        )}

        {activeTab === 'flow' && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Execution flow</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">A simplified view of the typical runtime sequence.</p>
            </div>
            <div className="relative flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
              {/* Timeline Steps */}
              {[
                { step: 1, title: 'Execution Init', desc: 'Environment bootstrap and runtime load.' },
                { step: 2, title: 'Context & Scope Binding', desc: 'Initialize globals, stack frame setup, variable definitions.' },
                { step: 3, title: 'Function Entrypoint Invocation', desc: 'Execute primary functions and recursive/loop structures.' },
                { step: 4, title: 'Scope Unwind & Terminate', desc: 'Garbage collect or return values to callers.' }
              ].map((flowStep, idx, arr) => (
                <div key={flowStep.step} className="flex gap-4 items-start relative">
                  {idx < arr.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-[-16px] w-0.5 bg-zinc-200 dark:bg-zinc-800" />
                  )}
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-sm font-semibold text-violet-700 dark:border dark:border-zinc-700 dark:bg-violet-950/50 dark:text-violet-300 shrink-0">
                    {flowStep.step}
                  </div>
                  <div className="flex flex-col pt-1">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{flowStep.title}</span>
                    <span className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{flowStep.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
