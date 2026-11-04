import { AnalysisReport, QuizQuestion, ChatMessage } from '../types/analysis';

export function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('GROQ_API_KEY is not defined. Please configure GROQ_API_KEY in your .env file or environment variables.');
  }
  return key;
}

const ANALYSIS_REPORT_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'code_analysis_report',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        language: { type: 'string' },
        overview: {
          type: 'object',
          properties: {
            purpose: { type: 'string' },
            howItWorks: { type: 'string' },
            executionFlow: { type: 'string' },
          },
          required: ['purpose', 'howItWorks', 'executionFlow'],
          additionalProperties: false,
        },
        explanation: {
          type: 'object',
          properties: {
            stepByStep: { type: 'array', items: { type: 'string' } },
            lineByLine: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  line: { type: 'integer' },
                  code: { type: 'string' },
                  explanation: { type: 'string' },
                },
                required: ['line', 'code', 'explanation'],
                additionalProperties: false,
              },
            },
          },
          required: ['stepByStep', 'lineByLine'],
          additionalProperties: false,
        },
        complexity: {
          type: 'object',
          properties: {
            time: { type: 'string' },
            space: { type: 'string' },
            timeExplanation: { type: 'string' },
            spaceExplanation: { type: 'string' },
          },
          required: ['time', 'space', 'timeExplanation', 'spaceExplanation'],
          additionalProperties: false,
        },
        quality: {
          type: 'object',
          properties: {
            bugs: { type: 'array', items: { type: 'string' } },
            edgeCases: { type: 'array', items: { type: 'string' } },
            securityConcerns: { type: 'array', items: { type: 'string' } },
            performanceImprovements: { type: 'array', items: { type: 'string' } },
            cleanCodeSuggestions: { type: 'array', items: { type: 'string' } },
          },
          required: ['bugs', 'edgeCases', 'securityConcerns', 'performanceImprovements', 'cleanCodeSuggestions'],
          additionalProperties: false,
        },
        refactored: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            changes: { type: 'array', items: { type: 'string' } },
          },
          required: ['code', 'changes'],
          additionalProperties: false,
        },
        personas: {
          type: 'object',
          properties: {
            beginner: { type: 'string' },
            expert: { type: 'string' },
            interview: { type: 'string' },
          },
          required: ['beginner', 'expert', 'interview'],
          additionalProperties: false,
        },
        summary: { type: 'string' },
      },
      required: ['language', 'overview', 'explanation', 'complexity', 'quality', 'refactored', 'personas', 'summary'],
      additionalProperties: false,
    },
  },
};

async function callGroqAPI(
  systemPrompt: string,
  userPrompt: string,
  responseFormat: Record<string, unknown> | null = { type: 'json_object' }
): Promise<any> {
  const apiKey = getGroqApiKey();
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const body: any = {
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1,
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (responseFormat) {
      return JSON.parse(content);
    }
    return content;
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw error;
  }
}

export async function analyzeCode(code: string, language: string, localParsedData: any): Promise<AnalysisReport> {
  const systemPrompt = `You are a world-class Staff Software Engineer and AI Code Auditor.
Analyze the provided code and return a high-fidelity code explanation report as a JSON object.
Do NOT output any markdown, text wrapping, or explanations outside the JSON object.

The JSON response MUST strictly follow this typescript schema:
{
  "language": string,
  "overview": {
    "purpose": string,
    "howItWorks": string,
    "executionFlow": string
  },
  "explanation": {
    "stepByStep": string[],
    "lineByLine": Array<{ "line": number, "code": string, "explanation": string }>
  },
  "complexity": {
    "time": string,
    "space": string,
    "timeExplanation": string,
    "spaceExplanation": string
  },
  "quality": {
    "bugs": string[],
    "edgeCases": string[],
    "securityConcerns": string[],
    "performanceImprovements": string[],
    "cleanCodeSuggestions": string[]
  },
  "refactored": {
    "code": string,
    "changes": string[]
  },
  "personas": {
    "beginner": string,
    "expert": string,
    "interview": string
  },
  "summary": string
}

Keep every field concise. Include line-by-line explanations for at most 12 important lines, using their exact 1-based line numbers. Limit each quality list to 3 specific findings; use an empty list when there are none. Provide accurate Big-O complexity and short, useful personas.`;

  const userPrompt = `Language: ${language}
Code to analyze:
\`\`\`
${code}
\`\`\`

Metrics already calculated locally for context:
${JSON.stringify(localParsedData.metrics, null, 2)}`;

  const aiResult = await callGroqAPI(systemPrompt, userPrompt, ANALYSIS_REPORT_SCHEMA);

  // Blend local metrics/symbols/graphs with LLM output
  return {
    ...aiResult,
    language: aiResult.language || language,
    metrics: localParsedData.metrics,
    symbols: localParsedData.symbols,
    ast: localParsedData.ast,
    graphs: localParsedData.graphs,
  };
}

