import React from 'react';
import { FileCheck, Layers } from 'lucide-react';
import { CitationItem, PoliticalDocument } from '../utils/ragEngine';

interface CitationInspectorProps {
  selectedCitation: CitationItem | null;
  latestCitations: CitationItem[];
  documents: PoliticalDocument[];
  onSelectCitation: (citation: CitationItem) => void;
}

export const CitationInspector: React.FC<CitationInspectorProps> = ({
  selectedCitation,
  latestCitations,
  documents,
  onSelectCitation,
}) => {
  const activeCitation = selectedCitation || latestCitations[0] || null;
  const parentDoc = activeCitation
    ? documents.find((d) => d.id === activeCitation.documentId)
    : null;

  return (
    <div className="flex flex-col h-full bg-white border border-[#E6E0D6] rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-[#E6E0D6] bg-[#FAF7F2]/60">
        <h2 className="text-base font-bold text-[#141413] font-serif-display">
          Source &amp; Citation Audit
        </h2>
        <p className="text-xs text-[#6E6A63] mt-0.5">
          Verbatim PDF page &amp; Excel row verification
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {!activeCitation ? (
          <div className="p-6 text-center">
            <Layers className="w-7 h-7 text-[#6E6A63] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#141413] font-serif-display">
              No Citation Selected Yet
            </p>
            <p className="text-xs text-[#6E6A63] mt-1 leading-relaxed">
              Run a question on the Intelligence Desk or click any bracketed source card to inspect its exact verbatim PDF/Excel text and metadata.
            </p>
          </div>
        ) : (
          <>
            {/* Active Citation Card */}
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6E0D6] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono tabular-nums font-bold text-[#D95D24]">
                  CITATION [{activeCitation.citationNumber}]
                </span>
                <span className="text-xs font-mono tabular-nums font-semibold text-[#15803D]">
                  {Math.round(activeCitation.relevanceScore * 100)}% Retrieval Match
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#141413] leading-snug break-words font-serif-display">
                  {activeCitation.documentTitle}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E6A63] mt-1">
                  {parentDoc?.fileFormat && (
                    <>
                      <span className="font-mono font-semibold text-[#D95D24]">
                        {parentDoc.fileFormat}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span>{activeCitation.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeCitation.region}</span>
                  {parentDoc && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{parentDoc.sourceOrg}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[#E6E0D6]">
                <div className="text-[11px] font-semibold text-[#57534E] mb-1">
                  Section / Sheet: {activeCitation.sectionHeading}
                </div>
                <blockquote className="text-xs text-[#141413] leading-relaxed bg-white p-3 rounded-lg border border-[#E6E0D6]">
                  “{activeCitation.excerpt}”
                </blockquote>
              </div>
            </div>

            {/* All Retrieved Passages for Current Answer */}
            {latestCitations.length > 1 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#141413] flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-[#D95D24]" />
                  Top-K Ranked Passages Sent to Synthesis ({latestCitations.length})
                </div>
                <div className="space-y-2">
                  {latestCitations.map((cit) => {
                    const isCurrent = activeCitation.chunkId === cit.chunkId;
                    return (
                      <button
                        key={cit.chunkId}
                        type="button"
                        onClick={() => onSelectCitation(cit)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${
                          isCurrent
                            ? 'border-[#D95D24] bg-[#F3EFE6]'
                            : 'border-[#E6E0D6] bg-white hover:bg-[#FAF7F2]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-[#141413]">
                          <span className="truncate">
                            [{cit.citationNumber}] {cit.sectionHeading}
                          </span>
                          <span className="font-mono tabular-nums text-[11px] text-[#D95D24] shrink-0 ml-2">
                            {Math.round(cit.relevanceScore * 100)}%
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6E6A63] mt-0.5 truncate">
                          {cit.documentTitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
