import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, FileText, AlertCircle } from 'lucide-react';
import {
  DocumentCategory,
  FileFormatType,
  parseExcelWorkbookBuffer,
} from '../utils/ragEngine';
import {
  createSampleElectionExcelBuffer,
  ingestPoliticalFile,
} from '../utils/fileParsers';

interface UploadDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (doc: {
    title: string;
    category: DocumentCategory;
    region: string;
    datePublished: string;
    sourceOrg: string;
    content: string;
    fileFormat: FileFormatType;
    fileSizeBytes: number;
    sheetOrPageCount: number;
  }) => void;
}

const CATEGORIES: DocumentCategory[] = [
  'Polling & Turnout',
  'Party Manifesto',
  'Campaign Finance',
  'Constituency Demographics',
  'Legislative Record',
];

export const UploadDataModal: React.FC<UploadDataModalProps> = ({
  isOpen,
  onClose,
  onAddDocument,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Polling & Turnout');
  const [region, setRegion] = useState('');
  const [sourceOrg, setSourceOrg] = useState('');
  const [content, setContent] = useState('');
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [fileFormat, setFileFormat] = useState<FileFormatType>('PDF');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);
  const [sheetOrPageCount, setSheetOrPageCount] = useState<number>(1);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      setErrorMsg(null);
      const combinedContents: string[] = [];
      let totalSize = 0;
      let totalPagesOrSheets = 0;
      let detectedFormat: FileFormatType = 'PDF';

      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        setParseStatus(`Streaming & parsing ${f.name} (${i + 1}/${fileList.length})...`);
        const res = await ingestPoliticalFile(f, (msg) => setParseStatus(msg));
        combinedContents.push(res.content);
        totalSize += res.fileSizeBytes;
        totalPagesOrSheets += res.sheetOrPageCount;
        detectedFormat = res.fileFormat;
      }

      const finalText = combinedContents.join('\n\n');
      setContent(finalText);
      setFileFormat(detectedFormat);
      setFileSizeBytes(totalSize);
      setSheetOrPageCount(totalPagesOrSheets);
      setLoadedFileName(
        fileList.length === 1
          ? fileList[0].name
          : `${fileList.length} files (${fileList[0].name} + ${fileList.length - 1} more)`
      );
      if (!title.trim()) {
        setTitle(fileList[0].name);
      }
      setParseStatus(
        `Indexed ${fileList.length} file(s) locally in browser ($0.00 cloud indexing cost)`
      );
    } catch {
      setParseStatus(null);
      setErrorMsg(
        'Could not parse the selected file. Please upload a valid PDF (.pdf), Excel (.xlsx, .xls), CSV, or TXT file.'
      );
    }
  };

  const handleLoadSampleExcelWorkbook = () => {
    const buffer = createSampleElectionExcelBuffer();
    const parsed = parseExcelWorkbookBuffer(buffer);
    setTitle('2026_Regional_Booth_Turnout_And_Spend_Matrix.xlsx');
    setCategory('Polling & Turnout');
    setRegion('Multi-State Constituencies (Varanasi, Pune, Coimbatore, Bucks)');
    setSourceOrg('Election Commission & Booth Analytics Desk');
    setContent(parsed.content);
    setFileFormat('EXCEL');
    setFileSizeBytes(148500000); // ~148.5 MB multi-sheet Excel dataset representation
    setSheetOrPageCount(parsed.sheetCount);
    setLoadedFileName('2026_Regional_Booth_Turnout_And_Spend_Matrix.xlsx (2 sheets)');
    setParseStatus(
      `Parsed binary .xlsx workbook (${parsed.sheetCount} sheets, ${parsed.totalRowsParsed} booth & expenditure records) at $0 cost`
    );
    setErrorMsg(null);
  };

  const handleLoadSamplePdfManifesto = () => {
    setTitle('2026_Ohio_District_9_Constituency_Briefing_Report.pdf');
    setCategory('Polling & Turnout');
    setRegion('Ohio 9th Congressional District (Toledo & Erie Corridor)');
    setSourceOrg('Great Lakes Nonpartisan Polling Institute');
    setContent(`# PDF Page 1: Ballot Horserace & Margin in Ohio District 9
Among 850 likely general election voters surveyed in Ohio's 9th Congressional District, bipartisan manufacturing advocates lead by +3.4 percentage points (49.2% to 45.8%, with 5.0% undecided). In Lucas County union households, turnout intent stands at 78.6%, driven by domestic auto-parts supply chain protections and overtime tax relief.

# PDF Page 2: Top Issue Priorities in Lakefront Precincts
In Erie and Ottawa counties, 41% of voters rank municipal water infrastructure and Great Lakes agricultural runoff grants as a decisive local ballot factor, while 37% cite prescription drug out-of-pocket caps and rural hospital staffing.`);
    setFileFormat('PDF');
    setFileSizeBytes(54200000); // ~54.2 MB PDF report representation
    setSheetOrPageCount(42);
    setLoadedFileName('2026_Ohio_District_9_Constituency_Briefing_Report.pdf');
    setParseStatus('Extracted PDF sections locally via page-stream parser ($0 cost)');
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please provide a document or dataset title.');
      return;
    }
    if (!content.trim() || content.trim().split(/\s+/).length < 5) {
      setErrorMsg(
        'Please upload a PDF/Excel file or paste political data content (at least 5 words) to index.'
      );
      return;
    }

    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });

    onAddDocument({
      title: title.trim(),
      category,
      region: region.trim() || 'National / Multi-State',
      datePublished: monthYear,
      sourceOrg: sourceOrg.trim() || 'Uploaded Intelligence Dataset',
      content: content.trim(),
      fileFormat,
      fileSizeBytes: fileSizeBytes || content.length * 2,
      sheetOrPageCount,
    });

    setTitle('');
    setRegion('');
    setSourceOrg('');
    setContent('');
    setLoadedFileName(null);
    setParseStatus(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#141413]/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#FAF7F2] rounded-t-2xl sm:rounded-2xl border border-[#E6E0D6] max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6E0D6] bg-white">
          <div>
            <h2
              id="upload-modal-title"
              className="text-lg font-bold text-[#141413] font-serif-display"
            >
              Ingest PDF &amp; Excel Political Datasets (10GB Vault)
            </h2>
            <p className="text-xs text-[#6E6A63] mt-0.5">
              Zero-cost client-side PDF &amp; Excel (.xlsx) chunking stored in local IndexedDB — upload once, query forever.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload dialog"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#57534E] hover:text-[#141413] rounded-lg hover:bg-[#F3EFE6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-center gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-800"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PDF & Excel Uploader Banner */}
          <div className="p-4 rounded-xl bg-white border border-[#E6E0D6] space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-[#D95D24] shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[#141413]">
                    Select PDF (.pdf), Excel (.xlsx, .xls), or CSV Files
                  </div>
                  <div className="text-xs text-[#6E6A63]">
                    {loadedFileName
                      ? `Loaded: ${loadedFileName}`
                      : 'Supports multi-sheet Excel workbooks & multi-page PDFs'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.csv,.txt,.md,.json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="political-file-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-white bg-[#D95D24] rounded-lg hover:bg-[#B84A18] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Select PDF / Excel
                </button>
              </div>
            </div>

            {/* Instant One-Click Test Generators for Excel & PDF */}
            <div className="pt-2.5 border-t border-[#E6E0D6] flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-[#6E6A63]">
                Instant Demo Ingest (Zero-Cost Browser Parser):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleExcelWorkbook}
                  className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-[#141413] bg-[#F3EFE6] border border-[#E6E0D6] rounded-lg hover:bg-[#E6E0D6] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#15803D]" />
                  Load Sample Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleLoadSamplePdfManifesto}
                  className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-[#141413] bg-[#F3EFE6] border border-[#E6E0D6] rounded-lg hover:bg-[#E6E0D6] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#D95D24]" />
                  Load Sample PDF (.pdf)
                </button>
              </div>
            </div>

            {parseStatus && (
              <div className="text-xs font-mono text-[#15803D] pt-1">
                {parseStatus}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="doc-title-input"
                className="block text-xs font-semibold text-[#141413] mb-1.5"
              >
                Dataset / Document Filename *
              </label>
              <input
                id="doc-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 2026_Booth_Turnout_Ledger.xlsx"
                className="w-full h-11 px-3 text-sm bg-white border border-[#E6E0D6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D95D24]"
              />
            </div>

            <div>
              <label
                htmlFor="doc-category-select"
                className="block text-xs font-semibold text-[#141413] mb-1.5"
              >
                Intelligence Category
              </label>
              <select
                id="doc-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full h-11 px-3 text-sm bg-white border border-[#E6E0D6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D95D24]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="doc-region-input"
                className="block text-xs font-semibold text-[#141413] mb-1.5"
              >
                Constituency / State Region
              </label>
              <input
                id="doc-region-input"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., Uttar Pradesh / Maharashtra / Pennsylvania"
                className="w-full h-11 px-3 text-sm bg-white border border-[#E6E0D6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D95D24]"
              />
            </div>

            <div>
              <label
                htmlFor="doc-source-input"
                className="block text-xs font-semibold text-[#141413] mb-1.5"
              >
                Source / Filing Agency
              </label>
              <input
                id="doc-source-input"
                type="text"
                value={sourceOrg}
                onChange={(e) => setSourceOrg(e.target.value)}
                placeholder="e.g., Election Commission / State Polling Desk"
                className="w-full h-11 px-3 text-sm bg-white border border-[#E6E0D6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D95D24]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="doc-content-textarea"
                className="block text-xs font-semibold text-[#141413]"
              >
                Extracted PDF Pages / Excel Sheet Rows *
              </label>
              <span className="text-xs font-mono tabular-nums text-[#6E6A63]">
                Format: {fileFormat} ·{' '}
                {content.trim() ? content.trim().split(/\s+/).length : 0} words
              </span>
            </div>
            <textarea
              id="doc-content-textarea"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Extracted text from your uploaded PDF or Excel workbook will appear here automatically..."
              className="w-full p-3 text-xs font-mono bg-white border border-[#E6E0D6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D95D24] leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E6E0D6]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-xs font-medium text-[#57534E] bg-[#F3EFE6] rounded-lg hover:bg-[#E6E0D6] transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 text-xs font-semibold text-white bg-[#D95D24] rounded-lg hover:bg-[#B84A18] transition-colors whitespace-nowrap shrink-0"
            >
              Index &amp; Save to 10GB Vault
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
