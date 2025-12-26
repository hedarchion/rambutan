
import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, CornerDownRight, Stamp } from 'lucide-react';
import { GradingMode, Student, Annotation, Point, ErrorCode, Rect } from '../types';
import { InteractionMode, DragSnapshot, ResizeHandle } from '../hooks/useAnnotationCanvas';
import { ERROR_CODES } from '../constants';

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

const ELABORATION_COLOR = '#34d399';

interface AnnotationEditorProps {
    ann: Annotation;
    availableCodes: ErrorCode[];
    onUpdate: (updates: Partial<Annotation>) => void;
    onDelete: () => void;
    onClose: () => void;
    isNew: boolean;
    zoom: number;
    canvasRef: React.RefObject<HTMLDivElement | null>;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({ 
    ann, 
    availableCodes, 
    onUpdate, 
    onDelete, 
    onClose,
    isNew,
    zoom,
    canvasRef,
    scrollContainerRef
}) => {
    const boxRef = useRef<HTMLDivElement>(null);
    const activeColor = MODE_COLORS[ann.mode];
    const showCodeGrid = ann.type === 'rect' && availableCodes.length > 0 && !ann.code;

    useLayoutEffect(() => {
      const updatePosition = () => {
         if (!boxRef.current || !canvasRef.current) return;
         const canvasRect = canvasRef.current.getBoundingClientRect();
         const annX = ann.type === 'rect' ? (ann.rects?.[0]?.x || 0) : (ann.x || 0);
         const annY = ann.type === 'rect' ? (ann.rects?.[0]?.y || 0) : (ann.y || 0);
         const annHeightNorm = ann.type === 'rect' ? (ann.rects?.[0]?.height || 0) : 0;
         
         const screenX = canvasRect.left + (annX * canvasRect.width);
         const screenY = canvasRect.top + (annY * canvasRect.height);
         const screenH = annHeightNorm * canvasRect.height;
         
         const boxRect = boxRef.current.getBoundingClientRect();
         const spaceBelow = window.innerHeight - (screenY + screenH);
         const spaceNeeded = boxRect.height + 20;
         const shouldFlip = spaceBelow < spaceNeeded;
         
         const left = screenX;
         const offset = ann.type === 'rect' ? 12 : 24;
         const top = shouldFlip ? screenY - 10 - boxRect.height : screenY + screenH + offset;
            
         boxRef.current.style.left = `${left}px`;
         boxRef.current.style.top = `${top}px`;
      };
      updatePosition();
      const scrollContainer = scrollContainerRef.current;
      window.addEventListener('resize', updatePosition);
      if (scrollContainer) scrollContainer.addEventListener('scroll', updatePosition);
      return () => {
          window.removeEventListener('resize', updatePosition);
          if (scrollContainer) scrollContainer.addEventListener('scroll', updatePosition);
      };
    }, [ann, zoom, availableCodes.length, ann.code, canvasRef, scrollContainerRef]);

    useEffect(() => {
        if (showCodeGrid && boxRef.current) boxRef.current.focus();
    }, [showCodeGrid]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault(); e.stopPropagation();
            if (isNew) onDelete(); else onClose();
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); e.stopPropagation();
            onClose();
        }
    };

    return createPortal(
        <div ref={boxRef} tabIndex={-1} className="fixed z-[9999] pointer-events-auto outline-none" style={{ left: 0, top: 0 }} onMouseDown={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
            <div className={`bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-2 ring-1 ring-black/50 ${showCodeGrid ? 'w-[240px]' : 'w-[240px]'}`}>
                {showCodeGrid ? (
                    <div>
                        <div className="flex items-center justify-between px-1 mb-2">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Select Code</span>
                            <span className="text-[8px] font-bold text-zinc-600">ESC to cancel</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                            {availableCodes.map(c => (
                                <button 
                                    key={c.code} 
                                    onClick={() => onUpdate({ code: c.code })} 
                                    title={c.label}
                                    className="flex flex-col items-center justify-center h-12 rounded-lg bg-zinc-800/40 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-none group/btn relative overflow-hidden"
                                >
                                    <span className="text-[10px] leading-none" style={{ color: activeColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>{c.code}</span>
                                    <span className="text-[7px] font-bold text-zinc-600 group-hover/btn:text-zinc-500 truncate w-full px-1 text-center mt-1 uppercase tracking-tighter">{c.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/5 text-center">
                            <button type="button" onClick={() => isNew ? onDelete() : onClose()} className="text-[9px] font-bold text-zinc-600 hover:text-white transition-colors">CANCEL</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {ann.type === 'rect' && availableCodes.length > 0 && (
                            <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                <div className="flex items-center space-x-2">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md border shadow-sm" style={{ color: activeColor, backgroundColor: `${activeColor}15`, borderColor: `${activeColor}30`, fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>{ann.code}</span>
                                    <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[100px]">{availableCodes.find(c => c.code === ann.code)?.label}</span>
                                </div>
                                <button onClick={() => onUpdate({ code: undefined })} className="text-[8px] font-black text-zinc-600 hover:text-white px-1.5 py-0.5 hover:bg-zinc-800 rounded uppercase">Change</button>
                            </div>
                        )}
                        {ann.type === 'rect' && availableCodes.length > 0 && (
                            <div className="relative group">
                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600 group-focus-within:text-emerald-500 transition-colors"><CornerDownRight size={10} /></div>
                                <input 
                                    className="w-full text-[11px] pl-7 pr-2 py-1.5 rounded-xl bg-black/40 border border-transparent focus:border-emerald-500/50 text-emerald-100 focus:ring-1 focus:ring-emerald-500/50 outline-none placeholder-zinc-800 font-medium" 
                                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}
                                    placeholder="Correction..." 
                                    value={ann.correction || ''} 
                                    onChange={(e) => onUpdate({ correction: e.target.value })} 
                                    autoFocus 
                                />
                            </div>
                        )}
                        {ann.type === 'stamp' && (
                            <div className="px-1 py-1 text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-rose-500/20 mb-1">
                                <Stamp size={10}/> Mark Stamp
                            </div>
                        )}
                        <div className="relative">
                            <textarea 
                                className="w-full text-[11px] p-2.5 rounded-xl bg-black/40 border border-transparent focus:border-zinc-700 text-zinc-200 focus:ring-1 focus:ring-zinc-700 outline-none min-h-[60px] placeholder-zinc-800 resize-none leading-relaxed custom-scrollbar" 
                                placeholder="Add a comment..." 
                                value={ann.text || ''} 
                                onChange={(e) => onUpdate({ text: e.target.value })} 
                            />
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[9px] font-bold text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded-lg flex items-center transition-none"><Trash2 size={10} className="mr-1.5"/>DELETE</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-[9px] font-black tracking-wide text-zinc-950 bg-white hover:bg-zinc-200 px-3 py-1 rounded-lg shadow-lg transition-none uppercase">Done</button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export interface AnnotationCanvasProps {
  currentStudent: Student | undefined;
  currentImageIndex: number;
  displayImageSrc: string | undefined;
  
  zoom: number;
  interactionMode: InteractionMode;
  dragSnapshot: DragSnapshot | null;
  creationDragCurrent: Point | null;
  editingAnnotationId: string | null;
  newAnnotationId: string | null;
  selectedIds: string[];
  selectionBox: Rect | null;
  canvasRef: React.RefObject<HTMLDivElement>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  getRelativePoint: (e: React.MouseEvent) => Point;
  handleMouseDown: (e: React.MouseEvent, annotationId?: string, rectIndex?: number, handle?: ResizeHandle) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: (e: React.MouseEvent) => void;
  
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  setEditingAnnotationId: (id: string | null) => void;
  setNewAnnotationId: (id: string | null) => void;
  
  enhanceMode: boolean;
  processedCache: Record<string, string>;
  activeMode: GradingMode;
  sessionId: string | null;
  graderName?: string;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  currentStudent,
  currentImageIndex,
  displayImageSrc,
  zoom,
  interactionMode,
  dragSnapshot,
  creationDragCurrent,
  editingAnnotationId,
  newAnnotationId,
  selectedIds,
  selectionBox,
  canvasRef,
  scrollContainerRef,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  updateAnnotation,
  deleteAnnotation,
  setEditingAnnotationId,
  setNewAnnotationId,
  enhanceMode,
  processedCache,
  activeMode,
  sessionId,
  graderName
}) => {
  return (
    <div ref={scrollContainerRef as any} className="flex-1 bg-zinc-900 overflow-auto relative cursor-crosshair select-none flex flex-col items-center justify-start p-8 pb-32" onMouseDown={(e) => handleMouseDown(e)} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onContextMenu={(e) => e.preventDefault()}>
        <div 
            className="relative shadow-[0_0_100px_-20px_rgba(0,0,0,0.7)] origin-top transition-transform duration-75" 
            style={{ transform: `scale(${zoom})`, width: '800px' }}
        >
            <div ref={canvasRef as any} className="relative w-full overflow-hidden bg-white">
            {displayImageSrc ? <img src={displayImageSrc} className="w-full h-auto block select-none pointer-events-none" draggable={false} /> : <div className="w-full h-[1000px] flex items-center justify-center bg-zinc-100 text-zinc-400 font-medium">Loading Page...</div>}
            
            {currentStudent?.annotations.filter(a => a.pageIndex === currentImageIndex).map((ann) => {
                const isEditing = editingAnnotationId === ann.id;
                const isSelected = selectedIds.includes(ann.id);
                const isMoving = interactionMode === 'moving' && dragSnapshot?.annotationId === ann.id;
                const color = (ann.mode === 'content' && ann.isElaboration) ? ELABORATION_COLOR : MODE_COLORS[ann.mode];
                
                if (ann.type === 'dot') {
                    let label = ann.number?.toString() || '?';
                    if (ann.number) {
                        const siblings = currentStudent.annotations.filter(a => a.mode === ann.mode && a.number === ann.number && a.type === 'dot').sort((a, b) => parseInt(a.id) - parseInt(b.id));
                        const subIndex = siblings.findIndex(s => s.id === ann.id);
                        if (subIndex > 0) label = `${ann.number}${String.fromCharCode(96 + subIndex)}`;
                    }
                    return (
                        <div key={ann.id} onMouseDown={(e) => handleMouseDown(e, ann.id)} className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-30 transition-all ${isMoving ? 'transition-none duration-0' : ''} ${isEditing ? 'z-50 scale-125' : isSelected ? 'z-40 scale-110' : 'hover:scale-110'}`} style={{ left: `${ann.x! * 100}%`, top: `${ann.y! * 100}%` }}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] leading-none shadow-lg ring-1 ring-white/50 cursor-pointer border-2 border-white transition-all font-bold ${isEditing ? 'shadow-[0_0_15px_rgba(255,255,255,0.4)]' : isSelected ? 'ring-rose-500 ring-4' : ''}`} style={{ backgroundColor: color, color: 'white', fontFamily: 'sans-serif' }}>
                                {label}
                            </div>
                        </div>
                    );
                } else if (ann.type === 'rect' && ann.rects) {
                    return (
                        <React.Fragment key={ann.id}>
                        {ann.rects.map((r, rIdx) => (
                            <div 
                              key={`${ann.id}-${rIdx}`} 
                              onMouseDown={(e) => handleMouseDown(e, ann.id, rIdx)} 
                              className={`absolute group transition-all mix-blend-multiply ${isMoving ? 'transition-none duration-0' : ''} ${isEditing ? 'z-20 ring-2' : isSelected ? 'z-40 ring-4 ring-rose-500 shadow-xl' : 'z-10 hover:ring-1 opacity-80 hover:opacity-100'}`} 
                              style={{ 
                                left: `${r.x * 100}%`, 
                                top: `${r.y * 100}%`, 
                                width: `${r.width * 100}%`, 
                                height: `${r.height * 100}%`, 
                                backgroundColor: `${color}25`, 
                                '--tw-ring-color': isSelected ? '#f43f5e' : color,
                                boxShadow: isEditing ? `0 0 10px ${color}40` : 'none'
                              } as React.CSSProperties}
                            >
                            {isEditing && (
                                <>
                                    <div onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, ann.id, rIdx, 'nw'); }} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 rounded-full cursor-nw-resize z-50 shadow-sm" style={{ borderColor: color }}></div>
                                    <div onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, ann.id, rIdx, 'se'); }} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 rounded-full cursor-se-resize z-50 shadow-sm" style={{ borderColor: color }}></div>
                                </>
                            )}
                            {rIdx === 0 && (
                                <>
                                    {/* Error Code: Vertical on Left Side */}
                                    <div className="absolute top-0 right-full h-full flex items-center pr-0.5 pointer-events-none z-50 mix-blend-normal">
                                        <div className="px-0.5 py-1 rounded-sm text-[7px] text-white uppercase shadow-sm flex flex-col items-center justify-center" style={{ backgroundColor: color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>
                                            {(ann.code || MODE_LABELS[ann.mode]).split('').map((char, i) => (
                                                <span key={i} className="leading-none">{char}</span>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Correction: On Top, perching right on the edge */}
                                    {ann.correction && (
                                        <div className="absolute bottom-full left-0 mb-0 pointer-events-none z-50 mix-blend-normal">
                                            <span 
                                                className="text-[9px] px-1 italic leading-none whitespace-nowrap"
                                                style={{ 
                                                    textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 0 1px 0 #fff, 0 -1px 0 #fff, 1px 0 0 #fff, -1px 0 0 #fff',
                                                    color: color,
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    fontWeight: 800
                                                }}
                                            >
                                                {ann.correction}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                            </div>
                        ))}
                        </React.Fragment>
                    );
                } else if (ann.type === 'stamp' && ann.stampData) {
                    return (
                        <div 
                            key={ann.id} 
                            onMouseDown={(e) => handleMouseDown(e, ann.id)}
                            className={`absolute z-30 transition-all cursor-move group ${isMoving ? 'transition-none duration-0' : ''} ${isEditing ? 'ring-2 ring-rose-500 scale-105 z-40 shadow-2xl' : isSelected ? 'ring-4 ring-rose-500 shadow-xl z-40' : 'hover:scale-105'}`}
                            style={{ left: `${ann.x! * 100}%`, top: `${ann.y! * 100}%` }}
                        >
                            <div className="bg-white border-2 border-rose-700/80 rounded-lg shadow-xl p-2.5 min-w-[120px] select-none flex flex-col gap-1.5" style={{ transform: 'rotate(-2deg)' }}>
                                <div className="space-y-0.5 font-mono text-[9px] font-black text-rose-700 uppercase leading-none">
                                    <div className="flex justify-between gap-4"><span>C:</span> <span>{ann.stampData.scores.content}/5</span></div>
                                    <div className="flex justify-between gap-4"><span>CA:</span> <span>{ann.stampData.scores.communicative}/5</span></div>
                                    <div className="flex justify-between gap-4"><span>O:</span> <span>{ann.stampData.scores.organisation}/5</span></div>
                                    <div className="flex justify-between gap-4"><span>L:</span> <span>{ann.stampData.scores.language}/5</span></div>
                                </div>
                                <div className="border-t-2 border-rose-700/30 pt-1 flex items-baseline justify-between">
                                    <span className="text-[20px] font-black text-rose-700 leading-none">{ann.stampData.total}</span>
                                    <span className="text-[9px] font-black text-rose-700/60 tracking-tighter">/20</span>
                                </div>
                                <div className="text-[6px] font-bold text-rose-700/50 uppercase leading-none mt-1 space-y-0.5">
                                    <div>Graded by {ann.stampData.grader}</div>
                                    <div>{ann.stampData.date}</div>
                                </div>
                                {isEditing && <div className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg group-hover:scale-110 transition-transform"><Stamp size={10} /></div>}
                            </div>
                        </div>
                    );
                }
                return null;
            })}

            {interactionMode === 'creating' && creationDragCurrent && dragSnapshot && (
                <div className="absolute border-2 border-dashed bg-white/10 pointer-events-none z-50 mix-blend-difference" style={{ borderColor: 'white', left: `${Math.min(dragSnapshot.startPoint.x, creationDragCurrent.x) * 100}%`, top: `${Math.min(dragSnapshot.startPoint.y, creationDragCurrent.y) * 100}%`, width: `${Math.abs(creationDragCurrent.x - dragSnapshot.startPoint.x) * 100}%`, height: `${Math.abs(creationDragCurrent.y - dragSnapshot.startPoint.y) * 100}%` }}></div>
            )}

            {interactionMode === 'selecting' && selectionBox && (
              <div 
                className="absolute border-2 border-rose-500 bg-rose-500/10 pointer-events-none z-50" 
                style={{ 
                  left: `${selectionBox.x * 100}%`, 
                  top: `${selectionBox.y * 100}%`, 
                  width: `${selectionBox.width * 100}%`, 
                  height: `${selectionBox.height * 100}%` 
                }}
              ></div>
            )}
            </div>
        </div>

        {editingAnnotationId && (() => {
            const editingAnn = currentStudent?.annotations.find(a => a.id === editingAnnotationId);
            if (!editingAnn || editingAnn.pageIndex !== currentImageIndex || editingAnn.type === 'stamp') return null;
            return (
            <AnnotationEditor 
                key={editingAnn.id} 
                ann={editingAnn} 
                availableCodes={ERROR_CODES.filter(e => e.mode === editingAnn.mode)} 
                onUpdate={(upd) => updateAnnotation(editingAnn.id, upd)} 
                onDelete={() => deleteAnnotation(editingAnn.id)} 
                onClose={() => { setEditingAnnotationId(null); setNewAnnotationId(null); }} 
                isNew={editingAnnotationId === newAnnotationId} 
                zoom={zoom} 
                canvasRef={canvasRef as any} 
                scrollContainerRef={scrollContainerRef as any} 
            />
            );
        })()}
    </div>
  );
};
