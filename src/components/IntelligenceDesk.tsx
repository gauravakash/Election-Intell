import React, { useState } from 'react';
import { Send, BookOpen, Trash2, Sparkles, ArrowUpRight, Zap } from 'lucide-react';
import {
  CitationItem,
  CostMode,
  DocumentCategory,
  RagQueryResponse,
} from '../utils/ragEngine';

interface IntelligenceDeskProps {
  queryHistory: RagQueryResponse[];
  isQuerying: boolean;
  activeDocsCount: number;
  totalChunksCount: number;
  costMode: CostMode;
  onChangeCostMode: (mode: CostMode) => void;
  selectedCategoryFilter: DocumentCategory | 'All';
  onChangeCategoryFilter: (cat: DocumentCategory | 'All') => void;
  onSubmitQuestion: (question: string) => void;
  onSelectCitation: (citation: CitationItem) => void;
  onClearHistory: () => void;
  onOpenUploadModal: () => void;
}

const SUGGESTED_QUESTIONS = [
  'What is the split-ticket voting rate and suburban shift in Midwest collar counties?',
  'Compare the Civic Renewal Alliance and National Prosperity Front on corporate taxes and prescription drugs.',
  'How much Q3 2026 campaign media spend went to Connected TV vs broadcast television?',
  'How do hospitality and service workers in Nevada and Arizona respond to tax-free tipped wages?',
];

const CATEGORIES: Array<DocumentCategory | 'All'> = [
  'All',
  'Polling & Turnout',
  'Party Manifesto',
  'Campaign Finance',
  'Constituency Demographics',
];

const COST_MODES: Array<{
  id: CostMode;
  label: string;
  rateDesc: string;
}> = [
  {
    id: 'zero-cost-local',
    label: 'Zero-Cost Local ($0.00/query)',
    rateDesc: '100% browser BM25 + extractive synthesis',
  },
  {
    id: 'flash-lite-micro',
    label: 'Flash Lite Micro (~$0.0001/query)',
    rateDesc: 'Prunes 99.9% tokens locally → Gemini 3.1 Flash Lite',
  },
  {
    id: 'flash-standard',
    label: 'Deep Synthesis (~$0.0003/query)',
    rateDesc: 'Top-K chunks → Gemini 3.8 Flash',
  },
];

