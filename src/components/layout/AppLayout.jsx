import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AlertBanner } from './AlertBanner';
import { ToastContainer } from '../common/Toast';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      {/* Red Alert Banner on DANGER */}
      <AlertBanner />

      {/* Floating real-time alert toasts */}
      <ToastContainer />

      <div className="flex flex-1">
        {/* Dark Navy Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Content Area with dynamic left margin on lg screens */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

