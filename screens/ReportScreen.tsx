import React from 'react';
import { Search, Download, FileText, ChevronLeft, CheckCircle } from 'lucide-react';
import { Student, GradingMode } from '../types';
import { Button } from '../components/Button';

interface ReportScreenProps {
  sessionName: string;
  students: Student[];
  level: string;
  part: string;
  classStats: {
    avg: string;
    median: string;
    avgTimeSeconds: number;
    categories: Array<{ key: string; label: string; value: string; color: string }>;
    topErrors: Array<{ code: string; count: number; label: string; mode: GradingMode }>;
    distribution: number[];
  } | null;
  reportSearch: string;
  onReportSearchChange: (search: string) => void;
  onDownloadGradebook: (students: Student[]) => void;
  onPrintBatchFeedback: (students: Student[]) => void;
  onBackToGrading: () => void;
  onFinishSession: () => void;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({
  sessionName,
  students,
  level,
  part,
  classStats,
  reportSearch,
  onReportSearchChange,
  onDownloadGradebook,
  onPrintBatchFeedback,
  onBackToGrading,
  onFinishSession
}) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">Session Report</h1>
            <div className="flex items-center gap-3 text-sm font-bold text-zinc-500">
              <span className="bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 text-zinc-400">{sessionName}</span>
              <span className="text-zinc-600">{level} • Part {part}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onBackToGrading} icon={<ChevronLeft size={16} />}>Back</Button>
            <Button variant="primary" onClick={onFinishSession} icon={<CheckCircle size={16} />}>Finish</Button>
          </div>
        </header>

        {classStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {classStats.categories.map((cat) => (
              <div key={cat.key} className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{cat.label}</p>
                  <p className="text-3xl font-black text-white">{cat.value}</p>
                </div>
                <div className="mt-3 h-1 w-full bg-zinc-800 rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${(parseFloat(cat.value) / 5) * 100}%`, backgroundColor: cat.color }}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-lg font-black text-white">Class Performance</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={reportSearch}
                  onChange={e => onReportSearchChange(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none w-48"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={() => onDownloadGradebook(students)} icon={<Download size={14} />}>CSV</Button>
              <Button variant="secondary" size="sm" onClick={() => onPrintBatchFeedback(students)} icon={<FileText size={14} />}>PDF</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4 text-center">Content</th>
                  <th className="px-6 py-4 text-center">Comm.</th>
                  <th className="px-6 py-4 text-center">Org.</th>
                  <th className="px-6 py-4 text-center">Lang.</th>
                  <th className="px-6 py-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {students.filter(s => s.name.toLowerCase().includes(reportSearch.toLowerCase())).map((st) => {
                  const tot: number = Number(st.scores.content) + Number(st.scores.communicative) + Number(st.scores.organisation) + Number(st.scores.language);
                  return (
                    <tr key={st.id} className="group hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4"><span className="font-bold text-sm text-zinc-300">{st.name}</span></td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center h-7 px-3 rounded-lg text-xs font-black border ${tot >= 10 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>{tot}</span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-zinc-400">{st.scores.content}</td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-zinc-400">{st.scores.communicative}</td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-zinc-400">{st.scores.organisation}</td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-zinc-400">{st.scores.language}</td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-zinc-500">{Math.floor(st.timeSpent / 60)}m {st.timeSpent % 60}s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
