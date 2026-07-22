import { useState } from 'react';
import { Mail, Building2, Lock, Eye, EyeOff, ShieldCheck, ChevronDown } from 'lucide-react';

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const email = 'admin@jaiswal-erp.com';

  const handleSubmit = (e) => {
    e.preventDefault();
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
            <h2 className="text-[20px] font-bold text-[#0F2A4A] mb-1.5">Reset Password</h2>
            <p className="text-[#8B93A1] text-[12.5px] leading-relaxed mb-6">
              Please secure your account by choosing a strong password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">Email ID</label>
                <div className="flex items-center gap-2 rounded-lg border border-[#E1E4E9] bg-[#F7F8FA] px-3 py-2.5">
                  <Mail className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="flex-1 outline-none text-[13px] text-[#54607A] bg-transparent cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">Organization</label>
                <div className="flex items-center gap-2 rounded-lg border border-[#E1E4E9] px-3 py-2.5 focus-within:border-[#1D4E89] transition-colors">
                  <Building2 className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                  <select className="flex-1 outline-none text-[13px] text-[#0F2A4A] bg-transparent appearance-none">
                    <option>Jaiswal Group</option>
                  </select>
                  <ChevronDown className="h-[14px] w-[14px] text-[#9AA3B2] shrink-0" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">Password</label>
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
                className="w-full bg-[#0F2A4A] hover:bg-[#123256] text-white text-[13.5px] font-semibold rounded-lg py-3 transition-colors mt-2"
              >
                Update Password
              </button>
            </form>

            <a href="#" className="mt-5 flex items-center justify-center text-[12px] text-[#1D4E89] font-medium hover:underline">
              Return to Dashboard
            </a>
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