import React from 'react';
import { Download, FileText, Code, Globe, Clipboard, Check } from 'lucide-react';
import { AnalysisReport } from '../types/analysis';

interface ExportUtilityProps {
  report: AnalysisReport;
}

export default function ExportUtility({ report }: ExportUtilityProps) {
  const [copied, setCopied] = React.useState(false);

  const generateMarkdown = () => {
    return `# CodeExplain AI - Deep Analysis Report
Generated: ${new Date().toLocaleDateString()}
Language: ${report.language}

## 1. Overview
### Purpose
${report.overview?.purpose || 'N/A'}

### How It Works
${report.overview?.howItWorks || 'N/A'}

### Execution Flow
${report.overview?.executionFlow || 'N/A'}

## 2. Complexity Analysis
* **Time Complexity:** ${report.complexity?.time || 'N/A'}
* **Space Complexity:** ${report.complexity?.space || 'N/A'}

### Time Explanation
${report.complexity?.timeExplanation || 'N/A'}

### Space Explanation
${report.complexity?.spaceExplanation || 'N/A'}

## 3. Code Quality Diagnostics
### Potential Bugs
${report.quality?.bugs?.map(b => `- ${b}`).join('\n') || 'None detected.'}

### Edge Cases
${report.quality?.edgeCases?.map(b => `- ${b}`).join('\n') || 'None detected.'}

### Security Concerns
${report.quality?.securityConcerns?.map(b => `- ${b}`).join('\n') || 'None detected.'}

### Performance Improvements
${report.quality?.performanceImprovements?.map(b => `- ${b}`).join('\n') || 'None detected.'}

### Clean Code Suggestions
${report.quality?.cleanCodeSuggestions?.map(b => `- ${b}`).join('\n') || 'None detected.'}

## 4. Explanations (Target Personas)
### Beginner Explanation
${report.personas?.beginner || 'N/A'}

### Expert Explanation
${report.personas?.expert || 'N/A'}

### Technical Interview Mode
${report.personas?.interview || 'N/A'}

## 5. Refactored Code Suggestions
\`\`\`${report.language.toLowerCase()}
${report.refactored?.code || ''}
\`\`\`

#### Changes made:
${report.refactored?.changes?.map(c => `- ${c}`).join('\n') || 'N/A'}

---
Report compiled by CodeExplain AI Platform.
`;
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const md = generateMarkdown();
    downloadFile(md, 'codeexplain_report.md', 'text/markdown');
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(report, null, 2);
    downloadFile(jsonStr, 'codeexplain_analysis.json', 'application/json');
  };

  const handleExportHTML = () => {
    const md = generateMarkdown();
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CodeExplain AI Report - ${report.language}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #171717; max-width: 800px; margin: 40px auto; padding: 0 20px; background-color: #fafafa; }
        h1 { border-bottom: 2px solid #e5e5e5; padding-bottom: 10px; font-weight: 800; }
        h2 { border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; margin-top: 30px; }
        h3 { color: #4f46e5; }
        pre { background: #171717; color: #f5f5f5; padding: 16px; rounded: 8px; border-radius: 8px; overflow-x: auto; font-family: monospace; }
        ul { padding-left: 20px; }
        li { margin-bottom: 8px; }
        .badge { background: #e0e7ff; color: #4338ca; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    </style>
</head>
<body>
    <h1>CodeExplain AI - Deep Analysis Report</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
    <p><strong>Language:</strong> <span class="badge">${report.language}</span></p>
    
    <h2>1. Overview</h2>
    <h3>Purpose</h3>
    <p>${report.overview?.purpose?.replace(/\n/g, '<br>') || 'N/A'}</p>
    <h3>How It Works</h3>
    <p>${report.overview?.howItWorks?.replace(/\n/g, '<br>') || 'N/A'}</p>
    <h3>Execution Flow</h3>
    <p>${report.overview?.executionFlow?.replace(/\n/g, '<br>') || 'N/A'}</p>

    <h2>2. Complexity Analysis</h2>
    <p><strong>Time Complexity:</strong> <code>${report.complexity?.time || 'N/A'}</code></p>
    <p><strong>Space Complexity:</strong> <code>${report.complexity?.space || 'N/A'}</code></p>
    <h3>Time Explanation</h3>
    <p>${report.complexity?.timeExplanation || 'N/A'}</p>
    <h3>Space Explanation</h3>
    <p>${report.complexity?.spaceExplanation || 'N/A'}</p>

    <h2>3. Code Diagnostics</h2>
    <h3>Bugs Detected</h3>
    <ul>${report.quality?.bugs?.map(b => `<li>${b}</li>`).join('') || '<li>None</li>'}</ul>
    <h3>Edge Cases</h3>
    <ul>${report.quality?.edgeCases?.map(b => `<li>${b}</li>`).join('') || '<li>None</li>'}</ul>
    <h3>Performance Suggestions</h3>
    <ul>${report.quality?.performanceImprovements?.map(b => `<li>${b}</li>`).join('') || '<li>None</li>'}</ul>

    <h2>4. Refactored Implementation</h2>
    <pre><code>${report.refactored?.code || ''}</code></pre>
</body>
</html>
    `;
    downloadFile(htmlContent, 'codeexplain_report.html', 'text/html');
  };

  const handleExportPDF = () => {
    // Generate a print-friendly window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>CodeExplain AI Report</title>
          <style>
            body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 30px; color: #1f2937; }
            h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; color: #111827; }
            h2 { color: #374151; margin-top: 24px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
            h3 { color: #4f46e5; font-size: 16px; }
            pre { background: #1f2937; color: #f9fafb; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; overflow-x: auto; }
            ul { padding-left: 20px; }
            li { margin-bottom: 6px; font-size: 14px; }
            @media print {
              body { padding: 0; }
              pre { background: #f3f4f6; color: #111827; border: 1px solid #e5e7eb; }
            }
          </style>
        </head>
        <body>
          <h1>CodeExplain AI - Performance & Architectural Report</h1>
          <p><strong>Export Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Target Language:</strong> ${report.language}</p>
          
          <h2>1. System Architecture</h2>
          <h3>Purpose</h3>
          <p>${report.overview?.purpose || 'N/A'}</p>
          <h3>Operational Mechanics</h3>
          <p>${report.overview?.howItWorks || 'N/A'}</p>

          <h2>2. Algorithmic Bounds</h2>
          <p><strong>Complexity:</strong> Time: ${report.complexity?.time || 'N/A'} | Space: ${report.complexity?.space || 'N/A'}</p>
          <p>${report.complexity?.timeExplanation || 'N/A'}</p>

          <h2>3. Safety & Diagnostic Audit</h2>
          <h3>Potential Defects</h3>
          <ul>${report.quality?.bugs?.map(b => `<li>${b}</li>`).join('') || '<li>None identified.</li>'}</ul>
          <h3>Edge Cases</h3>
          <ul>${report.quality?.edgeCases?.map(b => `<li>${b}</li>`).join('') || '<li>None.</li>'}</ul>

          <h2>4. Optimal Refactored Code</h2>
          <pre><code>${report.refactored?.code || ''}</code></pre>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyAll = () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/20">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Report Export Engine</span>
        <button
          onClick={handleCopyAll}
          className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" /> Copied!
            </>
          ) : (
            <>
              <Clipboard className="h-3 w-3" /> Copy Markdown
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={handleExportPDF}
          className="flex items-center justify-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-650 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          PDF
        </button>
        <button
          onClick={handleExportMarkdown}
          className="flex items-center justify-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-650 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <Code className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          Markdown
        </button>
        <button
          onClick={handleExportHTML}
          className="flex items-center justify-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-650 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <Globe className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          HTML
        </button>
        <button
          onClick={handleExportJSON}
          className="flex items-center justify-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-650 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <Download className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          JSON
        </button>
      </div>
    </div>
  );
}
