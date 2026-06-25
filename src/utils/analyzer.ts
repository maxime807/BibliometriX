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
  activeKeywordsList: string[],
  activeColumns: ActiveColumns
): StrategicTheme[] => {
  if (activeKeywordsList.length === 0) return [];

  // 1. Extract and count all global author keywords to build the Callon framework
  const docKeywords = records.map(rc => {
    if (!rc.keywords) return [];
    return Array.from(new Set(
      rc.keywords.toLowerCase()
        .split(/[,;]/)
        .map(k => k.trim())
        .filter(k => k.length > 2)
    ));
  });

  const kwGlobalCount: Record<string, number> = {};
  docKeywords.forEach(kws => {
    kws.forEach(kw => {
      kwGlobalCount[kw] = (kwGlobalCount[kw] || 0) + 1;
    });
  });

  const strategicThemes: StrategicTheme[] = [];

  // For each user active keyword, we build its semantic cluster (ego-network)
  activeKeywordsList.forEach(userKey => {
    let totalOccurrences = 0;
    const coOccurWithUser: Record<string, number> = {};
    const matchingDocIndices: number[] = [];

    // Find documents containing the user keyword and build the co-occurrence vector
    records.forEach((rc, idx) => {
      const textToSearch = [
        activeColumns.title ? rc.title : '',
        activeColumns.abstract ? rc.abstract : '',
        activeColumns.keywords ? rc.keywords : ''
      ].join(' ');

      if (matchKeyword(textToSearch, userKey)) {
        totalOccurrences++;
        matchingDocIndices.push(idx);
        
        docKeywords[idx].forEach(kw => {
          coOccurWithUser[kw] = (coOccurWithUser[kw] || 0) + 1;
        });
      }
    });

    if (totalOccurrences === 0) {
      strategicThemes.push({
        keyword: userKey,
        centrality: 0,
        density: 0,
        occurrences: 0
      });
      return;
    }

    // 2. Define the "Theme Cluster" for this user keyword
    // We take the top 30 most frequently co-occurring author keywords (excluding the user keyword itself if it happens to be exactly an author keyword)
    const clusterWords = Object.entries(coOccurWithUser)
      .filter(([kw]) => kw !== userKey.toLowerCase())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(entry => entry[0]);

    if (clusterWords.length === 0) {
      strategicThemes.push({
        keyword: userKey,
        centrality: 0,
        density: 0,
        occurrences: totalOccurrences
      });
      return;
    }

    // 3. Compute Centrality (Callon)
    // Centrality is the degree of external links. For a single keyword node, we sum its Equivalence Index with its cluster.
    // E_ij = (C_ij ^ 2) / (C_i * C_j)
    let centralitySum = 0;
    clusterWords.forEach(kw => {
      const c_ij = coOccurWithUser[kw];
      const c_i = totalOccurrences;
      const c_j = kwGlobalCount[kw];
      if (c_j > 0) {
        centralitySum += (c_ij * c_ij) / (c_i * c_j);
      }
    });

    // 4. Compute Density (Callon)
    // Density is the internal cohesion of the cluster. We compute the average Equivalence Index between all pairs within the cluster.
    // First, we need the global co-occurrences between the cluster words.
    const clusterCoOccur: Record<string, number> = {};
    matchingDocIndices.forEach(idx => {
      const kws = docKeywords[idx];
      // Keep only words that are in our cluster
      const presentClusterWords = kws.filter(k => clusterWords.includes(k));
      for (let i = 0; i < presentClusterWords.length; i++) {
        for (let j = i + 1; j < presentClusterWords.length; j++) {
          const pair = [presentClusterWords[i], presentClusterWords[j]].sort().join('|');
          clusterCoOccur[pair] = (clusterCoOccur[pair] || 0) + 1;
        }
      }
    });

    let densitySum = 0;
    let pairsCount = 0;
    
    for (let i = 0; i < clusterWords.length; i++) {
      for (let j = i + 1; j < clusterWords.length; j++) {
        const w1 = clusterWords[i];
        const w2 = clusterWords[j];
        const pair = [w1, w2].sort().join('|');
        const c_ij = clusterCoOccur[pair] || 0;
        if (c_ij > 0) {
          const c_i = kwGlobalCount[w1];
          const c_j = kwGlobalCount[w2];
          densitySum += (c_ij * c_ij) / (c_i * c_j);
        }
        pairsCount++;
      }
    }

    // Average internal density of the cluster
    const averageDensity = pairsCount > 0 ? densitySum / pairsCount : 0;

    strategicThemes.push({
      keyword: userKey,
      centrality: parseFloat((centralitySum * 10).toFixed(2)), // Scale for visualization
      density: parseFloat((averageDensity * 1000).toFixed(2)), // Scale for visualization, density values are usually very small
      occurrences: totalOccurrences
    });
  });

  return strategicThemes;
};

