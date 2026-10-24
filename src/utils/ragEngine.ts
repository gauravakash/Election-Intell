import * as XLSX from 'xlsx';

export type DocumentCategory =
  | 'Polling & Turnout'
  | 'Party Manifesto'
  | 'Campaign Finance'
  | 'Constituency Demographics'
  | 'Legislative Record';

export type FileFormatType = 'PDF' | 'EXCEL' | 'CSV' | 'JSON' | 'TXT';

export type CostMode = 'zero-cost-local' | 'flash-lite-micro' | 'flash-standard';

export interface PoliticalDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  region: string;
  datePublished: string;
  sourceOrg: string;
  content: string;
  wordCount: number;
  chunkCount: number;
  uploadedAt: string;
  fileFormat?: FileFormatType;
  fileSizeBytes?: number;
  sheetOrPageCount?: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  category: DocumentCategory;
  region: string;
  datePublished: string;
  chunkIndex: number;
  sectionHeading: string;
  text: string;
  tokens: string[];
}

export interface RetrievedPassage {
  chunk: DocumentChunk;
  relevanceScore: number;
  matchedTerms: string[];
}

export interface CitationItem {
  citationNumber: number;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sectionHeading: string;
  category: DocumentCategory;
  region: string;
  excerpt: string;
  relevanceScore: number;
}

export interface CostTelemetry {
  costMode: CostMode;
  corpusTokensTotal: number;
  retrievedTokensSent: number;
  tokenReductionPercent: number;
  estimatedQueryCostUSD: number;
  naiveFullContextCostUSD: number;
}

export interface RagQueryResponse {
  id: string;
  question: string;
  answer: string;
  keyTakeaways: string[];
  citations: CitationItem[];
  confidenceLevel: 'High' | 'Moderate' | 'Low';
  timestamp: string;
  totalChunksSearched: number;
  activeDocumentsCount: number;
  costTelemetry?: CostTelemetry;
}

/**
 * Pure tokenizer for political text indexing and retrieval
 */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'are', 'was', 'were',
  'have', 'has', 'had', 'not', 'but', 'what', 'which', 'who', 'whom', 'whose',
  'where', 'when', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'than', 'too', 'very', 'can', 'will', 'just',
  'should', 'now', 'into', 'over', 'after', 'before', 'between', 'under', 'about',
  'against', 'during', 'without', 'within', 'along', 'following', 'across',
  'behind', 'beyond', 'plus', 'except', 'but', 'up', 'out', 'around', 'down',
  'off', 'above', 'near', 'their', 'they', 'them', 'these', 'those', 'its', 'our',
  'your', 'his', 'her', 'been', 'being', 'does', 'did', 'doing', 'would', 'could'
]);

export function tokenizeText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%$-]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[-]+|[-]+$/g, ''))
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

/**
 * Splits raw political document content (PDF pages, Excel sheets, CSV, TXT, Markdown) into semantic chunks
 */
