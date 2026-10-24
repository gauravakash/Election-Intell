import { PoliticalDocument, chunkDocument, DocumentChunk } from './ragEngine';

export const INITIAL_POLITICAL_DOCUMENTS: Omit<PoliticalDocument, 'wordCount' | 'chunkCount'>[] = [
  {
    id: 'doc-midwest-battleground-2026',
    title: '2026 Midwest Battleground Precinct Turnout & Swing Voter Study.pdf',
    category: 'Polling & Turnout',
    region: 'Midwest Battleground (PA, MI, WI)',
    datePublished: 'Oct 2026',
    sourceOrg: 'National Electoral Strategy Consortium',
    uploadedAt: '2026-10-18T14:20:00Z',
    fileFormat: 'PDF',
    fileSizeBytes: 42850000, // ~42.8 MB indexed PDF report
    sheetOrPageCount: 118,
    content: `# Suburban Collar County Swing Dynamics
Across 420 benchmark precincts in Pennsylvania, Michigan, and Wisconsin, independent suburban voters shifted +4.8 percentage points toward pragmatic economic stability platforms between Q2 and Q3 2026. In collar counties surrounding Philadelphia (Bucks, Chester, Montgomery) and Detroit (Oakland, Macomb), split-ticket voting reached 19.4%, the highest level recorded since 2016. Voters citing cost-of-living and municipal property tax relief as their primary ballot driver favored fiscally moderate candidates by a 54% to 41% margin.

# Early Mail-In & Absentee Turnout Velocity
Cumulative early ballot returns across the Midwest battleground corridor stand at 31.2% of registered active voters as of 18 days prior to Election Day. Urban core precincts in Milwaukee and Wayne County trail their 2022 pace by 3.1 percentage points, whereas rural and exurban precincts have increased early in-person ballot cast rates by +6.4 percentage points. Youth turnout (ages 18-29) is currently tracking at 14.8% of early returns, concentrated heavily in university municipalities including Ann Arbor, Madison, and State College.

# Key Persuasion Issues Among Undecided Voters
Only 7.6% of likely voters remain undecided across the three-state industrial tier. Within this undecided cohort, 38% rank household energy and healthcare premiums as their top concern, 29% prioritize domestic manufacturing and supply-chain job retention, and 21% focus on public school funding accountability. Campaign messaging centered on bipartisan infrastructure delivery outperforms partisan attack ads by +11.2 net favorability points in persuasion testing.`
  },
  {
    id: 'doc-coalition-manifesto-comparison',
    title: '2026 Major Coalition Policy Manifestos: Economy, Energy & Healthcare.pdf',
    category: 'Party Manifesto',
    region: 'National Federal Platform',
    datePublished: 'Sep 2026',
    sourceOrg: 'Nonpartisan Policy Analysis Institute',
    uploadedAt: '2026-10-19T09:15:00Z',
    fileFormat: 'PDF',
    fileSizeBytes: 68400000, // ~68.4 MB indexed PDF compendium
    sheetOrPageCount: 240,
    content: `# Taxation, Small Business & Industrial Policy
The Civic Renewal Alliance Manifesto proposes a targeted corporate tax credit of 15% for domestic semiconductor, clean steel, and regional manufacturing employers that maintain at least 85% domestic workforce payrolls. It also pledges to expand the small-business standard deduction from $25,000 to $50,000 while indexing middle-income tax brackets to regional inflation. Conversely, the National Prosperity Front Platform advocates a flat 18% corporate rate, immediate full expensing for factory automation capital investments, and a mandatory sunset review for federal regulatory rules every 5 years.

# Grid Reliability, Domestic Energy & Permitting Reform
On energy transition and grid capacity, the Civic Renewal Alliance commits $42 billion over ten years to modernize high-voltage interregional transmission lines, paired with streamlined 18-month environmental permitting for geothermal, nuclear small modular reactors (SMRs), and utility-scale solar storage. The National Prosperity Front emphasizes baseload natural gas expansion, lifting LNG export terminal licensing delays within 60 days, and fast-tracking critical mineral mining leases on federal lands.

# Healthcare Cost Containment & Prescription Drug Pricing
Both coalitions address hospital billing transparency and pharmacy benefit manager (PBM) rebates. The Civic Renewal Alliance proposes capping out-of-pocket insulin and chronic cardiovascular medication costs at $35 per month for all commercial and Medicare beneficiaries, alongside expanding negotiated drug pricing to 50 additional high-spend biologics per year. The National Prosperity Front proposes tax-free portable Health Savings Accounts (HSAs) with a doubled annual contribution cap of $9,500 per family and interstate insurance competition.`
  },
  {
    id: 'doc-q3-campaign-finance-ledger',
    title: 'Q3_2026_Campaign_Expenditure_Booth_Disclosures.xlsx',
    category: 'Campaign Finance',
    region: 'Top 12 Competitive Senate & House Races',
    datePublished: 'Oct 2026',
    sourceOrg: 'Campaign Finance Transparency Bureau',
    uploadedAt: '2026-10-20T11:45:00Z',
    fileFormat: 'EXCEL',
    fileSizeBytes: 114200000, // ~114.2 MB Excel workbook
    sheetOrPageCount: 14,
    content: `# Media Allocation: Connected TV vs Broadcast & Digital
Aggregate Q3 2026 disbursements across the 12 most competitive federal Senate and House districts totaled $348.6 million. Connected TV (CTV) and streaming ad inventory captured 41.5% ($144.7 million) of total media spend, surpassing traditional linear broadcast television (34.2% or $119.2 million) for the first time in a midterm cycle. Short-form vertical video and programmatic bilingual digital placements accounted for 16.8% ($58.6 million), while direct mail and field canvassing payroll represented 7.5% ($26.1 million).

# Independent Expenditure & Super PAC Concentration
Outside independent expenditure committees deployed $112.4 million during the September filing window, with 68% concentrated in four states: Pennsylvania ($28.9M), Michigan ($21.4M), Arizona ($14.8M), and Nevada ($11.3M). Issue-advocacy PACs focused on healthcare and cost-of-living accounted for $46.2 million in positive contrast spots, whereas opposition research committees spent $66.2 million on negative accountability ads.

# Small-Dollar Grassroots Donor Retention
Grassroots contributions under $200 represented 39.2% of total candidate committee receipts in Q3 2026, down from 44.1% in the prior cycle. Recurring monthly donor programs yielded an average contribution of $27.50, with SMS text-to-donate compliance changes reducing impulse fundraising volume by 12.4% while increasing email brief newsletter fundraising conversion by +8.7%.`
  },
  {
    id: 'doc-sunbelt-demographic-census',
    title: 'Sunbelt_Suburban_Constituency_Census_Shift_2026.xlsx',
    category: 'Constituency Demographics',
    region: 'Sunbelt Growth Corridor (AZ, NV, GA, NC)',
    datePublished: 'Aug 2026',
    sourceOrg: 'Electoral Geography & Census Lab',
    uploadedAt: '2026-10-21T16:05:00Z',
    fileFormat: 'EXCEL',
    fileSizeBytes: 89600000, // ~89.6 MB Excel workbook
    sheetOrPageCount: 9,
    content: `# High-Growth Suburban Precinct Population Gains
Post-2020 population migration has added 1.42 million newly eligible voting-age citizens across fast-growing suburban corridors in Maricopa County (AZ), Clark County (NV), metro Atlanta (GA), and the Raleigh-Charlotte arc (NC). Newly registered voters in these high-growth ZIP codes are 43% unaffiliated or independent, compared to 29% among long-term residents. College-educated households in suburban Sunbelt precincts grew by +11.6% since 2022, correlating with heightened sensitivity to housing affordability, mortgage rates, and commuter transit infrastructure.

# Working-Class Service & Hospitality Voter Trends
In Clark County (Las Vegas metro) and Phoenix West Valley precincts, hospitality, logistics, and construction workers comprise 36.4% of the active electorate. Polling and focus group data indicate that eliminating federal taxes on tipped and overtime wages resonates strongly across union and non-union service households alike, generating +18.5 net support across demographic groups. Bilingual Spanish-English door-to-door canvassing in these precincts increased voter registration completion rates by +9.3% compared to digital-only outreach.`
  }
];

export function buildInitialCorpus(): {
  documents: PoliticalDocument[];
  chunks: DocumentChunk[];
} {
  const documents: PoliticalDocument[] = [];
  const chunks: DocumentChunk[] = [];

  for (const rawDoc of INITIAL_POLITICAL_DOCUMENTS) {
    const res = chunkDocument(rawDoc);
    documents.push(res.document);
    chunks.push(...res.chunks);
  }

  return { documents, chunks };
}
