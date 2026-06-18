import React, { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '../utils/cn';

interface LoaderProps {
  onFileSelect: (file: File) => void;
}

export const Loader: React.FC<LoaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Outil d'Analyse Textuelle</h1>
        <p className="text-lg text-slate-600">
          Uploadez votre fichier .RIS ou .CSV exporté depuis Scopus pour analyser les corrélations thématiques dans le temps.
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "mt-8 flex justify-center px-6 pt-10 pb-12 border-2 border-dashed rounded-2xl transition-colors",
            isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 hover:border-slate-400 bg-white"
          )}
        >
          <div className="space-y-2 text-center flex flex-col items-center">
            <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
            <div className="flex text-sm text-slate-600 items-center justify-center">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500"
              >
                <span>Uploader un fichier</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".csv,.ris"
                  className="sr-only"
                  onChange={handleChange}
                />
              </label>
              <p className="pl-1">ou glissez-déposez</p>
            </div>
            <p className="text-xs text-slate-500">Fichiers .CSV ou .RIS jusqu'à 50MB</p>
          </div>
        </div>
      </div>
    </div>
  );
};
