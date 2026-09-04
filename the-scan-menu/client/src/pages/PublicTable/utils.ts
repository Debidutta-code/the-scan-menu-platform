// ==========================================
// HELPERS / UTILITY FUNCTIONS
// ==========================================

/**
 * Dynamically loads the Razorpay checkout script.
 * Returns true on success, false on failure.
 */
export const loadRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Formats an amount stored in the smallest currency unit (paise)
 * into a human-readable currency string.
 */
export const formatPrice = (amountInPaise: number, currency: string): string => {
  const amount = amountInPaise / 100;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formats a seconds count into a MM:SS or Xs cooldown string.
 */
export const formatCooldown = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  }
  return `${secs}s`;
};

/**
 * Returns a promotional badge label for a menu item based on its index
 * and price, used for visual fidelity on menu cards.
 */
export const getItemBadge = (item: { price: number; isChefsSpecial?: boolean; isTopPick?: boolean }, idx: number): string | null => {
  if (item.isChefsSpecial) return null; // Handled with dedicated Chef Special badge
  if (item.isTopPick) return null; // Handled with dedicated Top Pick badge
  if (idx % 7 === 0) return 'Bestseller';
  if (item.price > 35000) return 'Popular';
  if (idx % 4 === 0) return 'New';
  return null;
};
