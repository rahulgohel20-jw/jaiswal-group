import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';

export function AccessDenied({ pageTitle = 'This Page' }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-5 shadow-sm border border-red-100">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 mb-3 uppercase tracking-wider">
        403 Access Denied
      </span>

      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        Permission Required
      </h2>

      <p className="text-sm text-gray-500 max-w-md mb-8 leading-relaxed">
        You do not have permission to view <span className="font-semibold text-gray-700">{pageTitle}</span>.
        Please contact your administrator if you believe this is an error.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#084E92] text-white text-sm font-medium hover:bg-[#063d73] transition cursor-pointer shadow-sm"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}

export default AccessDenied;
