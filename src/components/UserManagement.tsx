import React, { useState } from 'react';
import { 
  ShieldAlert, 
  UserPlus, 
  Trash2, 
  Home, 
  Phone,
  Shield,
  Edit2,
  X,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { User, UserRole } from '../types';

interface UserManagementProps {
  currentUser: User;
  users: User[];
  onAddUser: (newUser: User) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (userId: string) => void;
}

export default function UserManagement({ 
  currentUser, 
  users, 
  onAddUser, 
  onUpdateUser, 
  onDeleteUser 
}: UserManagementProps) {
  
  // Guard check
  if (currentUser.role !== 'RT' && currentUser.role !== 'admin') {
    return (
      <div className="p-8 bg-red-950/60 border border-red-500/40 rounded-3xl text-center space-y-4 shadow-2xl">
        <ShieldAlert size={44} className="text-red-400 mx-auto" />
        <h3 className="text-base font-bold text-white uppercase tracking-wider">Akses Ditolak</h3>
        <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
          Maaf, menu Manajemen Pengguna ini hanya dapat diakses secara penuh oleh pengguna dengan wewenang <strong className="text-amber-400">Admin / Ketua RT</strong>.
        </p>
      </div>
    );
  }

  // Minimize states (default minimized as requested)
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isAccountListOpen, setIsAccountListOpen] = useState(false);
  const [showTablePasswords, setShowTablePasswords] = useState(false);

  // Form states for creating a new user
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('1234'); // requested default password
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [blok, setBlok] = useState('');
  const [houseStatus, setHouseStatus] = useState<'Pemilik' | 'Sewa'>('Pemilik');
  const [role, setRole] = useState<UserRole>('warga');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('1990-01-01');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editBlok, setEditBlok] = useState('');
  const [editHouseStatus, setEditHouseStatus] = useState<'Pemilik' | 'Sewa'>('Pemilik');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('warga');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Handle Create User
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');

    if (!fullName.trim() || !username.trim() || !password.trim() || !blok.trim()) {
      alert('Semua kolom wajib diisi kecuali No HP.');
      return;
    }

    // Check if username already exists
    const exists = users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (exists) {
      alert(`Username @${username.trim().toLowerCase()} sudah digunakan oleh pengguna lain.`);
      return;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      passwordHash: password,
      role,
      blok: blok.trim().toUpperCase(),
      houseStatus,
      phone: phone.trim(),
      birthDate,
      family: []
    };

    onAddUser(newUser);

    // Reset Form
    setFullName('');
    setUsername('');
    setPassword('1234');
    setBlok('');
    setHouseStatus('Pemilik');
    setPhone('');
    setBirthDate('1990-01-01');
    setRole('warga');

    setSuccessMsg(`Akun untuk @${newUser.username} berhasil didaftarkan!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Filter users based on logged-in account role:
  // Non-admin accounts (like RT) cannot see the Administrator System account in User Management.
  const visibleUsers = users.filter(u => {
    const isMainAdmin = u.id === 'user-admin' || u.username === 'admin' || u.role === 'admin';
    if (currentUser.role !== 'admin' && isMainAdmin) {
      return false;
    }
    return true;
  });

  // Handle Delete Click
  const handleDeleteClick = (user: User) => {
    if (user.id === 'user-admin' || user.username === 'admin') {
      alert('Akun Administrator System adalah akun admin utama dan tidak dapat dihapus.');
      return;
    }

    if (user.id === currentUser.id) {
      alert('Anda tidak bisa menghapus akun Anda sendiri yang sedang aktif.');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus pengguna "${user.fullName}" (@${user.username})? Semua data profil keluarga terkait juga akan dihapus.`)) {
      onDeleteUser(user.id);
      setSuccessMsg(`Akun @${user.username} telah dihapus.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // Edit User Modal trigger
  const startEditUser = (user: User) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditPassword(user.passwordHash);
    setEditBlok(user.blok);
    setEditHouseStatus(user.houseStatus || 'Pemilik');
    setEditPhone(user.phone);
    setEditRole(user.role);
    setEditBirthDate(user.birthDate || '1990-01-01');
  };

  // Save edited user
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) return;
    if (!editFullName.trim() || !editUsername.trim() || !editPassword.trim() || !editBlok.trim()) {
      alert('Mohon lengkapi seluruh isian formulir edit.');
      return;
    }

    // Check username collision
    const exists = users.some(u => u.id !== editingUser.id && u.username.toLowerCase() === editUsername.trim().toLowerCase());
    if (exists) {
      alert(`Username @${editUsername.trim().toLowerCase()} sudah digunakan oleh akun lain.`);
      return;
    }

    const updated: User = {
      ...editingUser,
      fullName: editFullName.trim(),
      username: editUsername.trim().toLowerCase(),
      passwordHash: editPassword,
      role: editRole,
      blok: editBlok.trim().toUpperCase(),
      houseStatus: editHouseStatus,
      phone: editPhone.trim(),
      birthDate: editBirthDate
    };

    onUpdateUser(updated);
    setEditingUser(null);
    setSuccessMsg(`Profil akun @${updated.username} berhasil diperbarui.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div id="user_mgt_panel" className="space-y-8 animate-fadeIn text-slate-100">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Shield className="text-amber-400" size={26} />
          Manajemen Akses Pengguna
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Daftarkan akun login untuk warga baru, bendahara keuangan, atau kelola kata sandi akun warga yang mengalami kendala login.
        </p>
      </div>

       {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs rounded-2xl flex items-center gap-2 font-semibold animate-fadeIn shadow-lg">
          <CheckCircle size={18} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Columns for Adding User & Current Users List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Tambah User Card */}
        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl h-fit">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Buat Akun Login Baru</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateAccountOpen(!isCreateAccountOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-400 border-2 border-amber-500/80 text-[11px] font-bold shadow-md shadow-amber-500/10 transition-all cursor-pointer shrink-0"
            >
              {isCreateAccountOpen ? (
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

          {isCreateAccountOpen && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Nama Lengkap</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama lengkap warga/pengurus"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  />
                </div>

                {/* Username & Password Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Contoh: agus"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Kata Sandi</label>
                    <div className="relative">
                      <input
                        type={showCreatePassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Default: 1234"
                        className="w-full pl-3.5 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-all font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-amber-400 cursor-pointer"
                        title={showCreatePassword ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showCreatePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Blok & Status Rumah Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1">
                      <Home size={11} className="text-amber-400" />
                      Blok Rumah
                    </label>
                    <input
                      type="text"
                      value={blok}
                      onChange={(e) => setBlok(e.target.value)}
                      placeholder="Contoh: A-05"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1">
                      <Home size={11} className="text-amber-400" />
                      Status Rumah
                    </label>
                    <select
                      value={houseStatus}
                      onChange={(e) => setHouseStatus(e.target.value as 'Pemilik' | 'Sewa')}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-semibold focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
                    >
                      <option value="Pemilik">Pemilik</option>
                      <option value="Sewa">Sewa</option>
                    </select>
                  </div>
                </div>

                {/* No HP & Tanggal Lahir Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1">
                      <Phone size={11} className="text-amber-400" />
                      No HP / WA
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 0812..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Hak Akses (Role)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-bold focus:outline-none focus:border-amber-500 transition-all"
                  >
                    <option value="warga">Warga (Terbatas)</option>
                    <option value="bendahara">Bendahara (Keuangan)</option>
                    <option value="RT">RT (Administrator RT)</option>
                    <option value="admin">Admin (System Admin)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 gold-gradient-bg text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer uppercase tracking-wider"
                >
                  <UserPlus size={14} />
                  Daftarkan Akun
                </button>

              </form>

              {/* Sensus Sync Tip */}
              <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-start gap-2.5 text-[11px] text-slate-400 leading-normal">
                <HelpCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-200">Sensus Otomatis:</strong> Pendaftaran akun dengan role <strong>Warga</strong> otomatis menambahkan data warga pada daftar sensus RT.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Users Table Card */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Daftar Akun Login Terdaftar</h3>
              <span className="ml-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {visibleUsers.length} Akun
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAccountListOpen(!isAccountListOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-400 border-2 border-amber-500/80 text-[11px] font-bold shadow-md shadow-amber-500/10 transition-all cursor-pointer shrink-0"
            >
              {isAccountListOpen ? (
                <>
                  <ChevronUp size={14} className="text-amber-400" />
                  <span>Sembunyikan (Minimize)</span>
                </>
              ) : (
                <>
                  <ChevronDown size={14} className="text-amber-400" />
                  <span>Buka Daftar</span>
                </>
              )}
            </button>
          </div>

          {isAccountListOpen && (

          <div className="overflow-x-auto min-w-full rounded-2xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-widest text-[10px] font-bold bg-slate-950">
                  <th className="px-4 py-3.5 font-bold">Nama Lengkap</th>
                  <th className="px-4 py-3.5 font-bold">Username</th>
                  <th className="px-4 py-3.5 font-bold text-center whitespace-nowrap min-w-[100px]">Blok Rumah</th>
                  <th className="px-4 py-3.5 font-bold text-center">Role / Jabatan</th>
                  <th className="px-4 py-3.5 font-bold text-center font-mono">
                    <button
                      type="button"
                      onClick={() => setShowTablePasswords(!showTablePasswords)}
                      className="inline-flex items-center gap-1 hover:text-amber-400 cursor-pointer"
                      title={showTablePasswords ? 'Sembunyikan Sandi' : 'Tampilkan Sandi'}
                    >
                      <span>Sandi</span>
                      {showTablePasswords ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </th>
                  <th className="px-4 py-3.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {visibleUsers.map((u) => {
                  let roleColor = '';
                  if (u.role === 'admin') roleColor = 'bg-purple-950/60 text-purple-400 border border-purple-500/40 font-bold';
                  else if (u.role === 'RT') roleColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold';
                  else if (u.role === 'bendahara') roleColor = 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-bold';
                  else roleColor = 'bg-slate-800 text-slate-300 border border-slate-700';

                  const isMainAdmin = u.id === 'user-admin' || u.username === 'admin';
                  const isCurrent = u.id === currentUser.id;
                  const cannotDelete = isCurrent || isMainAdmin;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-white">
                        {u.fullName}
                        {u.id === currentUser.id && (
                          <span className="ml-2 text-[9px] uppercase tracking-wider px-2 py-0.5 gold-gradient-bg text-slate-950 rounded-md font-black">Anda</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-amber-400 font-bold">@{u.username}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap min-w-[100px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-amber-300 font-mono font-bold text-[10px]">
                            {u.blok}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${u.houseStatus === 'Sewa' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                            {u.houseStatus || 'Pemilik'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${roleColor}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-slate-400 font-bold tracking-widest">
                        {showTablePasswords ? u.passwordHash : '••••••••'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEditUser(u)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Edit Akun"
                          >
                            <Edit2 size={14} />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(u)}
                            disabled={cannotDelete}
                            className={`p-1.5 rounded-lg border transition-colors ${cannotDelete ? 'text-slate-600 bg-slate-950 border-slate-900 cursor-not-allowed' : 'text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-red-950/60 border-slate-700 cursor-pointer'}`}
                            title={isMainAdmin ? 'Akun Admin Utama (Tidak dapat dihapus)' : isCurrent ? 'Akun Aktif Anda' : 'Hapus Akun'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

        </div>

      </div>

      {/* MODAL: Edit User Form */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-start justify-center pt-4 sm:pt-10 p-4 z-50 animate-fadeIn backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-auto sm:my-0">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-3.5 mb-5">
              <Edit2 size={18} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Edit Akun Pengguna</h3>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Nama Lengkap</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Kata Sandi</label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-all font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-amber-400 cursor-pointer"
                      title={showEditPassword ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showEditPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Blok Rumah</label>
                  <input
                    type="text"
                    value={editBlok}
                    onChange={(e) => setEditBlok(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">No HP</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
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
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-bold uppercase tracking-widest text-[10px]">Hak Akses (Role)</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={editingUser.id === currentUser.id || editingUser.id === 'user-admin' || editingUser.username === 'admin'}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-bold focus:outline-none disabled:bg-slate-950 disabled:text-slate-600 transition-all"
                >
                  <option value="warga">Warga</option>
                  <option value="bendahara">Bendahara</option>
                  <option value="RT">RT (Administrator RT)</option>
                  <option value="admin">Admin (System Admin)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 gold-gradient-bg text-slate-950 font-black rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer uppercase tracking-wider"
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

