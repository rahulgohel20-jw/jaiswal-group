import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ExternalLink, Loader2, Store } from 'lucide-react';
import { buildPosSsoUrl, getPosAppBaseUrl } from '@/utils/posSso';

export const PosSsoRedirect = ({ defaultPath }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Compute the target path for jaiswal-pos
  const targetRedirectPath = useMemo(() => {
    if (defaultPath) return defaultPath;

    const pathname = location.pathname || '';
    if (pathname.startsWith('/pos/production')) return '/production';
    if (pathname.startsWith('/pos/statistics')) return '/statistics';
    if (pathname.startsWith('/pos/menu')) return '/menu';
    if (pathname.startsWith('/pos/purchase')) return '/purchase';
    if (pathname === '/pos' || pathname === '/pos/') return '/';
    if (pathname.startsWith('/pos/')) {
      return pathname.replace(/^\/pos/, '') || '/';
    }

    return '/';
  }, [location.pathname, defaultPath]);

  // Extract all existing URL search parameters and router state
  const additionalParams = useMemo(() => {
    const params = {};
    if (location.search) {
      const searchParams = new URLSearchParams(location.search);
      for (const [key, val] of searchParams.entries()) {
        params[key] = val;
      }
    }

    if (location.state && typeof location.state === 'object') {
      Object.entries(location.state).forEach(([k, v]) => {
        if (v !== undefined && v !== null && typeof v !== 'object') {
          params[k] = v;
        }
      });
    }

    return params;
  }, [location.search, location.state]);

  const ssoUrl = useMemo(() => {
    return buildPosSsoUrl(targetRedirectPath, additionalParams);
  }, [targetRedirectPath, additionalParams]);

  const posAppBaseUrl = useMemo(() => getPosAppBaseUrl(), []);

  useEffect(() => {
    // Perform seamless immediate redirection without prompting for credentials
    const timer = setTimeout(() => {
      window.location.href = ssoUrl;
    }, 400);

    return () => clearTimeout(timer);
  }, [ssoUrl]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-16 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 relative">
          <Store className="w-8 h-8" />
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </span>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Connecting to Jaiswal POS
        </h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Redirecting to Jaiswal POS terminal. Opening automatically without credentials.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <a
            href={ssoUrl}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Click here if not redirected
          </a>

          <a
            href={ssoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <span>Open in New Tab</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100 w-full text-xs text-gray-400 flex items-center justify-between">
          <span>Target: {posAppBaseUrl}</span>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-700 underline cursor-pointer"
          >
            Cancel & Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosSsoRedirect;
