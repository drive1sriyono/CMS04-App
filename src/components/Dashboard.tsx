import React, { useState } from 'react';
import { 
  Users, 
  AlertCircle,
  Wallet,
  Sparkles,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { User, Warga, FinancialTransaction, PaymentSubmission, DatabaseStatus } from '../types';
import { formatCurrency } from '../data/initialData';

interface DashboardProps {
  currentUser: User;
  warga: Warga[];
  transactions: FinancialTransaction[];
  submissions?: PaymentSubmission[];
  dbStatus?: DatabaseStatus;
}

const ALL_MONTHS_2026 = [
  'Januari 2026', 'Februari 2026', 'Maret 2026', 'April 2026',
  'Mei 2026', 'Juni 2026', 'Juli 2026', 'Agustus 2026',
  'September 2026', 'Oktober 2026', 'November 2026', 'Desember 2026'
];

interface MonthlyData {
  monthKey: string; // YYYY-MM
  monthName: string;
  pemasukan: number;
  pengeluaran: number;
  saldoAwal: number;
  saldo: number;
}

export default function Dashboard({ currentUser, warga, transactions, submissions = [], dbStatus }: DashboardProps) {
  const [hoveredBar, setHoveredBar] = useState<{ month: string; type: string; value: number } | null>(null);

  // 1. Calculate stats
  // Saldo Kas = Total Pemasukan - Total Pengeluaran
  const totalPemasukan = transactions
    .filter(t => t.type === 'Pemasukan')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPengeluaran = transactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldoKas = totalPemasukan - totalPengeluaran;

  // Total KK: mengacu kepada jumlah data warga (admin tidak dihitung)
  const validWargaList = warga.filter(w => 
    w.username?.toLowerCase() !== 'admin' && 
    w.id !== 'user-admin' &&
    w.fullName.toLowerCase() !== 'system administrator'
  );
  const totalKK = validWargaList.length;

  // Jumlah warga menunggak iuran (Automated check: hasn't paid up to current month in 2026)
  const currentMonthIdx = Math.min(Math.max(new Date().getMonth(), 0), 11);

  const wargaMenunggakCount = warga.filter(w => {
    const nameLower = w.fullName.trim().toLowerCase();
    const usernameLower = w.username?.trim().toLowerCase();

    // Check pending submission
    const isPending = submissions.some(s => {
      if (s.status !== 'Pending') return false;
      const subName = s.wargaName.trim().toLowerCase();
      return subName === nameLower || (usernameLower && subName === usernameLower);
    });
    if (isPending) return false; // Classified as Pending, not Menunggak

    const paidSet = new Set<string>();
    if (w.paidMonths) {
      w.paidMonths.forEach(m => paidSet.add(m));
    }

    transactions.forEach(t => {
      if (t.type === 'Pemasukan' && t.wargaName && t.wargaName.trim().toLowerCase() === nameLower) {
        if (t.paidMonths) {
          t.paidMonths.forEach(m => paidSet.add(m));
        }
        ALL_MONTHS_2026.forEach(m => {
          const shortM = m.replace(' 2026', '').toLowerCase();
          if (t.description.toLowerCase().includes(shortM)) {
            paidSet.add(m);
          }
        });
      }
    });

    submissions.forEach(s => {
      if (s.status === 'Approved' && s.wargaName.trim().toLowerCase() === nameLower) {
        s.paidMonths.forEach(m => paidSet.add(m));
      }
    });

    let maxPaidIdx = -1;
    ALL_MONTHS_2026.forEach((m, idx) => {
      if (paidSet.has(m)) {
        if (idx > maxPaidIdx) maxPaidIdx = idx;
      }
    });

    return maxPaidIdx < currentMonthIdx;
  }).length;

  // 2. Prepare monthly graph and balance history data
  const getMonthName = (monthNum: string): string => {
    const months: { [key: string]: string } = {
      '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
      '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
      '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
    };
    return months[monthNum] || monthNum;
  };

  // Group transactions by YYYY-MM
  const monthlyGroups: { [key: string]: { pemasukan: number; pengeluaran: number } } = {};
  
  // Current month string
  const currentMonthKey = new Date().toISOString().substring(0, 7); // e.g., "2026-07"
  
  if (Object.keys(monthlyGroups).length === 0) {
    monthlyGroups[currentMonthKey] = { pemasukan: 0, pengeluaran: 0 };
  }

  transactions.forEach(t => {
    if (!t.date) return;
    const yearMonth = t.date.substring(0, 7); // "YYYY-MM"
    if (!monthlyGroups[yearMonth]) {
      monthlyGroups[yearMonth] = { pemasukan: 0, pengeluaran: 0 };
    }
    if (t.type === 'Pemasukan') {
      monthlyGroups[yearMonth].pemasukan += t.amount;
    } else {
      monthlyGroups[yearMonth].pengeluaran += t.amount;
    }
  });

  let runningBalance = 0;
  const chartData: MonthlyData[] = Object.keys(monthlyGroups)
    .sort()
    .map(key => {
      const parts = key.split('-');
      const name = parts.length > 1 ? `${getMonthName(parts[1])} ${parts[0]}` : key;
      const pem = monthlyGroups[key].pemasukan;
      const peng = monthlyGroups[key].pengeluaran;
      const awal = runningBalance;
      const akhir = awal + pem - peng;
      runningBalance = akhir;

      return {
        monthKey: key,
        monthName: name,
        pemasukan: pem,
        pengeluaran: peng,
        saldoAwal: awal,
        saldo: akhir
      };
    });

  // Find max value for scaling the SVG chart
  const maxVal = Math.max(
    ...chartData.map(d => Math.max(d.pemasukan, d.pengeluaran, 500000))
  ) * 1.15; // 15% padding at top

  return (
    <div id="dashboard_panel" className="space-y-8 animate-fadeIn text-slate-100">
      
      {/* Header Greeting Banner - Luxury Dark Slate & Metallic Gold */}
      <div className="bg-slate-900 border border-amber-500/30 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden gold-border-glow">
        {/* Glow decoration */}
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3">
              <Sparkles size={13} />
              <span>Portal Administrasi Warga CMS RT04</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-snug">
              Selamat datang kembali, <span className="gold-gradient-text">{currentUser.fullName}</span>.
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Anda masuk sebagai <strong className="text-amber-400 font-mono uppercase">{currentUser.role}</strong>.
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Sinkronisasi Terakhir</span>
            <span className="inline-flex items-center gap-2 text-xs text-amber-300 bg-slate-950/90 px-4 py-1.5 rounded-full border border-amber-500/40 font-bold mt-1 shadow-md">
              <ShieldCheck size={14} className="text-amber-400" />
              {dbStatus?.lastTested ? dbStatus.lastTested : 'Terhubung'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD 1: Saldo Kas RT */}
        <div id="stat_card_saldo" className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 hover:border-amber-400 transition-all duration-300 shadow-xl relative group overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Saldo Kas RT</p>
              <h3 className="text-2xl font-black mt-2 tracking-tight gold-gradient-text">
                {formatCurrency(saldoKas)}
              </h3>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner flex items-center justify-center min-w-[48px] h-12">
              <span className="font-black text-amber-400 font-mono text-base tracking-tighter leading-none">Rp</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <TrendingUp size={12} /> Realtime Balance
            </span>
            <span className="font-mono text-slate-400">Terupdate</span>
          </div>
        </div>

        {/* CARD 2: Total KK */}
        <div id="stat_card_kk" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/40 transition-all duration-300 shadow-xl relative group overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Kepala Keluarga</p>
              <h3 className="text-2xl font-bold text-white mt-2 tracking-tight">
                {totalKK} <span className="text-sm font-medium text-slate-400">KK Terdaftar</span>
              </h3>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 group-hover:text-amber-400 group-hover:border-amber-500/30 transition-all">
              <Users size={22} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Komunitas Wilayah RT</span>
            <span className="font-mono text-amber-400 font-bold">{totalKK} Warga Sensus</span>
          </div>
        </div>

        {/* CARD 3: Warga Menunggak */}
        <div id="stat_card_menunggak" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 hover:border-red-500/40 transition-all duration-300 shadow-xl relative group overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Jumlah Warga Menunggak</p>
              <h3 className="text-2xl font-bold text-red-400 mt-2 tracking-tight">
                {wargaMenunggakCount} <span className="text-sm font-medium text-slate-400">Warga</span>
              </h3>
            </div>
            <div className={`p-3.5 rounded-2xl border transition-all ${wargaMenunggakCount > 0 ? 'bg-red-950/60 border-red-500/40 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
              <AlertCircle size={22} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Status Penagihan Kas</span>
            <span className={`font-bold ${wargaMenunggakCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {wargaMenunggakCount > 0 ? 'Perlu Follow-up' : 'Semua Lunas'}
            </span>
          </div>
        </div>

      </div>

      {/* Graph and Balance History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Column (2/3 width on desktop) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Grafik Pemasukan dan Pengeluaran Tiap Bulannya</h4>
              <p className="text-xs text-slate-400 mt-0.5">Perbandingan fluktuasi arus kas RT secara transparan</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-2 text-amber-400 font-bold">
                <span className="w-3 h-3 rounded bg-gradient-to-tr from-amber-500 to-amber-300 shadow-xs"></span>
                Pemasukan
              </span>
              <span className="flex items-center gap-2 text-slate-400 font-bold">
                <span className="w-3 h-3 rounded bg-slate-600"></span>
                Pengeluaran
              </span>
            </div>
          </div>

          {/* Custom SVG Chart */}
          <div className="relative w-full h-64 flex-1 mt-2">
            <svg className="w-full h-full" viewBox="0 0 500 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="goldBarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="slateBarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
              </defs>

              {/* Draw Y-axis guide lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = 20 + ratio * 160;
                const value = Math.round(maxVal * (1 - ratio));
                return (
                  <g key={idx}>
                    <line x1="50" y1={y} x2="480" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                    <text x="42" y={y + 3} fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
                      {value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${Math.round(value / 1000)}k` : value}
                    </text>
                  </g>
                );
              })}

              {/* Draw Bars */}
              {chartData.map((data, idx) => {
                const numBars = chartData.length;
                const sectionWidth = 430 / numBars;
                const groupCenterX = 50 + idx * sectionWidth + sectionWidth / 2;
                
                // Bar properties
                const barWidth = 14;
                const spacing = 4;
                
                // Left bar (Pemasukan)
                const pemHeight = (data.pemasukan / maxVal) * 160;
                const pemX = groupCenterX - barWidth - spacing / 2;
                const pemY = 180 - pemHeight;

                // Right bar (Pengeluaran)
                const pengHeight = (data.pengeluaran / maxVal) * 160;
                const pengX = groupCenterX + spacing / 2;
                const pengY = 180 - pengHeight;

                return (
                  <g key={data.monthKey} className="group/bar">
                    {/* Month Label */}
                    <text x={groupCenterX} y="200" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="600">
                      {data.monthName}
                    </text>

                    {/* Bar Pemasukan (Gold Gradient) */}
                    <rect
                      x={pemX}
                      y={pemY}
                      width={barWidth}
                      height={Math.max(pemHeight, 3)}
                      rx="3"
                      fill="url(#goldBarGrad)"
                      className="cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                      onMouseEnter={() => setHoveredBar({ month: data.monthName, type: 'Pemasukan', value: data.pemasukan })}
                      onMouseLeave={() => setHoveredBar(null)}
                    />

                    {/* Bar Pengeluaran (Slate/Gray) */}
                    <rect
                      x={pengX}
                      y={pengY}
                      width={barWidth}
                      height={Math.max(pengHeight, 3)}
                      rx="3"
                      fill="url(#slateBarGrad)"
                      className="cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                      onMouseEnter={() => setHoveredBar({ month: data.monthName, type: 'Pengeluaran', value: data.pengeluaran })}
                      onMouseLeave={() => setHoveredBar(null)}
                    />
                  </g>
                );
              })}

              {/* Baseline */}
              <line x1="45" y1="180" x2="480" y2="180" stroke="#334155" strokeWidth="1" />
            </svg>

            {/* Interactive Tooltip Overlay */}
            {hoveredBar && (
              <div className="absolute top-0 right-0 bg-slate-950 border border-amber-500/40 p-3 rounded-2xl shadow-2xl text-xs z-10 animate-fadeIn text-white">
                <p className="text-amber-400 text-[10px] uppercase font-bold tracking-wider">{hoveredBar.month}</p>
                <p className="font-bold text-white mt-0.5 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${hoveredBar.type === 'Pemasukan' ? 'bg-amber-400' : 'bg-slate-400'}`}></span>
                  {hoveredBar.type}: <span className="text-amber-300 font-mono font-black">{formatCurrency(hoveredBar.value)}</span>
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-400 text-center leading-normal">
            Sorot batang grafik untuk melihat detail nominal pemasukan vs pengeluaran setiap bulan.
          </div>
        </div>

        {/* Riwayat Saldo Table (1/3 width on desktop) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Wallet size={18} className="text-amber-400" />
                Riwayat Saldo
              </h4>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-950">
                    <th className="py-3 px-2.5">Bulan</th>
                    <th className="py-3 px-1.5 text-right text-sky-400">Awal</th>
                    <th className="py-3 px-1.5 text-right text-amber-400">Masuk</th>
                    <th className="py-3 px-1.5 text-right text-slate-400">Keluar</th>
                    <th className="py-3 px-2.5 text-right text-emerald-400">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {[...chartData].reverse().map((item) => (
                    <tr key={item.monthKey} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-2.5 font-bold text-slate-200 whitespace-nowrap">{item.monthName}</td>
                      <td className="py-3 px-1.5 text-right font-mono font-bold text-sky-400 whitespace-nowrap">{formatCurrency(item.saldoAwal)}</td>
                      <td className="py-3 px-1.5 text-right font-mono font-bold text-amber-400 whitespace-nowrap">{formatCurrency(item.pemasukan)}</td>
                      <td className="py-3 px-1.5 text-right font-mono font-bold text-slate-400 whitespace-nowrap">{formatCurrency(item.pengeluaran)}</td>
                      <td className="py-3 px-2.5 text-right font-mono font-black text-emerald-400 whitespace-nowrap">{formatCurrency(item.saldo)}</td>
                    </tr>
                  ))}

                  {chartData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Belum ada data riwayat saldo terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-800 pt-3 text-center">
            <span className="text-xs text-slate-400">Total Rekapitulasi: <span className="text-white font-bold">{chartData.length} Bulan</span></span>
          </div>
        </div>

      </div>

    </div>
  );
}

