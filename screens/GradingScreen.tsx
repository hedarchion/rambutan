
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Save, Download, CheckCircle, Clock, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Undo, Redo, ImageIcon, MoreVertical, Layers, MessageSquare, User, Wand2, ArrowUp, ArrowDown, Scissors, Grid, GripVertical, FileStack, FilePen, MousePointer2, Stamp } from 'lucide-react';
import { GradingMode, Student, StudentScore, Annotation, Part, Point } from '../types';
import { RUBRICS } from '../constants';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { Tooltip } from '../components/Tooltip';
import { AnnotationCanvas } from '../components/AnnotationCanvas';
import { useAnnotationCanvas } from '../hooks/useAnnotationCanvas';
import Markdown from 'react-markdown';

const MODE_COLORS: Record<GradingMode, string> = {
  content: '#10b981',
  communicative: '#f59e0b',
  organisation: '#0ea5e9',
  language: '#f43f5e',
  general: '#8b5cf6',
  select: '#ffffff',
  stamper: '#be123c'
};

const MODE_LABELS: Record<GradingMode, string> = {
  content: 'C',
  communicative: 'CA',
  organisation: 'O',
  language: 'L',
  general: 'G',
  select: 'S',
  stamper: 'ST'
};

interface GradingScreenProps {
  sessionId: string | null;
  sessionName: string;
  graderName: string;
  level: string;
  part: Part;
  taskDescription: string;
  students: Student[];
  currentStudentIndex: number;
  currentImageIndex: number;
  currentStudent: Student | undefined;
  activeMode: GradingMode;
  setActiveMode: (mode: GradingMode) => void;
  autoSaveStatus: 'idle' | 'saving' | 'saved';
  showStudentMenu: boolean;
  setShowStudentMenu: (show: boolean) => void;
  tempName: string;
  setTempName: (name: string) => void;
  enhanceMode: boolean;
  setEnhanceMode: (enhance: boolean) => void;
  processedCache: Record<string, string>;
  isProcessingImg: boolean;
  isTaskOpen: boolean;
  setIsTaskOpen: (open: boolean) => void;
  showExportMenu: boolean;
  setShowExportMenu: (show: boolean) => void;
  isExporting: boolean;
  currentStudentTime: number;
  changeStudent: (offset: number, targetImageIndex?: number) => void;
  handleUniversalNext: () => void;
  handleUniversalPrev: () => void;
  handleManualSave: () => void;
  confirmExit: () => void;
  finishSession: () => void;
  saveStudentName: (name: string) => void;
  mergeNextStudent: () => void;
  mergeWithPrevious: () => void;
  splitStudentAtPage: () => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  deleteAnnotations: (ids: string[]) => void;
  updateScore: (category: keyof StudentScore, val: number) => void;
  updateJustification: (mode: keyof StudentScore, text: string) => void;
  performUndo: () => void;
  performRedo: () => void;
  currentHistory: { past: Annotation[][]; future: Annotation[][] };
  handleExportCurrentPage: () => void;
  handleExportCurrentAnnotations: () => void;
  handleExportAll: () => void;
  handleExportAllAnnotations: () => void;
  handleDownloadGradebook: (students: Student[]) => void;
  handlePrintBatchFeedback: (students: Student[]) => void;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  recordHistory: () => void;
  historyRefs: React.MutableRefObject<any>;
  setHistory: React.Dispatch<React.SetStateAction<Record<string, { past: Annotation[][]; future: Annotation[][] }>>>;
  addAnnotation: (ann: Annotation, record?: boolean) => void;
  handleLogoClick: () => void;
}

