import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AlertProvider } from './context/AlertContext';
import { StreamProvider } from './context/StreamContext';
import { AppLayout } from './components/layout/AppLayout';

import { LandingPage } from './pages/LandingPage';
import { LiveMonitorPage } from './pages/LiveMonitorPage';
import { ZoneEditorPage } from './pages/ZoneEditorPage';
import { AlertHistoryPage } from './pages/AlertHistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { EmbedMonitorPage } from './pages/EmbedMonitorPage';

export function App() {
  return (
    <ThemeProvider>
      <AlertProvider>
        <StreamProvider>
          <BrowserRouter>
            <Routes>
              {/* Landing Page with full-width custom layout */}
              <Route path="/" element={<LandingPage />} />

              {/* Standalone Embed Route (No Sidebar/TopBar for iframes) */}
              <Route path="/embed" element={<EmbedMonitorPage />} />

              {/* Main App Dashboard Routes wrapped in AppLayout */}
              <Route element={<AppLayout />}>
                <Route path="/monitor" element={<LiveMonitorPage />} />
                <Route path="/zones" element={<ZoneEditorPage />} />
                <Route path="/zone-editor" element={<Navigate to="/zones" replace />} />
                <Route path="/alerts" element={<AlertHistoryPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/about" element={<AboutPage />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </StreamProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

export default App;

