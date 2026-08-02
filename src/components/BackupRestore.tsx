import React, { useState, useRef } from 'react';
import { 
  Database, 
  Download, 
  UploadCloud, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Server,
  FileJson
} from 'lucide-react';
import { User, Warga, FinancialTransaction, DatabaseStatus } from '../types';
import { resetToDefault } from '../data/initialData';

interface BackupRestoreProps {
  currentUser: User;
  users: User[];
  warga: Warga[];
  transactions: FinancialTransaction[];
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
  dbStatus,
  onRestoreState,
  onUpdateDbStatus
}: BackupRestoreProps) {
  
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
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

  // Simulate Connection Test
  const testSupabaseConnection = () => {
    setTestingConnection(true);
    setTestResult(null);

    setTimeout(() => {
      onUpdateDbStatus({
        connected: true,
        mode: 'online',
        lastTested: new Date().toLocaleString('id-ID')
      });
      setTestingConnection(false);
      setTestResult('Koneksi ke Supabase berhasil disimulasikan! Semua tabel skema keuangan dan warga siap diintegrasikan.');
    }, 2000);
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

        {/* Database Connection Showcase (Supabase) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-4">
              <Server size={18} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Konfigurasi Database Cloud (Supabase)</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Sesuai instruksi pengembangan, database persisten utama direncanakan menggunakan <strong>Supabase</strong>. Anda dapat menguji simulator jembatan koneksi di bawah ini untuk memverifikasi kesiapan integrasi cloud.
            </p>

            {/* Current Status Badge Widget */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Status Server:</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    dbStatus.connected 
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' 
                      : 'bg-slate-800 border border-slate-700 text-slate-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.connected ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`}></span>
                    {dbStatus.connected ? 'Connected (Simulated)' : 'Offline (Local State)'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Penyimpanan Aktif:</span>
                  <span className="font-mono text-white font-bold">{dbStatus.connected ? 'Supabase Cloud API' : 'Browser LocalStorage'}</span>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-slate-800/80 pt-2">
                  <span className="text-slate-400 font-medium">Terakhir Diuji:</span>
                  <span className="font-mono text-[11px] text-amber-300">{dbStatus.lastTested || 'Belum diuji'}</span>
                </div>
              </div>

              {/* Endpoint Showcase Block */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-[10px] text-slate-400 leading-normal space-y-1.5">
                <div><strong className="text-slate-200 font-semibold">SUPABASE_URL:</strong> <code className="font-mono text-amber-400 ml-1">Konfigurasi via Vercel / .env</code></div>
                <div><strong className="text-slate-200 font-semibold">SUPABASE_ANON_KEY:</strong> <code className="font-mono text-slate-400 ml-1">Konfigurasi via Vercel / .env</code></div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
            <button
              onClick={testSupabaseConnection}
              disabled={testingConnection}
              className="w-full sm:w-1/2 py-2.5 gold-gradient-bg text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
            >
              <RefreshCw size={13} className={testingConnection ? 'animate-spin' : ''} />
              {testingConnection ? 'Sedang Menguji...' : 'Tes Koneksi'}
            </button>
            <button
              onClick={toggleMockMode}
              className="w-full sm:w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Database size={13} className="text-amber-400" />
              Toggle Mode Akses
            </button>
          </div>

          {testResult && (
            <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 animate-fadeIn leading-relaxed font-medium">
              {testResult}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

