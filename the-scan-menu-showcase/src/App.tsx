import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Cursor } from './components/layout/Cursor';
import { initLenis } from './utils/lenis';

// Pages
import { Home } from './pages/Home';
import { NfcPage } from './pages/NfcPage';
import { QrPage } from './pages/QrPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { IndustriesPage } from './pages/IndustriesPage';
import { PricingPage } from './pages/PricingPage';
import { ContactPage } from './pages/ContactPage';
import { InteractiveDemoPage } from './pages/InteractiveDemoPage';
import { ApiDocsPage } from './pages/ApiDocsPage';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export const App: React.FC = () => {
  useEffect(() => {
    initLenis();
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-[#050505] text-[#f4f4f5] flex flex-col relative selection:bg-amber-500/30 selection:text-amber-200">
        <Cursor />
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/demo" element={<InteractiveDemoPage />} />
            <Route path="/interactive-demo" element={<InteractiveDemoPage />} />
            <Route path="/products/nfc" element={<NfcPage />} />
            <Route path="/products/qr" element={<QrPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/industries" element={<IndustriesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/docs" element={<ApiDocsPage />} />
            <Route path="/api-docs" element={<ApiDocsPage />} />
            {/* Fallback route */}
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
