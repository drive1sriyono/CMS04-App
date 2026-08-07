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
    <div id="login_container" className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-800 font-sans antialiased selection:bg-red-500 selection:text-white relative overflow-hidden">
      
      {/* Ambient Elegant Glow background circles */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-slate-400/5 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div id="login_card" className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-8 relative">
          
          {/* Top Elegant Crimson Border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-700"></div>

          {/* Logo Brand Header */}
          <div className="text-center mb-8 mt-1">
            <div className="relative inline-block mb-3">
              <Cms04Logo size={80} />
            </div>
            
            <h1 className="text-2xl font-black tracking-tight text-slate-800 mt-1">
              CMS<span className="text-red-600">04</span>
            </h1>
            <p className="text-[10px] font-bold text-red-600/90 uppercase tracking-widest mt-1">
              Portal Administrasi Warga CMS RT04
            </p>
          </div>

          {/* Error Message Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-semibold leading-relaxed animate-fadeIn">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                Username Akses
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-red-500">
                  <UserIcon size={16} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-red-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-red-600 transition-colors"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-red-600 via-red-500 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-red-500/10 active:scale-[0.99] cursor-pointer"
            >
              Login
            </button>
          </form>

        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-100 z-10">
        ©2026 by CMS04 Digital Team
      </div>
    </div>
  );
}

