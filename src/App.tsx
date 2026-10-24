import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  Upload,
  ArrowUpRight,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from 'lucide-react';
import {
  CostMode,
  DocumentCategory,
  DocumentChunk,
  FileFormatType,
  PoliticalDocument,
  RagQueryResponse,
  buildExtractiveGroundedAnswer,
  chunkDocument,
  retrieveRelevantChunks,
} from './utils/ragEngine';
import {
  loadCorpusFromIndexedDB,
  saveCorpusToIndexedDB,
  loadHistoryFromIndexedDB,
  saveHistoryToIndexedDB,
} from './utils/fileParsers';
import { buildInitialCorpus } from './utils/seedPoliticalData';
import { UploadDataModal } from './components/UploadDataModal';
import { DataVaultDrawer } from './components/DataVaultDrawer';

const STORAGE_DOCS_KEY = 'election_intell_corpus_docs_v2';
const STORAGE_HISTORY_KEY = 'election_intell_qa_history_v2';

const READY_TO_ASK_QUESTIONS = [
  {
    title: 'Midwest Suburban Swing & Split-Ticket Voting',
    question:
      'What is the split-ticket voting rate and suburban voter shift across Pennsylvania, Michigan, and Wisconsin collar counties?',
  },
  {
    title: 'Coalition Manifesto Policy Comparison',
    question:
      'Compare the Civic Renewal Alliance and National Prosperity Front on corporate tax rates, grid permitting, and insulin price caps.',
  },
  {
    title: 'Q3 Campaign Finance & Connected TV Spend',
    question:
      'How much Q3 2026 campaign expenditure went to Connected TV (CTV) versus traditional broadcast television and grassroots donors?',
  },
  {
    title: 'Sunbelt Demographics & Service Worker Trends',
    question:
      'How do hospitality and working-class voters in Clark County (NV) and Maricopa County (AZ) respond to eliminating taxes on tipped wages?',
  },
];

