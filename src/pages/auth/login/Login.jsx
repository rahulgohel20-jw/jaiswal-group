import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  User,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { loginUser } from '@/services/apiServices';

export default function LoginPage() {
  const navigate = useNavigate();
  const { saveAuth, setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const e = {};
    if (!userCode.trim()) e.userCode = 'User Code is required';
    if (!password) e.password = 'Password is required';
    return e;
  };

  const finishLogin = (res) => {
    const payload = res?.data?.data ?? res?.data;
    if (!payload?.token) return;

    if (payload.token) {
      console.log('Storing auth token in localStorage:', payload.token);
      localStorage.setItem('authToken', payload.token);
    }

    saveAuth(payload);
    const user = payload?.user || payload?.data || payload;
    setUser(user);

    const next = searchParams.get('next');
    navigate(next || '/dashboard', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await loginUser({
        userCode: userCode.trim(),
        password,
        email: null,
        organizationId: null,
      });

      finishLogin(res);
    } catch (err) {
      console.error(err);
      const data = err?.response?.data;
      setSubmitError(
        data?.errorMessage ||
          data?.message ||
          (data?.msg && data.msg !== 'FAILED' && data.msg !== 'ERROR' ? data.msg : null) ||
          err?.message ||
          'Invalid credentials. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col lg:flex-row"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Left section — white background */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[420px] flex flex-col items-center justify-center">
          <img
            src={`${import.meta.env.BASE_URL}media/app/login_screen.jpg`}
            alt="Manage everything, everywhere"
            className="w-full h-auto"
          />
          <h1 className="text-[28px] font-bold text-[#0F2A4A] text-center mt-8 leading-snug">
            Manage Everything,
            <br />
            Everywhere.
          </h1>
          <p className="text-[#8B93A1] text-[13px] text-center mt-3 max-w-[320px] leading-relaxed">
            An industrial-grade solution designed for precision and scale in
            modern enterprise workflows.
          </p>
        </div>
      </div>

      {/* Right section — #F8F9FF background */}
      <div className="w-full lg:w-1/2 bg-[#F8F9FF] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[380px] bg-white rounded-2xl border border-[#EAECEF] shadow-[0_8px_30px_rgba(15,42,74,0.06)] p-8">
          <h2 className="text-[20px] font-bold text-[#0F2A4A] mb-1.5">
            Welcome Back
          </h2>
          <p className="text-[#8B93A1] text-[12.5px] leading-relaxed mb-6">
            Enter your credentials to access the super admin panel.
          </p>

          {/* {requiresOrgSelection && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[12px] text-blue-800">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Multiple accounts found for <strong>{email}</strong>. Please
                select an organization below to continue.
              </span>
            </div>
          )} */}

          {submitError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">
                User Code
              </label>
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 focus-within:border-[#1D4E89] transition-colors ${errors.userCode ? 'border-red-400' : 'border-[#E1E4E9]'}`}
              >
                <User className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                <input
                  type="text"
                  value={userCode}
                  onChange={(e) => {
                    setUserCode(e.target.value);
                    if (errors.userCode)
                      setErrors((prev) => ({ ...prev, userCode: undefined }));
                  }}
                  placeholder="Enter your user code"
                  className="flex-1 outline-none text-[13px] bg-transparent text-[#0F2A4A] placeholder:text-[#B3B9C4]"
                />
              </div>
              {errors.userCode && (
                <p className="text-[11px] text-red-500 mt-1">{errors.userCode}</p>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">
                Password
              </label>
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 focus-within:border-[#1D4E89] transition-colors ${errors.password ? 'border-red-400' : 'border-[#E1E4E9]'}`}
              >
                <Lock className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className="flex-1 outline-none text-[13px] bg-transparent text-[#0F2A4A] placeholder:text-[#B3B9C4]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-[#9AA3B2] hover:text-[#54607A] shrink-0"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-[15px] w-[15px]" />
                  ) : (
                    <Eye className="h-[15px] w-[15px]" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-red-500 mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end pt-1">
              <Link
                to="/auth/forgot-password"
                className="text-[12px] text-[#1D4E89] font-medium hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#0F2A4A] hover:bg-[#123256] cursor-pointer text-white text-[13.5px] font-semibold rounded-lg py-3 transition-colors mt-2 disabled:opacity-50"
            >
              {submitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="text-center text-[10.5px] text-[#B3B9C4] mt-6">
            © 2026 Jaiswal ERP All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
}