export async function generateQuiz(code: string, language: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<QuizQuestion[]> {
  const systemPrompt = `You are an expert technical interviewer and computer science professor.
Generate an interactive, high-quality quiz based on the provided code snippet.
Generate exactly 4-5 diverse questions.
The returned JSON response MUST be an object with a "questions" key containing an array matching this typescript schema:
{
  "questions": Array<{
    "id": string,
    "type": "mcq" | "predict_output" | "bug_finding" | "complexity" | "completion",
    "question": string,
    "codeSnippet": string (optional code block if relevant, can be empty),
    "options": string[] (provide exactly 4 options for MCQ),
    "correctAnswer": string (exact match of correct option, or predicted output text, or bug location, or complexity notation, or missing code),
    "explanation": string,
    "difficulty": "easy" | "medium" | "hard"
  }>
}

Ensure the questions truly test core code logic, recursion, pointer usage, concurrency, memory models, time/space limits, or type-safety.`;

  const userPrompt = `Language: ${language}
Difficulty: ${difficulty}
Code:
\`\`\`
${code}
\`\`\``;

  const result = await callGroqAPI(systemPrompt, userPrompt);
  return result.questions || [];
}

export async function optimizeCode(code: string, language: string): Promise<{ optimizedCode: string; explanation: string; timeBefore: string; timeAfter: string; changes: string[] }> {
  const systemPrompt = `You are a Principal Performance Engineer. Optimize the given code for maximum performance, minimum memory footprints, and extreme execution speed.
Return the result as a JSON object with this schema:
{
  "optimizedCode": string,
  "explanation": string,
  "timeBefore": string,
  "timeAfter": string,
  "changes": string[]
}`;

  const userPrompt = `Language: ${language}
Code:
\`\`\`
${code}
\`\`\``;

  return await callGroqAPI(systemPrompt, userPrompt);
}

export async function refactorCode(code: string, language: string): Promise<{ refactoredCode: string; changes: string[]; designPatternsUsed: string[] }> {
  const systemPrompt = `You are a Software Architect and Clean Code Evangelist. Refactor the given code to improve maintainability, legibility, architectural beauty, and SOLID design patterns.
Return the result as a JSON object with this schema:
{
  "refactoredCode": string,
  "changes": string[],
  "designPatternsUsed": string[]
}`;

  const userPrompt = `Language: ${language}
Code:
\`\`\`
${code}
\`\`\``;

  return await callGroqAPI(systemPrompt, userPrompt);
}

export async function explainComplexity(code: string, language: string): Promise<{ timeComplexity: string; spaceComplexity: string; detailedProof: string; worstCase: string; bestCase: string; averageCase: string }> {
  const systemPrompt = `You are an Algorithm Theorist and Complexity Analyst. Provide a strict formal proof of Time and Space complexity for the given code.
Return the result as a JSON object with this schema:
{
  "timeComplexity": string,
  "spaceComplexity": string,
  "detailedProof": string,
  "worstCase": string,
  "bestCase": string,
  "averageCase": string
}`;

  const userPrompt = `Language: ${language}
Code:
\`\`\`
${code}
\`\`\``;

  return await callGroqAPI(systemPrompt, userPrompt);
}

export async function generateFlowchart(code: string, language: string): Promise<{ mermaidCode: string; stepNodes: Array<{ id: string; label: string; details: string }> }> {
  const systemPrompt = `You are a Technical Document Architect. Represent the execution flow of the provided code in Mermaid flowchart syntax, alongside simple step node details.
Return the result as a JSON object with this schema:
{
  "mermaidCode": string,
  "stepNodes": Array<{ "id": string, "label": string, "details": string }>
}`;

  const userPrompt = `Language: ${language}
Code:
\`\`\`
${code}
\`\`\``;

  return await callGroqAPI(systemPrompt, userPrompt);
}

export async function generateTests(code: string, language: string): Promise<{ testSuiteCode: string; coverageEstimation: string; testCases: Array<{ name: string; description: string; expectedResult: string }> }> {
  const systemPrompt = `You are a Senior Software Engineer in Test. Create a comprehensive test suite (unit tests, boundary cases, edge-cases, error injection) for the provided code.
Return the result as a JSON object with this schema:
{
  "testSuiteCode": string,
  "coverageEstimation": string,
  "testCases": Array<{ "name": string, "description": string, "expectedResult": string }>
}`;

  const userPrompt = `Language: ${language}
Code:
\`\`\`
${code}
\`\`\``;

  return await callGroqAPI(systemPrompt, userPrompt);
}

export async function chatAboutCode(code: string, language: string, history: ChatMessage[], message: string): Promise<string> {
  const systemPrompt = `You are CodeExplain AI, a conversational AI code exploration assistant.
Help the developer understand and work with the code provided.
Be accurate and concise. Answer only the latest question, using the recent conversation only when needed for context.
Use plain text without Markdown headings, hashtags, emojis, generic introductions, or repeated conclusions.
Use short lists only when they make the answer clearer. For code requests, include only a minimal complete solution and essential explanation.`;

  const chatHistory = history.slice(-6).map(h => {
    const content = h.content.slice(0, h.role === 'user' ? 2000 : 1200);
    return `${h.role === 'user' ? 'User' : 'CodeExplain AI'}: ${content}`;
  }).join('\n');

  const userPrompt = `Code context:
Language: ${language}
\`\`\`
${code}
\`\`\`

Recent conversation (context only; do not imitate prior response formatting):
${chatHistory}

New User Question: ${message}
Answer the latest question directly. Use concise plain text: no Markdown headings, hashtags, emojis, generic introductions, or repeated conclusions. Use a short list only when it improves clarity. If code or tests are requested, provide a minimal complete solution and omit unrequested test plans, coverage summaries, and tables.`;

  return await callGroqAPI(systemPrompt, userPrompt, null);
}
