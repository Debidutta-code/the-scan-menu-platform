import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker for automatic updates
registerSW({ immediate: true });

// Initialize saved font scale on startup
if (typeof window !== 'undefined') {
  const savedScale = localStorage.getItem('manager_font_scale');
  const root = document.documentElement;
  root.classList.remove('font-scale-small', 'font-scale-normal', 'font-scale-large');
  if (savedScale === 'SMALL') root.classList.add('font-scale-small');
  else if (savedScale === 'LARGE') root.classList.add('font-scale-large');
  else root.classList.add('font-scale-normal');
}

// Initialize the query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
