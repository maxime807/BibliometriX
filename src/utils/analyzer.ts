import { ActiveColumns, DocumentRecord, MetricData } from '../types';

export const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const removeAccents = (str: string): string => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const matchKeyword = (text: string, keyword: string) => {
  if (!text) return false;
  const trimmed = keyword.trim();
  if (!trimmed) return false;

  const normalizedText = removeAccents(text.toLowerCase());
  const normalizedKeyword = removeAccents(trimmed.toLowerCase());

  if (normalizedKeyword.includes('*')) {
    // Wildcard variant match: strip '*' and check if it is included
    const clean = normalizedKeyword.replace(/\*/g, '');
    if (!clean) return false;
    return normalizedText.includes(clean);
  } else {
    // Exact word match using word boundaries
    try {
      const escaped = escapeRegExp(normalizedKeyword);
      // If the keyword contains special boundary characters like punctuation (hyphen, dot, slash...),
      // use standard substring check to avoid regex word boundary (\b) mismatch issues
      if (/[^a-zA-Z0-9_\u00c0-\u00ff]/.test(normalizedKeyword)) {
        return normalizedText.includes(normalizedKeyword);
      }
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(normalizedText);
    } catch (e) {
      return normalizedText.includes(normalizedKeyword);
    }
  }
};

export const findOccurrences = (
  records: DocumentRecord[],
  keywords: string[],
  activeColumns: ActiveColumns
): MetricData[] => {
  const yearMap = new Map<string, Record<string, number>>();
  const totalDocsMap = new Map<string, number>();

  records.forEach((record) => {
    if (!record.year || !record.year.match(/^\d{4}$/)) return;
    const year = record.year;

    totalDocsMap.set(year, (totalDocsMap.get(year) || 0) + 1);

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
    .map(([year, counts]) => ({
      year,
      ...counts,
      _totalDocs: totalDocsMap.get(year) || 0
    }))
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));
};

export const findCoOccurrences = (
  records: DocumentRecord[],
  keywords: string[],
  activeColumns: ActiveColumns,
  limitPairs: number = 10 // top N pairs
): { chartData: MetricData[], topPairs: string[] } => {
  const yearMap = new Map<string, Record<string, number>>();
  const totalDocsMap = new Map<string, number>();
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

    totalDocsMap.set(year, (totalDocsMap.get(year) || 0) + 1);

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
      const res: MetricData = { 
        year,
        _totalDocs: totalDocsMap.get(year) || 0
      };
      sortedPairs.forEach(p => {
        res[p] = counts[p];
      });
      return res;
    })
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));

  return { chartData, topPairs: sortedPairs };
};

export interface StrategicTheme {
  keyword: string;
  centrality: number;
  density: number;
  occurrences: number;
}

export const calculateStrategicThemes = (
  records: DocumentRecord[],
  keywords: string[],
  activeColumns: ActiveColumns
): StrategicTheme[] => {
  if (keywords.length === 0) return [];

  // Count occurrences
  const occurrences: Record<string, number> = {};
  const majorOccurrences: Record<string, number> = {};
  
  keywords.forEach(k => {
    occurrences[k] = 0;
    majorOccurrences[k] = 0;
  });

  const coOccur: Record<string, Record<string, number>> = {};
  keywords.forEach(k1 => {
    coOccur[k1] = {};
    keywords.forEach(k2 => {
      coOccur[k1][k2] = 0;
    });
  });

  records.forEach(rc => {
    const textToSearch = [
      activeColumns.title ? rc.title : '',
      activeColumns.abstract ? rc.abstract : '',
      activeColumns.keywords ? rc.keywords : ''
    ].join(' ');

    const titleAndKw = [
      activeColumns.title ? rc.title : '',
      activeColumns.keywords ? rc.keywords : ''
    ].join(' ');

    const present = keywords.filter(k => matchKeyword(textToSearch, k));
    
    // Count total and major occurrences
    present.forEach(k => {
      occurrences[k] += 1;
      if (matchKeyword(titleAndKw, k)) {
        majorOccurrences[k] += 1;
      }
    });

    // Count co-occurrences
    for (let i = 0; i < present.length; i++) {
      for (let j = 0; j < present.length; j++) {
        if (i !== j) {
          coOccur[present[i]][present[j]] += 1;
        }
      }
    }
  });

  // Compute Centrality and Density
  return keywords.map(k => {
    const totalOcc = occurrences[k];
    
    // Compute Centrality: Sum of equivalence index (Callon)
    // E_ij = (c_ij ^ 2) / (c_i * c_j)
    let equivalenceSum = 0;
    keywords.forEach(other => {
      if (other !== k) {
        const coVal = coOccur[k][other];
        const occOther = occurrences[other];
        if (coVal > 0 && totalOcc > 0 && occOther > 0) {
          equivalenceSum += (coVal * coVal) / (totalOcc * occOther);
        }
      }
    });

    // Multiply by 100 for a consistent scale
    const centrality = parseFloat((equivalenceSum * 100).toFixed(1));

    // Compute Density: Major Occurrences (Title + Keywords) / Total Occurrences
    // Means "How much is this concept a focus rather than just passing mention"
    let density = 0;
    if (totalOcc > 0) {
      density = parseFloat(((majorOccurrences[k] / totalOcc) * 100).toFixed(1));
    }

    return {
      keyword: k,
      centrality,
      density,
      occurrences: totalOcc
    };
  });
};

