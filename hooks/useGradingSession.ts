
// Add React import to resolve "Cannot find namespace 'React'" errors throughout the file
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GradingMode, Part, Student, Annotation, StudentScore, Point, Rect } from '../types';
import { storage, SessionRecord } from '../services/storageService';
import { processImageWithSauvola } from '../services/imageProcessing';
import { ERROR_CODES, RUBRICS } from '../constants';
import { transcribeTaskImage } from '../services/geminiService';
import { convertPdfToImages } from '../services/pdfService';
import { jsPDF } from 'jspdf';

const MODE_COLORS: Record<GradingMode, string> = {
  content: '#10b981',
  communicative: '#f59e0b',
  organisation: '#0ea5e9',
  language: '#f43f5e',
  general: '#8b5cf6',
  select: '#ffffff',
  stamper: '#be123c' // Classic stamp red
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

export const useGradingSession = (step: 'setup' | 'task' | 'grading' | 'report') => {
  // Session metadata
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [graderName, setGraderName] = useState('');
  const [level, setLevel] = useState('Form 1 (A2 Revise)');
  const [part, setPart] = useState<Part>('1');
  const [taskDescription, setTaskDescription] = useState('');

  // Students & grading
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeMode, setActiveMode] = useState<GradingMode>('content');

  // History
  const [history, setHistory] = useState<Record<string, { past: Annotation[][], future: Annotation[][] }>>({});
  const historyRefs = useRef({ typingTimeout: null as any, isTyping: false, dragStartSnapshot: null as any });

  // Time tracking
  const [currentStudentTime, setCurrentStudentTime] = useState(0);

  // UI state
  const [enhanceMode, setEnhanceMode] = useState(false);
  const [processedCache, setProcessedCache] = useState<Record<string, string>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const saveTimeoutRef = useRef<any>(null);

  const currentStudent = students[currentStudentIndex];
  const historyKey = currentStudent ? `${currentStudent.id}-${currentImageIndex}` : null;

  // FIX: Added currentHistory computation using useMemo to expose it to GradingScreen for UI feedback on undo/redo status
  const currentHistory = useMemo(() => {
    if (!historyKey) return { past: [], future: [] };
    return history[historyKey] || { past: [], future: [] };
  }, [history, historyKey]);

  const recordHistory = useCallback(() => {
    if (!currentStudent || !historyKey) return;
    const currentPageAnns = currentStudent.annotations.filter(a => a.pageIndex === currentImageIndex);
    setHistory(prev => { 
        const entry = prev[historyKey] || { past: [], future: [] }; 
        return { ...prev, [historyKey]: { past: [...entry.past, JSON.parse(JSON.stringify(currentPageAnns))], future: [] } }; 
    });
  }, [currentStudent, historyKey, currentImageIndex]);

  const addAnnotation = useCallback((ann: Annotation, record: boolean = true) => { 
      if (record) recordHistory(); 
      setStudents(prev => prev.map((s, idx) => idx === currentStudentIndex ? { ...s, annotations: [...s.annotations, ann] } : s)); 
  }, [recordHistory, currentStudentIndex]);

  const classStats = useMemo(() => {
    if (students.length === 0) return null;
    const totals = students.map(s => (s.scores.content + s.scores.communicative + s.scores.organisation + s.scores.language));
    const avg = totals.reduce((a, b) => a + b, 0) / students.length;
    const sorted = [...totals].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const avgContent = students.reduce((a, b) => a + b.scores.content, 0) / students.length;
    const avgComm = students.reduce((a, b) => a + b.scores.communicative, 0) / students.length;
    const avgOrg = students.reduce((a, b) => a + b.scores.organisation, 0) / students.length;
    const avgLang = students.reduce((a, b) => a + b.scores.language, 0) / students.length;

    const avgTimeSeconds = students.reduce((a, b) => a + b.timeSpent, 0) / students.length;
    
    const distribution = new Array(21).fill(0);
    totals.forEach(t => {
        const rounded = Math.min(20, Math.max(0, Math.round(t)));
        distribution[rounded]++;
    });

    const errorCounts: Record<string, number> = {};
    students.forEach(s => s.annotations.forEach(a => {
        if (a.code) errorCounts[a.code] = (errorCounts[a.code] || 0) + 1;
    }));
    const topErrors = Object.entries(errorCounts)
        .map(([code, count]) => {
            const info = ERROR_CODES.find(e => e.code === code);
            return { code, count, label: info?.label || code, mode: info?.mode || 'general' as GradingMode };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    return {
      avg: avg.toFixed(1),
      median: median.toFixed(1),
      avgTimeSeconds,
      categories: [
        { key: 'content' as const, label: 'Content', value: avgContent.toFixed(1), color: MODE_COLORS.content },
        { key: 'communicative' as const, label: 'Communicative', value: avgComm.toFixed(1), color: MODE_COLORS.communicative },
        { key: 'organisation' as const, label: 'Organisation', value: avgOrg.toFixed(1), color: MODE_COLORS.organisation },
        { key: 'language' as const, label: 'Language', value: avgLang.toFixed(1), color: MODE_COLORS.language },
      ],
      topErrors,
      distribution
    };
  }, [students]);

  const saveToStorage = useCallback(async () => {
      const id = sessionId || Date.now().toString();
      if (!sessionId) setSessionId(id);
      
      const created = createdAt || new Date().toISOString();
      if (!createdAt) setCreatedAt(created);

      const session: SessionRecord = {
        id,
        name: sessionName,
        graderName,
        level,
        part,
        taskDescription,
        students: students.map((s, idx) => idx === currentStudentIndex ? { ...s, timeSpent: currentStudentTime } : s),
        createdAt: created,
        lastStudentIndex: currentStudentIndex,
        lastImageIndex: currentImageIndex
      };

      try {
        await storage.saveSession(session);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (err) {
        console.error("Save failed:", err);
        setAutoSaveStatus('idle');
      }
  }, [sessionId, createdAt, sessionName, graderName, level, part, taskDescription, students, currentStudentIndex, currentImageIndex, currentStudentTime]);

  const ensureSessionId = useCallback(() => {
    if (!sessionId) {
      const id = Date.now().toString();
      setSessionId(id);
      setCreatedAt(new Date().toISOString());
    }
  }, [sessionId]);

  const resumeSession = (session: SessionRecord) => {
    setSessionId(session.id);
    setCreatedAt(session.createdAt);
    setSessionName(session.name);
    setGraderName(session.graderName || '');
    setLevel(session.level);
    setPart(session.part);
    setTaskDescription(session.taskDescription);
    setStudents(session.students);
    setCurrentStudentIndex(session.lastStudentIndex ?? 0);
    setCurrentImageIndex(session.lastImageIndex ?? 0);
    const targetIndex = session.lastStudentIndex ?? 0;
    setCurrentStudentTime(session.students[targetIndex]?.timeSpent || 0);
  };

  const performUndo = () => {
      if (!currentStudent || !historyKey) return;
      const entry = history[historyKey];
      if (!entry || entry.past.length === 0) return;
      const newPast = [...entry.past]; const previousPageAnns = newPast.pop()!;
      const currentPageAnns = currentStudent.annotations.filter(a => a.pageIndex === currentImageIndex);
      setHistory(prev => ({ ...prev, [historyKey]: { past: newPast, future: [JSON.parse(JSON.stringify(currentPageAnns)), ...entry.future] } }));
      setStudents(prev => prev.map(s => { if (s.id !== currentStudent.id) return s; const otherPageAnns = s.annotations.filter(a => a.pageIndex !== currentImageIndex); return { ...s, annotations: [...otherPageAnns, ...previousPageAnns] }; }));
  };

  const performRedo = () => {
      if (!currentStudent || !historyKey) return;
      const entry = history[historyKey];
      if (!entry || entry.future.length === 0) return;
      const newFuture = [...entry.future]; const nextPageAnns = newFuture.shift()!;
      const currentPageAnns = currentStudent.annotations.filter(a => a.pageIndex === currentImageIndex);
      setHistory(prev => ({ ...prev, [historyKey]: { past: [...entry.past, JSON.parse(JSON.stringify(currentPageAnns))], future: newFuture } }));
      setStudents(prev => prev.map(s => { if (s.id !== currentStudent.id) return s; const otherPageAnns = s.annotations.filter(a => a.pageIndex !== currentImageIndex); return { ...s, annotations: [...otherPageAnns, ...nextPageAnns] }; }));
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => { 
      if (!historyRefs.current.isTyping) { recordHistory(); historyRefs.current.isTyping = true; } 
      if (historyRefs.current.typingTimeout) clearTimeout(historyRefs.current.typingTimeout); 
      historyRefs.current.typingTimeout = setTimeout(() => { historyRefs.current.isTyping = false; }, 1000); 
      setStudents(prev => prev.map((s, idx) => { if (idx !== currentStudentIndex) return s; return { ...s, annotations: s.annotations.map(a => a.id === id ? { ...a, ...updates } : a) }; })); 
  };

  const deleteAnnotation = (id: string) => { 
      recordHistory(); 
      setStudents(prev => prev.map((s, idx) => { if (idx !== currentStudentIndex) return s; return { ...s, annotations: s.annotations.filter(a => a.id !== id) }; })); 
  };

  const deleteAnnotations = (ids: string[]) => {
      if (ids.length === 0) return;
      recordHistory();
      setStudents(prev => prev.map((s, idx) => {
          if (idx !== currentStudentIndex) return s;
          return { ...s, annotations: s.annotations.filter(a => !ids.includes(a.id)) };
      }));
  };

  const updateScore = (category: keyof Student['scores'], val: number) => { 
      setStudents(prev => prev.map((s, idx) => { if (idx !== currentStudentIndex) return s; return { ...s, scores: { ...s.scores, [category]: val } }; })); 
  };

  const updateJustification = (mode: keyof Student['justifications'], text: string) => { 
      setStudents(prev => prev.map((s, idx) => { if (idx !== currentStudentIndex) return s; return { ...s, justifications: { ...s.justifications, [mode]: text } }; })); 
  };

  const saveStudentName = (name: string) => { 
      setStudents(prev => prev.map((s, idx) => idx === currentStudentIndex ? { ...s, name } : s)); 
  };

  const changeStudent = useCallback((offset: number, targetImageIndex?: number) => {
    const newIndex = currentStudentIndex + offset;
    if (newIndex < 0 || newIndex >= students.length) return;
    const updatedStudents = [...students];
    updatedStudents[currentStudentIndex] = { ...updatedStudents[currentStudentIndex], timeSpent: currentStudentTime };
    setStudents(updatedStudents);
    setCurrentStudentIndex(newIndex);
    setCurrentStudentTime(updatedStudents[newIndex].timeSpent);
    setCurrentImageIndex(targetImageIndex ?? 0);
  }, [currentStudentIndex, students, currentStudentTime]);

  const mergeNextStudent = () => { 
      if (currentStudentIndex >= students.length - 1) return; 
      setStudents(prev => { 
          const updated = [...prev]; 
          const current = { ...updated[currentStudentIndex] }; 
          const next = { ...updated[currentStudentIndex + 1] }; 
          const currentImageCount = current.images.length; 
          const adjustedAnnotations = next.annotations.map(ann => ({ ...ann, pageIndex: ann.pageIndex + currentImageCount })); 
          updated[currentStudentIndex] = { ...current, images: [...current.images, ...next.images], annotations: [...current.annotations, ...adjustedAnnotations] }; 
          updated.splice(currentStudentIndex + 1, 1); 
          return updated; 
      }); 
  };

  const mergeWithPrevious = () => { 
      if (currentStudentIndex === 0) return; 
      setStudents(prev => { 
          const updated = [...prev]; 
          const previous = { ...updated[currentStudentIndex - 1] }; 
          const current = { ...updated[currentStudentIndex] }; 
          const prevImageCount = previous.images.length; 
          const adjustedAnnotations = current.annotations.map(ann => ({ ...ann, pageIndex: ann.pageIndex + prevImageCount })); 
          updated[currentStudentIndex - 1] = { ...previous, images: [...previous.images, ...current.images], annotations: [...current.annotations, ...adjustedAnnotations] }; 
          updated.splice(currentStudentIndex, 1); 
          return updated; 
      }); 
      const prevLength = students[currentStudentIndex - 1].images.length; 
      setCurrentStudentIndex(currentStudentIndex - 1); 
      setCurrentImageIndex(prevLength); 
  };

  const splitStudentAtPage = () => { 
      if (currentImageIndex === 0) return; 
      setStudents(prev => { 
          const updated = [...prev]; 
          const current = { ...updated[currentStudentIndex] }; 
          const keptImages = current.images.slice(0, currentImageIndex); 
          const movedImages = current.images.slice(currentImageIndex); 
          const keptAnnotations = current.annotations.filter(a => a.pageIndex < currentImageIndex); 
          const movedAnnotations = current.annotations.filter(a => a.pageIndex >= currentImageIndex).map(a => ({ ...a, pageIndex: a.pageIndex - currentImageIndex })); 
          const newStudent: Student = { ...current, id: (Date.now() + Math.random()).toString(), name: `${current.name} (Part 2)`, images: movedImages, annotations: movedAnnotations, scores: { content: 0, communicative: 0, organisation: 0, language: 0 }, justifications: { content: '', communicative: '', organisation: '', language: '' }, timeSpent: 0 }; 
          updated[currentStudentIndex] = { ...current, images: keptImages, annotations: keptAnnotations }; 
          updated.splice(currentStudentIndex + 1, 0, newStudent); 
          return updated; 
      }); 
      setCurrentStudentIndex(currentStudentIndex + 1); 
      setCurrentImageIndex(0); 
  };

  const handleUniversalNext = useCallback(() => {
    if (!currentStudent) return;
    if (currentImageIndex < currentStudent.images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else if (currentStudentIndex < students.length - 1) {
      changeStudent(1, 0);
    }
  }, [currentStudent, currentImageIndex, currentStudentIndex, students.length, changeStudent]);

  const handleUniversalPrev = useCallback(() => {
    if (!currentStudent) return;
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    } else if (currentStudentIndex > 0) {
      const prevStudent = students[currentStudentIndex - 1];
      changeStudent(-1, prevStudent.images.length - 1);
    }
  }, [currentStudent, currentImageIndex, currentStudentIndex, students, changeStudent]);

  const handleDownloadGradebook = useCallback((filteredStudents: Student[]) => {
    const headers = ['Name', 'Content', 'Communicative', 'Organisation', 'Language', 'Total', 'Time (s)'];
    const rows = filteredStudents.map(s => {
      const total = s.scores.content + s.scores.communicative + s.scores.organisation + s.scores.language;
      return [s.name, s.scores.content, s.scores.communicative, s.scores.organisation, s.scores.language, total, s.timeSpent];
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${sessionName.replace(/\s+/g, '_')}_Gradebook.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sessionName]);

  const handlePrintBatchFeedback = useCallback(async (filteredStudents: Student[]) => {
    const doc = new jsPDF();
    filteredStudents.forEach((s, idx) => {
        if (idx > 0) doc.addPage();
        doc.setFontSize(18);
        doc.text(`Feedback: ${s.name}`, 20, 20);
        doc.setFontSize(12);
        doc.text(`Level: ${level} | Part: ${part}`, 20, 30);
        doc.text(`Total Score: ${s.scores.content + s.scores.communicative + s.scores.organisation + s.scores.language}/20`, 20, 40);
        
        let y = 50;
        (['content', 'communicative', 'organisation', 'language'] as const).forEach(cat => {
            doc.setFont("helvetica", "bold");
            doc.text(`${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${s.scores[cat]}/5`, 20, y);
            y += 7;
            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(s.justifications[cat] || "No justification provided.", 170);
            doc.text(lines, 25, y);
            y += (lines.length * 5) + 5;
        });
    });
    doc.save(`${sessionName.replace(/\s+/g, '_')}_Batch_Feedback.pdf`);
  }, [sessionName, level, part]);

  const handleTaskUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsTaskLoading(true);
    try {
      let base64Image = '';
      if (file.type === 'application/pdf') { const images = await convertPdfToImages(file); if (images.length > 0) base64Image = images[0]; }
      else { base64Image = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = (ev) => resolve(ev.target?.result as string); reader.readAsDataURL(file); }); }
      if (base64Image) { const text = await transcribeTaskImage(base64Image); setTaskDescription(text); }
    } catch (error) { alert("Failed."); } finally { setIsTaskLoading(false); }
  };

  const handleScriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setIsScriptLoading(true); const newStudents: Student[] = []; const startIdx = students.length + 1; let totalCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]; let images: string[] = [];
        if (file.type === 'application/pdf') images = await convertPdfToImages(file);
        else { const base64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = (ev) => resolve(ev.target?.result as string); reader.readAsDataURL(file); }); images = [base64]; }
        if (images.length > 0) { images.forEach((img) => { newStudents.push({ id: (Date.now() + i + Math.random() + totalCount).toString(), name: `Untitled ${startIdx + totalCount}`, images: [img], annotations: [], scores: { content: 0, communicative: 0, organisation: 0, language: 0 }, justifications: { content: '', communicative: '', organisation: '', language: '' }, timeSpent: 0 }); totalCount++; }); }
      }
      setStudents(prev => [...prev, ...newStudents]);
    } catch (error) { console.error(error); } finally { setIsScriptLoading(false); if (e.target) e.target.value = ''; }
  };

  const generatePageCanvas = async (student: Student, pageIndex: number, includeBackground: boolean = true): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas'); 
    const ctx = canvas.getContext('2d'); 
    if (!ctx) throw new Error("Could not get context");
    
    const baseImg = new Image(); 
    baseImg.src = student.images[pageIndex]; 
    await new Promise((resolve) => { baseImg.onload = resolve; });
    
    canvas.width = baseImg.width; 
    canvas.height = baseImg.height; 

    const scale = canvas.width / 800;

    // Helper to draw rounded rectangle
    const fillRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    };

    if (includeBackground) {
        const key = `${sessionId}-${student.id}-${pageIndex}`;
        const imgSrc = (enhanceMode && processedCache[key]) ? processedCache[key] : student.images[pageIndex];
        const img = new Image();
        img.src = imgSrc;
        await new Promise((resolve) => { img.onload = resolve; });
        ctx.drawImage(img, 0, 0);
    } else {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const pageAnns = student.annotations.filter(a => a.pageIndex === pageIndex);
    
    pageAnns.forEach(ann => {
      const color = (ann.mode === 'content' && ann.isElaboration) ? '#34d399' : MODE_COLORS[ann.mode];
      
      if (ann.type === 'dot') {
        const x = (ann.x || 0) * canvas.width; 
        const y = (ann.y || 0) * canvas.height; 
        const radius = 10 * scale; 
        
        ctx.save();
        ctx.shadowBlur = 4 * scale;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowOffsetY = 2 * scale;
        
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
        ctx.restore();
        
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5 * scale; ctx.stroke();
        
        ctx.fillStyle = 'white'; ctx.font = `800 ${radius * 1.1}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let label = ann.number?.toString() || '?';
        if (ann.number) {
            const siblings = student.annotations.filter(a => a.mode === ann.mode && a.number === ann.number && a.type === 'dot').sort((a, b) => parseInt(a.id) - parseInt(b.id));
            const subIndex = siblings.findIndex(s => s.id === ann.id);
            if (subIndex > 0) label = `${ann.number}${String.fromCharCode(96 + subIndex)}`;
        }
        ctx.fillText(label, x, y);
      } else if (ann.type === 'rect' && ann.rects) {
        ann.rects.forEach((r, rIdx) => {
          const rx = r.x * canvas.width; const ry = r.y * canvas.height; const rw = r.width * canvas.width; const rh = r.height * canvas.height;
          
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = color + '26'; 
          ctx.fillRect(rx, ry, rw, rh);
          ctx.restore();

          // Removed the strokeRect call to match the borderless appearance of the canvas
          // ctx.strokeStyle = color; ctx.lineWidth = 1.5 * scale; ctx.strokeRect(rx, ry, rw, rh);
          
          if (rIdx === 0) {
              const labelCode = ann.code || MODE_LABELS[ann.mode];
              const correction = ann.correction;
              
              // Draw Code Vertically on Left
              ctx.font = `800 ${7 * scale}px 'JetBrains Mono', monospace`;
              const charHeight = 7 * scale;
              const paddingV = 2 * scale;
              const paddingH = 1.5 * scale;
              const codeTotalHeight = (labelCode.length * charHeight) + (paddingV * 2);
              const codeTotalWidth = (7 * scale) + (paddingH * 2);
              
              const codeX = rx - codeTotalWidth - (1 * scale);
              const codeY = ry + (rh / 2) - (codeTotalHeight / 2);
              
              ctx.fillStyle = color;
              fillRoundedRect(ctx, codeX, codeY, codeTotalWidth, codeTotalHeight, 2 * scale);
              
              ctx.fillStyle = 'white';
              ctx.textAlign = 'center';
              labelCode.split('').forEach((char, i) => {
                  ctx.fillText(char, codeX + (codeTotalWidth / 2), codeY + paddingV + (i * charHeight) + (charHeight / 2));
              });

              // Draw Correction on Top - Closer to edge (perching)
              if (correction) {
                  ctx.font = `italic 800 ${9 * scale}px 'JetBrains Mono', monospace`;
                  ctx.textAlign = 'left';
                  const corrY = ry - (0.5 * scale); // Reduced distance for 'perching' effect
                  
                  // White stroke simulation
                  ctx.strokeStyle = 'white';
                  ctx.lineWidth = 2 * scale;
                  ctx.lineJoin = 'round';
                  ctx.strokeText(correction, rx, corrY);
                  
                  ctx.fillStyle = color;
                  ctx.fillText(correction, rx, corrY);
              }
          }
        });
      } else if (ann.type === 'stamp' && ann.stampData) {
          const sx = (ann.x || 0) * canvas.width;
          const sy = (ann.y || 0) * canvas.height;
          const stampW = 140 * scale;
          const stampH = 100 * scale;
          
          ctx.save();
          ctx.shadowBlur = 10 * scale;
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.fillStyle = 'white';
          fillRoundedRect(ctx, sx, sy, stampW, stampH, 8 * scale);
          
          ctx.strokeStyle = MODE_COLORS.stamper;
          ctx.lineWidth = 2 * scale;
          ctx.stroke();
          
          ctx.fillStyle = MODE_COLORS.stamper;
          ctx.font = `800 ${10 * scale}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'left';
          
          const padding = 10 * scale;
          const rowH = 14 * scale;
          
          ctx.fillText(`C:  ${ann.stampData.scores.content}/5`, sx + padding, sy + padding + (rowH * 1));
          ctx.fillText(`CA: ${ann.stampData.scores.communicative}/5`, sx + padding, sy + padding + (rowH * 2));
          ctx.fillText(`O:  ${ann.stampData.scores.organisation}/5`, sx + padding, sy + padding + (rowH * 3));
          ctx.fillText(`L:  ${ann.stampData.scores.language}/5`, sx + padding, sy + padding + (rowH * 4));
          
          ctx.font = `800 ${22 * scale}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'right';
          ctx.fillText(`${ann.stampData.total}`, sx + stampW - padding, sy + sy + (stampH / 2) - sy + (10 * scale));
          ctx.font = `800 ${8 * scale}px 'JetBrains Mono', monospace`;
          ctx.fillText(`/20`, sx + stampW - padding, sy + sy + (stampH / 2) - sy + (20 * scale));
          
          ctx.font = `800 ${6 * scale}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'left';
          ctx.fillText(`By ${ann.stampData.grader || 'Unknown'}`, sx + padding, sy + stampH - (padding * 1.5));
          ctx.fillText(`${ann.stampData.date}`, sx + padding, sy + stampH - (padding * 0.8));
          
          ctx.restore();
      }
    });
    return canvas;
  };

  const handleExportCurrentPage = async () => {
    if (!currentStudent) return; setIsExporting(true);
    try {
      const canvas = await generatePageCanvas(currentStudent, currentImageIndex, true);
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const doc = new jsPDF({ orientation: canvas.width > canvas.height ? 'l' : 'p', unit: 'px', format: [canvas.width, canvas.height], compress: true });
      doc.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'MEDIUM', 0);
      doc.save(`${currentStudent.name.replace(/\s+/g, '_')}_Page_${currentImageIndex + 1}_Full.pdf`);
    } catch (err) { alert("Failed to export page."); } finally { setIsExporting(false); }
  };

  const handleExportCurrentAnnotations = async () => {
    if (!currentStudent) return; setIsExporting(true);
    try {
      const canvas = await generatePageCanvas(currentStudent, currentImageIndex, false);
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const doc = new jsPDF({ orientation: canvas.width > canvas.height ? 'l' : 'p', unit: 'px', format: [canvas.width, canvas.height], compress: true });
      doc.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'MEDIUM', 0);
      doc.save(`${currentStudent.name.replace(/\s+/g, '_')}_Page_${currentImageIndex + 1}_AnnotationsOnly.pdf`);
    } catch (err) { alert("Failed to export annotations."); } finally { setIsExporting(false); }
  };

  const handleExportAll = async () => {
    if (!currentStudent) return; setIsExporting(true);
    try {
      const doc = new jsPDF({ unit: 'px', compress: true });
      for (let i = 0; i < currentStudent.images.length; i++) {
        const canvas = await generatePageCanvas(currentStudent, i, true);
        const imgData = canvas.toDataURL('image/jpeg', 0.80);
        if (i === 0) doc.deletePage(1); 
        doc.addPage([canvas.width, canvas.height], canvas.width > canvas.height ? 'l' : 'p');
        doc.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'MEDIUM', 0);
      }
      doc.save(`${currentStudent.name.replace(/\s+/g, '_')}_All_Full.pdf`);
    } catch (err) { alert("Failed to export all."); } finally { setIsExporting(false); }
  };

  const handleExportAllAnnotations = async () => {
    if (!currentStudent) return; setIsExporting(true);
    try {
      const doc = new jsPDF({ unit: 'px', compress: true });
      for (let i = 0; i < currentStudent.images.length; i++) {
        const canvas = await generatePageCanvas(currentStudent, i, false);
        const imgData = canvas.toDataURL('image/jpeg', 0.80);
        if (i === 0) doc.deletePage(1); 
        doc.addPage([canvas.width, canvas.height], canvas.width > canvas.height ? 'l' : 'p');
        doc.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'MEDIUM', 0);
      }
      doc.save(`${currentStudent.name.replace(/\s+/g, '_')}_All_AnnotationsOnly.pdf`);
    } catch (err) { alert("Failed to export all annotations."); } finally { setIsExporting(false); }
  };

  useEffect(() => {
    if (enhanceMode && students.length > 0) {
      const s = students[currentStudentIndex];
      if (!s || !sessionId) return;
      const key = `${sessionId}-${s.id}-${currentImageIndex}`;
      if (!processedCache[key] && !isProcessingImg) {
        setIsProcessingImg(true);
        (async () => {
          try {
            const cached = await storage.getProcessedImage(key);
            if (cached) {
              setProcessedCache(prev => ({ ...prev, [key]: cached }));
            } else {
              const original = s.images[currentImageIndex];
              if (original) { 
                const processed = await processImageWithSauvola(original); 
                await storage.saveProcessedImage(key, processed);
                setProcessedCache(prev => ({ ...prev, [key]: processed })); 
              }
            }
          } catch (err) { console.error("Enhance logic error:", err); } finally { setIsProcessingImg(false); }
        })();
      }
    }
  }, [enhanceMode, currentStudentIndex, currentImageIndex, students, processedCache, isProcessingImg, sessionId]);

  // FIX: Cleaned up the return object to remove duplicate properties and added currentHistory to fix App.tsx reference error
  return {
    sessionId, setSessionId,
    createdAt, setCreatedAt,
    sessionName, setSessionName,
    graderName, setGraderName,
    level, setLevel,
    part, setPart,
    taskDescription, setTaskDescription,
    students, setStudents,
    currentStudentIndex, setCurrentStudentIndex,
    currentImageIndex, setCurrentImageIndex,
    currentStudent,
    activeMode, setActiveMode,
    saveToStorage,
    ensureSessionId,
    resumeSession,
    history, setHistory,
    currentHistory,
    recordHistory,
    performUndo,
    performRedo,
    updateAnnotation,
    deleteAnnotation,
    deleteAnnotations,
    updateScore,
    updateJustification,
    saveStudentName,
    changeStudent,
    mergeNextStudent,
    mergeWithPrevious,
    splitStudentAtPage,
    handleUniversalNext,
    handleUniversalPrev,
    handleDownloadGradebook,
    handlePrintBatchFeedback,
    isProcessingImg,
    isTaskLoading,
    isTaskOpen: false, // Added default values to satisfy type requirements if necessary
    setIsTaskOpen: () => {},
    isScriptLoading,
    isExporting,
    handleTaskUpload,
    handleScriptUpload,
    handleExportCurrentPage,
    handleExportCurrentAnnotations,
    handleExportAll,
    handleExportAllAnnotations,
    classStats,
    saveTimeoutRef,
    historyRefs,
    setAutoSaveStatus,
    addAnnotation,
    setCurrentStudentTime,
    setEnhanceMode,
    setProcessedCache,
    autoSaveStatus,
    currentStudentTime,
    enhanceMode,
    processedCache
  };
};