export function chunkDocument(
  doc: Omit<PoliticalDocument, 'wordCount' | 'chunkCount'>,
  maxWordsPerChunk = 140
): { document: PoliticalDocument; chunks: DocumentChunk[] } {
  const normalized = doc.content.replace(/\r\n/g, '\n').trim();
  const totalWords = normalized ? normalized.split(/\s+/).length : 0;

  if (!normalized) {
    const emptyDoc: PoliticalDocument = {
      ...doc,
      wordCount: 0,
      chunkCount: 0,
    };
    return { document: emptyDoc, chunks: [] };
  }

  const rawBlocks = normalized.split(/\n{2,}/);
  const chunks: DocumentChunk[] = [];
  let currentHeading = 'Overview & Executive Summary';
  let bufferWords: string[] = [];
  let chunkCounter = 0;

  const flushBuffer = (heading: string) => {
    if (bufferWords.length === 0) return;
    const chunkText = bufferWords.join(' ').trim();
    if (chunkText.length > 0) {
      chunkCounter += 1;
      chunks.push({
        id: `${doc.id}-c${chunkCounter}`,
        documentId: doc.id,
        documentTitle: doc.title,
        category: doc.category,
        region: doc.region,
        datePublished: doc.datePublished,
        chunkIndex: chunkCounter,
        sectionHeading: heading,
        text: chunkText,
        tokens: tokenizeText(`${doc.title} ${heading} ${doc.region} ${doc.category} ${chunkText}`),
      });
    }
    bufferWords = [];
  };

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n');
    const firstLine = lines[0].trim();
    if (firstLine.startsWith('#')) {
      flushBuffer(currentHeading);
      currentHeading = firstLine.replace(/^#+\s*/, '').trim() || currentHeading;
      const rest = lines.slice(1).join(' ').trim();
      if (rest) {
        bufferWords.push(...rest.split(/\s+/));
      }
    } else if (
      lines.length > 1 &&
      firstLine.length < 70 &&
      firstLine === firstLine.toUpperCase() &&
      /[A-Z]/.test(firstLine)
    ) {
      flushBuffer(currentHeading);
      currentHeading = firstLine.replace(/[:]+$/, '').trim();
      const rest = lines.slice(1).join(' ').trim();
      if (rest) {
        bufferWords.push(...rest.split(/\s+/));
      }
    } else {
      const blockWords = trimmed.split(/\s+/);
      if (bufferWords.length + blockWords.length > maxWordsPerChunk && bufferWords.length >= 35) {
        flushBuffer(currentHeading);
      }
      bufferWords.push(...blockWords);
    }

    while (bufferWords.length >= maxWordsPerChunk) {
      const slice = bufferWords.slice(0, maxWordsPerChunk);
      const remainder = bufferWords.slice(maxWordsPerChunk);
      bufferWords = slice;
      flushBuffer(currentHeading);
      bufferWords = remainder;
    }
  }

  flushBuffer(currentHeading);

  const finalDoc: PoliticalDocument = {
    ...doc,
    wordCount: totalWords,
    chunkCount: chunks.length,
    fileSizeBytes: doc.fileSizeBytes ?? BufferLikeByteLength(normalized),
  };

  return { document: finalDoc, chunks };
}

function BufferLikeByteLength(str: string): number {
  return str.length * 2;
}

/**
 * Parses binary Excel (.xlsx, .xls) ArrayBuffer or Uint8Array into structured sheet & row blocks
 * Optimized for high-density booth/precinct spreadsheets without blowing up RAM.
 */
export function parseExcelWorkbookBuffer(
  buffer: ArrayBuffer | Uint8Array,
  maxRowsPerSheet = 2500
): { content: string; sheetCount: number; totalRowsParsed: number } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetBlocks: string[] = [];
  let totalRowsParsed = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
    });

    if (rows.length === 0) continue;

    const cappedRows = rows.slice(0, maxRowsPerSheet);
    totalRowsParsed += cappedRows.length;

    const formattedRows: string[] = [];
    // Group every 5 rows under a sheet section heading so BM25 indexes booth/constituency clusters cleanly
    for (let i = 0; i < cappedRows.length; i++) {
      const rowObj = cappedRows[i];
      const kvPairs = Object.entries(rowObj)
        .filter(([k, v]) => k && String(v).trim() !== '')
        .map(([k, v]) => `${k.trim()}: ${String(v).trim()}`)
        .join(' · ');
      if (kvPairs) {
        formattedRows.push(`Row ${i + 1} [${sheetName}] — ${kvPairs}`);
      }
    }

    sheetBlocks.push(
      `# Excel Sheet: ${sheetName} (${cappedRows.length} rows)\n\n${formattedRows.join('\n\n')}`
    );
  }

  return {
    content: sheetBlocks.join('\n\n'),
    sheetCount: workbook.SheetNames.length,
    totalRowsParsed,
  };
}

/**
 * Formats CSV, JSON, or text into readable analytical prose before chunking
 */
export function parseUploadedFileContent(filename: string, rawText: string): string {
  const lower = filename.toLowerCase();
  const trimmed = rawText.trim();

  if (lower.endsWith('.json')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item, idx) => {
            if (typeof item === 'object' && item !== null) {
              const pairs = Object.entries(item)
                .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                .join(' | ');
              return `### Record ${idx + 1}\n${pairs}`;
            }
            return String(item);
          })
          .join('\n\n');
      } else if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed)
          .map(([k, v]) => `### ${k}\n${typeof v === 'object' ? JSON.stringify(v, null, 2) : v}`)
          .join('\n\n');
      }
    } catch {
      return trimmed;
    }
  }

  if (lower.endsWith('.csv')) {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length >= 2) {
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const formattedRows = lines.slice(1).map((line, idx) => {
        const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const rowSummary = headers
          .map((h, i) => `${h}: ${values[i] ?? 'N/A'}`)
          .join(' · ');
        return `Row ${idx + 1} — ${rowSummary}`;
      });
      return `### Tabular Dataset (${headers.join(', ')})\n\n${formattedRows.join('\n\n')}`;
    }
  }

  return trimmed;
}

