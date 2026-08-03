import { useEffect } from 'react';

export interface WhiteLabelConfig {
  enabled?: boolean;
  customDomain?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  hidePoweredBy?: boolean;
  customCss?: string;
}

export function useWhiteLabelTheme(config?: WhiteLabelConfig) {
  useEffect(() => {
    if (!config || !config.enabled) return;

    const root = document.documentElement;

    // Set CSS custom properties
    if (config.primaryColor) {
      root.style.setProperty('--brand-primary', config.primaryColor);
    }
    if (config.secondaryColor) {
      root.style.setProperty('--brand-secondary', config.secondaryColor);
    }
    if (config.backgroundColor) {
      root.style.setProperty('--brand-bg', config.backgroundColor);
    }
    if (config.textColor) {
      root.style.setProperty('--brand-text', config.textColor);
    }
    if (config.fontFamily) {
      root.style.setProperty('--brand-font', config.fontFamily);
    }

    // Dynamic Google Font Injection
    let fontLink: HTMLLinkElement | null = null;
    if (config.fontFamily) {
      const formattedFontName = config.fontFamily.replace(/\s+/g, '+');
      fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(fontLink);
    }

    // Dynamic Favicon Injection
    let originalFaviconHref: string | null = null;
    const faviconElement = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (config.faviconUrl) {
      if (faviconElement) {
        originalFaviconHref = faviconElement.href;
        faviconElement.href = config.faviconUrl;
      } else {
        const newFavicon = document.createElement('link');
        newFavicon.rel = 'shortcut icon';
        newFavicon.href = config.faviconUrl;
        document.head.appendChild(newFavicon);
      }
    }

    // Dynamic Custom CSS Style Injection
    let customStyleTag: HTMLStyleElement | null = null;
    if (config.customCss) {
      customStyleTag = document.createElement('style');
      customStyleTag.id = 'white-label-custom-css';
      customStyleTag.innerHTML = config.customCss;
      document.head.appendChild(customStyleTag);
    }

    return () => {
      // Cleanup CSS properties
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-secondary');
      root.style.removeProperty('--brand-bg');
      root.style.removeProperty('--brand-text');
      root.style.removeProperty('--brand-font');

      if (fontLink && fontLink.parentNode) {
        fontLink.parentNode.removeChild(fontLink);
      }

      if (faviconElement && originalFaviconHref) {
        faviconElement.href = originalFaviconHref;
      }

      if (customStyleTag && customStyleTag.parentNode) {
        customStyleTag.parentNode.removeChild(customStyleTag);
      }
    };
  }, [config]);
}
