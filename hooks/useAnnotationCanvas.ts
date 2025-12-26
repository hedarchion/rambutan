
import React, { useState, useRef, useCallback } from 'react';
import { GradingMode, Student, Annotation, Point, Rect } from '../types';

export type InteractionMode = 'none' | 'creating' | 'moving' | 'resizing' | 'panning' | 'selecting' | 'moving-multi';
export type ResizeHandle = 'nw' | 'sw' | 'ne' | 'se';

export interface DragSnapshot {
  startPoint: Point;
  initialRect?: Rect;
  initialDot?: Point;
  annotationId?: string;
  rectIndex?: number;
  handle?: ResizeHandle;
  clientStart?: { x: number; y: number };
  initialScroll?: { left: number; top: number };
  initialMultiPositions?: Record<string, Point | Rect[]>;
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const useAnnotationCanvas = ({
  students,
  currentStudentIndex,
  currentImageIndex,
  setStudents,
  activeMode,
  recordHistory,
  historyRefs,
  step,
  sessionId,
  setHistory,
  addAnnotation,
  graderName,
}: {
  students: Student[];
  currentStudentIndex: number;
  currentImageIndex: number;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  activeMode: GradingMode;
  recordHistory: () => void;
  historyRefs: React.MutableRefObject<any>;
  step: 'setup' | 'task' | 'grading' | 'report';
  sessionId: string | null;
  setHistory: React.Dispatch<React.SetStateAction<Record<string, { past: Annotation[][]; future: Annotation[][] }>>>;
  addAnnotation: (ann: Annotation, record?: boolean) => void;
  graderName?: string;
}) => {
  const [zoom, setZoom] = useState(1);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('none');
  const [dragSnapshot, setDragSnapshot] = useState<DragSnapshot | null>(null);
  const [creationDragCurrent, setCreationDragCurrent] = useState<Point | null>(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [newAnnotationId, setNewAnnotationId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<Rect | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentStudent = students[currentStudentIndex];

  const getRelativePoint = useCallback((e: React.MouseEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((e.clientY - rect.top) / rect.height, 0, 1)
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, annotationId?: string, rectIndex?: number, handle?: any) => {
    if (step !== 'grading') return;
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      setInteractionMode('panning');
      setDragSnapshot({
        startPoint: { x: 0, y: 0 },
        clientStart: { x: e.clientX, y: e.clientY },
        initialScroll: { left: scrollContainerRef.current?.scrollLeft || 0, top: scrollContainerRef.current?.scrollTop || 0 }
      });
      return;
    }
    
    if (e.button === 0 && annotationId) e.stopPropagation();
    const pt = getRelativePoint(e);
    
    if (interactionMode === 'none' && currentStudent) {
      const pageAnns = currentStudent.annotations.filter(a => a.pageIndex === currentImageIndex);
      historyRefs.current.dragStartSnapshot = { annotations: JSON.parse(JSON.stringify(pageAnns)) };
    }

    // Stamper mode
    if (activeMode === 'stamper' && e.button === 0) {
        if (!annotationId) {
            const currentTotal = currentStudent ? (currentStudent.scores.content + currentStudent.scores.communicative + currentStudent.scores.organisation + currentStudent.scores.language) : 0;
            const newAnnotation: Annotation = {
                id: (Date.now() + Math.random()).toString(),
                mode: 'stamper',
                pageIndex: currentImageIndex,
                type: 'stamp',
                x: pt.x,
                y: pt.y,
                stampData: {
                    scores: { ...currentStudent.scores },
                    total: currentTotal,
                    grader: graderName || 'Teacher',
                    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                }
            };
            addAnnotation(newAnnotation);
            setInteractionMode('none');
            return;
        }
        // If annotationId is present, fall through to allow moving/selecting
    }

    // Multi-select mode
    if (activeMode === 'select' && e.button === 0) {
      if (annotationId) {
        // Dragging a selection or starting a drag of selected items
        const isAlreadySelected = selectedIds.includes(annotationId);
        const newSelection = isAlreadySelected ? selectedIds : [annotationId];
        if (!isAlreadySelected) setSelectedIds(newSelection);
        
        setInteractionMode('moving-multi');
        const initialMultiPositions: Record<string, Point | Rect[]> = {};
        students[currentStudentIndex].annotations.forEach(a => {
          if (newSelection.includes(a.id)) {
            if (a.type === 'dot') initialMultiPositions[a.id] = { x: a.x!, y: a.y! };
            else if (a.type === 'rect') initialMultiPositions[a.id] = JSON.parse(JSON.stringify(a.rects));
            else if (a.type === 'stamp') initialMultiPositions[a.id] = { x: a.x!, y: a.y! };
          }
        });
        setDragSnapshot({ startPoint: pt, initialMultiPositions });
      } else {
        // Selection box start
        setInteractionMode('selecting');
        setDragSnapshot({ startPoint: pt });
        setSelectedIds([]);
      }
      return;
    }

    if (e.button === 0 && handle && annotationId && rectIndex !== undefined) {
      const ann = students[currentStudentIndex].annotations.find(a => a.id === annotationId);
      const initialRect = ann?.rects?.[rectIndex];
      if (initialRect) {
        setInteractionMode('resizing');
        setDragSnapshot({ startPoint: pt, initialRect: { ...initialRect } as Rect, annotationId, rectIndex, handle });
      }
      return;
    }
    if (e.button === 0 && annotationId) {
      const ann = students[currentStudentIndex].annotations.find(a => a.id === annotationId);
      if (!ann) return;
      if (e.shiftKey && ann.type === 'rect') {
        setInteractionMode('creating');
        setEditingAnnotationId(annotationId);
        setDragSnapshot({ startPoint: pt });
        return;
      }
      setEditingAnnotationId(annotationId);
      setInteractionMode('moving');
      let initialRect, initialDot;
      if (ann.type === 'rect' && rectIndex !== undefined) initialRect = ann.rects?.[rectIndex];
      else if (ann.type === 'dot' || ann.type === 'stamp') initialDot = { x: ann.x!, y: ann.y! };
      if (initialRect || initialDot) {
        setDragSnapshot({ startPoint: pt, initialRect: initialRect ? { ...initialRect } : undefined, initialDot: initialDot ? { ...initialDot } : undefined, annotationId, rectIndex });
      }
      return;
    }
    if (e.button === 0 && !annotationId) {
      let shouldClearSelection = !e.shiftKey;
      if (e.shiftKey && editingAnnotationId) {
        const activeAnn = students[currentStudentIndex].annotations.find(a => a.id === editingAnnotationId);
        if (!(activeAnn && activeAnn.type === 'rect' && activeAnn.pageIndex === currentImageIndex)) shouldClearSelection = true;
      }
      if (shouldClearSelection) {
        setEditingAnnotationId(null);
        setNewAnnotationId(null);
      }
      setInteractionMode('creating');
      setDragSnapshot({ startPoint: pt });
    }
    if (e.button === 2) {
      e.preventDefault();
      if (!e.shiftKey) {
        setEditingAnnotationId(null);
        setNewAnnotationId(null);
      }
      setInteractionMode('none');
      setDragSnapshot({ startPoint: pt });
    }
  }, [step, getRelativePoint, interactionMode, currentStudent, currentImageIndex, historyRefs, students, currentStudentIndex, editingAnnotationId, activeMode, selectedIds, graderName, addAnnotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (interactionMode === 'panning' && dragSnapshot?.clientStart && dragSnapshot.initialScroll && scrollContainerRef.current) {
      const dx = e.clientX - dragSnapshot.clientStart.x;
      const dy = e.clientY - dragSnapshot.clientStart.y;
      scrollContainerRef.current.scrollLeft = dragSnapshot.initialScroll.left - dx;
      scrollContainerRef.current.scrollTop = dragSnapshot.initialScroll.top - dy;
      return;
    }
    if (!dragSnapshot) return;
    const currentPt = getRelativePoint(e);
    const { startPoint, initialRect, initialDot, annotationId, rectIndex, handle, initialMultiPositions } = dragSnapshot;
    const deltaX = currentPt.x - startPoint.x;
    const deltaY = currentPt.y - startPoint.y;

    if (interactionMode === 'selecting') {
      const x = Math.min(startPoint.x, currentPt.x);
      const y = Math.min(startPoint.y, currentPt.y);
      const width = Math.abs(currentPt.x - startPoint.x);
      const height = Math.abs(currentPt.y - startPoint.y);
      setSelectionBox({ x, y, width, height });
      
      // Update selection in real-time
      if (currentStudent) {
        const newlySelected = currentStudent.annotations.filter(a => {
          if (a.pageIndex !== currentImageIndex) return false;
          if (a.type === 'dot' || a.type === 'stamp') {
            return a.x! >= x && a.x! <= x + width && a.y! >= y && a.y! <= y + height;
          } else if (a.type === 'rect') {
            return a.rects?.some(r => {
              const rx = r.x; const ry = r.y; const rw = r.width; const rh = r.height;
              // Check if rect overlaps selection box
              return !(rx > x + width || rx + rw < x || ry > y + height || ry + rh < y);
            });
          }
          return false;
        }).map(a => a.id);
        setSelectedIds(newlySelected);
      }
      return;
    }

    if (interactionMode === 'moving-multi' && initialMultiPositions) {
      setStudents(prev => prev.map((s, sIdx) => {
        if (sIdx !== currentStudentIndex) return s;
        const newAnns = s.annotations.map(a => {
          const initial = initialMultiPositions[a.id];
          if (!initial) return a;
          if (a.type === 'dot' || a.type === 'stamp') {
            const dot = initial as Point;
            return { ...a, x: clamp(dot.x + deltaX, 0, 1), y: clamp(dot.y + deltaY, 0, 1) };
          } else if (a.type === 'rect') {
            const rects = initial as Rect[];
            const newRects = rects.map(r => ({
              ...r,
              x: clamp(r.x + deltaX, 0, 1 - r.width),
              y: clamp(r.y + deltaY, 0, 1 - r.height)
            }));
            return { ...a, rects: newRects };
          }
          return a;
        });
        return { ...s, annotations: newAnns };
      }));
      return;
    }

    if (interactionMode === 'moving' && annotationId) {
      setStudents(prev => prev.map((s, sIdx) => {
        if (sIdx !== currentStudentIndex) return s;
        const newAnns = s.annotations.map(a => {
          if (a.id !== annotationId) return a;
          if ((a.type === 'dot' || a.type === 'stamp') && initialDot) return { ...a, x: clamp(initialDot.x + deltaX, 0, 1), y: clamp(initialDot.y + deltaY, 0, 1) };
          else if (a.type === 'rect' && initialRect && rectIndex !== undefined && a.rects) {
            const newRects = [...a.rects];
            const newX = clamp(initialRect.x + deltaX, 0, 1 - initialRect.width);
            const newY = clamp(initialRect.y + deltaY, 0, 1 - initialRect.height);
            newRects[rectIndex] = { ...newRects[rectIndex], x: newX, y: newY };
            return { ...a, rects: newRects };
          }
          return a;
        });
        return { ...s, annotations: newAnns };
      }));
    }
    if (interactionMode === 'resizing' && initialRect && annotationId && rectIndex !== undefined && handle) {
      setStudents(prev => prev.map((s, sIdx) => {
        if (sIdx !== currentStudentIndex) return s;
        const newAnns = s.annotations.map(a => {
          if (a.id !== annotationId || !a.rects) return a;
          const newRects = [...a.rects];
          let newR = { ...initialRect };
          if (handle === 'se') {
            newR.width = Math.max(0.01, initialRect.width + deltaX);
            newR.height = Math.max(0.01, initialRect.height + deltaY);
          } else if (handle === 'sw') {
            newR.x = initialRect.x + deltaX;
            newR.width = Math.max(0.01, initialRect.width - deltaX);
            newR.height = Math.max(0.01, initialRect.height + deltaY);
          } else if (handle === 'ne') {
            newR.y = initialRect.y + deltaY;
            newR.width = Math.max(0.01, initialRect.width + deltaX);
            newR.height = Math.max(0.01, initialRect.height - deltaY);
          } else if (handle === 'nw') {
            newR.x = initialRect.x + deltaX;
            newR.y = initialRect.y + deltaY;
            newR.width = Math.max(0.01, initialRect.width - deltaX);
            newR.height = Math.max(0.01, initialRect.height - deltaY);
          }
          newRects[rectIndex] = newR;
          return { ...a, rects: newRects };
        });
        return { ...s, annotations: newAnns };
      }));
    }
    if (interactionMode === 'creating') setCreationDragCurrent(currentPt);
  }, [interactionMode, dragSnapshot, getRelativePoint, currentStudentIndex, setStudents, currentImageIndex, currentStudent]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (interactionMode === 'panning') {
      setInteractionMode('none');
      setDragSnapshot(null);
      return;
    }
    if (!dragSnapshot) return;
    const currentPt = getRelativePoint(e); const { startPoint } = dragSnapshot;
    
    if ((interactionMode === 'moving' || interactionMode === 'resizing' || interactionMode === 'moving-multi') && historyRefs.current.dragStartSnapshot && sessionId) { 
        const snapshot = historyRefs.current.dragStartSnapshot.annotations; 
        const historyKey = `${currentStudent?.id}-${currentImageIndex}`; 
        setHistory(prev => { 
            const entry = prev[historyKey] || { past: [], future: [] }; 
            return { ...prev, [historyKey]: { past: [...entry.past, snapshot], future: [] } }; 
        }); 
    }

    if (interactionMode === 'selecting') {
      setSelectionBox(null);
    }

    if (e.button === 0 && interactionMode === 'creating') { 
        const rawWidth = Math.abs(currentPt.x - startPoint.x); 
        const rawHeight = Math.abs(currentPt.y - startPoint.y); 
        const isDrag = rawWidth > 0.01 || rawHeight > 0.01; 
        const width = isDrag ? rawWidth : 0.06; 
        const height = isDrag ? rawHeight : 0.02; 
        const originX = isDrag ? Math.min(startPoint.x, currentPt.x) : (startPoint.x - 0.03); 
        const originY = isDrag ? Math.min(startPoint.y, currentPt.y) : (startPoint.y - 0.01); 
        const clampedX = clamp(originX, 0, 1 - width); 
        const clampedY = clamp(originY, 0, 1 - height); 
        const newRect: Rect = { x: clampedX, y: clampedY, width, height }; 
        if (e.shiftKey && editingAnnotationId) { 
            setStudents(prev => prev.map((s, sIdx) => { 
                if (sIdx !== currentStudentIndex) return s; 
                const newAnns = s.annotations.map(a => { 
                    if (a.id === editingAnnotationId && a.type === 'rect' && a.pageIndex === currentImageIndex) { 
                        return { ...a, rects: [...(a.rects || []), newRect] }; 
                    } 
                    return a; 
                }); 
                return { ...s, annotations: newAnns }; 
            })); 
            recordHistory(); 
        } else { 
            const id = (Date.now() + Math.random()).toString(); 
            const newAnnotation: Annotation = { id, mode: activeMode, pageIndex: currentImageIndex, type: 'rect', rects: [newRect], text: '' }; 
            addAnnotation(newAnnotation); 
            setEditingAnnotationId(id); 
            setNewAnnotationId(id); 
        } 
    }
    if (e.button === 2 && interactionMode === 'none') { 
        const dist = Math.hypot(currentPt.x - startPoint.x, currentPt.y - startPoint.y); 
        if (dist < 0.01) { 
            const modeDots = students[currentStudentIndex].annotations.filter(a => a.mode === activeMode && a.type === 'dot'); 
            const numbers = modeDots.map(d => d.number || 0); 
            const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0; 
            const nextNum = (e.ctrlKey || e.metaKey) ? (maxNum || 1) : (maxNum + 1); 
            const isElaboration = (e.ctrlKey || e.metaKey) || e.shiftKey; 
            const id = (Date.now() + Math.random()).toString(); 
            addAnnotation({ id, mode: activeMode, pageIndex: currentImageIndex, type: 'dot', x: currentPt.x, y: currentPt.y, number: nextNum, isElaboration }); 
        } 
    }
    setInteractionMode('none'); setDragSnapshot(null); setCreationDragCurrent(null); historyRefs.current.dragStartSnapshot = null;
  }, [interactionMode, dragSnapshot, getRelativePoint, currentStudent, currentImageIndex, historyRefs, sessionId, setHistory, editingAnnotationId, setStudents, currentStudentIndex, recordHistory, activeMode, addAnnotation, students]);

  return {
    zoom, setZoom,
    interactionMode, setInteractionMode,
    dragSnapshot, setDragSnapshot,
    creationDragCurrent, setCreationDragCurrent,
    editingAnnotationId, setEditingAnnotationId,
    newAnnotationId, setNewAnnotationId,
    selectedIds, setSelectedIds,
    selectionBox, setSelectionBox,
    canvasRef, scrollContainerRef,
    getRelativePoint, handleMouseDown, handleMouseMove, handleMouseUp,
  };
};
