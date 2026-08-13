import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingCartBarProps } from '../types';
import { formatPrice } from '../utils';

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  cartItems,
  currency,
  activeTab,
  onViewCart,
}) => {
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AnimatePresence>
      {cartItems.length > 0 && activeTab !== 'cart-orders' && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-20 left-4 right-4 z-30 max-w-md mx-auto"
        >
          <button
            onClick={onViewCart}
            className="w-full bg-slate-950 hover:bg-slate-900 text-white py-3.5 px-5 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl flex items-center justify-between border border-slate-800 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="bg-amber-500 text-slate-950 font-black font-mono text-xs px-2.5 py-0.5 rounded-full flex items-center justify-center">
                {totalCount}
              </span>
              <span className="font-sans">View Basket</span>
            </div>
            <span className="font-mono font-black">{formatPrice(cartSubtotal, currency)}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
