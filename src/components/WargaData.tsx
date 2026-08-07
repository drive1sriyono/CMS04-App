import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  FileSpreadsheet, 
  PlusCircle, 
  Eye, 
  Edit2, 
  Trash2, 
  X, 
  Home, 
  Phone, 
  Calendar,
  Heart,
  AlertCircle,
  Plus,
  Check,
  CheckCircle2,
  XCircle,
  Receipt,
  DollarSign,
  ShieldCheck,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { User, Warga, FinancialTransaction, PaymentSubmission } from '../types';
import { calculateAge, formatDate, formatCurrency } from '../data/initialData';

interface WargaDataProps {
  currentUser: User;
  warga: Warga[];
  transactions?: FinancialTransaction[];
  submissions?: PaymentSubmission[];
  onAddWarga: (newWarga: Warga) => void;
  onUpdateWarga: (updatedWarga: Warga) => void;
  onDeleteWarga: (id: string) => void;
}

const ALL_MONTHS_2026 = [
  'Januari 2026',
  'Februari 2026',
  'Maret 2026',
  'April 2026',
  'Mei 2026',
  'Juni 2026',
  'Juli 2026',
  'Agustus 2026',
  'September 2026',
  'Oktober 2026',
  'November 2026',
  'Desember 2026'
];

