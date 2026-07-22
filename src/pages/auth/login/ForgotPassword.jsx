import { useState } from 'react';
import { Mail, ArrowLeft, ShieldCheck, Lock as LockIcon } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
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

            {!sent ? (
              <>
                <h2 className="text-[20px] font-bold text-[#0F2A4A] mb-1.5">Forgot Password?</h2>
                <p className="text-[#8B93A1] text-[12.5px] leading-relaxed mb-6">
                  Enter your registered email address to receive password reset instructions.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">Email ID</label>
                    <div className="flex items-center gap-2 rounded-lg border border-[#E1E4E9] px-3 py-2.5 focus-within:border-[#1D4E89] transition-colors">
                      <Mail className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@jaiswal-erp.com"
                        required
                        className="flex-1 outline-none text-[13px] text-[#0F2A4A] placeholder:text-[#B3B9C4] bg-transparent"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0F2A4A] hover:bg-[#123256] text-white text-[13.5px] font-semibold rounded-lg py-3 transition-colors mt-2"
                  >
                    Send Reset Link
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-[20px] font-bold text-[#0F2A4A] mb-1.5">Check Your Email</h2>
                <p className="text-[#8B93A1] text-[12.5px] leading-relaxed mb-6">
                  We've sent password reset instructions to <span className="text-[#0F2A4A] font-medium">{email}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="w-full bg-[#0F2A4A] hover:bg-[#123256] text-white text-[13.5px] font-semibold rounded-lg py-3 transition-colors"
                >
                  Resend Link
                </button>
              </>
            )}

            <a href="/" className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-[#1D4E89] font-medium hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Login
            </a>
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