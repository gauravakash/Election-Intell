import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenizeText,
  chunkDocument,
  parseUploadedFileContent,
  parseExcelWorkbookBuffer,
  calculateRagCostTelemetry,
  retrieveRelevantChunks,
  buildExtractiveGroundedAnswer,
} from './ragEngine';
import { createSampleElectionExcelBuffer } from './fileParsers';
import { buildInitialCorpus } from './seedPoliticalData';

test('tokenizeText strips punctuation and stopwords while preserving numbers and percentages', () => {
  const tokens = tokenizeText('In Q3 2026, suburban turnout increased by 19.4% across Pennsylvania!');
  assert.ok(tokens.includes('2026'));
  assert.ok(tokens.includes('suburban'));
  assert.ok(tokens.includes('turnout'));
  assert.ok(tokens.includes('19'));
  assert.ok(!tokens.includes('the'));
  assert.ok(!tokens.includes('across'));
});

test('chunkDocument splits multi-section political documents with accurate section headings', () => {
  const sampleDoc = {
    id: 'test-doc-1',
    title: 'Sample Precinct Brief.pdf',
    category: 'Polling & Turnout' as const,
    region: 'Ohio District 7',
    datePublished: 'Oct 2026',
    sourceOrg: 'Test Analytics',
    uploadedAt: '2026-10-24T00:00:00Z',
    content: `# Early Voting Summary\nEarly voting reached 28% in suburban precincts.\n\n# Economic Priorities\nVoters ranked inflation and property taxes as top priorities.`,
  };

  const { document, chunks } = chunkDocument(sampleDoc, 80);
  assert.equal(document.chunkCount, 2);
  assert.ok(document.wordCount > 10);
  assert.equal(chunks[0].sectionHeading, 'Early Voting Summary');
  assert.equal(chunks[1].sectionHeading, 'Economic Priorities');
});

test('parseExcelWorkbookBuffer parses binary .xlsx election workbooks with multiple sheets', () => {
  const buffer = createSampleElectionExcelBuffer();
  const parsed = parseExcelWorkbookBuffer(buffer);
  assert.equal(parsed.sheetCount, 2);
  assert.ok(parsed.totalRowsParsed >= 6);
  assert.ok(parsed.content.includes('Varanasi North - Booth 104'));
  assert.ok(parsed.content.includes('Coimbatore South - Booth 089'));
  assert.ok(parsed.content.includes('Booth_Turnout_Matrix'));
});

test('calculateRagCostTelemetry computes 99%+ token pruning and $0.00 cost in zero-cost-local mode', () => {
  const { chunks } = buildInitialCorpus();
  const passages = retrieveRelevantChunks('Connected TV media spend', chunks, { topK: 3 });

  const localCost = calculateRagCostTelemetry(500000, passages, 'zero-cost-local');
  assert.equal(localCost.estimatedQueryCostUSD, 0);
  assert.equal(localCost.retrievedTokensSent, 0);

  const flashLiteCost = calculateRagCostTelemetry(500000, passages, 'flash-lite-micro');
  assert.ok(flashLiteCost.tokenReductionPercent > 99);
  assert.ok(flashLiteCost.estimatedQueryCostUSD < 0.001);
  assert.ok(flashLiteCost.naiveFullContextCostUSD > 0.5);
});

test('parseUploadedFileContent converts CSV rows into structured analytical records', () => {
  const csv = `Precinct,Turnout,Margin\nBucks-01,68.4%,+3.2%\nOakland-04,71.1%,+5.0%`;
  const formatted = parseUploadedFileContent('precinct_data.csv', csv);
  assert.ok(formatted.includes('Precinct: Bucks-01'));
  assert.ok(formatted.includes('Turnout: 68.4%'));
  assert.ok(formatted.includes('Precinct: Oakland-04'));
});

test('retrieveRelevantChunks ranks relevant battleground and campaign finance chunks at the top', () => {
  const { chunks } = buildInitialCorpus();

  const financeResults = retrieveRelevantChunks(
    'How much was spent on Connected TV vs broadcast television in Q3 2026 campaign finance?',
    chunks,
    { topK: 3 }
  );

  assert.ok(financeResults.length > 0);
  assert.equal(financeResults[0].chunk.documentId, 'doc-q3-campaign-finance-ledger');
  assert.ok(financeResults[0].chunk.text.includes('Connected TV'));
});

test('buildExtractiveGroundedAnswer synthesizes citations and cost telemetry accurately', () => {
  const { documents, chunks } = buildInitialCorpus();
  const passages = retrieveRelevantChunks('split-ticket voting in suburban collar counties', chunks, { topK: 3 });
  const response = buildExtractiveGroundedAnswer(
    'What is the split-ticket voting rate in suburban collar counties?',
    passages,
    chunks.length,
    documents.length,
    10000,
    'flash-lite-micro'
  );

  assert.ok(response.answer.includes('[1]'));
  assert.ok(response.citations.length > 0);
  assert.ok(response.costTelemetry);
  assert.equal(response.costTelemetry?.costMode, 'flash-lite-micro');
});
