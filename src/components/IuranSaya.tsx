import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Calendar, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  X, 
  CheckCircle2, 
  Clock, 
  Eye, 
  CreditCard, 
  CheckCircle,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { User, Warga, FinancialTransaction, PaymentSubmission, DatabaseStatus } from '../types';
import { formatCurrency, formatDate } from '../data/initialData';
import { compressImageFile } from '../utils/imageCompressor';
import { RefreshCw } from 'lucide-react';

interface IuranSayaProps {
  currentUser: User;
  warga: Warga[];
  transactions: FinancialTransaction[];
  submissions: PaymentSubmission[];
  onAddSubmission: (newSub: PaymentSubmission) => void;
  onRefreshSync?: () => Promise<any>;
  dbStatus?: DatabaseStatus;
}

const MONTH_LIST = [
  'Januari 2026', 'Februari 2026', 'Maret 2026', 'April 2026',
  'Mei 2026', 'Juni 2026', 'Juli 2026', 'Agustus 2026',
  'September 2026', 'Oktober 2026', 'November 2026', 'Desember 2026'
];

export default function IuranSaya({
  currentUser,
  warga = [],
  transactions = [],
  submissions = [],
  onAddSubmission,
  onRefreshSync,
  dbStatus
}: IuranSayaProps) {
  const uName = currentUser.fullName.toLowerCase().trim();
  const uUser = currentUser.username.toLowerCase().trim();
  const uId = currentUser.id;

  const paidSet = new Set<string>();
  const pendingSet = new Set<string>();

  const matchedWarga = warga.find(w => w.id === uId || (w.username && w.username.toLowerCase() === uUser) || w.fullName.toLowerCase().trim() === uName);
  if (matchedWarga?.paidMonths) {
    matchedWarga.paidMonths.forEach(m => paidSet.add(m));
  }

  transactions.forEach(t => {
    if (t.type === 'Pemasukan') {
      const txWName = t.wargaName?.trim().toLowerCase() || '';
      const txWId = t.wargaId;
      const isMatch = (uId && txWId && txWId === uId) || txWName === uName || txWName === uUser || txWName === uId;
      if (isMatch) {
        if (t.paidMonths) t.paidMonths.forEach(m => paidSet.add(m));
        MONTH_LIST.forEach(m => {
          const shortM = m.replace(' 2026', '').toLowerCase();
          if (t.description.toLowerCase().includes(shortM)) paidSet.add(m);
        });
      }
    }
  });

  submissions.forEach(s => {
    const subName = s.wargaName?.trim().toLowerCase() || '';
    const subUser = s.submittedBy?.trim().toLowerCase() || '';
    const subId = s.wargaId;
    const isMatch = (uId && subId && subId === uId) || subName === uName || subName === uUser || subUser === uUser || subName === uId;
    if (isMatch) {
      if (s.status === 'Approved' && s.paidMonths) s.paidMonths.forEach(m => paidSet.add(m));
      if (s.status === 'Pending' && s.paidMonths) s.paidMonths.forEach(m => pendingSet.add(m));
    }
  });

  const myTxs = transactions.filter(t => {
    if (t.type !== 'Pemasukan') return false;
    const txWName = t.wargaName?.trim().toLowerCase() || '';
    const txWId = t.wargaId;
    return (uId && txWId && txWId === uId) || txWName === uName || txWName === uUser || txWName === uId;
  });

  const mySubmissions = submissions.filter(s => {
    const subName = s.wargaName?.trim().toLowerCase() || '';
    const subUser = s.submittedBy?.trim().toLowerCase() || '';
    const subId = s.wargaId;
    return (uId && subId && subId === uId) || subName === uName || subName === uUser || subUser === uUser || subName === uId;
  });

  // State Management for Warga Form
  const [wargaSubMonths, setWargaSubMonths] = useState<string[]>([]);
  const wargaSubRate = 60000;
  const [wargaSubAmount, setWargaSubAmount] = useState('');
  const [wargaSubDate, setWargaSubDate] = useState(new Date().toISOString().substring(0, 10));
  const [wargaSubProof, setWargaSubProof] = useState<string>('');
  const [isCompressingWarga, setIsCompressingWarga] = useState(false);
  const wargaFileInputRef = useRef<HTMLInputElement>(null);

  const [isWargaFormOpen, setIsWargaFormOpen] = useState(false);
  const [isMySubmissionsOpen, setIsMySubmissionsOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isKartuIuranOpen, setIsKartuIuranOpen] = useState(true);

  const getPaidRangeSummary = (paidMonths: string[]) => {
    if (paidMonths.length === 0) {
      return { text: 'Belum Ada Pembayaran', count: 0, lastPaidMonth: null };
    }
    const count = paidMonths.length;
    const first = paidMonths[0].replace(' 2026', '');
    const last = paidMonths[count - 1].replace(' 2026', '');
    
    let rangeText = '';
    if (count === 1) {
      rangeText = `Bulan ${first}`;
    } else {
      rangeText = `${first} - ${last} 2026`;
    }

    return { text: rangeText, count, lastPaidMonth: paidMonths[count - 1] };
  };

  const hasPendingMySubmissions = mySubmissions.some(s => s.status === 'Pending');

  // Warga helper methods
  const getWargaAlreadyPaidMonths = () => {
    return Array.from(paidSet);
  };

  const getWargaPendingSubmissionMonths = () => {
    return Array.from(pendingSet);
  };

  // Auto-init initial selected month
  useEffect(() => {
    const alreadyPaid = getWargaAlreadyPaidMonths();
    const pendingMonths = getWargaPendingSubmissionMonths();
    const availableMonths = MONTH_LIST.filter(m => !alreadyPaid.includes(m) && !pendingMonths.includes(m));

    if (availableMonths.length > 0) {
      setWargaSubMonths([availableMonths[0]]);
      setWargaSubAmount((1 * wargaSubRate).toString());
    } else {
      setWargaSubMonths([]);
      setWargaSubAmount('');
    }
  }, [currentUser, submissions, transactions]);

  const handleWargaToggleMonth = (month: string) => {
    const alreadyPaid = getWargaAlreadyPaidMonths();
    const pendingMonths = getWargaPendingSubmissionMonths();

    if (alreadyPaid.includes(month)) {
      alert(`Bulan ${month} sudah lunas.`);
      return;
    }
    if (pendingMonths.includes(month)) {
      alert(`Bulan ${month} sedang dalam proses verifikasi oleh RT/Bendahara.`);
      return;
    }

    const unpaidMonths = MONTH_LIST.filter(m => !alreadyPaid.includes(m) && !pendingMonths.includes(m));
    if (unpaidMonths.length === 0) {
      alert('Semua bulan iuran 2026 Anda telah lunas atau sedang dalam verifikasi.');
      return;
    }

    const targetIdx = unpaidMonths.indexOf(month);
    if (targetIdx === -1) return;

    const currentCount = wargaSubMonths.length;

    if (targetIdx + 1 === currentCount) {
      const updated = unpaidMonths.slice(0, currentCount - 1);
      setWargaSubMonths(updated);
      setWargaSubAmount(updated.length > 0 ? (updated.length * wargaSubRate).toString() : '');
      return;
    }

    if (targetIdx < currentCount - 1) {
      const updated = unpaidMonths.slice(0, targetIdx);
      setWargaSubMonths(updated);
      setWargaSubAmount(updated.length > 0 ? (updated.length * wargaSubRate).toString() : '');
      return;
    }

    if (targetIdx === currentCount) {
      const updated = unpaidMonths.slice(0, currentCount + 1);
      setWargaSubMonths(updated);
      setWargaSubAmount((updated.length * wargaSubRate).toString());
      return;
    }

    if (targetIdx > currentCount) {
      const nextExpected = unpaidMonths[currentCount];
      const shortExpected = nextExpected.replace(' 2026', '');
      alert(`Pembayaran iuran harus berurutan tanpa meloncat bulan. Silakan pilih bulan ${shortExpected} terlebih dahulu.`);
      return;
    }
  };

  const handleWargaProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressingWarga(true);
      try {
        const compressedBase64 = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.78 });
        setWargaSubProof(compressedBase64);
      } catch (err) {
        console.error('Error compressing image:', err);
        const reader = new FileReader();
        reader.onloadend = () => setWargaSubProof(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsCompressingWarga(false);
      }
    }
  };

  const handleWargaSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (wargaSubMonths.length === 0) {
      alert('Pilih minimal 1 bulan pembayaran iuran.');
      return;
    }
    if (!wargaSubAmount || Number(wargaSubAmount) <= 0) {
      alert('Nominal pembayaran harus lebih dari Rp 0.');
      return;
    }
    if (!wargaSubProof) {
      alert('Foto bukti pembayaran transfer wajib diunggah.');
      return;
    }

    const newSub: PaymentSubmission = {
      id: `sub-${Date.now()}`,
      wargaId: currentUser.id,
      wargaName: currentUser.fullName,
      blok: currentUser.blok,
      amount: Number(wargaSubAmount),
      date: wargaSubDate,
      paidMonths: [...wargaSubMonths],
      proofImage: wargaSubProof,
      status: 'Pending',
      submittedBy: currentUser.username,
      submittedAt: new Date().toISOString()
    };

    onAddSubmission(newSub);

    // Reset Warga Form
    setWargaSubProof('');
    if (wargaFileInputRef.current) wargaFileInputRef.current.value = '';

    alert('Pengajuan pembayaran iuran Anda berhasil dikirim! Silakan menunggu verifikasi oleh RT atau Bendahara.');
  };

  const currentMonthIdx = Math.min(Math.max(new Date().getMonth(), 0), 11);
  let maxPaidIdx = -1;
  MONTH_LIST.forEach((m, idx) => {
    if (paidSet.has(m) && idx > maxPaidIdx) maxPaidIdx = idx;
  });

  let statusText = 'Lunas';
  let badgeStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';

  if (pendingSet.size > 0) {
    statusText = 'Pending Verifikasi';
    badgeStyle = 'bg-amber-950/80 text-amber-300 border-amber-500/40';
  } else if (maxPaidIdx < currentMonthIdx) {
    statusText = 'Menunggak';
    badgeStyle = 'bg-rose-950/80 text-rose-300 border-rose-500/40';
  }

  const activePaidMonths = MONTH_LIST.filter(m => paidSet.has(m));
  const activePaidSummary = getPaidRangeSummary(activePaidMonths);

  return (
    <div className="space-y-8 animate-fadeIn text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="text-amber-400" size={26} />
            Catatan & Pembayaran Iuran Saya
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pantau status iuran bulanan Anda, ajukan bukti transfer pembayaran secara mandiri, dan kelola histori transaksi.
          </p>
        </div>

        {onRefreshSync && (
          <button
            type="button"
            onClick={async () => {
              const btnIcon = document.getElementById('iuran-sync-icon');
              if (btnIcon) btnIcon.classList.add('animate-spin');
              try {
                await onRefreshSync();
              } catch (e) {
                console.error('Manual sync failed:', e);
              } finally {
                setTimeout(() => {
                  if (btnIcon) btnIcon.classList.remove('animate-spin');
                }, 1000);
              }
            }}
            title="Sinkronkan status pengajuan iuran sekarang dari Supabase Cloud"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-amber-400 border border-amber-500/30 font-bold rounded-xl text-xs transition-all shadow-lg shrink-0 cursor-pointer self-start md:self-auto"
          >
            <RefreshCw id="iuran-sync-icon" size={14} />
            <span>Refresh & Sync</span>
            {dbStatus && (
              <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.connected ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} title={dbStatus.lastTested}></span>
            )}
          </button>
        )}
      </div>

      {/* SECTION c: Kartu Iuran Warga Terdaftar (Minimizable Banner) */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <ShieldCheck size={22} />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-widest block">Kartu Iuran Saya</span>
              <div className="flex flex-wrap items-center gap-2 text-sm font-black text-white leading-tight">
                <span>Pencatatan Pembayaran: <strong className="text-white">{currentUser.fullName}</strong></span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold whitespace-nowrap">
                  Blok Rumah: {currentUser.blok}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeStyle}`}>
              {statusText}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono whitespace-nowrap">
              {activePaidSummary.count > 0 ? `Terbayar s.d. ${activePaidSummary.lastPaidMonth?.replace(' 2026', '')} 2026 (${activePaidSummary.count}/12 Bulan)` : 'Belum Ada Pembayaran'}
            </span>
            <button
              type="button"
              onClick={() => setIsKartuIuranOpen(!isKartuIuranOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-400 border-2 border-amber-500/80 text-[11px] font-bold shadow-md shadow-amber-500/10 transition-all cursor-pointer shrink-0"
            >
              {isKartuIuranOpen ? (
                <>
                  <ChevronUp size={14} className="text-amber-400" />
                  <span>Minimize</span>
                </>
              ) : (
                <>
                  <ChevronDown size={14} className="text-amber-400" />
                  <span>Buka Kartu</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isKartuIuranOpen && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400 font-medium">
              Progres Pencatatan Iuran Bulanan 2026:
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {MONTH_LIST.map(m => {
                const isPaid = paidSet.has(m);
                const isPending = pendingSet.has(m);
                const shortMonth = m.replace(' 2026', '');
                return (
                  <div
                    key={m}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      isPaid
                        ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/5 font-bold'
                        : isPending
                        ? 'bg-amber-950/70 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/5 font-bold'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      {isPaid ? (
                        <CheckCircle2 size={12} className="text-emerald-400" />
                      ) : isPending ? (
                        <CheckCircle2 size={12} className="text-amber-400" />
                      ) : (
                        <XCircle size={12} className="text-slate-600" />
                      )}
                      <span className="text-[11px] font-bold">{shortMonth}</span>
                    </div>
                    <span className={`text-[9px] font-mono block ${isPaid ? 'text-emerald-400 font-bold' : isPending ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>
                      {isPaid ? 'LUNAS' : isPending ? 'PENDING' : 'BELUM'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SECTION a & b: Form Pengajuan & Riwayat Pengajuan Saya */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Submit Iuran Warga */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl h-fit">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-5">
            <div className="flex items-center gap-2">
              <Upload size={20} className="text-amber-400" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Form Pengajuan Bayar Iuran</h3>
                <p className="text-[10px] text-slate-400">Kirim bukti pembayaran iuran Anda ke RT/Bendahara</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsWargaFormOpen(!isWargaFormOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-400 border-2 border-amber-500/80 text-[11px] font-bold shadow-md shadow-amber-500/10 transition-all cursor-pointer shrink-0"
            >
              {isWargaFormOpen ? (
                <>
                  <ChevronUp size={14} className="text-amber-400" />
                  <span>Minimize</span>
                </>
              ) : (
                <>
                  <ChevronDown size={14} className="text-amber-400" />
                  <span>Buka Form</span>
                </>
              )}
            </button>
          </div>

          {isWargaFormOpen && (
            <form onSubmit={handleWargaSubmit} className="space-y-4 text-xs">
              {/* Nama & Blok User (Readonly) */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block">Identitas Penyetor</span>
                <div className="text-xs font-bold text-white flex items-center justify-between gap-2">
                  <span className="truncate">{currentUser.fullName}</span>
                  <span className="text-amber-300 font-mono font-bold bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full text-[10px] shrink-0 whitespace-nowrap">
                    Blok {currentUser.blok}
                  </span>
                </div>
              </div>

              {/* Tanggal Pembayaran */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Calendar size={12} className="text-amber-400" />
                  Tanggal Transfer / Bayar
                </label>
                <input
                  type="date"
                  value={wargaSubDate}
                  onChange={(e) => setWargaSubDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-medium"
                />
              </div>

              {/* Pilihan Bulan Pembayaran */}
              <div className="p-3.5 bg-slate-950 border border-amber-500/20 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Calendar size={14} />
                    Pilih Bulan Iuran 2026
                  </label>
                  <span className="text-[10px] text-amber-300/80 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                    Harus Berurutan
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {MONTH_LIST.map((m) => {
                    const isAlreadyPaid = getWargaAlreadyPaidMonths().includes(m);
                    const isPending = getWargaPendingSubmissionMonths().includes(m);
                    const isSelected = wargaSubMonths.includes(m);
                    const shortName = m.replace(' 2026', '');

                    if (isAlreadyPaid) {
                      return (
                        <div
                          key={m}
                          className="px-2 py-1.5 rounded-lg text-[9px] font-bold border bg-emerald-950/60 border-emerald-500/40 text-emerald-400 text-center flex flex-col items-center justify-center cursor-not-allowed opacity-80"
                          title="Sudah Lunas"
                        >
                          <span className="font-bold">{shortName}</span>
                          <span className="text-[8px] uppercase tracking-tighter">✓ Lunas</span>
                        </div>
                      );
                    }

                    if (isPending) {
                      return (
                        <div
                          key={m}
                          className="px-2 py-1.5 rounded-lg text-[9px] font-bold border bg-amber-950/60 border-amber-500/40 text-amber-300 text-center flex flex-col items-center justify-center cursor-not-allowed opacity-80"
                          title="Menunggu Verifikasi RT/Bendahara"
                        >
                          <span className="font-bold">{shortName}</span>
                          <span className="text-[8px] uppercase tracking-tighter text-amber-400">Verifikasi</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleWargaToggleMonth(m)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' 
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/40'
                        }`}
                      >
                        {isSelected && <Check size={10} />}
                        <span>{shortName}</span>
                      </button>
                    );
                  })}
                </div>

                {wargaSubMonths.length > 0 && (
                  <div className="text-[11px] text-amber-300 font-bold pt-1">
                    {wargaSubMonths.length} Bulan Dipilih: <span className="font-normal text-slate-300">{wargaSubMonths.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Nominal Total */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nominal Pembayaran (Rp)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-amber-400">Rp</span>
                  <input
                    type="number"
                    value={wargaSubAmount}
                    onChange={(e) => setWargaSubAmount(e.target.value)}
                    placeholder="60000"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Foto Bukti Pembayaran */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Foto Bukti Transfer (Wajib)</span>
                  <span className="text-[9px] text-amber-400 font-mono font-normal">Kompresi HTML5 Canvas</span>
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-28 border border-amber-500/30 border-dashed rounded-xl cursor-pointer bg-slate-950 hover:bg-slate-800/50 transition-all">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      {isCompressingWarga ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[10px] text-amber-300 font-bold">Mengompresi Gambar...</span>
                        </div>
                      ) : wargaSubProof ? (
                        <div className="relative group w-full h-24 px-2 flex justify-center items-center">
                          <img src={wargaSubProof} alt="Preview Bukti Transfer" className="h-full max-w-full object-cover rounded-lg border border-slate-700" />
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setWargaSubProof(''); if (wargaFileInputRef.current) wargaFileInputRef.current.value=''; }}
                            className="absolute -top-1 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload size={18} className="text-amber-400 mb-1" />
                          <p className="text-[10px] text-slate-300"><span className="font-bold text-amber-400">Upload Struk Transfer</span></p>
                          <p className="text-[8px] text-slate-500">Terkompresi otomatis & jernih</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={wargaFileInputRef}
                      onChange={handleWargaProofChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 gold-gradient-bg text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                Kirim Pengajuan Pembayaran
              </button>
            </form>
          )}
        </div>

        {/* Riwayat Pengajuan Saya */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2 min-w-0">
              <Clock size={16} className={hasPendingMySubmissions ? "text-red-400 animate-pulse shrink-0" : "text-amber-400 shrink-0"} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex flex-wrap items-center gap-2">
                <span>Riwayat Pengajuan Pembayaran Saya ({mySubmissions.length})</span>
                {hasPendingMySubmissions && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-950/90 text-red-400 border border-red-500/60 uppercase tracking-wider animate-pulse">
                    Pending Verifikasi
                  </span>
                )}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsMySubmissionsOpen(!isMySubmissionsOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-md transition-all cursor-pointer shrink-0 ${
                hasPendingMySubmissions
                  ? 'bg-red-950/90 hover:bg-red-900 text-red-300 hover:text-red-200 border-2 border-red-500/90 shadow-red-500/30 animate-pulse'
                  : 'bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-400 border-2 border-amber-500/80 shadow-amber-500/10'
              }`}
            >
              {isMySubmissionsOpen ? (
                <>
                  <ChevronUp size={14} className={hasPendingMySubmissions ? 'text-red-400' : 'text-amber-400'} />
                  <span>Minimize</span>
                </>
              ) : (
                <>
                  <ChevronDown size={14} className={hasPendingMySubmissions ? 'text-red-400' : 'text-amber-400'} />
                  <span>Buka Riwayat ({mySubmissions.length})</span>
                </>
              )}
            </button>
          </div>

          {isMySubmissionsOpen && (
            <>
              {mySubmissions.length > 0 ? (
                <div className="space-y-3">
                  {mySubmissions.map((sub) => {
                    const isPending = sub.status === 'Pending';
                    const isApproved = sub.status === 'Approved';
                    const isRejected = sub.status === 'Rejected';

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-amber-400 text-sm">{formatCurrency(sub.amount)}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isPending ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                              isApproved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                              'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}>
                              {isPending ? 'Menunggu Verifikasi' : isApproved ? 'Diterima & Diverifikasi' : 'Ditolak'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            Bulan: <span className="font-bold text-amber-300">{sub.paidMonths.join(', ')}</span>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Tanggal Pengajuan: {formatDate(sub.date)}
                          </p>
                          {isRejected && sub.rejectionReason && (
                            <p className="text-[11px] text-red-400 font-medium pt-1">
                              Alasan Penolakan: {sub.rejectionReason}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setZoomedImage(sub.proofImage)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold border border-slate-700 transition-colors shrink-0 cursor-pointer"
                        >
                          <Eye size={12} />
                          Bukti Foto
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 bg-slate-950/60 rounded-2xl border border-slate-800 text-center text-xs text-slate-500">
                  Belum ada pengajuan pembayaran online yang Anda kirimkan.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SECTION d: Riwayat Transaksi saya */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Riwayat Transaksi saya ({myTxs.length + mySubmissions.length})
        </h4>
        {myTxs.length === 0 && mySubmissions.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-xl text-center border border-slate-800/60">
            Belum ada catatan setoran iuran terverifikasi untuk akun Anda.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {mySubmissions.map(s => (
              <div key={s.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">Iuran {s.paidMonths.join(', ')}</p>
                  <p className="text-[10px] text-slate-400">{s.date} • Pengajuan Online</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${s.status === 'Approved' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' : s.status === 'Pending' ? 'bg-amber-950 text-amber-400 border-amber-500/30' : 'bg-red-950 text-red-400 border-red-500/30'}`}>
                  {s.status}
                </span>
              </div>
            ))}
            {myTxs.map(t => (
              <div key={t.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <p className="font-bold text-emerald-400">{t.description}</p>
                  <p className="text-[10px] text-slate-400">{t.date} • Kas RT Direct</p>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-xs">
                  Rp {t.amount.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ZOOMED PROOF MODAL */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-md">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-2 bg-slate-950 hover:bg-slate-800 text-amber-400 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="flex justify-center items-center mt-6">
              <img src={zoomedImage} alt="Bukti Transfer Zoomed" className="max-h-[70vh] rounded-2xl object-contain border border-slate-800" referrerPolicy="no-referrer" />
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-3 font-mono">Bukti Pengiriman Transfer Warga</p>
          </div>
        </div>
      )}
    </div>
  );
}
