import React from 'react';
import { X } from 'lucide-react';
import { CorpusVaultPanel } from './CorpusVaultPanel';
import { DocumentChunk, PoliticalDocument } from '../utils/ragEngine';

interface DataVaultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: PoliticalDocument[];
  chunks: DocumentChunk[];
  selectedDocIds: string[];
  onToggleDocSelection: (docId: string) => void;
  onSelectAllDocs: () => void;
  onDeleteDocument: (docId: string) => void;
  onResetDefaultCorpus: () => void;
  onOpenUploadModal: () => void;
}

export const DataVaultDrawer: React.FC<DataVaultDrawerProps> = ({
  isOpen,
  onClose,
  documents,
  chunks,
  selectedDocIds,
  onToggleDocSelection,
  onSelectAllDocs,
  onDeleteDocument,
  onResetDefaultCorpus,
  onOpenUploadModal,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#141413]/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="10GB Political Data Vault"
    >
      <div className="w-full max-w-xl bg-[#FAF7F2] h-full flex flex-col shadow-2xl border-l border-[#E6E0D6]">
        <div className="px-5 py-3.5 bg-white border-b border-[#E6E0D6] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#141413] font-serif-display">
              Manage 10GB PDF &amp; Excel Data Vault
            </h2>
            <p className="text-xs text-[#6E6A63]">
              Upload once — indexed locally in IndexedDB at $0.00 storage cost
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Data Vault drawer"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#57534E] hover:text-[#141413] rounded-lg hover:bg-[#F3EFE6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          <CorpusVaultPanel
            documents={documents}
            chunks={chunks}
            selectedDocIds={selectedDocIds}
            onToggleDocSelection={onToggleDocSelection}
            onSelectAllDocs={onSelectAllDocs}
            onDeleteDocument={onDeleteDocument}
            onResetDefaultCorpus={onResetDefaultCorpus}
            onOpenUploadModal={() => {
              onClose();
              onOpenUploadModal();
            }}
          />
        </div>
      </div>
    </div>
  );
};
