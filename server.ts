import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  CitationItem,
  CostMode,
  RagQueryResponse,
  RetrievedPassage,
  buildExtractiveGroundedAnswer,
  calculateRagCostTelemetry,
} from './src/utils/ragEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.post('/api/rag/ask', async (req, res) => {
  try {
    const {
      question,
      passages,
      totalChunksSearched = 0,
      activeDocumentsCount = 0,
      totalCorpusWords = 1200,
      costMode = 'flash-lite-micro',
    }: {
      question: string;
      passages: RetrievedPassage[];
      totalChunksSearched?: number;
      activeDocumentsCount?: number;
      totalCorpusWords?: number;
      costMode?: CostMode;
    } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'A valid question is required.' });
    }

    const safePassages = Array.isArray(passages) ? passages : [];
    const fallbackResponse = buildExtractiveGroundedAnswer(
      question.trim(),
      safePassages,
      totalChunksSearched,
      activeDocumentsCount,
      totalCorpusWords,
      costMode
    );

    // If user selected Zero-Cost Local Extractive Mode or no passages matched, return $0.00 local synthesis immediately
    if (costMode === 'zero-cost-local' || safePassages.length === 0) {
      return res.json(fallbackResponse);
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json(fallbackResponse);
    }

    // Use ultra-cost-effective gemini-3.1-flash-lite by default for 10GB RAG scale, or gemini-3.8-flash if requested
    const targetModel =
      costMode === 'flash-lite-micro' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash';

    const formattedContext = safePassages
      .map(
        (p, idx) =>
          `[Source ${idx + 1}] Document: "${p.chunk.documentTitle}" | Section: "${p.chunk.sectionHeading}" | Region: "${p.chunk.region}" | Category: "${p.chunk.category}"\nExcerpt: ${p.chunk.text}`
      )
      .join('\n\n');

    const prompt = `You are Election Intell, an authoritative nonpartisan political intelligence RAG analyst.
Answer the user's question strictly using the uploaded PDF and Excel political intelligence sources provided below.
Every factual claim or statistic MUST include inline bracketed source citations like [1], [2], etc., corresponding to [Source 1], [Source 2].
Do not use markdown bold asterisks (**). Write clean, authoritative analytical prose.

UPLOADED POLITICAL CORPUS PASSAGES:
${formattedContext}

USER QUESTION:
${question.trim()}`;

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: prompt,
      config: {
        systemInstruction:
          'You are Election Intell, a nonpartisan political data analyst. Ground answers strictly in the provided passages and cite sources using [1], [2], etc. Never use markdown ** asterisks.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description:
                'Detailed analytical answer grounded in the passages with inline citations like [1], [2].',
            },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                '2 to 4 concise bullet takeaways with specific metrics and inline citations [1].',
            },
            confidenceLevel: {
              type: Type.STRING,
              description: 'High, Moderate, or Low based on how directly the passages answer the question.',
            },
          },
          required: ['answer', 'keyTakeaways', 'confidenceLevel'],
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      return res.json(fallbackResponse);
    }

    const parsed = JSON.parse(rawText.trim());
    const citations: CitationItem[] = safePassages.map((p, index) => ({
      citationNumber: index + 1,
      chunkId: p.chunk.id,
      documentId: p.chunk.documentId,
      documentTitle: p.chunk.documentTitle,
      sectionHeading: p.chunk.sectionHeading,
      category: p.chunk.category,
      region: p.chunk.region,
      excerpt: p.chunk.text,
      relevanceScore: p.relevanceScore,
    }));

    const confidence: 'High' | 'Moderate' | 'Low' =
      parsed.confidenceLevel === 'High' ||
      parsed.confidenceLevel === 'Moderate' ||
      parsed.confidenceLevel === 'Low'
        ? parsed.confidenceLevel
        : fallbackResponse.confidenceLevel;

    const costTelemetry = calculateRagCostTelemetry(totalCorpusWords, safePassages, costMode);

    const result: RagQueryResponse = {
      id: `q-${Date.now()}`,
      question: question.trim(),
      answer: (parsed.answer || fallbackResponse.answer).replace(/\*\*/g, ''),
      keyTakeaways:
        Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length > 0
          ? parsed.keyTakeaways.map((t: string) => String(t).replace(/\*\*/g, ''))
          : fallbackResponse.keyTakeaways,
      citations,
      confidenceLevel: confidence,
      timestamp: new Date().toISOString(),
      totalChunksSearched,
      activeDocumentsCount,
      costTelemetry,
    };

    return res.json(result);
  } catch (error) {
    console.error('Election Intell RAG API fallback triggered:', error);
    const {
      question = '',
      passages = [],
      totalChunksSearched = 0,
      activeDocumentsCount = 0,
      totalCorpusWords = 1200,
      costMode = 'flash-lite-micro',
    } = req.body || {};
    const fallback = buildExtractiveGroundedAnswer(
      String(question),
      Array.isArray(passages) ? passages : [],
      totalChunksSearched,
      activeDocumentsCount,
      totalCorpusWords,
      costMode
    );
    return res.json(fallback);
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Election Intell server listening on http://localhost:${PORT}`);
  });
}

startServer();
