import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CalendarCheck, ExternalLink, Loader2 } from 'lucide-react';
import { buildEventSsoUrl, getEventAppBaseUrl } from '@/utils/eventSso';
import { Button } from '@/components/ui/button';

export const EventSsoRedirect = ({ defaultPath }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(true);

  // Compute the target path for event-app
  const targetRedirectPath = useMemo(() => {
    if (defaultPath) return defaultPath;

    const pathname = location.pathname || '';
    if (pathname.startsWith('/events/add')) return '/events/add';
    if (pathname.startsWith('/events/calendar')) return '/events/calendar';
    if (pathname.startsWith('/events/types')) return '/events/types';
    if (pathname.startsWith('/events/inquiries')) return '/events/inquiries';
    if (pathname === '/events' || pathname === '/events/') return '/events/calendar';
    if (pathname.startsWith('/events/')) return pathname;

    return '/events/calendar';
  }, [location.pathname, defaultPath]);

  // Extract all existing URL search parameters and router state (e.g. lead conversion)
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
    return buildEventSsoUrl(targetRedirectPath, additionalParams);
  }, [targetRedirectPath, additionalParams]);

  const eventAppBaseUrl = useMemo(() => getEventAppBaseUrl(), []);

  useEffect(() => {
    // Perform seamless redirection
    const timer = setTimeout(() => {
      window.location.href = ssoUrl;
    }, 400);

    return () => clearTimeout(timer);
  }, [ssoUrl]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-16 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 relative">
          <CalendarCheck className="w-8 h-8" />
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </span>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Connecting to Event Module
        </h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Authenticating your session and securely transferring your credentials to the Event Management system...
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <a
            href={ssoUrl}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            Click here if not redirected
          </a>

          <a
            href={ssoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            <span>Open in New Tab</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100 w-full text-xs text-gray-400 flex items-center justify-between">
          <span>Target: {eventAppBaseUrl}</span>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-700 underline"
          >
            Cancel & Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventSsoRedirect;
