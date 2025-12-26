
import React, { useState, useEffect, useRef } from 'react';
import { useGradingSession } from './hooks/useGradingSession';
import { storage, SessionRecord } from './services/storageService';
import { SetupScreen } from './screens/SetupScreen';
import { TaskScreen } from './screens/TaskScreen';
import { GradingScreen } from './screens/GradingScreen';
import { ReportScreen } from './screens/ReportScreen';

export default function App() {
  const [step, setStep] = useState<'setup' | 'task' | 'grading' | 'report'>('setup');
  const [savedSessions, setSavedSessions] = useState<SessionRecord[]>([]);
  const [showStorageManager, setShowStorageManager] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [showStudentMenu, setShowStudentMenu] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(true);
  const [logoClicks, setLogoClicks] = useState(0);
  const logoClickTimeout = useRef<any>(null);
  const [devModeUnlocked, setDevModeUnlocked] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [tempName, setTempName] = useState('');
  const [greeting, setGreeting] = useState("Welcome back");

  const grading = useGradingSession(step);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (step === 'setup') { storage.getAllSessions().then(setSavedSessions); }
  }, [step]);

  const handleLogoClick = () => {
    setLogoClicks(prev => prev + 1);
    if (logoClickTimeout.current) clearTimeout(logoClickTimeout.current);
    logoClickTimeout.current = setTimeout(() => setLogoClicks(0), 500);
  };

  useEffect(() => {
    if (logoClicks === 3) { setDevModeUnlocked(prev => !prev); setLogoClicks(0); }
  }, [logoClicks]);

  useEffect(() => {
    const isSessionActive = step === 'grading' || step === 'report' || (step === 'task' && grading.students.length > 0);
    if (!isSessionActive) return;
    if (grading.saveTimeoutRef.current) clearTimeout(grading.saveTimeoutRef.current);
    grading.setAutoSaveStatus('saving');
    grading.saveTimeoutRef.current = setTimeout(grading.saveToStorage, 2000);
    return () => clearTimeout(grading.saveTimeoutRef.current);
  }, [grading.saveToStorage, step, grading.students.length]);

  const onResume = (session: SessionRecord) => { grading.resumeSession(session); setStep('grading'); };
  const onDeleteSessionTrigger = async (id: string, e: React.MouseEvent) => { e.stopPropagation(); setSessionToDelete(id); };
  const confirmDeleteSession = async () => { if (!sessionToDelete) return; await storage.deleteSession(sessionToDelete); setSavedSessions(prev => prev.filter(s => s.id !== sessionToDelete)); setSessionToDelete(null); };

  const duplicateSession = async (session: SessionRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = Date.now().toString();
    const duplicated: SessionRecord = { ...session, id: newId, name: `${session.name} (Copy)`, createdAt: new Date().toISOString() };
    await storage.saveSession(duplicated);
    setSavedSessions(prev => [duplicated, ...prev]);
  };

  const handleExportSession = (session: SessionRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const data = JSON.stringify(session);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${session.name.replace(/\s+/g, '_')}_Backup.rambutan`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    } catch (err) { alert("Failed to export session."); }
  };

  const handleImportSession = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string; const session = JSON.parse(content) as SessionRecord;
        await storage.saveSession(session);
        setSavedSessions(prev => { const filtered = prev.filter(s => s.id !== session.id); return [session, ...filtered]; });
        alert(`Successfully imported "${session.name}"`);
      } catch (err) { alert("Failed to import session."); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  useEffect(() => { if (grading.currentStudent) setTempName(grading.currentStudent.name); }, [grading.currentStudentIndex, grading.students]);

  useEffect(() => {
    let interval: any;
    if (step === 'grading') { interval = setInterval(() => { grading.setCurrentStudentTime(t => t + 1); }, 1000); }
    return () => clearInterval(interval);
  }, [step, grading.setCurrentStudentTime]);

  // Global navigation key listener (remains in App because it's higher-level session nav)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step !== 'grading') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return; 
      
      // Navigation
      if (e.key === 'ArrowRight') { e.preventDefault(); grading.handleUniversalNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); grading.handleUniversalPrev(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, grading]); 

  const confirmExit = async () => {
    if (grading.sessionId) { await grading.saveToStorage(); }
    setStep('setup'); 
    grading.setStudents([]); 
    grading.setSessionName(''); 
    grading.setGraderName('');
    grading.setTaskDescription(''); 
    grading.setHistory({}); 
    grading.setCurrentStudentIndex(0); 
    grading.setCurrentImageIndex(0); 
    grading.setSessionId(null); 
    grading.setCreatedAt(null);
  };

  if (step === 'setup') { 
    return (
      <SetupScreen greeting={greeting} onNewSession={() => setStep('task')} sessionName={grading.sessionName} onSessionNameChange={grading.setSessionName} graderName={grading.graderName} onGraderNameChange={grading.setGraderName} level={grading.level} onLevelChange={grading.setLevel} part={grading.part} onPartChange={grading.setPart} savedSessions={savedSessions} onResumeSession={onResume} onDeleteSession={onDeleteSessionTrigger} sessionToDelete={sessionToDelete} onCancelDeleteSession={() => setSessionToDelete(null)} onConfirmDeleteSession={confirmDeleteSession} onDuplicateSession={duplicateSession} onExportSession={handleExportSession} onImportSession={handleImportSession} devModeUnlocked={devModeUnlocked} onLogoClick={handleLogoClick} showStorageManager={showStorageManager} onShowStorageManager={setShowStorageManager} onClearCache={async () => { await storage.clearAllProcessedImages(); grading.setProcessedCache({}); }} />
    );
  }

  if (step === 'task') { 
    return (
      <TaskScreen 
        sessionName={grading.sessionName} 
        taskDescription={grading.taskDescription} 
        onTaskDescriptionChange={grading.setTaskDescription} 
        students={grading.students} 
        isTaskLoading={grading.isTaskLoading} 
        isScriptLoading={grading.isScriptLoading} 
        onTaskUpload={grading.handleTaskUpload} 
        onScriptUpload={grading.handleScriptUpload} 
        onStartGrading={() => { 
          if (grading.students.length > 0) {
            grading.ensureSessionId();
            setStep('grading'); 
          }
        }} 
        onBack={() => setStep('setup')} 
      />
    );
  }

  if (step === 'grading') {
    return (
      <GradingScreen 
        sessionId={grading.sessionId} 
        sessionName={grading.sessionName} 
        graderName={grading.graderName}
        level={grading.level} 
        part={grading.part} 
        taskDescription={grading.taskDescription} 
        students={grading.students} 
        currentStudentIndex={grading.currentStudentIndex} 
        currentImageIndex={grading.currentImageIndex} 
        currentStudent={grading.currentStudent} 
        activeMode={grading.activeMode} 
        setActiveMode={grading.setActiveMode} 
        autoSaveStatus={grading.autoSaveStatus} 
        showStudentMenu={showStudentMenu} 
        setShowStudentMenu={setShowStudentMenu} 
        tempName={tempName} 
        setTempName={setTempName} 
        enhanceMode={grading.enhanceMode} 
        setEnhanceMode={grading.setEnhanceMode} 
        processedCache={grading.processedCache} 
        isProcessingImg={grading.isProcessingImg} 
        isTaskOpen={isTaskOpen} 
        setIsTaskOpen={setIsTaskOpen} 
        showExportMenu={showExportMenu} 
        setShowExportMenu={setShowExportMenu} 
        isExporting={grading.isExporting} 
        currentStudentTime={grading.currentStudentTime} 
        changeStudent={grading.changeStudent} 
        handleUniversalNext={grading.handleUniversalNext} 
        handleUniversalPrev={grading.handleUniversalPrev} 
        handleManualSave={grading.saveToStorage} 
        confirmExit={confirmExit} 
        finishSession={() => setStep('report')} 
        saveStudentName={grading.saveStudentName} 
        mergeNextStudent={grading.mergeNextStudent} 
        mergeWithPrevious={grading.mergeWithPrevious} 
        splitStudentAtPage={grading.splitStudentAtPage} 
        updateAnnotation={grading.updateAnnotation} 
        deleteAnnotation={grading.deleteAnnotation} 
        deleteAnnotations={grading.deleteAnnotations}
        updateScore={grading.updateScore} 
        updateJustification={grading.updateJustification} 
        performUndo={grading.performUndo} 
        performRedo={grading.performRedo} 
        currentHistory={grading.currentHistory} 
        handleExportCurrentPage={grading.handleExportCurrentPage} 
        handleExportAll={grading.handleExportAll} 
        handleExportCurrentAnnotations={grading.handleExportCurrentAnnotations} 
        handleExportAllAnnotations={grading.handleExportAllAnnotations} 
        handleDownloadGradebook={(st) => grading.handleDownloadGradebook(st)} 
        handlePrintBatchFeedback={(st) => grading.handlePrintBatchFeedback(st)} 
        setStudents={grading.setStudents}
        recordHistory={grading.recordHistory}
        historyRefs={grading.historyRefs}
        setHistory={grading.setHistory}
        addAnnotation={grading.addAnnotation}
        handleLogoClick={handleLogoClick} 
      />
    );
  }

  if (step === 'report') {
    return (
      <ReportScreen sessionName={grading.sessionName} students={grading.students} level={grading.level} part={grading.part} classStats={grading.classStats} reportSearch={reportSearch} onReportSearchChange={setReportSearch} onDownloadGradebook={grading.handleDownloadGradebook} onPrintBatchFeedback={grading.handlePrintBatchFeedback} onBackToGrading={() => setStep('grading')} onFinishSession={() => { setStep('setup'); grading.setStudents([]); }} />
    );
  }

  return null;
}
