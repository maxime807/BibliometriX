import { ActiveColumns, DocumentRecord, MetricData } from '../types';

export const normalizeKeyword = (k: string) => k.toLowerCase().replace(/\*/g, '').trim();

const matchKeyword = (text: string, keyword: string) => {
  if (!text) return false;
  const normText = text.toLowerCase();
  const normKeyword = normalizeKeyword(keyword);
  if (!normKeyword) return false;
  return normText.includes(normKeyword);
};

export const findOccurrences = (
  records: DocumentRecord[],
  keywords: string[],
  activeColumns: ActiveColumns
): MetricData[] => {
  const yearMap = new Map<string, Record<string, number>>();

  records.forEach((record) => {
    if (!record.year || !record.year.match(/^\d{4}$/)) return;
    const year = record.year;

    if (!yearMap.has(year)) {
      const initialCounts: Record<string, number> = {};
      keywords.forEach((k) => (initialCounts[k] = 0));
      yearMap.set(year, initialCounts);
    }

    const textToSearch = [
      activeColumns.title ? record.title : '',
      activeColumns.abstract ? record.abstract : '',
      activeColumns.keywords ? record.keywords : ''
    ].join(' ');

    const yearData = yearMap.get(year)!;
    keywords.forEach((keyword) => {
      if (matchKeyword(textToSearch, keyword)) {
        yearData[keyword] += 1;
      }
    });
  });

  return Array.from(yearMap.entries())
    .map(([year, counts]) => ({ year, ...counts }))
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));
};

export const findCoOccurrences = (
  records: DocumentRecord[],
  keywords: string[],
  activeColumns: ActiveColumns,
  limitPairs: number = 10 // top N pairs
): { chartData: MetricData[], topPairs: string[] } => {
  const yearMap = new Map<string, Record<string, number>>();
  const pairTotals: Record<string, number> = {};

  // Initialize pairs
  const pairs: string[] = [];
  for (let i = 0; i < keywords.length; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      const pair = `${keywords[i]} & ${keywords[j]}`;
      pairs.push(pair);
      pairTotals[pair] = 0;
    }
  }

  records.forEach((record) => {
    if (!record.year || !record.year.match(/^\d{4}$/)) return;
    const year = record.year;

    if (!yearMap.has(year)) {
      const initialCounts: Record<string, number> = {};
      pairs.forEach((p) => (initialCounts[p] = 0));
      yearMap.set(year, initialCounts);
    }

    const textToSearch = [
      activeColumns.title ? record.title : '',
      activeColumns.abstract ? record.abstract : '',
      activeColumns.keywords ? record.keywords : ''
    ].join(' ');

    const yearData = yearMap.get(year)!;
    const presentKeywords = keywords.filter(k => matchKeyword(textToSearch, k));

    for (let i = 0; i < presentKeywords.length; i++) {
      for (let j = i + 1; j < presentKeywords.length; j++) {
        // Need to find the original pair key regardless of order found
        const k1 = presentKeywords[i];
        const k2 = presentKeywords[j];
        
        let pairKey = `${k1} & ${k2}`;
        if (!pairTotals.hasOwnProperty(pairKey)) {
             pairKey = `${k2} & ${k1}`;
        }

        if (yearData[pairKey] !== undefined) {
          yearData[pairKey] += 1;
          pairTotals[pairKey] += 1;
        }
      }
    }
  });

  // Find top pairs
  const sortedPairs = Object.entries(pairTotals)
    .sort((a, b) => b[1] - a[1])
    .filter(p => p[1] > 0)
    .slice(0, limitPairs)
    .map(p => p[0]);

  // Simplify chart data to only include top pairs
  const chartData: MetricData[] = Array.from(yearMap.entries())
    .map(([year, counts]) => {
      const res: MetricData = { year };
      sortedPairs.forEach(p => {
        res[p] = counts[p];
      });
      return res;
    })
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));

  return { chartData, topPairs: sortedPairs };
};
