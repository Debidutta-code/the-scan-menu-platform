import React, { useEffect, useState } from 'react';

export const Cursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [cursorText, setCursorText] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });

      // Check if mouse is over interactive target with data-cursor attribute
      const target = e.target as HTMLElement | null;
      const interactiveEl = target?.closest('[data-cursor]') as HTMLElement | null;
      
      if (interactiveEl) {
        const text = interactiveEl.getAttribute('data-cursor') || '';
        setCursorText(text);
        setIsHovered(true);
      } else {
        setCursorText('');
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 pointer-events-none z-50 transition-transform duration-75 ease-out hidden md:flex items-center justify-center rounded-full ${
        isHovered
          ? 'bg-amber-400/90 text-black px-4 py-2 text-xs font-bold shadow-lg shadow-amber-500/20 scale-110'
          : 'w-6 h-6 border-2 border-amber-400/60 bg-amber-400/10 backdrop-blur-[1px]'
      }`}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0px) translate(-50%, -50%)`,
      }}
    >
      {cursorText}
    </div>
  );
};
