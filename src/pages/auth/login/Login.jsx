import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, IdCard, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { loginUser } from '@/services/apiServices';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();  
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState('');
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!EMAIL_REGEX.test(email)) e.email = 'Enter a valid email address';

    if (!password) e.password = 'Password is required';

    return e;
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
        email,
        organizationId: 1,
        password,
      });
      const token = res?.data?.data?.token ?? res?.data?.token;
      if (token) {
        localStorage.setItem('authToken', token);
      }
      const next = searchParams.get('next');
      navigate(next || '/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      setSubmitError(
        err?.response?.data?.errorMessage ||
          err?.response?.data?.msg ||
          'Invalid credentials. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Left section — white background */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[420px] flex flex-col items-center justify-center">
          <img
            src="/media/app/login_screen.jpg"
            alt="Manage everything, everywhere"
            className="w-full h-auto"
          />
          <h1 className="text-[28px] font-bold text-[#0F2A4A] text-center mt-8 leading-snug">
            Manage Everything,
            <br />
            Everywhere.
          </h1>
          <p className="text-[#8B93A1] text-[13px] text-center mt-3 max-w-[320px] leading-relaxed">
            An industrial-grade solution designed for precision and scale in modern
            enterprise workflows.
          </p>
        </div>
      </div>

      {/* Right section — #F8F9FF background */}
      <div className="w-full lg:w-1/2 bg-[#F8F9FF] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[380px] bg-white rounded-2xl border border-[#EAECEF] shadow-[0_8px_30px_rgba(15,42,74,0.06)] p-8">

          <h2 className="text-[20px] font-bold text-[#0F2A4A] mb-1.5">Welcome Back</h2>
          <p className="text-[#8B93A1] text-[12.5px] leading-relaxed mb-6">
            Enter your credentials to access the super admin panel.
          </p>

          {submitError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">Email ID</label>
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 focus-within:border-[#1D4E89] transition-colors ${errors.email ? 'border-red-400' : 'border-[#E1E4E9]'}`}>
                <Mail className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="admin@jaiswal-erp.com"
                  className="flex-1 outline-none text-[13px] text-[#0F2A4A] placeholder:text-[#B3B9C4] bg-transparent"
                />
              </div>
              {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">Password</label>
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 focus-within:border-[#1D4E89] transition-colors ${errors.password ? 'border-red-400' : 'border-[#E1E4E9]'}`}>
                <Lock className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className="flex-1 outline-none text-[13px] text-[#0F2A4A] placeholder:text-[#B3B9C4] bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-[#9AA3B2] hover:text-[#54607A] shrink-0"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-end pt-1">
              <Link to="/auth/forgot-password" className="text-[12px] text-[#1D4E89] font-medium hover:underline">
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