import React, { useState } from 'react';
import { Loader } from './components/Loader';
import { Dashboard } from './components/Dashboard';
import { DocumentRecord } from './types';
import { parseFile } from './utils/parser';

export default function App() {
  const [data, setData] = useState<DocumentRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsedData = await parseFile(file);
      if (parsedData.length === 0) {
        throw new Error("No valid data found in the file.");
      }
      setData(parsedData);
    } catch (err: any) {
      setError(err.message || 'Error parsing file.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetData = () => {
    setData(null);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Traitement en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden font-sans text-slate-800 bg-slate-50">
      {error && (
        <div className="max-w-4xl mx-auto mt-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {!data ? (
        <Loader onFileSelect={handleFileSelect} />
      ) : (
        <Dashboard data={data} onReset={resetData} />
      )}
    </div>
  );
}
