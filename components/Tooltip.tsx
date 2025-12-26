import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    setShow(true);
  };

  return (
    <>
      <div className="relative flex items-center" onMouseEnter={handleMouseEnter} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && createPortal(
        <div 
          className="fixed z-[10000] px-2 py-1 text-[10px] font-bold text-zinc-100 bg-zinc-800 border border-zinc-700 rounded shadow-xl whitespace-nowrap pointer-events-none transform -translate-x-1/2" 
          style={{ top: pos.top, left: pos.left }}
        >
          {content}
        </div>, 
        document.body
      )}
    </>
  );
};