export default function App() {
  const [documents, setDocuments] = useState<PoliticalDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DOCS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to seed corpus
    }
    return buildInitialCorpus().documents;
  });

  useEffect(() => {
    let mounted = true;
    loadCorpusFromIndexedDB().then((idbDocs) => {
      if (mounted && idbDocs && idbDocs.length > 0) {
        setDocuments(idbDocs);
        setSelectedDocIds(idbDocs.map((d) => d.id));
      }
    });
    loadHistoryFromIndexedDB().then((idbHistory) => {
      if (mounted && idbHistory && idbHistory.length > 0) {
        setQueryHistory(idbHistory);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const chunks: DocumentChunk[] = useMemo(() => {
    const allChunks: DocumentChunk[] = [];
    for (const doc of documents) {
      const res = chunkDocument(doc);
      allChunks.push(...res.chunks);
    }
    return allChunks;
  }, [documents]);

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() =>
    documents.map((d) => d.id)
  );

  useEffect(() => {
    saveCorpusToIndexedDB(documents);
    try {
      localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(documents));
    } catch {
      // IndexedDB handles large 10GB scale
    }
  }, [documents]);

  const [costMode, setCostMode] = useState<CostMode>('flash-lite-micro');
  const [queryHistory, setQueryHistory] = useState<RagQueryResponse[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [expandedSourcesId, setExpandedSourcesId] = useState<string | null>(
    null
  );

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isVaultDrawerOpen, setIsVaultDrawerOpen] = useState(false);

  useEffect(() => {
    saveHistoryToIndexedDB(queryHistory);
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(queryHistory));
    } catch {
      // ignore
    }
  }, [queryHistory]);

  const totalCorpusWords = useMemo(
    () => documents.reduce((sum, d) => sum + d.wordCount, 0),
    [documents]
  );

  const handleAddDocument = (newDocInput: {
    title: string;
    category: DocumentCategory;
    region: string;
    datePublished: string;
    sourceOrg: string;
    content: string;
    fileFormat: FileFormatType;
    fileSizeBytes: number;
    sheetOrPageCount: number;
  }) => {
    const newId = `doc-custom-${Date.now()}`;
    const { document: indexedDoc } = chunkDocument({
      id: newId,
      ...newDocInput,
      uploadedAt: new Date().toISOString(),
    });

    setDocuments((prev) => [indexedDoc, ...prev]);
    setSelectedDocIds((prev) => [indexedDoc.id, ...prev]);
  };

  const handleToggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDocs = () => {
    setSelectedDocIds(documents.map((d) => d.id));
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
  };

  const handleResetDefaultCorpus = () => {
    const seeded = buildInitialCorpus().documents;
    setDocuments(seeded);
    setSelectedDocIds(seeded.map((d) => d.id));
  };

  const handleSubmitQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question) {
      setInputError('Please type a question or pick one of the suggested questions below.');
      return;
    }

    setInputError(null);
    setIsQuerying(true);

    const activeIds =
      selectedDocIds.length > 0 ? selectedDocIds : documents.map((d) => d.id);

    const relevantPassages = retrieveRelevantChunks(question, chunks, {
      topK: 4,
      documentIds: activeIds,
    });

    const activeChunksCount = chunks.filter((c) =>
      activeIds.includes(c.documentId)
    ).length;

    try {
      const response = await fetch('/api/rag/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          passages: relevantPassages,
          totalChunksSearched: activeChunksCount,
          activeDocumentsCount: activeIds.length,
          totalCorpusWords,
          costMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch RAG synthesis');
      }

      const data: RagQueryResponse = await response.json();
      setQueryHistory((prev) => [data, ...prev]);
    } catch {
      const fallback = buildExtractiveGroundedAnswer(
        question,
        relevantPassages,
        activeChunksCount,
        activeIds.length,
        totalCorpusWords,
        costMode
      );
      setQueryHistory((prev) => [fallback, ...prev]);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) {
      setInputError('Please enter a question to ask your political data.');
      return;
    }
    const q = questionInput;
    setQuestionInput('');
    handleSubmitQuestion(q);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#141413]">
      {/* Clean Sarvam AI Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 h-14 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E6E0D6] px-4 sm:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setQueryHistory([]);
          }}
          className="text-xl font-bold tracking-tight text-[#141413] whitespace-nowrap shrink-0 font-serif-display"
        >
          Election Intell
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#57534E]"
        >
          <a
            href="#ask"
            onClick={(e) => {
              e.preventDefault();
              setQueryHistory([]);
            }}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            New Question
          </a>
          <a
            href="#data-vault"
            onClick={(e) => {
              e.preventDefault();
              setIsVaultDrawerOpen(true);
            }}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Uploaded Data ({documents.length})
          </a>
          <a
            href="#cost-mode"
            onClick={(e) => {
              e.preventDefault();
              setCostMode((prev) =>
                prev === 'zero-cost-local' ? 'flash-lite-micro' : 'zero-cost-local'
              );
            }}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {costMode === 'zero-cost-local'
              ? 'Mode: $0 Local RAG'
              : 'Mode: Flash Lite RAG'}
          </a>
          {queryHistory.length > 0 && (
            <a
              href="#clear"
              onClick={(e) => {
                e.preventDefault();
                setQueryHistory([]);
              }}
              className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Clear Answers
            </a>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#D95D24] rounded-xl hover:bg-[#B84A18] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload PDF / Excel
          </button>
        </div>
      </header>

      {/* Centered, Breathable Question & Answer Workspace */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col">
        {/* Hero Title & Quiet Corpus Status */}
        <div className="text-center space-y-2.5 mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-[#141413] font-serif-display tracking-tight text-balance">
            Ask anything across your political data.
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[#6E6A63]">
            <span>
              <strong className="font-mono tabular-nums text-[#141413]">
                {documents.length}
              </strong>{' '}
              PDF &amp; Excel files indexed ({chunks.length} chunks)
            </span>
            <span aria-hidden="true">·</span>
            <span>10GB Local Vault ($0 DB cost)</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsVaultDrawerOpen(true)}
              className="text-[#D95D24] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              View / Manage Files
            </button>
          </div>
        </div>

        {/* Clean Sarvam-Style Question Composer Box */}
        <form
          onSubmit={handleFormSubmit}
          className="bg-white border border-[#E6E0D6] rounded-2xl p-2 sm:p-2.5 shadow-xs focus-within:border-[#D95D24] transition-colors mb-8"
        >
          {inputError && (
            <div
              role="alert"
              className="px-3 py-1.5 text-xs font-medium text-red-700"
            >
              {inputError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <label htmlFor="rag-question-input" className="sr-only">
              Ask a question about your uploaded political data
            </label>
            <input
              id="rag-question-input"
              type="text"
              value={questionInput}
              onChange={(e) => {
                setQuestionInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="Ask a question across your uploaded PDFs & Excel sheets..."
              className="flex-1 h-12 px-3.5 text-sm sm:text-base text-[#141413] bg-transparent placeholder:text-[#6E6A63] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isQuerying}
              className="min-h-[46px] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#D95D24] rounded-xl hover:bg-[#B84A18] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Ask
            </button>
          </div>
        </form>

        {/* Ready-to-Ask Suggested Questions */}
        <section aria-label="Suggested Questions" className="mb-10">
          <div className="flex items-center justify-between gap-3 mb-3 px-1">
            <h2 className="text-xs font-semibold text-[#6E6A63] font-sans">
              Ready to ask — click any question to query your uploaded data:
            </h2>
            {queryHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setQueryHistory([])}
                className="text-xs font-medium text-[#6E6A63] hover:text-[#141413] flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Clear thread
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {READY_TO_ASK_QUESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isQuerying}
                onClick={() => handleSubmitQuestion(item.question)}
                className="text-left p-4 rounded-2xl bg-white border border-[#E6E0D6] hover:bg-[#F3EFE6]/70 hover:border-[#D95D24]/60 transition-colors group flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <span className="text-xs font-bold text-[#D95D24]">
                    {item.title}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-[#6E6A63] group-hover:text-[#D95D24] shrink-0" />
                </div>
                <p className="text-xs sm:text-sm text-[#141413] leading-snug">
                  {item.question}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Loading State */}
        {isQuerying && (
          <div
            role="status"
            aria-live="polite"
            className="p-6 rounded-2xl bg-white border border-[#E6E0D6] space-y-3 animate-pulse mb-6"
          >
            <div className="h-4 bg-[#E6E0D6] rounded w-1/2" />
            <div className="h-3 bg-[#E6E0D6] rounded w-full" />
            <div className="h-3 bg-[#E6E0D6] rounded w-5/6" />
            <div className="text-xs font-medium text-[#D95D24] pt-1">
              Searching local PDF &amp; Excel chunks and generating answer...
            </div>
          </div>
        )}

        {/* Question & Answer Feed */}
        {queryHistory.length > 0 && (
          <section aria-label="Question and Answer Results" className="space-y-6">
            {queryHistory.map((item) => {
              const isSourcesOpen = expandedSourcesId === item.id;
              return (
                <article
                  key={item.id}
                  className="bg-white border border-[#E6E0D6] rounded-2xl p-5 sm:p-7 space-y-5"
                >
                  {/* Question Heading */}
                  <div className="pb-4 border-b border-[#E6E0D6]">
                    <h3 className="text-base sm:text-lg font-bold text-[#141413] font-serif-display leading-snug">
                      {item.question}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E6A63] mt-1.5">
                      <span>Grounded Answer</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {item.citations.length} verified sources
                      </span>
                      {item.costTelemetry && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[#15803D]">
                            {item.costTelemetry.tokenReductionPercent}% tokens saved ($
                            {item.costTelemetry.estimatedQueryCostUSD.toFixed(4)})
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Answer Prose */}
                  <div className="text-sm sm:text-base text-[#141413] leading-relaxed space-y-3 whitespace-pre-line">
                    {item.answer.replace(/\*\*/g, '')}
                  </div>

                  {/* Key Takeaways */}
                  {item.keyTakeaways && item.keyTakeaways.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6E0D6] space-y-2">
                      <div className="text-xs font-bold text-[#141413]">
                        Key Highlights
                      </div>
                      <ul className="space-y-1.5 text-xs sm:text-sm text-[#57534E] list-disc list-inside">
                        {item.keyTakeaways.map((takeaway, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {takeaway.replace(/\*\*/g, '')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Collapsible Grounded Citations */}
                  {item.citations.length > 0 && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSourcesId(isSourcesOpen ? null : item.id)
                        }
                        className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#F3EFE6] hover:bg-[#E6E0D6] text-xs font-semibold text-[#141413] transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>
                          {isSourcesOpen ? 'Hide' : 'View'} {item.citations.length}{' '}
                          Cited PDF / Excel Passages
                        </span>
                        {isSourcesOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isSourcesOpen && (
                        <div className="mt-3 grid grid-cols-1 gap-2.5">
                          {item.citations.map((cit) => (
                            <div
                              key={cit.chunkId}
                              className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E6E0D6] text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2 font-semibold text-[#141413]">
                                <span>
                                  [{cit.citationNumber}] {cit.documentTitle} —{' '}
                                  {cit.sectionHeading}
                                </span>
                                <span className="font-mono tabular-nums text-[#D95D24] shrink-0">
                                  {Math.round(cit.relevanceScore * 100)}% match
                                </span>
                              </div>
                              <p className="text-[#57534E] leading-relaxed">
                                “{cit.excerpt}”
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>

      {/* Upload PDF & Excel Modal */}
      <UploadDataModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onAddDocument={handleAddDocument}
      />

      {/* Slide-over Data Vault Drawer for managing uploaded files */}
      <DataVaultDrawer
        isOpen={isVaultDrawerOpen}
        onClose={() => setIsVaultDrawerOpen(false)}
        documents={documents}
        chunks={chunks}
        selectedDocIds={selectedDocIds}
        onToggleDocSelection={handleToggleDocSelection}
        onSelectAllDocs={handleSelectAllDocs}
        onDeleteDocument={handleDeleteDocument}
        onResetDefaultCorpus={handleResetDefaultCorpus}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
      />
    </div>
  );
}
