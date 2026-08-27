import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, ArrowLeft, ShieldCheck, Lock as LockIcon, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { forgotPassword } from '@/services/apiServices';

export default function ForgotPasswordPage() {
  const [userCode, setUserCode] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [serverMsg, setServerMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userCode.trim()) {
      setErrorMsg('Please enter your User Code.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await forgotPassword({ userCode: userCode.trim() });
      const msg =
        res?.data?.msg ||
        res?.data?.message ||
        res?.data?.data?.message ||
        (typeof res?.data?.data === 'string' ? res.data.data : null) ||
        'Password has been reset. Please contact your administrator for your new password.';
      setServerMsg(msg);
      setSent(true);
    } catch (err) {
      console.error(err);
      const data = err?.response?.data;
      const errorText =
        data?.errorMessage ||
        data?.message ||
        (data?.msg && data.msg !== 'FAILED' && data.msg !== 'ERROR' ? data.msg : null) ||
        err?.message ||
        'Unable to process password reset. Please contact your administrator.';
      setErrorMsg(errorText);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Left section — white background */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col items-center justify-center p-6 lg:p-12">
        <img
         src={`${import.meta.env.BASE_URL}media/app/login_screen.jpg`}
          alt="Secure enterprise illustration"
          className="w-full max-w-[420px] h-auto"
        />
        <h1 className="text-[24px] font-bold text-[#0F2A4A] text-center mt-8 leading-snug">
          Secure Enterprise Solutions
        </h1>
        <p className="text-[#8B93A1] text-[13px] text-center mt-3 max-w-[360px] leading-relaxed">
          Manage your logistics, analytics, and projects through our unified cloud-based ecosystem with military-grade security.
        </p>
      </div>

      {/* Right section — #F8F9FF background */}
      <div className="w-full lg:w-1/2 bg-[#F8F9FF] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[380px]">
          <div className="bg-white rounded-2xl border border-[#EAECEF] shadow-[0_8px_30px_rgba(15,42,74,0.06)] p-8">
            <div className="flex justify-start mb-5">
              <div className="h-9 w-9 rounded-lg bg-[#EAF1FB] flex items-center justify-center">
                <LockIcon className="h-4 w-4 text-[#1D4E89]" />
              </div>
            </div>

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

            {!sent ? (
              <>
                <h2 className="text-[20px] font-bold text-[#0F2A4A] mb-1.5">Forgot Password?</h2>
                <p className="text-[#8B93A1] text-[12.5px] leading-relaxed mb-6">
                  Enter your User Code to reset your account password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">User Code</label>
                    <div className="flex items-center gap-2 rounded-lg border border-[#E1E4E9] px-3 py-2.5 focus-within:border-[#1D4E89] transition-colors">
                      <User className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                      <input
                        type="text"
                        value={userCode}
                        onChange={(e) => setUserCode(e.target.value)}
                        placeholder="Enter your user code"
                        required
                        className="flex-1 outline-none text-[13px] text-[#0F2A4A] placeholder:text-[#B3B9C4] bg-transparent"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#0F2A4A] hover:bg-[#123256] text-white text-[13.5px] cursor-pointer font-semibold rounded-lg py-3 transition-colors mt-2 disabled:opacity-50"
                  >
                    {submitting ? 'Resetting Password...' : 'Reset Password'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <h2 className="text-[18px] font-bold text-[#0F2A4A]">Password Reset Requested</h2>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 mb-6 text-[12.5px] text-blue-900 leading-relaxed">
                  {serverMsg}
                </div>
                <Link
                  to="/"
                  className="w-full block text-center bg-[#0F2A4A] cursor-pointer hover:bg-[#123256] text-white text-[13.5px] font-semibold rounded-lg py-3 transition-colors"
                >
                  Return to Login
                </Link>
              </>
            )}

            <Link to="/" className="mt-5 cursor-pointer flex items-center justify-center gap-1.5 text-[12px] text-[#1D4E89] font-medium hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Login
            </Link>
          </div>

          <div className="flex items-center justify-center gap-4 mt-5">
            <div className="flex items-center gap-1 text-[10px] text-[#B3B9C4]">
              <ShieldCheck className="h-3 w-3" />
              ISO 27001 Certified
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#B3B9C4]">
              <LockIcon className="h-3 w-3" />
              AES-256 Encrypted
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}