/**
 * Calculates token and cost savings for the 10GB Cost-Effective RAG architecture
 */
export function calculateRagCostTelemetry(
  totalCorpusWords: number,
  retrievedPassages: RetrievedPassage[],
  costMode: CostMode
): CostTelemetry {
  // 1 word ≈ 1.33 tokens
  const corpusTokensTotal = Math.max(100, Math.round(totalCorpusWords * 1.33));
  const retrievedWords = retrievedPassages.reduce(
    (sum, p) => sum + p.chunk.text.split(/\s+/).length,
    0
  );
  const promptOverheadTokens = 140;
  const retrievedTokensSent =
    costMode === 'zero-cost-local'
      ? 0
      : Math.round(retrievedWords * 1.33) + promptOverheadTokens;

  const tokenReductionPercent =
    corpusTokensTotal > 0
      ? Number(
          Math.min(
            99.99,
            Math.max(0, ((corpusTokensTotal - retrievedTokensSent) / corpusTokensTotal) * 100)
          ).toFixed(2)
        )
      : 99.9;

  // Pricing per 1M input tokens:
  // Zero-Cost Local: $0.00
  // Gemini 3.1 Flash Lite: ~$0.075 / 1M tokens
  // Gemini 3.8 Flash: ~$0.15 / 1M tokens
  const ratePerMillion =
    costMode === 'zero-cost-local'
      ? 0
      : costMode === 'flash-lite-micro'
      ? 0.075
      : 0.15;

  const estimatedQueryCostUSD = Number(
    ((retrievedTokensSent / 1_000_000) * ratePerMillion).toFixed(6)
  );

  // Naive full-context LLM dump cost without local BM25 pruning (at $1.25/1M tokens)
  const naiveFullContextCostUSD = Number(
    ((corpusTokensTotal / 1_000_000) * 1.25).toFixed(4)
  );

  return {
    costMode,
    corpusTokensTotal,
    retrievedTokensSent,
    tokenReductionPercent,
    estimatedQueryCostUSD,
    naiveFullContextCostUSD,
  };
}

/**
 * BM25 + Political Entity Boost Retrieval Engine
 * Zero-vector-DB local retrieval that scales to millions of tokens at $0 indexing cost.
 */
export function retrieveRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  options?: {
    topK?: number;
    categoryFilter?: DocumentCategory | 'All';
    documentIds?: string[];
  }
): RetrievedPassage[] {
  const topK = options?.topK ?? 4;
  let candidateChunks = chunks;

  if (options?.categoryFilter && options.categoryFilter !== 'All') {
    candidateChunks = candidateChunks.filter((c) => c.category === options.categoryFilter);
  }
  if (options?.documentIds && options.documentIds.length > 0) {
    const allowed = new Set(options.documentIds);
    candidateChunks = candidateChunks.filter((c) => allowed.has(c.documentId));
  }

  if (candidateChunks.length === 0) return [];

  const queryTokens = tokenizeText(query);
  if (queryTokens.length === 0) {
    return candidateChunks.slice(0, topK).map((chunk) => ({
      chunk,
      relevanceScore: 0.5,
      matchedTerms: [],
    }));
  }

  const N = candidateChunks.length;
  const docFreq = new Map<string, number>();
  let totalLength = 0;

  for (const chunk of candidateChunks) {
    totalLength += chunk.tokens.length;
    const uniqueTokens = new Set(chunk.tokens);
    for (const token of uniqueTokens) {
      docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
    }
  }

  const avgDocLength = totalLength / Math.max(1, N);
  const k1 = 1.5;
  const b = 0.75;

  const scored: RetrievedPassage[] = candidateChunks.map((chunk) => {
    const termFreq = new Map<string, number>();
    for (const t of chunk.tokens) {
      termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
    }

    let rawScore = 0;
    const matchedSet = new Set<string>();

    for (const qToken of queryTokens) {
      const exactTf = termFreq.get(qToken) ?? 0;
      if (exactTf > 0) {
        matchedSet.add(qToken);
        const df = docFreq.get(qToken) ?? 1;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const numerator = exactTf * (k1 + 1);
        const denominator = exactTf + k1 * (1 - b + b * (chunk.tokens.length / avgDocLength));
        rawScore += idf * (numerator / denominator);
      } else if (qToken.length >= 4) {
        const stem = qToken.slice(0, Math.max(4, qToken.length - 2));
        for (const [docToken, count] of termFreq.entries()) {
          if (docToken.startsWith(stem) || stem.startsWith(docToken)) {
            matchedSet.add(qToken);
            rawScore += 0.45 * Math.min(2, count);
            break;
          }
        }
      }
    }

    const headingLower = `${chunk.documentTitle} ${chunk.sectionHeading} ${chunk.region}`.toLowerCase();
    for (const qToken of queryTokens) {
      if (headingLower.includes(qToken)) {
        rawScore += 0.85;
      }
    }

    if (
      /\b(how much|percent|margin|turnout|budget|spend|spending|poll|numbers|rate|lead|points|cost|booth|excel|sheet)\b/i.test(query) &&
      /\b\d+(\.\d+)?%|\$\d+/i.test(chunk.text)
    ) {
      rawScore += 0.6;
    }

    return {
      chunk,
      relevanceScore: rawScore,
      matchedTerms: Array.from(matchedSet),
    };
  });

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const maxRaw = scored[0]?.relevanceScore ?? 1;
  const filtered = scored.filter((item, idx) => item.relevanceScore > 0 || idx < 3).slice(0, topK);

  return filtered.map((item, idx) => {
    const normalized =
      maxRaw > 0
        ? Math.min(0.98, Math.max(0.22, Number(((item.relevanceScore / maxRaw) * 0.92 - idx * 0.03).toFixed(2))))
        : 0.35;
    return {
      ...item,
      relevanceScore: normalized,
    };
  });
}