export default function WargaData({ 
  currentUser, 
  warga, 
  transactions = [],
  submissions = [],
  onAddWarga, 
  onUpdateWarga, 
  onDeleteWarga 
}: WargaDataProps) {
  const canManageWarga = ['admin', 'RT', 'bendahara'].includes(currentUser.role);
  const canDeleteWarga = ['admin', 'RT'].includes(currentUser.role);
  const isWargaRole = currentUser.role === 'warga';
  const [isKartuIuranOpen, setIsKartuIuranOpen] = useState(false);

  // Helper function to calculate paid months for any citizen (Cumulative Sequential Rule)
  const getWargaPaidMonths = (w: Warga): string[] => {
    const paidSet = new Set<string>();

    if (w.paidMonths && Array.isArray(w.paidMonths)) {
      w.paidMonths.forEach(m => paidSet.add(m));
    }

    const nameLower = w.fullName.trim().toLowerCase();
    const usernameLower = w.username?.trim().toLowerCase();
    const targetId = w.id;

    transactions.forEach(t => {
      if (t.type !== 'Pemasukan') return;
      const txWName = t.wargaName?.trim().toLowerCase() || '';
      const txWId = t.wargaId;

      const isMatch = (
        (targetId && txWId && txWId === targetId) ||
        (txWName && (
          txWName === nameLower ||
          (usernameLower && txWName === usernameLower) ||
          txWName === targetId
        ))
      );

      if (isMatch) {
        if (t.paidMonths && Array.isArray(t.paidMonths)) {
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
      if (s.status === 'Approved') {
        const subName = s.wargaName?.trim().toLowerCase() || '';
        const subUser = s.submittedBy?.trim().toLowerCase() || '';
        const subId = s.wargaId;

        const isMatch = (
          (targetId && subId && subId === targetId) ||
          subName === nameLower ||
          (usernameLower && (subName === usernameLower || subUser === usernameLower)) ||
          subName === targetId
        );

        if (isMatch && s.paidMonths && Array.isArray(s.paidMonths)) {
          s.paidMonths.forEach(m => paidSet.add(m));
        }
      }
    });

    let maxPaidIdx = -1;
    ALL_MONTHS_2026.forEach((m, idx) => {
      if (paidSet.has(m)) {
        if (idx > maxPaidIdx) maxPaidIdx = idx;
      }
    });

    if (maxPaidIdx < 0) return [];

    return ALL_MONTHS_2026.filter((_, idx) => idx <= maxPaidIdx);
  };

  // Helper to calculate automatic dynamic status (Lunas, Menunggak, Pending)
  const getWargaCalculatedStatus = (w: Warga): 'Lunas' | 'Menunggak' | 'Pending' => {
    // 1. Check if there is any pending submission for this citizen
    const nameLower = w.fullName.trim().toLowerCase();
    const usernameLower = w.username?.trim().toLowerCase();
    const targetId = w.id;

    const isPending = submissions.some(s => {
      if (s.status !== 'Pending') return false;
      const subName = s.wargaName?.trim().toLowerCase() || '';
      const subUser = s.submittedBy?.trim().toLowerCase() || '';
      const subId = s.wargaId;

      return (
        (targetId && subId && subId === targetId) ||
        subName === nameLower ||
        (usernameLower && (subName === usernameLower || subUser === usernameLower)) ||
        subName === targetId
      );
    });

    if (isPending) return 'Pending';

    // 2. Check current month paid status (month index 0 to 11)
    const currentMonthIdx = Math.min(Math.max(new Date().getMonth(), 0), 11);
    const paidMonths = getWargaPaidMonths(w);
    let maxPaidIdx = -1;
    paidMonths.forEach(m => {
      const idx = ALL_MONTHS_2026.indexOf(m);
      if (idx > maxPaidIdx) maxPaidIdx = idx;
    });

    // If citizen has paid for current month or higher, status is Lunas
    if (maxPaidIdx >= currentMonthIdx) {
      return 'Lunas';
    }

    // Otherwise Menunggak
    return 'Menunggak';
  };

  // Helper for range text summary
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

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Lunas' | 'Menunggak' | 'Pending'>('Semua');

  // Modals
  const [selectedWargaForDetail, setSelectedWargaForDetail] = useState<Warga | null>(null);
  const [editingWarga, setEditingWarga] = useState<Warga | null>(null);
  const [isAddingWarga, setIsAddingWarga] = useState(false);

  // Form states for manually adding citizens
  const [addName, setAddName] = useState('');
  const [addBlok, setAddBlok] = useState('');
  const [addHouseStatus, setAddHouseStatus] = useState<'Pemilik' | 'Sewa'>('Pemilik');
  const [addPhone, setAddPhone] = useState('');
  const [addBirthDate, setAddBirthDate] = useState('1990-01-01');
  const [addStatus, setAddStatus] = useState<'Lunas' | 'Menunggak' | 'Pending'>('Pending');

  // Form states for editing
  const [editName, setEditName] = useState('');
  const [editBlok, setEditBlok] = useState('');
  const [editHouseStatus, setEditHouseStatus] = useState<'Pemilik' | 'Sewa'>('Pemilik');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editStatus, setEditStatus] = useState<'Lunas' | 'Menunggak' | 'Pending'>('Pending');

  // Handle Manual Citizens Registration
  const handleAddWargaSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!addName.trim()) {
      alert('Nama lengkap wajib diisi.');
      return;
    }
    if (!addBlok.trim()) {
      alert('Blok rumah wajib diisi.');
      return;
    }

    const newCitizen: Warga = {
      id: `warga-${Date.now()}`,
      fullName: addName.trim(),
      blok: addBlok.trim().toUpperCase(),
      houseStatus: addHouseStatus,
      phone: addPhone.trim(),
      statusIuran: addStatus,
      birthDate: addBirthDate
    };

    onAddWarga(newCitizen);

    // Reset Form
    setAddName('');
    setAddBlok('');
    setAddHouseStatus('Pemilik');
    setAddPhone('');
    setAddBirthDate('1990-01-01');
    setAddStatus('Pending');
    setIsAddingWarga(false);

    alert('Warga berhasil didaftarkan secara manual!');
  };

  // Handle Edit Citizen Trigger
  const startEditWarga = (w: Warga) => {
    setEditingWarga(w);
    setEditName(w.fullName);
    setEditBlok(w.blok);
    setEditHouseStatus(w.houseStatus || 'Pemilik');
    setEditPhone(w.phone);
    setEditBirthDate(w.birthDate);
    setEditStatus(w.statusIuran);
  };

  // Handle Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingWarga) return;
    if (!editName.trim() || !editBlok.trim()) {
      alert('Nama lengkap dan blok wajib diisi.');
      return;
    }

    const updated: Warga = {
      ...editingWarga,
      fullName: editName.trim(),
      blok: editBlok.trim().toUpperCase(),
      houseStatus: editHouseStatus,
      phone: editPhone.trim(),
      birthDate: editBirthDate,
      statusIuran: editStatus
    };

    onUpdateWarga(updated);
    setEditingWarga(null);
    alert('Informasi warga berhasil diperbarui!');
  };

  // Handle Delete Citizen
  const handleDeleteClick = (id: string, name: string) => {
    if (!canDeleteWarga) {
      alert('Hanya Ketua RT dan Admin Sistem yang diperbolehkan menghapus data warga.');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus data warga "${name}" dari sistem? Tindakan ini tidak dapat dibatalkan.`)) {
      onDeleteWarga(id);
      if (selectedWargaForDetail?.id === id) {
        setSelectedWargaForDetail(null);
      }
    }
  };

  // Excel/CSV Exporter
  const exportWargaToExcel = () => {
    if (!canManageWarga) return;

    let headers = 'No,Nama Warga,Blok Rumah,Status Rumah,No HP,Tanggal Lahir,Umur (Tahun),Status Iuran\n';
    
    const rows = warga.map((w, index) => {
      const age = calculateAge(w.birthDate);
      const calcStatus = getWargaCalculatedStatus(w);
      const hStatus = w.houseStatus || 'Pemilik';
      return `${index + 1},"${w.fullName}","${w.blok}","${hStatus}","${w.phone}",${w.birthDate},${age},${calcStatus}`;
    }).join('\n');

    const csvContent = '\uFEFF' + headers + rows; // UTF-8 BOM for MS Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daftar_Warga_RT_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered List (Excludes invisible admin account)
  const filteredWarga = warga.filter(w => {
    const isAdmin = w.username === 'admin' || w.fullName.toLowerCase().includes('administrator');
    if (isAdmin) return false;

    const matchesSearch = 
      w.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.blok.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.phone.includes(searchQuery);

    const calcStatus = getWargaCalculatedStatus(w);
    const matchesStatus = statusFilter === 'Semua' || calcStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Active logged in user record
  const activeWargaRecord = warga.find(
    w => w.fullName.toLowerCase().trim() === currentUser.fullName.toLowerCase().trim() ||
         (w.username && currentUser.username && w.username.toLowerCase() === currentUser.username.toLowerCase())
  );
  const activePaidMonths = activeWargaRecord ? getWargaPaidMonths(activeWargaRecord) : [];
  const activePaidSummary = getPaidRangeSummary(activePaidMonths);

  return (
    <div id="warga_panel" className="space-y-8 animate-fadeIn text-slate-100">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="text-amber-400" size={26} />
            Pengelolaan Data Warga
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Lihat, kelola, dan unduh data sensus iuran kas bulanan warga RT secara digital dan sistematis.
          </p>
        </div>
        
        {canManageWarga && (
          <div className="flex gap-3">
            <button
              onClick={exportWargaToExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 text-slate-200 cursor-pointer"
            >
              <FileSpreadsheet size={15} className="text-amber-400" />
              Unduh Data (Excel)
            </button>
          </div>
        )}
      </div>
      {/* Main Table card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        
        {/* Table Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Data Warga RT04</h3>
            <span className="ml-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {filteredWarga.length} Terdaftar
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute inset-y-0 left-3 my-auto text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari warga, blok, hp..."
                className="pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
              />
            </div>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-amber-500 transition-all"
            >
              <option value="Semua">Semua Status Iuran</option>
              <option value="Lunas">Lunas</option>
              <option value="Menunggak">Menunggak</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Citizens Table */}
        <div className="overflow-x-auto min-w-full rounded-2xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-widest text-[10px] font-bold bg-slate-950">
                <th className="px-4 py-3.5 font-bold text-center w-12">No</th>
                <th className="px-4 py-3.5 font-bold">Nama Warga</th>
                <th className="px-4 py-3.5 font-bold text-center whitespace-nowrap min-w-[100px]">Blok Rumah</th>
                <th className="px-4 py-3.5 font-bold">No HP / WA</th>
                <th className="px-4 py-3.5 font-bold text-center">Status Iuran Bulanan</th>
                <th className="px-4 py-3.5 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredWarga.map((w, index) => {
                const wPaidMonths = getWargaPaidMonths(w);
                const wSummary = getPaidRangeSummary(wPaidMonths);
                const calcStatus = getWargaCalculatedStatus(w);

                // Color badges for automated status
                let statusBadge = '';
                let statusLabel = '';
                if (calcStatus === 'Lunas') {
                  statusBadge = 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold';
                  statusLabel = 'Lunas';
                } else if (calcStatus === 'Pending') {
                  statusBadge = 'bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold';
                  statusLabel = 'Pending';
                } else {
                  statusBadge = 'bg-red-950/60 border border-red-500/40 text-red-400 font-bold';
                  statusLabel = 'Menunggak';
                }

                return (
                  <tr key={w.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5 text-center font-mono text-slate-500 font-bold">{index + 1}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-white block">{w.fullName}</span>
                      {w.username && (
                        <span className="text-[10px] text-amber-400 block font-mono mt-0.5">@{w.username}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap min-w-[100px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-950 text-amber-300 border border-slate-800 text-[10px] font-bold font-mono">
                          {w.blok}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${w.houseStatus === 'Sewa' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                          {w.houseStatus || 'Pemilik'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300 font-medium">{w.phone || '-'}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] tracking-wide ${statusBadge}`}>
                        {statusLabel}
                      </span>
                      <div className="mt-1">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-950 text-amber-300 border border-slate-800">
                          {wSummary.count > 0 ? `Terbayar: ${wSummary.text} (${wSummary.count}/12 Bln)` : 'Belum Ada Pembayaran'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex gap-1.5">
                        {/* View Detail Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedWargaForDetail(w)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          title="Lihat Detail Sensus"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Editor Controls (Admin, RT & Bendahara) */}
                        {canManageWarga && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditWarga(w)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                              title="Edit Informasi Warga"
                            >
                              <Edit2 size={14} />
                            </button>
                            {canDeleteWarga && (
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(w.id, w.fullName)}
                                className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-red-950/60 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                                title="Hapus Warga"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredWarga.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada data warga ditemukan yang memenuhi kriteria pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL: View Detail Warga */}
      {selectedWargaForDetail && (() => {
        const modalPaidMonths = getWargaPaidMonths(selectedWargaForDetail);
        const modalSummary = getPaidRangeSummary(modalPaidMonths);
        const citizenTxs = transactions.filter(t => {
          if (t.type !== 'Pemasukan') return false;
          const targetName = selectedWargaForDetail.fullName.toLowerCase().trim();
          const targetUsername = selectedWargaForDetail.username?.toLowerCase().trim();
          const targetId = selectedWargaForDetail.id;

          const txName = t.wargaName?.toLowerCase().trim() || '';
          const txId = t.wargaId;

          return (
            (txId && txId === targetId) ||
            txName === targetName ||
            (targetUsername && txName === targetUsername) ||
            txName === targetId
          );
        });

        return (
          <div className="fixed inset-0 bg-slate-950/80 flex items-start justify-center pt-4 sm:pt-10 p-4 z-50 animate-fadeIn backdrop-blur-md overflow-y-auto">
            <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setSelectedWargaForDetail(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 border border-slate-700 transition-colors cursor-pointer z-10"
              >
                <X size={16} />
              </button>

              {/* Citizen Header */}
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedWargaForDetail.fullName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-amber-400 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Blok {selectedWargaForDetail.blok}
                    </span>
                    {selectedWargaForDetail.username && (
                      <span className="text-xs text-slate-400 font-mono">@{selectedWargaForDetail.username}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Citizen Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 mb-5">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-0.5">Status Rumah</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${selectedWargaForDetail.houseStatus === 'Sewa' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                    {selectedWargaForDetail.houseStatus || 'Pemilik'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-0.5">No HP / WA</span>
                  <span className="font-mono font-bold text-slate-200">{selectedWargaForDetail.phone || 'Belum diisi'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-0.5">Tanggal Lahir & Umur</span>
                  <span className="font-bold text-slate-200">{formatDate(selectedWargaForDetail.birthDate)} ({calculateAge(selectedWargaForDetail.birthDate)} thn)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-0.5">Status Iuran</span>
                  {(() => {
                    const modalStatus = getWargaCalculatedStatus(selectedWargaForDetail);
                    let badgeBg = 'bg-red-950/80 text-red-400 border border-red-500/40';
                    if (modalStatus === 'Lunas') badgeBg = 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40';
                    else if (modalStatus === 'Pending') badgeBg = 'bg-amber-950/80 text-amber-300 border border-amber-500/40';
                    return (
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeBg}`}>
                        {modalStatus}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Matriks Status Pembayaran Iuran Per Bulan */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Calendar size={14} />
                    Pencatatan Matriks Iuran Bulanan 2026
                  </h4>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    {modalSummary.count} / 12 Bulan Terbayar
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {ALL_MONTHS_2026.map((m) => {
                    const isPaid = modalPaidMonths.includes(m);
                    const shortName = m.replace(' 2026', '');
                    return (
                      <div
                        key={m}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isPaid
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
                            : 'card-soft-grey-unpaid border-slate-200 text-slate-400 font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {isPaid ? <CheckCircle2 size={13} className="text-emerald-500" /> : <XCircle size={13} className="text-slate-400" />}
                          <span className="text-xs font-bold">{shortName}</span>
                        </div>
                        <span className={`text-[10px] font-mono block ${isPaid ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`}>
                          {isPaid ? 'LUNAS (Rp 60rb)' : 'BELUM BAYAR'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Riwayat Setoran Iuran Warga Ini */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Receipt size={14} className="text-amber-400" />
                  Riwayat Transaksi Setoran Iuran ({citizenTxs.length})
                </h4>

                {citizenTxs.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/80">
                    {citizenTxs.map(tx => (
                      <div key={tx.id} className="p-3 text-xs flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{formatDate(tx.date)}</span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                              {formatCurrency(tx.amount)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{tx.description}</p>
                        </div>
                        {tx.proofImage && (
                          <a
                            href={tx.proofImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-amber-400 underline shrink-0 hover:text-amber-300 font-bold"
                          >
                            Bukti Bayar
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-500">
                    Belum ada catatan transaksi pemasukan resmi untuk warga ini.
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {canManageWarga && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedWargaForDetail;
                      setSelectedWargaForDetail(null);
                      startEditWarga(target);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <Edit2 size={14} />
                    Edit Data
                  </button>
                )}
                {canDeleteWarga && (
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(selectedWargaForDetail.id, selectedWargaForDetail.fullName)}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    Hapus
                  </button>
                )}
                <button
                  onClick={() => setSelectedWargaForDetail(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-slate-700"
                >
                  Tutup Detail
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Register New Citizen Manual Form */}
      {isAddingWarga && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-start justify-center pt-4 sm:pt-10 p-4 z-50 animate-fadeIn backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddingWarga(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <PlusCircle size={20} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Daftarkan Warga Sensus</h3>
            </div>

            <form onSubmit={handleAddWargaSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Nama Lengkap Warga</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  placeholder="Nama warga baru"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Blok Rumah</label>
                  <input
                    type="text"
                    value={addBlok}
                    onChange={(e) => setAddBlok(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                    placeholder="Contoh: B-14"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">No HP / WhatsApp</label>
                  <input
                    type="text"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                    placeholder="Contoh: 0853..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Tanggal Lahir</label>
                <input
                  type="date"
                  value={addBirthDate}
                  onChange={(e) => setAddBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-all font-medium"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingWarga(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase tracking-wider transition-colors border border-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 gold-gradient-bg text-slate-950 font-black uppercase tracking-wider transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  Tambah Warga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Citizen Form */}
      {editingWarga && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-start justify-center pt-4 sm:pt-10 p-4 z-50 animate-fadeIn backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingWarga(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <Edit2 size={18} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Edit Informasi Sensus</h3>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Nama Lengkap Warga</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  placeholder="Nama lengkap"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Blok Rumah</label>
                  <input
                    type="text"
                    value={editBlok}
                    onChange={(e) => setEditBlok(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                    placeholder="Contoh: B-14"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Status Rumah</label>
                  <select
                    value={editHouseStatus}
                    onChange={(e) => setEditHouseStatus(e.target.value as 'Pemilik' | 'Sewa')}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-semibold focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
                  >
                    <option value="Pemilik">Pemilik</option>
                    <option value="Sewa">Sewa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">No HP / WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  placeholder="Contoh: 0853..."
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Tanggal Lahir</label>
                <input
                  type="date"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-all font-medium"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingWarga(null)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase tracking-wider transition-colors border border-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 gold-gradient-bg text-slate-950 font-black uppercase tracking-wider transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

