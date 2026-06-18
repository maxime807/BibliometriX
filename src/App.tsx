import React, { useState, useEffect } from 'react';
import { Loader } from './components/Loader';
import { Dashboard } from './components/Dashboard';
import { DocumentRecord } from './types';
import { parseFile } from './utils/parser';
import * as idb from 'idb-keyval';

export default function App() {
  const [data, setData] = useState<DocumentRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading while checking IDB

  useEffect(() => {
    // Load persisted data
    const loadData = async () => {
      try {
        const savedData = await idb.get('analysis-data');
        if (savedData && Array.isArray(savedData) && savedData.length > 0) {
          setData(savedData);
        }
      } catch (err) {
        console.error("Failed to load data from indexedDB", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleFilesSelect = async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    try {
      let allParsedData: DocumentRecord[] = [];
      for (const file of files) {
        const parsedData = await parseFile(file);
        allParsedData = [...allParsedData, ...parsedData];
      }
      
      if (allParsedData.length === 0) {
        throw new Error("Aucune donnée valide trouvée dans les fichiers.");
      }
      
      // Deduplicate on ID just in case
      const uniqueData = Array.from(new Map(allParsedData.map(item => [item.id, item])).values());
      
      setData(uniqueData);
      await idb.set('analysis-data', uniqueData);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la lecture des fichiers.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetData = async () => {
    setData(null);
    setError(null);
    try {
      await idb.del('analysis-data');
      await idb.del('analysis-state'); // Clear dashboard state as well
    } catch (err) {
      console.error(err);
    }
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
    <div className="flex flex-col h-screen w-full overflow-hidden font-sans text-slate-800 bg-slate-50">
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
        <Loader onFilesSelect={handleFilesSelect} />
      ) : (
        <Dashboard data={data} onReset={resetData} />
      )}
    </div>
  );
}
