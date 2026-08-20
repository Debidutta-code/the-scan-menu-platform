import React, { useRef, useState } from 'react';

interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export const Magnetic: React.FC<MagneticProps> = ({ children, className = '', strength = 0.35 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    // Calculate displacement (capped to max 12px for subtle premium feel)
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    const clampedX = Math.max(-12, Math.min(12, deltaX));
    const clampedY = Math.max(-12, Math.min(12, deltaY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-300 ease-out inline-block ${className}`}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0px)`,
      }}
    >
      {children}
    </div>
  );
};
