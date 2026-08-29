import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { FloatingCartBarProps } from '../types';

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  cartItems,
  activeTab,
  onViewCart,
}) => {
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const x = useMotionValue(0);
  const [side, setSide] = useState<'right' | 'left'>('right');
  const buttonWidth = 64; // 64px = w-16
  const margin = 16; // 16px padding on each side

  const getTravelDistance = () => {
    if (typeof window === 'undefined') return 250;
    const screenWidth = window.innerWidth;
    const containerWidth = Math.min(screenWidth, 448);
    return Math.max(80, containerWidth - buttonWidth - margin * 2);
  };

  const [travelDistance, setTravelDistance] = useState(getTravelDistance);

  useEffect(() => {
    const handleResize = () => {
      const newTravel = getTravelDistance();
      setTravelDistance(newTravel);
      if (side === 'left') {
        x.set(-newTravel);
      } else {
        x.set(0);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [side, x]);

  if (cartItems.length === 0 || activeTab === 'cart-orders') {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed bottom-20 left-0 right-0 z-40 max-w-md mx-auto pointer-events-none px-4 flex justify-end">
        <motion.div
          style={{ x }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          drag="x"
          dragConstraints={{ left: -travelDistance, right: 0 }}
          dragElastic={0.05}
          onDragEnd={(_, info) => {
            const currentX = x.get();
            const midpoint = -travelDistance / 2;

            if (info.velocity.x > 250) {
              setSide('right');
              animate(x, 0, { type: 'spring', damping: 25, stiffness: 350 });
            } else if (info.velocity.x < -250) {
              setSide('left');
              animate(x, -travelDistance, { type: 'spring', damping: 25, stiffness: 350 });
            } else {
              if (currentX < midpoint) {
                setSide('left');
                animate(x, -travelDistance, { type: 'spring', damping: 25, stiffness: 350 });
              } else {
                setSide('right');
                animate(x, 0, { type: 'spring', damping: 25, stiffness: 350 });
              }
            }
          }}
          className="pointer-events-auto cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <button
            type="button"
            onClick={onViewCart}
            className="relative w-16 h-16 rounded-full bg-slate-950 text-white shadow-2xl border-2 border-amber-500 flex items-center justify-center hover:bg-slate-900 active:scale-95 transition-transform cursor-pointer"
            title="View Cart"
          >
            <ShoppingBag className="w-7 h-7 text-amber-400" strokeWidth={2.2} />

            {/* Badge for item count */}
            <span className="absolute -top-1 -right-1 min-w-[24px] h-[24px] px-1 rounded-full bg-amber-500 text-slate-950 font-black font-mono text-xs flex items-center justify-center shadow-md border-2 border-slate-950">
              {totalCount}
            </span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