/**
 * Deterministic grounded synthesis (used for Zero-Cost Local Extractive Mode or offline fallback)
 */
export function buildExtractiveGroundedAnswer(
  question: string,
  passages: RetrievedPassage[],
  totalChunksSearched: number,
  activeDocumentsCount: number,
  totalCorpusWords = 1200,
  costMode: CostMode = 'zero-cost-local'
): RagQueryResponse {
  const costTelemetry = calculateRagCostTelemetry(totalCorpusWords, passages, costMode);

  if (passages.length === 0) {
    return {
      id: `q-${Date.now()}`,
      question,
      answer:
        'No matching intelligence records were found in your active political corpus for this query. Try broadening your category filter or uploading additional PDF/Excel datasets.',
      keyTakeaways: [
        'Zero passages matched the current filter criteria.',
        'Verify that relevant PDF or Excel documents are uploaded and selected in the Corpus Vault.',
      ],
      citations: [],
      confidenceLevel: 'Low',
      timestamp: new Date().toISOString(),
      totalChunksSearched,
      activeDocumentsCount,
      costTelemetry,
    };
  }

  const citations: CitationItem[] = passages.map((p, index) => ({
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

  const top = citations[0];
  const second = citations[1];
  const third = citations[2];

  const paragraphs: string[] = [];
  paragraphs.push(
    `Based on grounded analysis of your uploaded political corpus, ${top.documentTitle} (${top.sectionHeading}) provides the primary evidence addressing your question: ${top.excerpt} [${top.citationNumber}].`
  );

  if (second) {
    paragraphs.push(
      `Corroborating intelligence from ${second.documentTitle} (${second.sectionHeading}, ${second.region}) further indicates: ${second.excerpt} [${second.citationNumber}].`
    );
  }

  if (third) {
    paragraphs.push(
      `Additional context in ${third.documentTitle} (${third.sectionHeading}) notes: ${third.excerpt} [${third.citationNumber}].`
    );
  }

  const keyTakeaways = citations.slice(0, 3).map((c) => {
    const firstSentence = c.excerpt.split(/(?<=[.!?])\s+/)[0] || c.excerpt;
    return `${c.documentTitle} (${c.region}): ${firstSentence} [${c.citationNumber}]`;
  });

  const avgScore =
    citations.reduce((acc, c) => acc + c.relevanceScore, 0) / Math.max(1, citations.length);

  return {
    id: `q-${Date.now()}`,
    question,
    answer: paragraphs.join('\n\n'),
    keyTakeaways,
    citations,
    confidenceLevel: avgScore >= 0.7 ? 'High' : avgScore >= 0.45 ? 'Moderate' : 'Low',
    timestamp: new Date().toISOString(),
    totalChunksSearched,
    activeDocumentsCount,
    costTelemetry,
  };
}
