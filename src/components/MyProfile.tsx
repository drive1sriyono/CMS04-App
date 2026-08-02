import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  Phone, 
  Home, 
  Calendar, 
  Plus, 
  Trash2, 
  Users, 
  CheckCircle,
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { User, FamilyMember, Warga, FinancialTransaction, PaymentSubmission } from '../types';
import { calculateAge } from '../data/initialData';

interface MyProfileProps {
  currentUser: User;
  warga?: Warga[];
  transactions?: FinancialTransaction[];
  submissions?: PaymentSubmission[];
  onUpdateUser: (updatedUser: User) => void;
}

const ALL_MONTHS_2026 = [
  'Januari 2026', 'Februari 2026', 'Maret 2026', 'April 2026',
  'Mei 2026', 'Juni 2026', 'Juli 2026', 'Agustus 2026',
  'September 2026', 'Oktober 2026', 'November 2026', 'Desember 2026'
];

export default function MyProfile({ 
  currentUser, 
  warga = [],
  transactions = [],
  submissions = [],
  onUpdateUser 
}: MyProfileProps) {
  // Form minimize toggle states (default minimized as requested)
  const [isPersonalDataOpen, setIsPersonalDataOpen] = useState(false);
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);

  // Personal Data Form State
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [username, setUsername] = useState(currentUser.username);
  const [password, setPassword] = useState(currentUser.passwordHash);
  const [showPassword, setShowPassword] = useState(false);
  const [blok, setBlok] = useState(currentUser.blok);
  const [houseStatus, setHouseStatus] = useState<'Pemilik' | 'Sewa'>(currentUser.houseStatus || 'Pemilik');
  const [phone, setPhone] = useState(currentUser.phone);
  const [birthDate, setBirthDate] = useState(currentUser.birthDate);
  const [successMsg, setSuccessMsg] = useState('');

  // Family Members State
  const [family, setFamily] = useState<FamilyMember[]>(currentUser.family || []);
  
  // New Family Member Form State
  const [newFamName, setNewFamName] = useState('');
  const [newFamRelation, setNewFamRelation] = useState('');
  const [newFamBirthDate, setNewFamBirthDate] = useState('');
  const [famError, setFamError] = useState('');

  // Save Personal Data
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');

    if (!fullName.trim() || !username.trim() || !password.trim()) {
      alert('Nama lengkap, username, dan kata sandi wajib diisi.');
      return;
    }

    const updated: User = {
      ...currentUser,
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      passwordHash: password,
      blok: blok.trim(),
      houseStatus,
      phone: phone.trim(),
      birthDate: birthDate || '',
      family // Keep family synchronized
    };

    onUpdateUser(updated);
    setSuccessMsg('Profil pribadi Anda berhasil diperbarui.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Add Family Member
  const handleAddFamilyMember = (e: React.FormEvent) => {
    e.preventDefault();
    setFamError('');

    if (!newFamName.trim()) {
      setFamError('Nama keluarga wajib diisi.');
      return;
    }
    if (!newFamRelation.trim()) {
      setFamError('Status hubungan wajib diisi.');
      return;
    }

    const newMember: FamilyMember = {
      id: `fam-${Date.now()}`,
      name: newFamName.trim(),
      relationship: newFamRelation.trim(),
      birthDate: newFamBirthDate || ''
    };

    const updatedFamily = [...family, newMember];
    setFamily(updatedFamily);
    
    // Auto-update parent state and localStorage immediately to ensure seamless experience
    const updatedUser = {
      ...currentUser,
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      passwordHash: password,
      blok: blok.trim(),
      houseStatus,
      phone: phone.trim(),
      birthDate,
      family: updatedFamily
    };
    onUpdateUser(updatedUser);

    // Reset Form
    setNewFamName('');
    setNewFamRelation('');
    setNewFamBirthDate('');
    
    setSuccessMsg('Anggota keluarga berhasil ditambahkan.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Delete Family Member
  const handleDeleteFamilyMember = (id: string) => {
    const updatedFamily = family.filter(f => f.id !== id);
    setFamily(updatedFamily);

    const updatedUser = {
      ...currentUser,
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      passwordHash: password,
      blok: blok.trim(),
      houseStatus,
      phone: phone.trim(),
      birthDate,
      family: updatedFamily
    };
    onUpdateUser(updatedUser);

    setSuccessMsg('Anggota keluarga berhasil dihapus.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div id="profile_panel" className="space-y-8 animate-fadeIn text-slate-100">
      
      {/* Introduction banner */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <UserIcon className="text-amber-400" size={26} />
          Kelola Profil Saya & Data Keluarga
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Perbarui informasi pribadi dan susunan anggota keluarga Anda untuk pencatatan sensus RT yang akurat.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs rounded-2xl flex items-center gap-2 font-semibold animate-fadeIn shadow-lg">
          <CheckCircle size={18} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid for Personal Form & Family Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Form Data Pribadi (Left Side) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl h-fit">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <UserIcon size={20} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Form Data Pribadi</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPersonalDataOpen(!isPersonalDataOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-400 border-2 border-amber-500/80 text-[11px] font-bold shadow-md shadow-amber-500/10 transition-all cursor-pointer shrink-0"
            >
              {isPersonalDataOpen ? (
                <>
                  <ChevronUp size={14} className="text-amber-400" />
                  <span>Sembunyikan (Minimize)</span>
                </>
              ) : (
                <>
                  <ChevronDown size={14} className="text-amber-400" />
                  <span>Buka Form</span>
                </>
              )}
            </button>
          </div>

          {isPersonalDataOpen && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
            
            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                placeholder="Contoh: Budi Santoso"
              />
            </div>

            {/* Grid Username & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  placeholder="Username login"
                />
              </div>

              {/* Password (with Eye Toggle) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                    placeholder="Sandi login"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-amber-400 cursor-pointer"
                    title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Blok & Status Rumah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Blok Rumah */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Home size={12} className="text-amber-400" />
                  Blok Rumah
                </label>
                <input
                  type="text"
                  value={blok}
                  onChange={(e) => setBlok(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  placeholder="Contoh: C-09"
                />
              </div>

              {/* Status Rumah */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Home size={12} className="text-amber-400" />
                  Status Rumah
                </label>
                <select
                  value={houseStatus}
                  onChange={(e) => setHouseStatus(e.target.value as 'Pemilik' | 'Sewa')}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
                >
                  <option value="Pemilik">Pemilik</option>
                  <option value="Sewa">Sewa</option>
                </select>
              </div>
            </div>

            {/* Grid No HP & Tanggal Lahir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* No HP */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-amber-400" />
                    No HP / WhatsApp
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-mono font-normal lowercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  placeholder="Contoh: 08781234... (opsional)"
                />
              </div>

              {/* Tanggal Lahir */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-amber-400" />
                    Tanggal Lahir
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-mono font-normal lowercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">(opsional)</span>
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full mt-4 py-3 gold-gradient-bg text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer uppercase tracking-wider"
            >
              <Save size={16} />
              Simpan Data Pribadi
            </button>

          </form>
          )}
        </div>

        {/* Susunan Keluarga (Right Side) */}
        <div className="space-y-6">
          
          {/* Add family member card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Tambah Anggota Keluarga</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddFamilyOpen(!isAddFamilyOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-400 border-2 border-amber-500/80 text-[11px] font-bold shadow-md shadow-amber-500/10 transition-all cursor-pointer shrink-0"
              >
                {isAddFamilyOpen ? (
                  <>
                    <ChevronUp size={14} className="text-amber-400" />
                    <span>Sembunyikan (Minimize)</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} className="text-amber-400" />
                    <span>Buka Form</span>
                  </>
                )}
              </button>
            </div>

            {isAddFamilyOpen && (
              <>
                {famError && (
                  <div className="mb-4 p-2.5 bg-red-950/80 border border-red-500/40 text-red-300 text-xs rounded-xl text-center font-semibold">
                    {famError}
                  </div>
                )}

                <form onSubmit={handleAddFamilyMember} className="space-y-3.5">
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Anggota Keluarga</label>
                    <input
                      type="text"
                      value={newFamName}
                      onChange={(e) => setNewFamName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                      placeholder="Nama lengkap anggota keluarga"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status Hubungan</label>
                      <input
                        type="text"
                        value={newFamRelation}
                        onChange={(e) => setNewFamRelation(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                        placeholder="Contoh: Istri, Anak, Ibu"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                        <span>Tanggal Lahir</span>
                        <span className="text-[10px] text-amber-400/80 font-mono font-normal lowercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">(opsional)</span>
                      </label>
                      <input
                        type="date"
                        value={newFamBirthDate}
                        onChange={(e) => setNewFamBirthDate(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <Plus size={14} className="text-amber-400" />
                    Tambah Anggota
                  </button>

                </form>
              </>
            )}
          </div>

          {/* List of current family members */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center justify-between">
              <span>Susunan Keluarga Terdaftar</span>
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold">{family.length} Orang</span>
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold bg-slate-950">
                    <th className="px-3.5 py-2.5 font-bold">Nama</th>
                    <th className="px-3.5 py-2.5 font-bold">Hubungan</th>
                    <th className="px-3.5 py-2.5 font-bold text-center">Umur</th>
                    <th className="px-3.5 py-2.5 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {family.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-800/50 transition-colors group">
                      <td className="px-3.5 py-3 font-bold text-white">{member.name}</td>
                      <td className="px-3.5 py-3">
                        <span className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-semibold text-[10px]">
                          {member.relationship}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center font-mono font-bold text-slate-300">
                        {member.birthDate ? `${calculateAge(member.birthDate)} thn` : '-'}
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteFamilyMember(member.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/60 rounded-lg transition-colors cursor-pointer"
                          title="Hapus anggota"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {family.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        Belum ada anggota keluarga terdaftar. Isi formulir di atas untuk mendaftarkan keluarga Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>

      {/* Connected Payment Card Section */}
      {(() => {
        if (currentUser.role === 'admin') return null;

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
              ALL_MONTHS_2026.forEach(m => {
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

        const currentMonthIdx = Math.min(Math.max(new Date().getMonth(), 0), 11);
        let maxPaidIdx = -1;
        ALL_MONTHS_2026.forEach((m, idx) => {
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

        return (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 mt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <CheckCircle size={18} className="text-amber-400" />
                  <span>Kartu & Status Pembayaran Iuran Akun Saya</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Status iuran terkoneksi otomatis dengan akun @{currentUser.username} (Blok {currentUser.blok})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeStyle}`}>
                  {statusText}
                </span>
                <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  {paidSet.size}/12 Bulan
                </span>
              </div>
            </div>

            {/* Matrix 2026 */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Matriks Setoran 2026</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {ALL_MONTHS_2026.map(m => {
                  const isPaid = paidSet.has(m);
                  const isPending = pendingSet.has(m);
                  const shortM = m.replace(' 2026', '');

                  let cardClass = 'bg-slate-950/80 border-slate-800 text-slate-500';
                  let status = 'Belum Lunas';

                  if (isPaid) {
                    cardClass = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold';
                    status = 'Lunas';
                  } else if (isPending) {
                    cardClass = 'bg-amber-950/60 border-amber-500/40 text-amber-300 font-bold';
                    status = 'Verifikasi';
                  }

                  return (
                    <div key={m} className={`p-2.5 rounded-xl border text-center transition-all ${cardClass}`}>
                      <p className="text-[11px] font-bold">{shortM}</p>
                      <p className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">{status}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Transaction List */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Histori Transaksi Account Saya ({myTxs.length + mySubmissions.length})
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
          </div>
        );
      })()}

    </div>
  );
}