export const IntelligenceDesk: React.FC<IntelligenceDeskProps> = ({
  queryHistory,
  isQuerying,
  activeDocsCount,
  totalChunksCount,
  costMode,
  onChangeCostMode,
  selectedCategoryFilter,
  onChangeCategoryFilter,
  onSubmitQuestion,
  onSelectCitation,
  onClearHistory,
  onOpenUploadModal,
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) {
      setInputError(
        'Please enter a political or electoral question to query your uploaded PDF and Excel data.'
      );
      return;
    }
    setInputError(null);
    onSubmitQuestion(questionInput.trim());
    setQuestionInput('');
  };

  const handlePresetClick = (preset: string) => {
    setInputError(null);
    onSubmitQuestion(preset);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-[#E6E0D6] rounded-2xl overflow-hidden">
      {/* Desk Toolbar */}
      <div className="p-4 border-b border-[#E6E0D6] bg-[#FAF7F2]/60 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#141413] font-serif-display">
            Grounded Political Q&amp;A Desk
          </h2>
          <p className="text-xs text-[#6E6A63] mt-0.5">
            Querying{' '}
            <span className="font-mono tabular-nums font-semibold text-[#141413]">
              {activeDocsCount}
            </span>{' '}
            PDF/Excel files (
            <span className="font-mono tabular-nums font-semibold text-[#141413]">
              {totalChunksCount}
            </span>{' '}
            indexed chunks)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {queryHistory.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-[#57534E] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Thread
            </button>
          )}
        </div>
      </div>

      {/* Cost-Effective 10GB Engine Selector */}
      <div className="px-4 py-2.5 bg-[#F3EFE6]/80 border-b border-[#E6E0D6] space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#141413] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#D95D24]" />
            10GB Cost-Optimizer Mode:
          </span>
          <span className="text-[11px] text-[#6E6A63] font-mono">
            {COST_MODES.find((m) => m.id === costMode)?.rateDesc}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {COST_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChangeCostMode(mode.id)}
              className={`min-h-[30px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                costMode === mode.id
                  ? 'bg-[#D95D24] text-white'
                  : 'bg-white text-[#57534E] border border-[#E6E0D6] hover:text-[#141413]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scope Category Filter Bar */}
      <div className="px-4 py-2 bg-[#FAF7F2]/50 border-b border-[#E6E0D6] flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-[#6E6A63] mr-1 whitespace-nowrap shrink-0">
          Scope Filter:
        </span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChangeCategoryFilter(cat)}
            className={`min-h-[28px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              selectedCategoryFilter === cat
                ? 'bg-[#141413] text-[#FAF7F2]'
                : 'text-[#57534E] hover:text-[#141413] hover:bg-[#F3EFE6]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Primary Question Input Form Pinned at Top of Desk */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3.5 sm:p-4 border-b border-[#E6E0D6] bg-white"
      >
        {inputError && (
          <div className="text-xs font-medium text-red-600 mb-2" role="alert">
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
            placeholder="Ask any question across your uploaded PDFs & Excel sheets..."
            className="flex-1 h-11 px-3.5 text-sm bg-[#FAF7F2] border border-[#E6E0D6] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D95D24]"
          />
          <button
            type="submit"
            disabled={isQuerying}
            className="min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-[#D95D24] rounded-lg hover:bg-[#B84A18] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Ask Question
          </button>
        </div>
      </form>

      {/* Main Q&A Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
        {/* Suggested Research Prompts */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-[#57534E]">
            Instant Grounded Inquiries (Click to run against uploaded PDF/Excel corpus):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isQuerying}
                onClick={() => handlePresetClick(q)}
                className="text-left p-3 rounded-xl border border-[#E6E0D6] bg-[#FAF7F2]/70 hover:bg-[#F3EFE6] hover:border-[#D95D24]/50 transition-colors group flex items-start justify-between gap-2"
              >
                <span className="text-xs text-[#141413] font-medium leading-snug">
                  {q}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#6E6A63] group-hover:text-[#D95D24] shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Loading Skeleton */}
        {isQuerying && (
          <div
            role="status"
            aria-live="polite"
            className="p-5 rounded-xl border border-[#E6E0D6] bg-[#FAF7F2] space-y-3 animate-pulse"
          >
            <div className="h-4 bg-[#E6E0D6] rounded w-2/3" />
            <div className="h-3 bg-[#E6E0D6] rounded w-full" />
            <div className="h-3 bg-[#E6E0D6] rounded w-5/6" />
            <div className="text-xs font-medium text-[#D95D24] pt-1">
              Pruning corpus locally via BM25 &amp; synthesizing cited brief...
            </div>
          </div>
        )}

        {/* Query Responses */}
        {queryHistory.length === 0 && !isQuerying ? (
          <div className="p-8 text-center border border-dashed border-[#E6E0D6] rounded-xl bg-[#FAF7F2]/40">
            <BookOpen className="w-7 h-7 text-[#6E6A63] mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-[#141413] font-serif-display">
              Ask Any Question Across Your 10GB Political Corpus
            </h3>
            <p className="text-xs text-[#6E6A63] mt-1 max-w-md mx-auto leading-relaxed">
              Your uploaded PDFs and Excel workbooks are indexed locally in IndexedDB. Only the top 4 matching passages (~600 tokens) are sent per query, cutting LLM costs by 99.9%.
            </p>
            {activeDocsCount === 0 && (
              <button
                type="button"
                onClick={onOpenUploadModal}
                className="mt-4 min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#D95D24] rounded-lg hover:bg-[#B84A18] transition-colors"
              >
                Upload PDF or Excel Dataset
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {queryHistory.map((item) => (
              <article
                key={item.id}
                className="border border-[#E6E0D6] rounded-2xl bg-white overflow-hidden"
              >
                {/* Question Banner */}
                <div className="px-4 py-3 bg-[#141413] text-[#FAF7F2] flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold leading-snug font-serif-display">
                    Q: {item.question}
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-[#E6E0D6] whitespace-nowrap shrink-0">
                    {item.citations.length} cited sources
                  </span>
                </div>

                {/* Synthesized Grounded Answer */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Metadata & Cost Telemetry Line (unboxed text with middle-dot separators) */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E6A63]">
                    <span className="font-semibold text-[#141413]">
                      Grounded Synthesis
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Confidence:{' '}
                      <strong
                        className={
                          item.confidenceLevel === 'High'
                            ? 'text-[#15803D]'
                            : item.confidenceLevel === 'Moderate'
                            ? 'text-[#B45309]'
                            : 'text-red-700'
                        }
                      >
                        {item.confidenceLevel}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Searched {item.totalChunksSearched} chunks
                    </span>
                    {item.costTelemetry && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-[#15803D] font-semibold">
                          Query Cost: $
                          {item.costTelemetry.estimatedQueryCostUSD.toFixed(5)} (
                          {item.costTelemetry.tokenReductionPercent}% tokens saved)
                        </span>
                      </>
                    )}
                  </div>

                  <div className="text-sm text-[#141413] leading-relaxed space-y-3 whitespace-pre-line">
                    {item.answer.replace(/\*\*/g, '')}
                  </div>

                  {/* Key Takeaways */}
                  {item.keyTakeaways && item.keyTakeaways.length > 0 && (
                    <div className="pt-3 border-t border-[#E6E0D6]">
                      <h4 className="text-xs font-bold text-[#141413] mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#D95D24]" />
                        Key Quantitative Takeaways
                      </h4>
                      <ul className="space-y-1.5 text-xs text-[#57534E] list-disc list-inside">
                        {item.keyTakeaways.map((takeaway, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {takeaway.replace(/\*\*/g, '')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Retrieved Source Passages */}
                  {item.citations.length > 0 && (
                    <div className="pt-3 border-t border-[#E6E0D6]">
                      <div className="text-xs font-bold text-[#141413] mb-2">
                        Verified PDF &amp; Excel Passages (Click to inspect full context):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {item.citations.map((cit) => (
                          <button
                            key={cit.chunkId}
                            type="button"
                            onClick={() => onSelectCitation(cit)}
                            className="text-left p-3 rounded-xl border border-[#E6E0D6] bg-[#FAF7F2]/70 hover:bg-[#F3EFE6] hover:border-[#D95D24] transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#141413]">
                              <span className="truncate">
                                [{cit.citationNumber}] {cit.documentTitle}
                              </span>
                              <span className="font-mono tabular-nums text-[11px] text-[#D95D24] shrink-0">
                                {Math.round(cit.relevanceScore * 100)}% match
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6E6A63] mt-0.5 truncate">
                              {cit.sectionHeading} · {cit.region}
                            </div>
                            <p className="text-xs text-[#57534E] mt-1.5 line-clamp-2 leading-relaxed">
                              {cit.excerpt}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
