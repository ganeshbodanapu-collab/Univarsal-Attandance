import React, { useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { AttendanceProvider } from './context/AttendanceContext';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';

function handleDeepLinkUrl(rawUrl: string, navigate: (path: string, opts?: any) => void) {
  if (!rawUrl) return;
  console.log('[DeepLink] Processing URL:', rawUrl);

  try {
    // 1. Direct URL parsing
    let urlObj: URL | null = null;
    try {
      urlObj = new URL(rawUrl);
    } catch {
      // Fallback for custom scheme or invalid URL string format
      if (rawUrl.includes('/auth/approved')) {
        const queryIdx = rawUrl.indexOf('?');
        const search = queryIdx !== -1 ? rawUrl.substring(queryIdx) : '';
        navigate(`/auth/approved${search}`, { replace: true });
        return;
      }
    }

    if (urlObj) {
      const pathname = urlObj.pathname || '';
      const search = urlObj.search || '';

      if (pathname.includes('/auth/approved') || rawUrl.includes('approved')) {
        const req = urlObj.searchParams.get('request');
        const tok = urlObj.searchParams.get('token');
        if (req && tok) {
          navigate(`/auth/approved?request=${encodeURIComponent(req)}&token=${encodeURIComponent(tok)}`, { replace: true });
        } else {
          navigate(`/auth/approved${search}`, { replace: true });
        }
      }
    }
  } catch (err) {
    console.warn('[DeepLink] Error handling URL:', err);
  }
}

const CapacitorDeepLinkHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let listenerHandler: any;

    async function initDeepLinkListeners() {
      try {
        // A. COLD START Launch URL Handling (App was completely closed)
        const launchUrl = await CapApp.getLaunchUrl();
        if (launchUrl && launchUrl.url) {
          console.log('[DeepLink] Cold Start Launch URL:', launchUrl.url);
          handleDeepLinkUrl(launchUrl.url, navigate);
        }

        // B. Background & Active App URL Listener
        listenerHandler = await CapApp.addListener('appUrlOpen', (data) => {
          console.log('[DeepLink] App URL Open Event:', data.url);
          handleDeepLinkUrl(data.url, navigate);
        });
      } catch (err) {
        console.info('[DeepLink] Capacitor App plugin inactive (Web mode)');
      }
    }

    initDeepLinkListeners();

    return () => {
      if (listenerHandler && typeof listenerHandler.remove === 'function') {
        listenerHandler.remove();
      }
    };
  }, [navigate]);

  return null;
};

function App() {
  return (
    <BrowserRouter>
      <CapacitorDeepLinkHandler />
      <AuthProvider>
        <AttendanceProvider>
          <AppRoutes />
        </AttendanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
