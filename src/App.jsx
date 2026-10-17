import React, { useState, useEffect } from 'react';
import CalendarPage from './pages/CalendarPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { PublicBookingPage } from './pages/client/PublicBookingPage.jsx';
import SalesPortal from './pages/sales/SalesPortal.jsx';
import { notificationService } from './services/notificationService.js';
import OfflineBanner from './components/common/OfflineBanner.jsx';
import { autoDiscoverServer } from './services/discoveryService.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';

export default function App() {
  const clientDemo = window.__CLIENT_DEMO__ === true;
  const [demoReady, setDemoReady] = useState(!clientDemo);
  useEffect(() => {
    if (!clientDemo) return;
    fetch('/api/public/demo-session', {credentials:'same-origin'}).then(res=>res.json()).then(data=>{
      if (data.client) localStorage.setItem('gentize_client_auth',JSON.stringify(data.client));
      else localStorage.removeItem('gentize_client_auth');
    }).catch(()=>localStorage.removeItem('gentize_client_auth')).finally(()=>setDemoReady(true));
  }, [clientDemo]);
  // Support URL query ?portal=sales, ?portal=admin, or ?mode=book for direct deep linking
  const [currentPortal, setCurrentPortal] = useState(() => {
    if (clientDemo) return 'client';
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal') === 'sales') return 'sales';
    if (params.get('portal') === 'news') return 'admin';
    if (params.get('portal') === 'admin' || window.location.pathname.startsWith('/admin')) {
      return 'admin';
    }
    if (params.get('mode') === 'book' || window.location.pathname.startsWith('/book')) {
      return 'client';
    }
    return 'user';
  });

  useEffect(() => {
    const syncPortal = () => {
      if (clientDemo) {setCurrentPortal('client');return;}
      const params = new URLSearchParams(window.location.search);
      setCurrentPortal(
        params.get('portal') === 'sales'
          ? 'sales'
          : params.get('portal') === 'news'
          ? 'admin'
          : params.get('portal') === 'admin' || window.location.pathname.startsWith('/admin')
          ? 'admin'
          : params.get('mode') === 'book' || window.location.pathname.startsWith('/book')
          ? 'client'
          : 'user'
      );
    };
    window.addEventListener('popstate', syncPortal);

    // Initialize native notification channel & permission prompt on app startup
    notificationService.ensureNotificationChannel().catch(() => {});
    notificationService.requestDevicePermission().catch(() => {});

    // Automatically locate and connect to laptop backend on any Wi-Fi
    autoDiscoverServer().catch(() => {});

    return () => window.removeEventListener('popstate', syncPortal);
  }, []);

  // Sync state with URL without full page reload
  const handleSwitchPortal = (portal) => {
    if (clientDemo) return;
    setCurrentPortal(portal);
    const url = new URL(window.location.href);
    if (portal === 'sales') {
      url.searchParams.set('portal', 'sales');
      url.searchParams.delete('mode');
    } else if (portal === 'news') {
      url.searchParams.set('portal', 'admin');
      url.searchParams.delete('mode');
      setCurrentPortal('admin');
    } else if (portal === 'admin') {
      url.searchParams.set('portal', 'admin');
      url.searchParams.delete('mode');
    } else if (portal === 'client') {
      url.searchParams.set('mode', 'book');
      url.searchParams.delete('portal');
    } else {
      url.searchParams.delete('portal');
      url.searchParams.delete('mode');
    }
    window.history.pushState({}, '', url.toString());
  };

  if (!demoReady) return <div className="p-6 text-center text-slate-500">Loading client portal…</div>;
  return (
    <ErrorBoundary>
      <div className="relative min-h-screen bg-[#F8FAFC]">
        <OfflineBanner />
        {currentPortal === 'sales' && (
          <SalesPortal
            onSwitchPortal={handleSwitchPortal}
          />
        )}
        {/* Render Active Portal View */}
        {currentPortal === 'user' && (
          <CalendarPage
            onSwitchPortal={handleSwitchPortal}
          />
        )}

        {currentPortal === 'admin' && (
          <AdminPage
            onSwitchPortal={handleSwitchPortal}
            onOpenClient={() => handleSwitchPortal('client')}
          />
        )}

        {currentPortal === 'client' && (
          <PublicBookingPage
            clientOnly={clientDemo}
            onBackToPortal={() => handleSwitchPortal('user')}
            onSwitchPortal={handleSwitchPortal}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}



