import React, { useState, useRef } from 'react';
import { 
  Database, 
  Download, 
  UploadCloud, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Server,
  FileJson,
  CloudUpload
} from 'lucide-react';
import { User, Warga, FinancialTransaction, PaymentSubmission, DatabaseStatus } from '../types';
import { resetToDefault } from '../data/initialData';
import { testSupabaseRealConnection, pushAllLocalDataToSupabase } from '../utils/supabase';

interface BackupRestoreProps {
  currentUser: User;
  users: User[];
  warga: Warga[];
  transactions: FinancialTransaction[];
  submissions?: PaymentSubmission[];
  dbStatus: DatabaseStatus;
  onRestoreState: (state: {
    users: User[];
    warga: Warga[];
    transactions: FinancialTransaction[];
    dbStatus: DatabaseStatus;
  }) => void;
  onUpdateDbStatus: (status: DatabaseStatus) => void;
}

export default function BackupRestore({
  currentUser,
  users,
  warga,
  transactions,
  submissions = [],
  dbStatus,
  onRestoreState,
  onUpdateDbStatus
}: BackupRestoreProps) {
  
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Get Supabase credentials automatically from Vercel / Vite Environment Variables
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guard: ONLY Admin has access to this menu
  if (currentUser.role !== 'admin') {
    return (
      <div className="p-8 bg-red-950/60 border border-red-500/40 rounded-3xl text-center space-y-4 shadow-2xl">
        <AlertTriangle size={44} className="text-red-400 mx-auto" />
        <h3 className="text-base font-bold text-white uppercase tracking-wider">Akses Ditolak</h3>
        <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
          Menu <strong>Backup & Restore</strong> serta Konfigurasi Database ini dilindungi dan hanya dapat diakses oleh <strong className="text-amber-400">Administrator (Admin)</strong>.
        </p>
      </div>
    );
  }

  // Handle Export Backup to JSON file
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      exportedBy: currentUser.username,
      data: {
        users,
        warga,
        transactions
      }
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `RT_Digital_Backup_${new Date().toISOString().substring(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);

    setSuccessMsg('Ekspor backup database JSON berhasil diunduh.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Process and validate restored file
  const processRestoredJSON = (file: File) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setErrorMsg('Format file tidak didukung. Harap unggah file cadangan berekstensi .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        
        // Validate backup structure
        if (!content.data || !content.data.users || !content.data.warga || !content.data.transactions) {
          throw new Error('Struktur berkas JSON cadangan tidak valid atau rusak.');
        }

        onRestoreState({
          users: content.data.users,
          warga: content.data.warga,
          transactions: content.data.transactions,
          dbStatus: {
            ...dbStatus,
            lastTested: `Direset via Backup (${new Date().toLocaleTimeString('id-ID')})`
          }
        });

        setSuccessMsg('Database sistem RT Digital berhasil dipulihkan dari file cadangan.');
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err: any) {
        setErrorMsg(`Gagal memulihkan file: ${err.message || 'Format JSON tidak valid'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processRestoredJSON(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processRestoredJSON(file);
    }
  };

  // REAL Connection Test to Supabase
  const testSupabaseConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    setErrorMsg('');

    const res = await testSupabaseRealConnection();
    setTestingConnection(false);

    if (res.success) {
      onUpdateDbStatus({
        connected: true,
        mode: 'online',
        lastTested: `Real Online (${new Date().toLocaleTimeString('id-ID')} • ${res.latency}ms)`
      });
      setTestResult(res.message);
    } else {
      onUpdateDbStatus({
        connected: false,
        mode: 'offline',
        lastTested: `Perlu Cek (${new Date().toLocaleTimeString('id-ID')})`
      });
      setTestResult(res.message);
    }
  };

  // Manual Sync Local State to Supabase Cloud
  const handleManualSyncToSupabase = async () => {
    setSyncingCloud(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await pushAllLocalDataToSupabase({
      users,
      warga,
      transactions,
      submissions
    });

    setSyncingCloud(false);

    if (res.success) {
      setSuccessMsg(res.message);
      onUpdateDbStatus({
        connected: true,
        mode: 'online',
        lastTested: `Selesai Sync (${new Date().toLocaleTimeString('id-ID')})`
      });
      setTimeout(() => setSuccessMsg(''), 6000);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Toggle mode manually for showcase
  const toggleMockMode = () => {
    const newStatus: DatabaseStatus = {
      connected: !dbStatus.connected,
      mode: !dbStatus.connected ? 'online' : 'offline',
      lastTested: new Date().toLocaleString('id-ID')
    };
    onUpdateDbStatus(newStatus);
    setSuccessMsg(`Mode sistem diganti ke: ${newStatus.mode === 'online' ? 'Supabase Cloud (Disimulasikan)' : 'Lokal (Offline)'}`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Reset to Factory defaults
  const handleResetDefaults = () => {
    if (confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh perubahan dan memulihkan data bawaan awal sistem? Data keuangan saat ini akan terhapus.')) {
      const defaults = resetToDefault();
      onRestoreState(defaults);
      setSuccessMsg('Sistem berhasil dikembalikan ke pengaturan bawaan pabrik.');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <div id="backup_panel" className="space-y-8 animate-fadeIn text-slate-100">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Database className="text-amber-400" size={26} />
          Cadangan & Koneksi Database
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Ekspor database lokal Anda ke berkas JSON eksternal, pulihkan dari cadangan lama, serta pantau status integrasi database cloud Supabase.
        </p>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs rounded-2xl flex items-center gap-2 font-semibold animate-fadeIn shadow-lg">
          <CheckCircle size={18} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-950/80 border border-red-500/40 text-red-300 text-xs rounded-2xl flex items-center gap-2 font-semibold animate-fadeIn shadow-lg">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Split Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* JSON Backup & Restore Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-4">
              <FileJson size={18} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Ekspor & Impor JSON Cadangan</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Amankan data kas RT Anda dengan mengekspornya secara rutin. Anda dapat mengunggah kembali file hasil ekspor ini kapan saja untuk memulihkan keadaan sistem sepenuhnya.
            </p>

            {/* Export Section */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-bold text-white block">Download Database Cadangan</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Berisi seluruh tabel warga, keuangan, & susunan keluarga</span>
              </div>
              <button
                onClick={handleExportBackup}
                className="px-4 py-2.5 gold-gradient-bg text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer uppercase tracking-wider shrink-0"
              >
                <Download size={14} />
                Ekspor JSON
              </button>
            </div>

            {/* Import Drop Area */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-300 block mb-1">Unggah File Cadangan (.json)</span>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-36 ${
                  dragOver 
                    ? 'border-amber-400 bg-amber-500/10' 
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <UploadCloud size={30} className={`${dragOver ? 'text-amber-400' : 'text-slate-500'} mb-2`} />
                <p className="text-xs text-slate-200 font-semibold">Tarik dan jatuhkan file di sini, atau <span className="text-amber-400 font-bold">pilih berkas</span></p>
                <p className="text-[10px] text-slate-500 mt-1">Mendukung berkas ekstensi .json backup CMS04 Digital</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 text-center">
            <button
              onClick={handleResetDefaults}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors font-bold uppercase tracking-wider text-[10px] cursor-pointer"
            >
              Kembalikan ke Data Sistem Awal (Reset)
            </button>
          </div>
        </div>

        {/* Database Connection Showcase (Supabase Real HTTP Test) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-4">
              <Server size={18} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Konfigurasi & Tes Koneksi Real Supabase</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              Kredensial database Supabase terhubung secara otomatis via <strong>Vercel Environment Variables</strong> (<code>VITE_SUPABASE_URL</code> &amp; <code>VITE_SUPABASE_ANON_KEY</code>). Pengguna tidak perlu menginputkan API Key/URL secara manual di aplikasi.
            </p>

            {/* Current Status Badge Widget */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Status Koneksi Real:</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    dbStatus.connected 
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' 
                      : 'bg-slate-800 border border-slate-700 text-slate-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.connected ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`}></span>
                    {dbStatus.connected ? 'Cloud Connected (Real)' : 'Offline (Local Storage)'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Penyimpanan Utama:</span>
                  <span className="font-mono text-white font-bold">{dbStatus.connected ? 'Supabase REST Cloud' : 'Browser LocalStorage'}</span>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-slate-800/80 pt-2">
                  <span className="text-slate-400 font-medium">Pengujian Terakhir:</span>
                  <span className="font-mono text-[11px] text-amber-300">{dbStatus.lastTested || 'Belum diuji secara real'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
            <button
              onClick={testSupabaseConnection}
              disabled={testingConnection}
              className="w-full sm:w-1/3 py-2.5 gold-gradient-bg text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
            >
              <RefreshCw size={13} className={testingConnection ? 'animate-spin' : ''} />
              {testingConnection ? 'Menguji Real...' : 'Tes Koneksi'}
            </button>
            <button
              onClick={handleManualSyncToSupabase}
              disabled={syncingCloud}
              className="w-full sm:w-1/3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
            >
              <CloudUpload size={14} className={syncingCloud ? 'animate-bounce' : ''} />
              {syncingCloud ? 'Mengunggah...' : 'Upload ke Supabase'}
            </button>
            <button
              onClick={toggleMockMode}
              className="w-full sm:w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Database size={13} className="text-amber-400" />
              Toggle Mode
            </button>
          </div>

          {testResult && (
            <div className="mt-4 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-amber-300 animate-fadeIn leading-relaxed font-mono">
              {testResult}
            </div>
          )}

        </div>

      </div>

      {/* Panduan Setup Supabase & SQL Schema */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Panduan Setup & SQL Schema Supabase</h3>
          </div>
          <button
            onClick={() => {
              const sql = `-- SCHEMA CMS04 RT DIGITAL FOR SUPABASE WITH AUTO-MIGRATION

-- 1. TABEL WARGA
CREATE TABLE IF NOT EXISTS public.warga (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT,
  blok TEXT,
  house_status TEXT DEFAULT 'Pemilik',
  phone TEXT,
  status_iuran TEXT DEFAULT 'Lunas',
  birth_date DATE,
  paid_months TEXT DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS blok TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS house_status TEXT DEFAULT 'Pemilik';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_iuran TEXT DEFAULT 'Lunas';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS paid_months TEXT DEFAULT '[]';

-- 2. TABEL USERS
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  full_name TEXT,
  blok TEXT,
  house_status TEXT DEFAULT 'Pemilik',
  phone TEXT,
  birth_date DATE,
  family TEXT DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blok TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS house_status TEXT DEFAULT 'Pemilik';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS family TEXT DEFAULT '[]';

-- 3. TABEL FINANCIAL_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT DEFAULT 'Iuran Warga',
  warga_name TEXT,
  recipient TEXT,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  proof_image TEXT,
  paid_months TEXT DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Iuran Warga';
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS warga_name TEXT;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS paid_months TEXT DEFAULT '[]';

-- 4. TABEL PAYMENT_SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.payment_submissions (
  id TEXT PRIMARY KEY,
  warga_id TEXT,
  warga_name TEXT,
  blok TEXT,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  paid_months TEXT DEFAULT '[]',
  proof_image TEXT,
  status TEXT DEFAULT 'PENDING',
  submitted_by TEXT,
  submitted_at TEXT NOT NULL,
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payment_submissions ADD COLUMN IF NOT EXISTS warga_id TEXT;
ALTER TABLE public.payment_submissions ADD COLUMN IF NOT EXISTS warga_name TEXT;
ALTER TABLE public.payment_submissions ADD COLUMN IF NOT EXISTS blok TEXT;
ALTER TABLE public.payment_submissions ADD COLUMN IF NOT EXISTS paid_months TEXT DEFAULT '[]';
ALTER TABLE public.payment_submissions ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE public.payment_submissions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.payment_submissions ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE public.payment_submissions ADD COLUMN IF NOT EXISTS reviewed_at TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE public.warga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
DROP POLICY IF EXISTS "Allow anon select and insert" ON public.warga;
DROP POLICY IF EXISTS "Allow anon select and insert" ON public.users;
DROP POLICY IF EXISTS "Allow anon select and insert" ON public.financial_transactions;
DROP POLICY IF EXISTS "Allow anon select and insert" ON public.payment_submissions;

CREATE POLICY "Allow anon select and insert" ON public.warga FOR ALL USING (true);
CREATE POLICY "Allow anon select and insert" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow anon select and insert" ON public.financial_transactions FOR ALL USING (true);
CREATE POLICY "Allow anon select and insert" ON public.payment_submissions FOR ALL USING (true);
`;
              navigator.clipboard.writeText(sql);
              alert('SQL Schema berhasil disalin ke clipboard! Silahkan salin ke Supabase SQL Editor.');
            }}
            className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Salin Script SQL Schema</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center text-[10px]">1</span>
              <span>Buat Project Supabase</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Buka <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">supabase.com</a>, daftar/login, buat New Project dengan nama <strong>CMS04-RT-DIGITAL</strong> dan tentukan Password Database.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center text-[10px]">2</span>
              <span>Jalankan SQL Schema</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Masuk ke menu <strong>SQL Editor</strong> di dashboard Supabase, tempelkan (paste) script SQL Schema dari tombol di atas, lalu klik <strong>Run</strong>.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center text-[10px]">3</span>
              <span>Atur Vercel Environment</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Buka Vercel Dashboard → <strong>Environment Variables</strong>. Tambahkan <code>VITE_SUPABASE_URL</code> &amp; <code>VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

