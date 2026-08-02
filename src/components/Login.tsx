import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import Cms04Logo from './Cms04Logo';

interface LoginProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export default function Login({ users, onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username dan kata sandi wajib diisi.');
      return;
    }

    const matchedUser = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim() && u.passwordHash === password
    );

    if (matchedUser) {
      onLoginSuccess(matchedUser);
    } else {
      setError('Username atau kata sandi tidak sesuai.');
    }
  };

  return (
    <div id="login_container" className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      
      {/* Ambient Gold Glow background circles */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div id="login_card" className="w-full max-w-md bg-slate-900/90 border border-amber-500/30 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden p-8 relative gold-border-glow">
          
          {/* Top Gold Shimmer Border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"></div>

          {/* Logo Brand Header */}
          <div className="text-center mb-8 mt-1">
            <div className="relative inline-block mb-3">
              <Cms04Logo size={80} />
            </div>
            
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              CMS<span className="gold-gradient-text">04</span>
            </h1>
            <p className="text-[10px] font-bold text-amber-400/90 uppercase tracking-widest mt-1">
              Portal Administrasi Warga CMS RT04
            </p>
          </div>

          {/* Error Message Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs text-center font-semibold leading-relaxed animate-fadeIn">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Username Akses
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-amber-500/80">
                  <UserIcon size={16} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-3 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-amber-500/80">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-amber-400 transition-colors"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-amber-500/25 active:scale-[0.99] cursor-pointer"
            >
              Login
            </button>
          </form>

        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-[11px] text-slate-500 border-t border-slate-900 z-10">
        ©2026 by CMS04 Digital Team
      </div>
    </div>
  );
}

