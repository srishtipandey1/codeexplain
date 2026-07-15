import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { detectLanguage, parseLocalMetrics } from './src/services/parser';
import {
  analyzeCode,
  generateQuiz,
  optimizeCode,
  refactorCode,
  explainComplexity,
  generateFlowchart,
  generateTests,
  chatAboutCode
} from './src/services/groq';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for large code payloads or zip file strings
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  // Helper endpoint to check API health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // POST /api/analyze
  app.post('/api/analyze', async (req, res) => {
    try {
      const { code, filename, language } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'No code content provided' });
      }

      const activeLanguage = language || detectLanguage(filename || 'code_input', code);
      // Run parser locally first
      const localParsedData = parseLocalMetrics(code, activeLanguage);

      // Run advanced AI diagnostics on Groq
      const report = await analyzeCode(code, activeLanguage, localParsedData);
      res.json(report);
    } catch (error: any) {
      console.error('Error in /api/analyze:', error);
      res.status(500).json({ error: error.message || 'An error occurred during analysis.' });
    }
  });

  // POST /api/chat
  app.post('/api/chat', async (req, res) => {
    try {
      const { code, language, history, message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      const response = await chatAboutCode(code || '', language || 'JavaScript', history || [], message);
      res.json({ response });
    } catch (error: any) {
      console.error('Error in /api/chat:', error);
      res.status(500).json({ error: error.message || 'An error occurred during chat.' });
    }
  });

  // POST /api/quiz
  app.post('/api/quiz', async (req, res) => {
    try {
      const { code, language, difficulty } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'Code is required for quiz generation.' });
      }
      const questions = await generateQuiz(code, language || 'JavaScript', difficulty || 'medium');
      res.json({ questions });
    } catch (error: any) {
      console.error('Error in /api/quiz:', error);
      res.status(500).json({ error: error.message || 'An error occurred during quiz generation.' });
    }
  });

  // POST /api/optimize
  app.post('/api/optimize', async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'Code is required.' });
      }
      const result = await optimizeCode(code, language || 'JavaScript');
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/optimize:', error);
      res.status(500).json({ error: error.message || 'An error occurred during optimization.' });
    }
  });

  // POST /api/refactor
  app.post('/api/refactor', async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'Code is required.' });
      }
      const result = await refactorCode(code, language || 'JavaScript');
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/refactor:', error);
      res.status(500).json({ error: error.message || 'An error occurred during refactoring.' });
    }
  });

  // POST /api/complexity
  app.post('/api/complexity', async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'Code is required.' });
      }
      const result = await explainComplexity(code, language || 'JavaScript');
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/complexity:', error);
      res.status(500).json({ error: error.message || 'An error occurred during complexity analysis.' });
    }
  });

  // POST /api/flowchart
  app.post('/api/flowchart', async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'Code is required.' });
      }
      const result = await generateFlowchart(code, language || 'JavaScript');
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/flowchart:', error);
      res.status(500).json({ error: error.message || 'An error occurred during flowchart generation.' });
    }
  });

  // POST /api/tests
  app.post('/api/tests', async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'Code is required.' });
      }
      const result = await generateTests(code, language || 'JavaScript');
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/tests:', error);
      res.status(500).json({ error: error.message || 'An error occurred during test generation.' });
    }
  });

  // Integration of Vite Development Server Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in Development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production-ready static bundle from /dist');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CodeExplain server successfully started and listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CodeExplain Express server:', err);
});
