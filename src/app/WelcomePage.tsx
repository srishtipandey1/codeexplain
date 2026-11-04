import {
  ArrowRight,
  BookOpen,
  Braces,
  FileSearch,
  GitBranch,
  Sparkles,
} from 'lucide-react';

interface WelcomePageProps {
  onStart: () => void;
}

const capabilities = [
  {
    icon: FileSearch,
    title: 'Search by meaning',
    description:
      'Find relevant code with local, BM25-powered search instead of relying on exact filenames or keywords.',
  },
  {
    icon: BookOpen,
    title: 'Understand the implementation',
    description:
      'Explore explanations, code quality, complexity, and learning tools alongside the file you are reading.',
  },
  {
    icon: GitBranch,
    title: 'Keep the context together',
    description:
      'Use one focused discussion for questions about your code. Search and analysis stay in the project inspector.',
  },
];

export default function WelcomePage({ onStart }: WelcomePageProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#09090b] text-zinc-100 selection:bg-violet-500/30">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
        <a href="#" className="flex items-center gap-3" aria-label="CodeExplain home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-950/40">
            <Braces className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">CodeExplain</span>
        </a>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-violet-400 hover:text-white"
        >
          Open workspace
          <ArrowRight className="h-4 w-4" />
        </button>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-14 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:pb-28 lg:pt-24">
        <div className="pointer-events-none absolute -left-40 top-12 h-96 w-96 rounded-full bg-violet-700/15 blur-3xl" />
        <div className="relative">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3.5 py-2 text-xs font-semibold tracking-wide text-violet-200">
            <Sparkles className="h-3.5 w-3.5" />
            A workspace for code comprehension
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Make unfamiliar code{' '}
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent">
              make sense.
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-400">
            Search a codebase by concept, inspect how its pieces fit together, and
            ask focused questions while you read. One place to move from code to
            understanding.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-2.5 rounded-xl bg-violet-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400"
            >
              Start exploring
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#capabilities"
              className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:text-white"
            >
              See what you can do
            </a>
          </div>
          <p className="mt-7 text-xs font-medium tracking-wide text-zinc-500">
            Local code search · Structured analysis · File-focused AI
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-violet-500/15 via-transparent to-sky-500/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#101014] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-violet-300">
                  <Braces className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">sorting_example.py</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Python · selected file</p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                Ready to explore
              </span>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-xl border border-zinc-800 bg-[#0b0b0e] p-4 font-mono text-xs leading-6 sm:text-sm">
                <p className="text-zinc-600">01</p>
                <p><span className="text-violet-300">def</span> <span className="text-sky-300">merge_sort</span>(items):</p>
                <p className="text-zinc-600">02</p>
                <p className="pl-4"><span className="text-violet-300">if</span> len(items) &lt;= <span className="text-amber-200">1</span>:</p>
                <p className="text-zinc-600">03</p>
                <p className="pl-8"><span className="text-violet-300">return</span> items</p>
                <p className="text-zinc-600">04</p>
                <p className="pl-4">middle = len(items) // <span className="text-amber-200">2</span></p>
                <p className="text-zinc-600">05</p>
                <p className="pl-4">left = merge_sort(items[:middle])</p>
                <p className="text-zinc-600">06</p>
                <p className="pl-4">right = merge_sort(items[middle:])</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Find', icon: FileSearch },
                  { label: 'Explain', icon: BookOpen },
                  { label: 'Trace', icon: GitBranch },
                ].map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-3 text-xs font-semibold text-zinc-300"
                  >
                    <Icon className="h-3.5 w-3.5 text-violet-300" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="relative mt-4 text-center text-xs text-zinc-500">
            Read the code. Follow the logic. Build understanding.
          </p>
        </div>
      </section>

      <section id="capabilities" className="border-t border-zinc-800/80 bg-zinc-950/50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:py-20">
          <div className="mb-9 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
              A clearer way to explore
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
              Designed around understanding the code in front of you.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-zinc-800 bg-[#101014] p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <span>CodeExplain · A focused workspace for exploring code</span>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 self-start font-semibold text-zinc-300 transition hover:text-white sm:self-auto"
        >
          Open the workspace
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </footer>
    </main>
  );
}
