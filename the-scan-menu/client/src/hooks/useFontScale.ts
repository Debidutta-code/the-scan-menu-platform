import { useState, useEffect, useCallback } from 'react';

export type FontScale = 'SMALL' | 'NORMAL' | 'LARGE';

export function useFontScale() {
  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manager_font_scale');
      if (saved === 'SMALL' || saved === 'NORMAL' || saved === 'LARGE') {
        return saved;
      }
    }
    return 'NORMAL';
  });

  const setFontScale = useCallback((scale: FontScale) => {
    setFontScaleState(scale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('manager_font_scale', scale);
      const root = document.documentElement;
      root.classList.remove('font-scale-small', 'font-scale-normal', 'font-scale-large');
      if (scale === 'SMALL') root.classList.add('font-scale-small');
      else if (scale === 'LARGE') root.classList.add('font-scale-large');
      else root.classList.add('font-scale-normal');

      window.dispatchEvent(new CustomEvent('fontScaleChanged', { detail: scale }));
    }
  }, []);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && (detail === 'SMALL' || detail === 'NORMAL' || detail === 'LARGE')) {
        setFontScaleState(detail);
      }
    };

    window.addEventListener('fontScaleChanged', handleSync);
    return () => window.removeEventListener('fontScaleChanged', handleSync);
  }, []);

  return { fontScale, setFontScale };
}
