import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, KeyRound, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { resetPassword } from '@/services/apiServices';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  

  const emailFromState = Boolean(location.state?.email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({
        email,
        newPassword: password,
        organizationId: 1,
        otp,
      });
      setResetSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.response?.data?.errorMessage ||
          err?.response?.data?.message ||
          'Unable to reset password. Please check your OTP and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Left section — white background */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col items-center justify-center p-6 lg:p-12">
        <img
          src="/media/app/login_screen.jpg"
          alt="Secure enterprise illustration"
          className="w-full max-w-[420px] h-auto"
        />
        <h1 className="text-[24px] font-bold text-[#0F2A4A] text-center mt-8 leading-snug">
          Secure Enterprise Access
        </h1>
        <p className="text-[#8B93A1] text-[13px] text-center mt-3 max-w-[360px] leading-relaxed">
          Manage your organization's entire lifecycle with our robust, secure, and intuitive resource planning platform.
        </p>
      </div>

      {/* Right section — #F8F9FF background */}
      <div className="w-full lg:w-1/2 bg-[#F8F9FF] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[380px]">
          <div className="bg-white rounded-2xl border border-[#EAECEF] shadow-[0_8px_30px_rgba(15,42,74,0.06)] p-8">

            {resetSuccess ? (
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-[20px] font-bold text-[#0F2A4A] mb-1.5">
                  Password Updated Successfully
                </h2>
                <p className="text-[#8B93A1] text-[12.5px] leading-relaxed mb-6">
                  Your password has been reset. You can now log in with your new password.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/', { replace: true })}
                  className="w-full bg-[#0F2A4A] hover:bg-[#123256] text-white text-[13.5px] font-semibold rounded-lg py-3 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-[20px] font-bold text-[#0F2A4A] mb-1.5">Reset Password</h2>
                <p className="text-[#8B93A1] text-[12.5px] leading-relaxed mb-6">
                  Enter the OTP sent to your email and choose a strong new password.
                </p>

                {errorMsg && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="flex-1">{errorMsg}</span>
                    <button
                      type="button"
                      onClick={() => setErrorMsg('')}
                      className="shrink-0 text-red-400 hover:text-red-600"
                      aria-label="Dismiss error"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">Email ID</label>
                    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${emailFromState ? 'bg-[#F7F8FA] border-[#E1E4E9]' : 'border-[#E1E4E9] focus-within:border-[#1D4E89]'}`}>
                      <Mail className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                      <input
                        type="email"
                        value={email}
                        disabled={emailFromState}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@jaiswal-erp.com"
                        required
                        className={`flex-1 outline-none text-[13px] bg-transparent ${emailFromState ? 'text-[#54607A] cursor-not-allowed' : 'text-[#0F2A4A] placeholder:text-[#B3B9C4]'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">OTP</label>
                    <div className="flex items-center gap-2 rounded-lg border border-[#E1E4E9] px-3 py-2.5 focus-within:border-[#1D4E89] transition-colors">
                      <KeyRound className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter the 6-digit code"
                        required
                        className="flex-1 outline-none text-[13px] text-[#0F2A4A] placeholder:text-[#B3B9C4] bg-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">New Password</label>
                    <div className="flex items-center gap-2 rounded-lg border border-[#E1E4E9] px-3 py-2.5 focus-within:border-[#1D4E89] transition-colors">
                      <Lock className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
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
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">Confirm Password</label>
                    <div className="flex items-center gap-2 rounded-lg border border-[#E1E4E9] px-3 py-2.5 focus-within:border-[#1D4E89] transition-colors">
                      <Lock className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="flex-1 outline-none text-[13px] text-[#0F2A4A] placeholder:text-[#B3B9C4] bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        className="text-[#9AA3B2] hover:text-[#54607A] shrink-0"
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#0F2A4A] hover:bg-[#123256] cursor-pointer text-white text-[13.5px] font-semibold rounded-lg py-3 transition-colors mt-2 disabled:opacity-50"
                  >
                    {submitting ? 'Updating...' : 'Update Password'}
                  </button>               
                </form>

                <a href="/" className="mt-5 flex items-center justify-center text-[12px] text-[#1D4E89] font-medium hover:underline">
                  Back to Login
                </a>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 mt-5">
            <div className="flex items-center gap-1 text-[10px] text-[#B3B9C4]">
              <ShieldCheck className="h-3 w-3" />
              ISO 27001 Certified
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#B3B9C4]">
              <Lock className="h-3 w-3" />
              AES-256 Encrypted
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}