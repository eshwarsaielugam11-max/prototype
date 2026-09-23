import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NavBar, Footer } from './components/layout';
import { Home } from './pages/Home';
import { Record } from './pages/Record';
import { Upload } from './pages/Upload';
import { Result } from './pages/Result';
import { Report } from './pages/Report';
import { History } from './pages/History';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-bg-void text-ink font-body selection:bg-signal-gold/20 selection:text-signal-gold">
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/record" element={<Record />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/result" element={<Result />} />
          <Route path="/result/:id" element={<Result />} />
          <Route path="/report" element={<Report />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
