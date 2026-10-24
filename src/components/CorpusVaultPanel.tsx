import React, { useState } from 'react';
import {
  Trash2,
  Plus,
  RotateCcw,
  Search,
  CheckSquare,
  Square,
  Eye,
} from 'lucide-react';
import {
  DocumentCategory,
  DocumentChunk,
  PoliticalDocument,
} from '../utils/ragEngine';

interface CorpusVaultPanelProps {
  documents: PoliticalDocument[];
  chunks: DocumentChunk[];
  selectedDocIds: string[];
  onToggleDocSelection: (docId: string) => void;
  onSelectAllDocs: () => void;
  onDeleteDocument: (docId: string) => void;
  onResetDefaultCorpus: () => void;
  onOpenUploadModal: () => void;
  onInspectDocument?: (doc: PoliticalDocument) => void;
}

const CATEGORY_FILTERS: Array<DocumentCategory | 'All'> = [
  'All',
  'Polling & Turnout',
  'Party Manifesto',
  'Campaign Finance',
  'Constituency Demographics',
  'Legislative Record',
];

function formatBytesToMB(bytes?: number): string {
  if (!bytes || bytes <= 0) return '1.2 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

export const CorpusVaultPanel: React.FC<CorpusVaultPanelProps> = ({
  documents,
  chunks,
  selectedDocIds,
  onToggleDocSelection,
  onSelectAllDocs,
  onDeleteDocument,
  onResetDefaultCorpus,
  onOpenUploadModal,
  onInspectDocument,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'All'>(
    'All'
  );
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  const filteredDocs = documents.filter((doc) => {
    const matchesCat =
      activeCategory === 'All' || doc.category === activeCategory;
    const matchesSearch =
      !searchTerm.trim() ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalBytes = documents.reduce(
    (sum, d) => sum + (d.fileSizeBytes || 25000000),
    0
  );
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const maxVaultGB = 10;
  const capacityPct = Math.min(
    100,
    Math.max(1.5, (totalBytes / (maxVaultGB * 1024 * 1024 * 1024)) * 100)
  );

  const previewDoc = documents.find((d) => d.id === previewDocId) || null;
  const previewChunks = previewDoc
    ? chunks.filter((c) => c.documentId === previewDoc.id)
    : [];

  return (
    <div className="flex flex-col h-full bg-white border border-[#E6E0D6] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#E6E0D6] flex items-center justify-between gap-3 bg-[#FAF7F2]/60">
        <div>
          <h2 className="text-base font-bold text-[#141413] font-serif-display">
            10GB PDF &amp; Excel Vault
          </h2>
          <p className="text-xs text-[#6E6A63] mt-0.5 font-mono tabular-nums">
            {documents.length} files · {chunks.length} chunks · {totalMB} MB / 10 GB
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenUploadModal}
          className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-[#D95D24] bg-[#F3EFE6] border border-[#E6E0D6] rounded-lg hover:bg-[#E6E0D6] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Dataset
        </button>
      </div>

      {/* 10GB Local IndexedDB Capacity Meter */}
      <div className="px-4 py-2.5 bg-[#F3EFE6]/70 border-b border-[#E6E0D6] space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-[#57534E]">
          <span>IndexedDB Local Storage Quota (Zero Cloud DB Fees)</span>
          <span className="font-mono tabular-nums font-semibold text-[#15803D]">
            $0.00 / GB Stored
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#E6E0D6] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#D95D24] rounded-full transition-opacity"
            style={{ width: `${Math.max(4, capacityPct)}%` }}
          />
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="p-3.5 border-b border-[#E6E0D6] bg-[#FAF7F2]/40 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6E6A63] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter PDF & Excel files by constituency, title, or keyword..."
            aria-label="Filter uploaded files"
            className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-[#E6E0D6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D95D24]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`min-h-[30px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeCategory === cat
                  ? 'bg-[#141413] text-[#FAF7F2]'
                  : 'text-[#57534E] hover:text-[#141413] hover:bg-[#F3EFE6]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-[#57534E] pt-0.5">
          <span>
            Active in RAG scope:{' '}
            <strong className="font-mono tabular-nums text-[#141413]">
              {selectedDocIds.length}/{documents.length}
            </strong>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSelectAllDocs}
              className="text-xs font-medium text-[#D95D24] hover:underline whitespace-nowrap"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onResetDefaultCorpus}
              title="Restore default benchmark datasets"
              className="text-xs font-medium text-[#57534E] hover:text-[#141413] flex items-center gap-1 whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Demo Data
            </button>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#E6E0D6]">
        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-[#141413]">
              No matching PDF or Excel datasets
            </p>
            <p className="text-xs text-[#6E6A63] mt-1 max-w-xs mx-auto">
              Upload your election Excel (.xlsx) sheets or PDF manifestos once to query them at near-zero cost.
            </p>
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="mt-4 min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#D95D24] rounded-lg hover:bg-[#B84A18] transition-colors"
            >
              Upload PDF / Excel
            </button>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const isPreviewed = previewDocId === doc.id;
            const fmt =
              doc.fileFormat ||
              (doc.title.toLowerCase().endsWith('.xlsx') ? 'EXCEL' : 'PDF');
            return (
              <div
                key={doc.id}
                className={`p-4 transition-colors ${
                  isSelected ? 'bg-white' : 'bg-[#FAF7F2]/60 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleDocSelection(doc.id)}
                    aria-label={`Toggle RAG inclusion for ${doc.title}`}
                    className="mt-0.5 min-h-[28px] min-w-[28px] flex items-center justify-center text-[#D95D24] hover:text-[#B84A18] shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4 text-[#6E6A63]" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#141413] leading-snug break-words">
                      {doc.title}
                    </h3>
                    {/* Unboxed inline metadata with middle-dot separators (Zero-Pill Discipline) */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E6A63] mt-1.5">
                      <span className="font-mono font-semibold text-[#D95D24]">
                        {fmt}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#141413]">
                        {doc.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{doc.region}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {formatBytesToMB(doc.fileSizeBytes)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {doc.chunkCount} chunks
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDocId(isPreviewed ? null : doc.id);
                        if (onInspectDocument) onInspectDocument(doc);
                      }}
                      aria-label={`Inspect chunks for ${doc.title}`}
                      className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg transition-colors ${
                        isPreviewed
                          ? 'bg-[#F3EFE6] text-[#D95D24]'
                          : 'text-[#6E6A63] hover:text-[#141413] hover:bg-[#F3EFE6]'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDocument(doc.id)}
                      aria-label={`Delete ${doc.title}`}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center text-[#6E6A63] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isPreviewed && (
                  <div className="mt-3 pt-3 border-t border-[#E6E0D6] space-y-2">
                    <div className="text-xs font-semibold text-[#141413]">
                      Indexed Semantic Chunks ({previewChunks.length})
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {previewChunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E6E0D6] text-xs text-[#141413]"
                        >
                          <div className="flex items-center justify-between text-[11px] text-[#6E6A63] mb-1">
                            <span className="font-semibold text-[#141413]">
                              Chunk #{chunk.chunkIndex} · {chunk.sectionHeading}
                            </span>
                            <span className="font-mono tabular-nums">
                              {chunk.tokens.length} indexed terms
                            </span>
                          </div>
                          <p className="leading-relaxed">{chunk.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
