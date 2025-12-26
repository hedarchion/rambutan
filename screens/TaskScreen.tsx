import React from 'react';
import { ChevronLeft, Plus, FileText, PenTool, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Student } from '../types';
import { Button } from '../components/Button';

interface TaskScreenProps {
  sessionName: string;
  taskDescription: string;
  onTaskDescriptionChange: (text: string) => void;
  students: Student[];
  isTaskLoading: boolean;
  isScriptLoading: boolean;
  onTaskUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onScriptUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartGrading: () => void;
  onBack: () => void;
}

export const TaskScreen: React.FC<TaskScreenProps> = ({
  sessionName,
  taskDescription,
  onTaskDescriptionChange,
  students,
  isTaskLoading,
  isScriptLoading,
  onTaskUpload,
  onScriptUpload,
  onStartGrading,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 max-w-5xl w-full rounded-[2rem] shadow-2xl p-8 md:p-12 space-y-8 relative z-10 animate-fade-in-up">
        <div className="flex justify-between items-center border-b border-white/5 pb-6">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-1">Upload Materials</h2>
            <p className="text-zinc-400 text-sm font-medium">Prepare your session.</p>
          </div>
          <Button variant="ghost" onClick={onBack} icon={<ChevronLeft size={16}/>}>Back</Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            <div className={`relative group flex-1 transition-all duration-300 ${isTaskLoading ? 'opacity-80' : ''}`}>
              <input type="file" onChange={onTaskUpload} className="hidden" id="task" accept="image/*,.pdf" />
              <label htmlFor="task" className="cursor-pointer flex flex-col items-center justify-center h-full min-h-[160px] border-2 border-dashed border-zinc-700 bg-zinc-950/30 hover:bg-zinc-800/50 hover:border-rose-500/50 rounded-2xl p-6 text-center transition-all group-hover:shadow-lg active:scale-[0.98]">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 border border-rose-500/20">
                  {isTaskLoading ? <div className="animate-spin w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full" /> : <Plus size={20} className="text-rose-500"/>}
                </div>
                <span className="text-zinc-200 font-bold text-sm mb-1">Task Question</span>
              </label>
            </div>
            <div className={`relative group flex-1 transition-all duration-300 ${isScriptLoading ? 'opacity-80' : ''}`}>
              <input type="file" multiple onChange={onScriptUpload} className="hidden" id="scripts" accept="image/*,.pdf" />
              <label htmlFor="scripts" className="cursor-pointer flex flex-col items-center justify-center h-full min-h-[160px] border-2 border-dashed border-zinc-700 bg-zinc-950/30 hover:bg-zinc-800/50 hover:border-blue-500/50 rounded-2xl p-6 text-center transition-all group-hover:shadow-lg active:scale-[0.98]">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 border border-rose-500/20">
                  {isScriptLoading ? <div className="animate-spin w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full" /> : <FileText size={20} className="text-blue-500"/>}
                </div>
                <span className="text-zinc-200 font-bold text-sm mb-1">
                  {students.length > 0 ? `${students.length} Scripts Loaded` : 'Upload Scripts'}
                </span>
              </label>
            </div>
          </div>
          <div className="lg:col-span-7 flex flex-col h-full min-h-[300px]">
            <div className="relative flex-1 group">
              <div className="absolute top-3 right-3 pointer-events-none text-zinc-600 group-focus-within:text-zinc-400">
                <PenTool size={14} />
              </div>
              <textarea 
                className="w-full h-full rounded-2xl bg-zinc-950/50 border border-zinc-700 p-6 font-mono text-sm text-zinc-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 outline-none transition-all resize-none placeholder-zinc-700 leading-relaxed custom-scrollbar" 
                value={taskDescription} 
                onChange={(e) => onTaskDescriptionChange(e.target.value)} 
                placeholder="Task instructions..." 
              />
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center pt-6 border-t border-white/5">
          <div className="flex items-center text-xs text-zinc-500">
            {students.length > 0 ? (
              <span className="flex items-center text-emerald-400 bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle size={12} className="mr-1.5" />Ready to grade
              </span>
            ) : (
              <span className="flex items-center">
                <AlertCircle size={12} className="mr-1.5" />Upload scripts to continue
              </span>
            )}
          </div>
          <Button onClick={onStartGrading} disabled={students.length===0} size="lg" className="w-full sm:w-auto shadow-xl" icon={<Sparkles size={16} />}>Start Grading</Button>
        </div>
      </div>
    </div>
  );
};