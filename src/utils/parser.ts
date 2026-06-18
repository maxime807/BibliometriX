import Papa from 'papaparse';
import { DocumentRecord } from '../types';

export const parseCSV = (file: File): Promise<DocumentRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, any>[];
        const records: DocumentRecord[] = data.map((row, index) => ({
          id: row['EID'] || row['DOI'] || `doc-${index}`,
          year: row['Year'] || '',
          title: row['Title'] || '',
          abstract: row['Abstract'] || '',
          keywords: [row['Author Keywords'], row['Index Keywords']].filter(Boolean).join(' '),
        }));
        resolve(records);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const parseRIS = async (file: File): Promise<DocumentRecord[]> => {
  const text = await file.text();
  const records: DocumentRecord[] = [];
  let currentRecord: Partial<DocumentRecord> = {};
  
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = line.trim();
    
    if (cleanLine.startsWith('TY  - ')) {
      currentRecord = { id: `doc-${records.length}`, title: '', abstract: '', keywords: '', year: '' };
    } else if (cleanLine.startsWith('T1  - ') || cleanLine.startsWith('TI  - ')) {
      currentRecord.title = (currentRecord.title || '') + ' ' + cleanLine.substring(6).trim();
    } else if (cleanLine.startsWith('AB  - ')) {
      currentRecord.abstract = (currentRecord.abstract || '') + ' ' + cleanLine.substring(6).trim();
    } else if (cleanLine.startsWith('PY  - ') || cleanLine.startsWith('Y1  - ')) {
      const yearMatch = cleanLine.substring(6).match(/\d{4}/);
      if (yearMatch) {
         currentRecord.year = yearMatch[0];
      }
    } else if (cleanLine.startsWith('KW  - ')) {
      const kw = cleanLine.substring(6).trim();
      currentRecord.keywords = currentRecord.keywords ? `${currentRecord.keywords}, ${kw}` : kw;
    } else if (cleanLine.startsWith('ER  - ')) {
      if (currentRecord.title || currentRecord.abstract) {
        records.push(currentRecord as DocumentRecord);
      }
      currentRecord = {};
    }
  }
  return records;
};

export const parseFile = async (file: File): Promise<DocumentRecord[]> => {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return parseCSV(file);
  } else if (file.name.toLowerCase().endsWith('.ris')) {
    return parseRIS(file);
  } else {
    throw new Error('Unsupported file format. Please upload a .CSV or .RIS file.');
  }
};
