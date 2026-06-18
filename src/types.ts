export interface DocumentRecord {
  id: string;
  year: string;
  title: string;
  abstract: string;
  keywords: string;
}

export interface MetricData {
  year: string;
  [key: string]: number | string;
}

export interface ActiveColumns {
  title: boolean;
  abstract: boolean;
  keywords: boolean;
}