export const GradingScreen: React.FC<GradingScreenProps> = ({
  sessionId, sessionName, graderName, level, part, taskDescription,
  students, currentStudentIndex, currentImageIndex, currentStudent,
  activeMode, setActiveMode,
  autoSaveStatus,
  showStudentMenu, setShowStudentMenu,
  tempName, setTempName,
  enhanceMode, setEnhanceMode,
  processedCache,
  isProcessingImg,
  isTaskOpen, setIsTaskOpen,
  showExportMenu, setShowExportMenu,
  isExporting,
  currentStudentTime,
  changeStudent,
  handleUniversalNext,
  handleUniversalPrev,
  handleManualSave,
  confirmExit,
  finishSession,
  saveStudentName,
  mergeNextStudent,
  mergeWithPrevious,
  splitStudentAtPage,
  updateAnnotation,
  deleteAnnotation,
  deleteAnnotations,
  updateScore,
  updateJustification,
  performUndo, performRedo, currentHistory,
  handleExportCurrentPage,
  handleExportCurrentAnnotations,
  handleExportAll,
  handleExportAllAnnotations,
  handleDownloadGradebook,
  handlePrintBatchFeedback,
  setStudents,
  recordHistory,
  historyRefs,
  setHistory,
  addAnnotation,
  handleLogoClick
}) => {
  const canvas = useAnnotationCanvas({
    students,
    currentStudentIndex,
    currentImageIndex,
    setStudents,
    activeMode,
    recordHistory,
    historyRefs,
    step: 'grading',
    sessionId,
    setHistory,
    addAnnotation,
    graderName,
  });

  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [studentInput, setStudentInput] = useState('');
  const studentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return; 
      
      if (e.key === 'F1') { e.preventDefault(); setActiveMode(activeMode === 'content' ? 'general' : 'content'); }
      if (e.key === 'F2') { e.preventDefault(); setActiveMode(activeMode === 'communicative' ? 'general' : 'communicative'); }
      if (e.key === 'F3') { e.preventDefault(); setActiveMode(activeMode === 'organisation' ? 'general' : 'organisation'); }
      if (e.key === 'F4') { e.preventDefault(); setActiveMode(activeMode === 'language' ? 'general' : 'language'); }

      // Ctrl + M for Select tool
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setActiveMode(activeMode === 'select' ? 'general' : 'select');
      }

      // Shortcut S for Stamper
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveMode(activeMode === 'stamper' ? 'general' : 'stamper');
      }

      // Escape to exit special modes
      if (e.key === 'Escape' && (activeMode === 'select' || activeMode === 'stamper')) {
        e.preventDefault();
        setActiveMode('general');
        canvas.setSelectedIds([]);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { 
        e.preventDefault(); 
        if (e.shiftKey) performRedo(); else performUndo(); 
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); performRedo(); }

      if (e.key === 'Delete') {
        if (activeMode === 'select' && canvas.selectedIds.length > 0) {
          e.preventDefault();
          deleteAnnotations(canvas.selectedIds);
          canvas.setSelectedIds([]);
        } else if (canvas.editingAnnotationId) {
          e.preventDefault();
          deleteAnnotation(canvas.editingAnnotationId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas.editingAnnotationId, canvas.selectedIds, activeMode, deleteAnnotation, deleteAnnotations, performUndo, performRedo, setActiveMode]);

  useEffect(() => {
    if (isEditingStudent && studentInputRef.current) {
      studentInputRef.current.focus();
      studentInputRef.current.select();
    }
  }, [isEditingStudent]);

  const handleStudentClick = () => {
    setStudentInput((currentStudentIndex + 1).toString());
    setIsEditingStudent(true);
  };

  const handleStudentSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const newStudentNum = parseInt(studentInput, 10);
    if (!isNaN(newStudentNum) && newStudentNum >= 1 && newStudentNum <= students.length) {
      const targetIndex = newStudentNum - 1;
      const offset = targetIndex - currentStudentIndex;
      changeStudent(offset, 0); // Reset to page 1 when jumping students
    }
    setIsEditingStudent(false);
  };

  const currentTotal = currentStudent ? (currentStudent.scores.content + currentStudent.scores.communicative + currentStudent.scores.organisation + currentStudent.scores.language) : 0;
  const displayImageSrc = (enhanceMode && processedCache[`${sessionId}-${currentStudent?.id}-${currentImageIndex}`]) ? processedCache[`${sessionId}-${currentStudent?.id}-${currentImageIndex}`] : currentStudent?.images[currentImageIndex];
  const activeRubrics = (activeMode !== 'select' && activeMode !== 'general' && activeMode !== 'stamper') ? RUBRICS[part][activeMode] : [];
  const activeColor = MODE_COLORS[activeMode];
  const isSpecificMode = activeMode !== 'general' && activeMode !== 'select' && activeMode !== 'stamper';

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden text-zinc-200 font-sans selection:bg-rose-500/30">
      
      {/* --- HEADER --- */}
      <header className="h-16 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 select-none shrink-0 z-40 relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer group opacity-90 hover:opacity-100 transition-opacity" onClick={handleLogoClick}>
            <Logo size={24} className="text-rose-600 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm tracking-tight text-white hidden md:block">Rambutan</span>
          </div>

          <div className="h-6 w-px bg-zinc-800 hidden md:block"></div>

          <div className="flex flex-col -space-y-0.5 max-w-[150px] sm:max-w-[200px] md:max-w-[300px]">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate">{sessionName}</span>
              <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-[11px] font-bold text-zinc-400 whitespace-nowrap">{level.split('(')[0].trim()}</span>
                  <div className="w-1 h-1 rounded-full bg-zinc-700 shrink-0"></div>
                  <span className="text-[11px] font-bold text-zinc-400 whitespace-nowrap">Part {part}</span>
              </div>
          </div>

          <div className="h-6 w-px bg-zinc-800 hidden lg:block"></div>

          <div className="relative group/name">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <input 
                        type="text" 
                        value={tempName} 
                        onChange={(e) => setTempName(e.target.value)} 
                        onFocus={(e) => { e.target.select(); }} 
                        onBlur={() => { if (tempName.trim()) saveStudentName(tempName); else setTempName(currentStudent?.name || ''); }} 
                        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); }} 
                        className="bg-transparent border border-transparent hover:border-zinc-800 focus:border-zinc-700 rounded-lg px-2 py-1 text-sm font-bold text-zinc-100 w-[150px] sm:w-[200px] truncate focus:outline-none focus:bg-zinc-900 transition-all placeholder-zinc-700" 
                        spellCheck={false} 
                        placeholder="Student Name" 
                    />
                     <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover/name:opacity-100 transition-opacity">
                         <GripVertical size={12} className="text-zinc-600"/>
                     </div>
                </div>
                <button 
                    onClick={() => setShowStudentMenu(!showStudentMenu)} 
                    className={`p-1.5 rounded-lg transition-all ${showStudentMenu ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                >
                    <MoreVertical size={16} />
                </button>
            </div>

            {showStudentMenu && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 animate-fade-in-up flex flex-col overflow-hidden p-1">
                <button onClick={() => { mergeWithPrevious(); setShowStudentMenu(false); }} disabled={currentStudentIndex === 0} className="w-full text-left px-3 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center transition-colors disabled:opacity-30">
                  <ArrowUp size={14} className="mr-3 text-emerald-500" /> Merge with Previous
                </button>
                <button onClick={() => { mergeNextStudent(); setShowStudentMenu(false); }} disabled={currentStudentIndex >= students.length - 1} className="w-full text-left px-3 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center transition-colors disabled:opacity-30">
                  <ArrowDown size={14} className="mr-3 text-rose-500" /> Merge with Next
                </button>
                <div className="h-px bg-white/5 my-1.5 mx-2"></div>
                <button onClick={() => { splitStudentAtPage(); setShowStudentMenu(false); }} disabled={currentImageIndex === 0} className="w-full text-left px-3 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center transition-colors disabled:opacity-30">
                  <Scissors size={14} className="mr-3 text-blue-500" /> Split at Page {currentImageIndex + 1}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 hidden sm:flex">
            <div className={`w-1.5 h-1.5 rounded-full ${autoSaveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : autoSaveStatus === 'saved' ? 'bg-emerald-500' : 'bg-zinc-700'}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-16 text-right">
                {autoSaveStatus === 'saving' ? 'Syncing...' : autoSaveStatus === 'saved' ? 'Synced' : 'Ready'}
            </span>
          </div>
          
          <div className="flex items-center bg-zinc-900/50 rounded-lg p-1 border border-white/5">
            <Tooltip content="Manual Save">
                <button onClick={handleManualSave} className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                    <Save size={16} />
                </button>
            </Tooltip>
            <div className="w-px h-4 bg-zinc-800 mx-1"></div>
            <Tooltip content="Export">
                <button onClick={() => setShowExportMenu(!showExportMenu)} className={`p-2 rounded-md transition-colors ${showExportMenu ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <Download size={16}/>
                </button>
            </Tooltip>
             <div className="w-px h-4 bg-zinc-800 mx-1"></div>
            <Tooltip content="Exit">
                <button onClick={confirmExit} className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                    <X size={16}/>
                </button>
            </Tooltip>
          </div>

          <button onClick={finishSession} className="hidden md:flex items-center bg-zinc-100 hover:bg-white text-zinc-950 px-5 h-10 rounded-lg text-xs font-black tracking-wide shadow-lg shadow-white/5 transition-all hover:scale-105 active:scale-95">
             <CheckCircle size={14} className="mr-2" /> FINISH
          </button>
        </div>
      </header>

      {/* --- SECONDARY TOOLBAR --- */}
      <div className="h-14 bg-zinc-950 border-b border-white/5 flex items-center px-6 z-30 shrink-0">
        <div className="flex-1 flex items-center gap-2">
            <div className="flex bg-zinc-900/50 rounded-lg p-0.5 border border-white/5">
                <Tooltip content="Undo (Ctrl+Z)">
                    <button onClick={performUndo} disabled={currentHistory.past.length === 0} className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 transition-colors">
                    <Undo size={14}/>
                    </button>
                </Tooltip>
                <div className="w-px h-4 bg-zinc-800 my-auto mx-0.5"></div>
                <Tooltip content="Redo (Ctrl+Shift+Z)">
                    <button onClick={performRedo} disabled={currentHistory.future.length === 0} className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 transition-colors">
                    <Redo size={14}/>
                    </button>
                </Tooltip>
            </div>

            <Tooltip content="Magic Enhance">
                <button onClick={() => setEnhanceMode(!enhanceMode)} className={`flex items-center gap-2 px-3 h-9 rounded-lg border transition-all ${enhanceMode ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <Wand2 size={14} className={isProcessingImg ? "animate-spin" : ""} />
                    <span className="text-xs font-bold hidden xl:block">Enhance</span>
                </button>
            </Tooltip>
        </div>

        {/* --- DOCKED MODE SELECTOR --- */}
        <div className="flex-shrink-0">
             <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                <Tooltip content="Selection Tool (Ctrl+M)">
                    <button 
                        onClick={() => {
                            const next = activeMode === 'select' ? 'general' : 'select';
                            setActiveMode(next);
                            if (next !== 'select') canvas.setSelectedIds([]);
                        }}
                        className={`relative w-12 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${activeMode === 'select' ? 'bg-zinc-800 shadow-md ring-1 ring-white/10' : 'hover:bg-zinc-800/50 opacity-60'}`}
                    >
                        <div className="flex flex-col items-center">
                            <MousePointer2 size={14} className={activeMode === 'select' ? 'text-white' : 'text-zinc-500'} />
                            <span className="text-[7px] font-black text-zinc-600 uppercase mt-0.5">M</span>
                        </div>
                    </button>
                </Tooltip>
                <div className="w-px h-6 bg-zinc-800 my-auto mx-1"></div>
                {(['content', 'communicative', 'organisation', 'language'] as GradingMode[]).map((m, i) => {
                    const isActive = activeMode === m;
                    const color = MODE_COLORS[m];
                    return (
                    <button 
                        key={m}
                        onClick={() => setActiveMode(isActive ? 'general' : m)} 
                        className={`relative px-4 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${isActive ? 'bg-zinc-800 shadow-md ring-1 ring-white/10' : 'hover:bg-zinc-800/50 opacity-60'}`}
                    >
                        <div className="flex flex-col items-center">
                            <span className={`text-[11px] font-black transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`} style={{ color: isActive ? color : undefined }}>
                                {MODE_LABELS[m]}
                            </span>
                            <span className="text-[7px] font-black text-zinc-600 uppercase mt-0.5">F{i+1}</span>
                        </div>
                        {isActive && <div className="w-1 h-1 rounded-full absolute -bottom-0.5" style={{ backgroundColor: color }}></div>}
                    </button>
                    );
                })}
                <div className="w-px h-6 bg-zinc-800 my-auto mx-1"></div>
                <Tooltip content="Stamper (S)">
                    <button 
                        onClick={() => setActiveMode(activeMode === 'stamper' ? 'general' : 'stamper')} 
                        className={`relative w-12 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${activeMode === 'stamper' ? 'bg-rose-900/30 ring-1 ring-rose-500/50' : 'hover:bg-zinc-800/50 opacity-60'}`}
                    >
                        <div className="flex flex-col items-center">
                            <Stamp size={14} className={activeMode === 'stamper' ? 'text-rose-500' : 'text-zinc-500'} />
                            <span className="text-[7px] font-black text-zinc-600 uppercase mt-0.5">S</span>
                        </div>
                    </button>
                </Tooltip>
             </div>
        </div>

        <div className="flex-1 flex items-center justify-end">
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* TASK PANEL */}
        <div className={`${isTaskOpen ? 'w-[320px]' : 'w-0'} bg-zinc-950 border-r border-white/5 flex flex-col z-20 transition-all duration-300 relative shrink-0`}>
            <button 
                onClick={() => setIsTaskOpen(!isTaskOpen)} 
                className="absolute -right-5 top-6 w-5 h-10 bg-zinc-900 border-y border-r border-zinc-700 rounded-r-lg flex items-center justify-center text-zinc-500 hover:text-white z-50 shadow-lg cursor-pointer hover:w-6 transition-all"
            >
                {isTaskOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
            <div className={`flex-1 flex flex-col overflow-hidden ${isTaskOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200 delay-100`}>
                <div className="px-4 py-5 border-b border-white/5 bg-zinc-900/50 shrink-0">
                     <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Grid size={12}/> Task Instructions
                     </span>
                     <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-zinc-400">Assignment</span>
                     </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-zinc-950">
                <div className="prose prose-sm prose-invert prose-zinc max-w-none text-zinc-400">
                    {taskDescription ? <Markdown>{taskDescription}</Markdown> : <span className="text-xs text-zinc-600 italic flex items-center justify-center h-32 border border-dashed border-zinc-800 rounded-xl">No task description provided.</span>}
                </div>
                </div>
            </div>
        </div>

        {/* --- CENTRAL CANVAS AREA --- */}
        <div className="flex-1 relative flex flex-col min-w-0">
            <AnnotationCanvas 
                currentStudent={currentStudent}
                currentImageIndex={currentImageIndex}
                displayImageSrc={displayImageSrc}
                zoom={canvas.zoom}
                interactionMode={canvas.interactionMode}
                dragSnapshot={canvas.dragSnapshot}
                creationDragCurrent={canvas.creationDragCurrent}
                editingAnnotationId={canvas.editingAnnotationId}
                newAnnotationId={canvas.newAnnotationId}
                selectedIds={canvas.selectedIds}
                selectionBox={canvas.selectionBox}
                canvasRef={canvas.canvasRef}
                scrollContainerRef={canvas.scrollContainerRef}
                getRelativePoint={canvas.getRelativePoint}
                handleMouseDown={canvas.handleMouseDown}
                handleMouseMove={canvas.handleMouseMove}
                handleMouseUp={canvas.handleMouseUp}
                updateAnnotation={updateAnnotation}
                deleteAnnotation={deleteAnnotation}
                setEditingAnnotationId={canvas.setEditingAnnotationId}
                setNewAnnotationId={canvas.setNewAnnotationId}
                enhanceMode={enhanceMode}
                processedCache={processedCache}
                activeMode={activeMode}
                sessionId={sessionId}
                graderName={graderName}
            />

            {/* --- FOOTER (NOW CENTERED TO CANVAS) --- */}
            <footer className="absolute bottom-6 left-0 right-0 z-[60] pointer-events-none flex justify-center">
                <div className="flex items-center gap-4 pointer-events-auto bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl ring-1 ring-black/50">
                    
                    {/* Student Nav */}
                    <div className="flex items-center gap-2 px-2">
                        <button onClick={() => changeStudent(-1)} disabled={currentStudentIndex === 0} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-all active:scale-95"><User size={16} className="mr-1"/><ChevronLeft size={12}/></button>
                        <div className="flex flex-col items-center w-24">
                            <span className="text-[9px] font-bold text-zinc-600 uppercase">Student</span>
                            <div className="flex items-center gap-1">
                                {isEditingStudent ? (
                                    <form onSubmit={handleStudentSubmit}>
                                        <input 
                                            ref={studentInputRef}
                                            type="text" 
                                            className="w-8 bg-zinc-800 border border-zinc-700 rounded text-xs font-black text-center text-white outline-none focus:ring-1 focus:ring-rose-500" 
                                            value={studentInput}
                                            onChange={(e) => setStudentInput(e.target.value)}
                                            onBlur={() => handleStudentSubmit()}
                                        />
                                    </form>
                                ) : (
                                    <span 
                                        onClick={handleStudentClick}
                                        className="text-xs font-black text-zinc-200 cursor-pointer hover:text-white hover:underline underline-offset-2"
                                    >
                                        {currentStudentIndex + 1}
                                    </span>
                                )}
                                <span className="text-xs font-black text-zinc-200">
                                    <span className="text-zinc-600 font-medium mx-0.5">of</span> {students.length}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => changeStudent(1)} disabled={currentStudentIndex === students.length - 1} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-all active:scale-95"><ChevronRight size={12}/><User size={16} className="ml-1"/></button>
                    </div>

                    <div className="w-px h-8 bg-zinc-800"></div>

                    {/* Page Nav */}
                    <div className="flex items-center gap-2 px-2">
                        <button onClick={handleUniversalPrev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-all active:scale-95"><ArrowUp size={16}/></button>
                        <div className="flex flex-col items-center w-16">
                            <span className="text-[9px] font-bold text-zinc-600 uppercase">Page</span>
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-black text-zinc-200">
                                    {currentImageIndex + 1}
                                </span>
                                <span className="text-xs font-black text-zinc-200">
                                    <span className="text-zinc-600 font-medium mx-0.5">of</span> {currentStudent?.images.length || 0}
                                </span>
                            </div>
                        </div>
                        <button onClick={handleUniversalNext} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-all active:scale-95"><ArrowDown size={16}/></button>
                    </div>

                    <div className="w-px h-8 bg-zinc-800"></div>

                    {/* Time */}
                    <div className="px-4 flex items-center gap-2.5">
                        <Clock size={16} className="text-zinc-600 shrink-0" />
                        <span className="font-mono text-sm font-bold text-zinc-300 tabular-nums leading-none translate-y-[0.5px]">
                            {Math.floor(currentStudentTime / 60)}:{(currentStudentTime % 60).toString().padStart(2, '0')}
                        </span>
                    </div>

                    <div className="w-px h-8 bg-zinc-800"></div>

                    {/* Zoom */}
                    <div className="flex items-center gap-1 px-2">
                        <button onClick={() => canvas.setZoom(z => Math.max(0.5, z - 0.1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all active:scale-95"><ZoomOut size={16}/></button>
                        <span className="text-xs font-bold text-zinc-400 w-10 text-center">{Math.round(canvas.zoom * 100)}%</span>
                        <button onClick={() => canvas.setZoom(z => Math.min(2, z + 0.1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all active:scale-95"><ZoomIn size={16}/></button>
                    </div>
                </div>
            </footer>
        </div>

        {/* RUBRIC PANEL */}
        <div className="w-[320px] bg-zinc-950 border-l border-white/5 flex flex-col z-20 shadow-2xl shrink-0">
          <div className="px-4 py-5 border-b border-white/5 bg-zinc-900/50">
             <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Grand Total</span>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className={`text-4xl font-black tabular-nums transition-colors duration-300 ${currentTotal >= 10 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {currentTotal}
                        </span>
                        <span className="text-xs font-bold text-zinc-600">/20</span>
                    </div>
                </div>
                <div className="flex flex-col items-end text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: activeColor }}>{MODE_LABELS[activeMode]}</span>
                    <div className="text-xl font-black text-white mt-1">
                        {isSpecificMode ? currentStudent?.scores[activeMode as keyof StudentScore] : '-'}
                        <span className="text-xs font-bold text-zinc-600 ml-0.5">/5</span>
                    </div>
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar space-y-1.5">
            {activeRubrics.length > 0 ? activeRubrics.map((row) => {
              const isSelected = isSpecificMode && currentStudent?.scores[activeMode as keyof StudentScore] === row.score;
              return (
                <div 
                    key={row.score} 
                    onClick={() => isSpecificMode && updateScore(activeMode as keyof StudentScore, row.score)} 
                    className={`relative p-2.5 rounded-lg border transition-all duration-150 cursor-pointer group
                        ${isSelected 
                            ? 'bg-zinc-900 border-transparent ring-1 ring-inset shadow-md' 
                            : 'bg-transparent border-white/5 hover:bg-zinc-900/40 hover:border-white/10'
                        }
                    `}
                    style={{ '--tw-ring-color': activeColor } as React.CSSProperties}
                >
                  <div className="flex items-start gap-2 relative z-10">
                    <div 
                        className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black shrink-0 transition-colors ${isSelected ? 'text-white shadow-sm' : 'bg-zinc-900 text-zinc-600 group-hover:bg-zinc-800'}`} 
                        style={{ backgroundColor: isSelected ? activeColor : undefined }}
                    >
                        {row.score}
                    </div>
                    <div className={`text-[11px] leading-[1.3] font-medium transition-colors ${isSelected ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                        <div className="prose-rubric"><Markdown>{row.desc}</Markdown></div>
                    </div>
                  </div>
                  {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/[0.01] rounded-lg pointer-events-none"></div>}
                </div>
              );
            }) : (
                <div className="flex flex-col items-center justify-center h-24 text-zinc-600 italic text-center px-4">
                    {activeMode === 'select' ? (
                        <div className="text-[10px]">Batch editing selected items</div>
                    ) : activeMode === 'stamper' ? (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center gap-2">
                                <Stamp size={24} className="text-rose-500 opacity-40" />
                                <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Stamper Mode</span>
                                <p className="text-[10px] text-zinc-600 px-4">Click anywhere on the script to stamp the current mark breakdown.</p>
                            </div>
                            <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 text-left">
                                <div className="text-[9px] font-black text-zinc-500 uppercase mb-2 border-b border-zinc-800 pb-1">Current Stamp</div>
                                <div className="space-y-1 font-mono text-[10px] text-zinc-400">
                                    <div>C:  {currentStudent?.scores.content}/5</div>
                                    <div>CA: {currentStudent?.scores.communicative}/5</div>
                                    <div>O:  {currentStudent?.scores.organisation}/5</div>
                                    <div>L:  {currentStudent?.scores.language}/5</div>
                                    <div className="pt-1 text-zinc-200 font-bold border-t border-zinc-800 mt-1">Total: {currentTotal}/20</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-[10px]">Select a category to grade</div>
                    )}
                </div>
            )}
          </div>

          <div className="p-3 border-t border-white/5 bg-zinc-900/30">
            <div className="flex items-center gap-1.5 mb-1.5">
                <MessageSquare size={10} className="text-zinc-500"/>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Feedback</span>
            </div>
            <textarea 
              className="w-full h-24 bg-zinc-950/50 border border-white/5 rounded-lg p-2 text-[11px] text-zinc-300 resize-none focus:ring-1 focus:bg-zinc-950 transition-all placeholder-zinc-800 leading-normal custom-scrollbar disabled:opacity-20 disabled:cursor-not-allowed" 
              style={{ '--tw-ring-color': `${activeColor}40` } as React.CSSProperties}
              placeholder={isSpecificMode ? `Comments for ${MODE_LABELS[activeMode]}` : "Select category..."}
              value={isSpecificMode ? (currentStudent?.justifications[activeMode as keyof StudentScore] || '') : ''} 
              disabled={!isSpecificMode}
              onChange={(e) => isSpecificMode && updateJustification(activeMode as keyof StudentScore, e.target.value)} 
            />
          </div>
        </div>
      </main>
      
      {showExportMenu && (
        <div className="fixed z-[100] top-16 right-6 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1.5 w-72 flex flex-col animate-scale-in origin-top-right ring-1 ring-black/50">
          <button onClick={() => { handleExportCurrentPage(); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
              <ImageIcon size={16}/>
            </div>
            <div className="flex flex-col">
              <span>Export Page + Annotations</span>
              <span className="text-[9px] font-medium text-zinc-600">Current page with script and grading</span>
            </div>
          </button>
          
          <button onClick={() => { handleExportCurrentAnnotations(); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
              <FilePen size={16}/>
            </div>
            <div className="flex flex-col">
              <span>Export Annotations Only</span>
              <span className="text-[9px] font-medium text-zinc-600">Grading only on clean background</span>
            </div>
          </button>
          
          <div className="h-px bg-white/5 my-1.5 mx-2"></div>
          
          <button onClick={() => { handleExportAll(); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500 border border-pink-500/20">
              <Layers size={16}/>
            </div>
            <div className="flex flex-col">
              <span>Export All</span>
              <span className="text-[9px] font-medium text-zinc-600">Full script with all grading baked in</span>
            </div>
          </button>

          <button onClick={() => { handleExportAllAnnotations(); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
              <FileStack size={16}/>
            </div>
            <div className="flex flex-col">
              <span>Export All Annotations</span>
              <span className="text-[9px] font-medium text-zinc-600">Comprehensive report of grading only</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
