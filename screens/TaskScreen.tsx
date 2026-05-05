import React, { useEffect, useCallback } from 'react';
import { ChevronLeft, FileText, PenTool, CheckCircle, AlertCircle, Sparkles, ImageIcon, X } from 'lucide-react';
import { Part, Student } from '../types';
import { Button } from '../components/Button';

interface TaskScreenProps {
  sessionName: string;
  parts: Part[];
  taskDescriptions: Record<Part, string>;
  taskImages: Record<Part, string>;
  onTaskDescriptionChange: (descs: Record<Part, string>) => void;
  students: Student[];
  isTaskLoading: boolean;
  isScriptLoading: boolean;
  onTaskUpload: (part: Part, e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasteTaskImage: (part: Part, file: File) => void;
  onScriptUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartGrading: () => void;
  onBack: () => void;
}

const PART_LABELS: Record<Part, string> = {
  '1': 'Part 1 — Short Communicative Message',
  '2': 'Part 2 — Guided Writing',
  '3': 'Part 3 — Extended Writing',
};

export const TaskScreen: React.FC<TaskScreenProps> = ({
  sessionName,
  parts,
  taskDescriptions,
  taskImages,
  onTaskDescriptionChange,
  students,
  isTaskLoading,
  isScriptLoading,
  onTaskUpload,
  onPasteTaskImage,
  onScriptUpload,
  onStartGrading,
  onBack,
}) => {
  const canProceed = students.length > 0;

  // Clipboard paste handler
  const handlePaste = useCallback((part: Part, e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) onPasteTaskImage(part, file);
        return;
      }
    }
  }, [onPasteTaskImage]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans">
      <div className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 max-w-5xl w-full rounded-[2rem] shadow-2xl p-6 md:p-10 space-y-6 relative z-10 animate-fade-in-up">
        <div className="flex justify-between items-center border-b border-white/5 pb-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">Upload Materials</h2>
            <p className="text-zinc-400 text-xs md:text-sm font-medium">Prepare your session.</p>
          </div>
          <Button variant="ghost" onClick={onBack} icon={<ChevronLeft size={16}/>}>Back</Button>
        </div>

        <div className="space-y-5">
          {/* Per-Part Question Blocks */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <PenTool size={12} /> Task Questions
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {parts.map(part => (
                <div key={part} className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-300">{PART_LABELS[part]}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-zinc-600 hidden md:inline">Ctrl+V</span>
                      <label className={`cursor-pointer flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                        isTaskLoading ? 'opacity-50 pointer-events-none' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600'
                      }`}>
                        <input type="file" onChange={(e) => onTaskUpload(part, e)} className="hidden" accept="image/*,.pdf" />
                        {isTaskLoading ? (
                          <div className="animate-spin w-3 h-3 border-2 border-rose-500 border-t-transparent rounded-full" />
                        ) : (
                          <ImageIcon size={12} />
                        )}
                        <span className="hidden sm:inline">Upload</span>
                      </label>
                    </div>
                  </div>

                  {/* Task image preview */}
                  {taskImages[part] && (
                    <div className="relative rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900/50">
                      <img src={taskImages[part]} alt={`Part ${part} task`} className="w-full max-h-48 object-contain" />
                      <button
                        onClick={() => onTaskDescriptionChange({ ...taskDescriptions, ...{ [part]: taskDescriptions[part] } })}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  <textarea
                    className="w-full h-20 rounded-xl bg-zinc-900/60 border border-zinc-700 p-3 font-mono text-xs md:text-sm text-zinc-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 outline-none transition-all resize-none placeholder-zinc-700 leading-relaxed custom-scrollbar"
                    value={taskDescriptions[part] || ''}
                    onChange={(e) => onTaskDescriptionChange({ ...taskDescriptions, [part]: e.target.value })}
                    onPaste={(e) => handlePaste(part, e)}
                    placeholder={`Part ${part} task instructions... (Ctrl+V to paste image)`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Script Upload */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <FileText size={12} /> Student Scripts
            </h3>
            <div className={`relative group transition-all duration-300 ${isScriptLoading ? 'opacity-80' : ''}`}>
              <input type="file" multiple onChange={onScriptUpload} className="hidden" id="scripts" accept="image/*,.pdf" />
              <label htmlFor="scripts" className="cursor-pointer flex flex-col items-center justify-center min-h-[140px] border-2 border-dashed border-zinc-700 bg-zinc-950/30 hover:bg-zinc-800/50 hover:border-blue-500/50 rounded-2xl p-6 text-center transition-all group-hover:shadow-lg active:scale-[0.98]">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border border-blue-500/20">
                  {isScriptLoading ? <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" /> : <FileText size={20} className="text-blue-500"/>}
                </div>
                <span className="text-zinc-200 font-bold text-sm mb-1">
                  {students.length > 0 ? `${students.length} Pages Loaded` : 'Upload Scanned Scripts'}
                </span>
                <span className="text-zinc-500 text-xs">PDF or images — all students, all parts in one batch</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-5 border-t border-white/5">
          <div className="flex items-center text-xs text-zinc-500">
            <span className={`flex items-center px-3 py-1 rounded-full border ${students.length > 0 ? 'text-emerald-400 bg-emerald-900/20 border-emerald-500/20' : ''}`}>
              {students.length > 0 ? <CheckCircle size={12} className="mr-1.5" /> : <AlertCircle size={12} className="mr-1.5" />}
              {students.length > 0 ? `${students.length} pages ready` : 'Upload scripts to continue'}
            </span>
          </div>
          <Button
            onClick={onStartGrading}
            disabled={!canProceed}
            size="lg"
            className="w-full sm:w-auto shadow-xl"
            icon={<Sparkles size={16} />}
          >
            Start Grading
          </Button>
        </div>
      </div>
    </div>
  );
};
