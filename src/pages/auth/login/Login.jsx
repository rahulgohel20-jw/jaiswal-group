import { useState } from 'react';
import { Mail, IdCard, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState('');
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-[1040px] grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center">

        <div className="hidden lg:flex items-center justify-center h-full py-6">
          <div className="w-full max-w-[520px] h-full p-6 flex flex-col items-center justify-center">
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

        <div className="w-full max-w-[380px] mx-auto bg-white rounded-2xl border border-[#EAECEF] shadow-[0_8px_30px_rgba(15,42,74,0.06)] p-8">
          <div className="flex justify-start mb-4">
            <img
              src="/media/app/jaiswalgroup-logo.png"
              alt="Jaiswal Group Logo"
              className="h-[50px]"
            />
          </div>

          <h2 className="text-[20px] font-bold text-[#0F2A4A] mb-1.5">Welcome Back</h2>
          <p className="text-[#8B93A1] text-[12.5px] leading-relaxed mb-6">
            Enter your credentials to access the super admin panel.
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
                  className="flex-1 outline-none text-[13px] text-[#0F2A4A] placeholder:text-[#B3B9C4] bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#54607A] mb-1.5">User Code</label>
              <div className="flex items-center gap-2 rounded-lg border border-[#E1E4E9] px-3 py-2.5 focus-within:border-[#1D4E89] transition-colors">
                <IdCard className="h-[15px] w-[15px] text-[#9AA3B2] shrink-0" />
                <input
                  type="text"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  placeholder="Enter Super Admin ID"
                  className="flex-1 outline-none text-[13px] text-[#0F2A4A] placeholder:text-[#B3B9C4] bg-transparent"
                />
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

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#CBD1DB] accent-[#1D4E89]"
                />
                <span className="text-[12px] text-[#54607A]">Remember Me</span>
              </label>
              <a href="#" className="text-[12px] text-[#1D4E89] font-medium hover:underline">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full bg-[#0F2A4A] hover:bg-[#123256] text-white text-[13.5px] font-semibold rounded-lg py-3 transition-colors mt-2"
            >
              Login
            </button>
          </form>

          <p className="text-center text-[10.5px] text-[#B3B9C4] mt-6">
            © 2024 Jaiswal ERP v4.2.0. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
}