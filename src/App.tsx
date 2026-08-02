import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  User as UserIcon, 
  DollarSign, 
  Users, 
  Lock, 
  Database, 
  LogOut, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';

// Import Components
import Cms04Logo from './components/Cms04Logo';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';

// Import Types
import { User, Warga, FinancialTransaction, PaymentSubmission, DatabaseStatus } from './types';

// Import Data Managers
import { 
  getStoredUsers, 
  saveStoredUsers, 
  getStoredWarga, 
  saveStoredWarga, 
  getStoredTransactions, 
  saveStoredTransactions, 
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredDbStatus, 
  saveStoredDbStatus 
} from './data/initialData';

// Import Views
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MyProfile from './components/MyProfile';
import Finance from './components/Finance';
import WargaData from './components/WargaData';
import UserManagement from './components/UserManagement';
import BackupRestore from './components/BackupRestore';

export default function App() {
  // Application Global States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [warga, setWarga] = useState<Warga[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({ connected: false, mode: 'offline' });
  
  // Navigation States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'finance' | 'warga' | 'users' | 'backup'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize and load states on mount
  useEffect(() => {
    document.title = 'CMS04';
    setUsers(getStoredUsers());
    setWarga(getStoredWarga());
    setTransactions(getStoredTransactions());
    setSubmissions(getStoredSubmissions());
    setDbStatus(getStoredDbStatus());

    // Auto-login session recovery from sessionStorage if available
    const cachedUser = sessionStorage.getItem('rt_digital_active_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setCurrentUser(parsed);
      } catch (e) {
        sessionStorage.removeItem('rt_digital_active_user');
      }
    }
  }, []);

  // Sync personal profile modifications instantly to currentUser session state
  const handleUpdateUser = (updatedUser: User) => {
    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      sessionStorage.setItem('rt_digital_active_user', JSON.stringify(updatedUser));
    }

    // Also automatically sync in citizen list if they are registered there
    const existsInWarga = warga.some(w => w.id === updatedUser.id);
    if (existsInWarga || updatedUser.role === 'warga') {
      const updatedWargaList = warga.map(w => {
        if (w.id === updatedUser.id) {
          return {
            ...w,
            fullName: updatedUser.fullName,
            blok: updatedUser.blok,
            houseStatus: updatedUser.houseStatus,
            phone: updatedUser.phone,
            birthDate: updatedUser.birthDate
          };
        }
        return w;
      });
      setWarga(updatedWargaList);
      saveStoredWarga(updatedWargaList);
    }
  };

  // Add User Trigger - synchronizes with Warga listing if the role is 'warga'
  const handleAddUser = (newUser: User) => {
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    if (newUser.role === 'warga') {
      const newWarga: Warga = {
        id: newUser.id,
        fullName: newUser.fullName,
        username: newUser.username,
        blok: newUser.blok,
        houseStatus: newUser.houseStatus,
        phone: newUser.phone,
        statusIuran: 'Pending', // default status on new user creation
        birthDate: newUser.birthDate
      };
      const updatedWargaList = [...warga, newWarga];
      setWarga(updatedWargaList);
      saveStoredWarga(updatedWargaList);
    }
  };

  // Delete user trigger - deletes corresponding citizens list (warga)
  const handleDeleteUser = (userId: string) => {
    // Prevent deletion of Main Admin account
    if (userId === 'user-admin') {
      alert('Akun Administrator System adalah akun admin utama dan tidak dapat dihapus.');
      return;
    }

    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    const updatedWargaList = warga.filter(w => w.id !== userId);
    setWarga(updatedWargaList);
    saveStoredWarga(updatedWargaList);
  };

  // Add Citizen trigger
  const handleAddWarga = (newW: Warga) => {
    const updatedW = [...warga, newW];
    setWarga(updatedW);
    saveStoredWarga(updatedW);
  };

  // Update Citizen status/block
  const handleUpdateWarga = (updatedW: Warga) => {
    const updatedWList = warga.map(w => w.id === updatedW.id ? updatedW : w);
    setWarga(updatedWList);
    saveStoredWarga(updatedWList);

    // Also sync to matching user account if any
    const userAcc = users.find(u => u.id === updatedW.id);
    if (userAcc) {
      const updatedAcc = {
        ...userAcc,
        fullName: updatedW.fullName,
        blok: updatedW.blok,
        houseStatus: updatedW.houseStatus,
        phone: updatedW.phone,
        birthDate: updatedW.birthDate
      };
      const updatedUsers = users.map(u => u.id === updatedW.id ? updatedAcc : u);
      setUsers(updatedUsers);
      saveStoredUsers(updatedUsers);

      if (currentUser && currentUser.id === updatedW.id) {
        setCurrentUser(updatedAcc);
        sessionStorage.setItem('rt_digital_active_user', JSON.stringify(updatedAcc));
      }
    }
  };

  // Delete Citizen trigger
  const handleDeleteWarga = (id: string) => {
    const targetWarga = warga.find(w => w.id === id);

    // Prevent deletion of Main Admin account
    if (targetWarga && (targetWarga.id === 'user-admin' || targetWarga.username === 'admin' || targetWarga.fullName.toLowerCase().includes('administrator'))) {
      alert('Akun Administrator System adalah akun admin utama dan tidak dapat dihapus.');
      return;
    }

    const targetName = targetWarga?.fullName?.toLowerCase().trim();
    const targetUsername = targetWarga?.username?.toLowerCase().trim();

    const updatedW = warga.filter(w => {
      if (w.id === id) return false;
      if (targetName && w.fullName.toLowerCase().trim() === targetName) return false;
      if (targetUsername && w.username && w.username.toLowerCase().trim() === targetUsername) return false;
      return true;
    });
    setWarga(updatedW);
    saveStoredWarga(updatedW);

    // Also remove matching user account to avoid orphan credentials
    const updatedUsers = users.filter(u => {
      if (u.id === id) return false;
      if (targetName && u.fullName.toLowerCase().trim() === targetName) return false;
      if (targetUsername && u.username && u.username.toLowerCase().trim() === targetUsername) return false;
      return true;
    });
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
  };

  // Add financial transaction
  const handleAddTransaction = (newTx: FinancialTransaction) => {
    const updatedTx = [...transactions, newTx];
    setTransactions(updatedTx);
    saveStoredTransactions(updatedTx);

    // Dynamic auto-action: If it is a Pemasukan related to a citizen payment,
    // let's set their citizen iuran status to 'Lunas'!
    if (newTx.type === 'Pemasukan' && newTx.wargaName) {
      const match = warga.find(w => w.fullName.toLowerCase().trim() === newTx.wargaName?.toLowerCase().trim());
      if (match) {
        const existingMonths = match.paidMonths || [];
        const newPaidMonths = newTx.paidMonths || [];
        const mergedMonths = Array.from(new Set([...existingMonths, ...newPaidMonths]));
        const updatedW = { ...match, paidMonths: mergedMonths, statusIuran: 'Lunas' as const };
        handleUpdateWarga(updatedW);
      }
    }
  };

  // Submission action handlers (Warga submission & RT/Bendahara approval)
  const handleAddSubmission = (newSub: PaymentSubmission) => {
    const updated = [newSub, ...submissions];
    setSubmissions(updated);
    saveStoredSubmissions(updated);
  };

  const handleApproveSubmission = (subId: string, reviewerName: string) => {
    const targetSub = submissions.find(s => s.id === subId);
    if (!targetSub) return;

    // 1. Update submission status
    const updatedSubmissions = submissions.map(s => {
      if (s.id === subId) {
        return {
          ...s,
          status: 'Approved' as const,
          reviewedBy: reviewerName,
          reviewedAt: new Date().toISOString()
        };
      }
      return s;
    });
    setSubmissions(updatedSubmissions);
    saveStoredSubmissions(updatedSubmissions);

    // 2. Convert submission to official FinancialTransaction
    const newTx: FinancialTransaction = {
      id: `tx-approved-${Date.now()}`,
      type: 'Pemasukan',
      amount: targetSub.amount,
      date: targetSub.date,
      description: `Iuran Bulanan RT (Verifikasi Online) - ${targetSub.paidMonths.join(', ')}`,
      proofImage: targetSub.proofImage,
      wargaName: targetSub.wargaName,
      paidMonths: targetSub.paidMonths
    };

    const updatedTx = [...transactions, newTx];
    setTransactions(updatedTx);
    saveStoredTransactions(updatedTx);

    // 3. Sync Citizen's paidMonths array and statusIuran
    const match = warga.find(w => w.fullName.toLowerCase().trim() === targetSub.wargaName.toLowerCase().trim());
    if (match) {
      const existingMonths = match.paidMonths || [];
      const mergedMonths = Array.from(new Set([...existingMonths, ...targetSub.paidMonths]));
      const updatedW = { ...match, paidMonths: mergedMonths, statusIuran: 'Lunas' as const };
      handleUpdateWarga(updatedW);
    }
  };

  const handleRejectSubmission = (subId: string, reason: string, reviewerName: string) => {
    const updatedSubmissions = submissions.map(s => {
      if (s.id === subId) {
        return {
          ...s,
          status: 'Rejected' as const,
          rejectionReason: reason,
          reviewedBy: reviewerName,
          reviewedAt: new Date().toISOString()
        };
      }
      return s;
    });
    setSubmissions(updatedSubmissions);
    saveStoredSubmissions(updatedSubmissions);
  };

  // Backup state restore
  const handleRestoreState = (state: {
    users: User[];
    warga: Warga[];
    transactions: FinancialTransaction[];
    dbStatus: DatabaseStatus;
  }) => {
    setUsers(state.users);
    saveStoredUsers(state.users);

    setWarga(state.warga);
    saveStoredWarga(state.warga);

    setTransactions(state.transactions);
    saveStoredTransactions(state.transactions);

    setDbStatus(state.dbStatus);
    saveStoredDbStatus(state.dbStatus);

    // If active user is no longer present in restored list, log out
    if (currentUser) {
      const exists = state.users.find(u => u.id === currentUser.id);
      if (exists) {
        setCurrentUser(exists);
        sessionStorage.setItem('rt_digital_active_user', JSON.stringify(exists));
      } else {
        handleLogout();
      }
    }
  };

  const handleUpdateDbStatus = (status: DatabaseStatus) => {
    setDbStatus(status);
    saveStoredDbStatus(status);
  };

  // Login handler
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('rt_digital_active_user', JSON.stringify(user));
    setActiveTab('dashboard');
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('rt_digital_active_user');
  };

  // If user is not logged in, render Login Page
  if (!currentUser) {
    return <Login users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  // Sidebar navigation options (role-based filter)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'profile', label: 'Profil Saya', icon: <UserIcon size={18} /> },
    { id: 'finance', label: 'Keuangan Kas', icon: <DollarSign size={18} /> },
    { id: 'warga', label: 'Data Warga', icon: <Users size={18} /> },
    { id: 'users', label: 'Manajemen User', icon: <Lock size={18} />, allowedRoles: ['admin', 'RT'] },
    { id: 'backup', label: 'Backup & Database', icon: <Database size={18} />, allowedRoles: ['admin'] }
  ];

  const visibleNavItems = navItems.filter(item => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(currentUser.role);
  });

  // Switch content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} warga={warga} transactions={transactions} submissions={submissions} />;
      case 'profile':
        return <MyProfile currentUser={currentUser} onUpdateUser={handleUpdateUser} />;
      case 'finance':
        return (
          <Finance 
            currentUser={currentUser} 
            warga={warga} 
            transactions={transactions} 
            submissions={submissions}
            onAddTransaction={handleAddTransaction} 
            onAddSubmission={handleAddSubmission}
            onApproveSubmission={handleApproveSubmission}
            onRejectSubmission={handleRejectSubmission}
          />
        );
      case 'warga':
        return (
          <WargaData 
            currentUser={currentUser} 
            warga={warga} 
            transactions={transactions}
            submissions={submissions}
            onAddWarga={handleAddWarga} 
            onUpdateWarga={handleUpdateWarga} 
            onDeleteWarga={handleDeleteWarga} 
          />
        );
      case 'users':
        if (currentUser.role !== 'admin' && currentUser.role !== 'RT') {
          return <Dashboard currentUser={currentUser} warga={warga} transactions={transactions} submissions={submissions} />;
        }
        return (
          <UserManagement 
            currentUser={currentUser} 
            users={users} 
            onAddUser={handleAddUser} 
            onUpdateUser={handleUpdateUser} 
            onDeleteUser={handleDeleteUser} 
          />
        );
      case 'backup':
        if (currentUser.role !== 'admin') {
          return <Dashboard currentUser={currentUser} warga={warga} transactions={transactions} submissions={submissions} />;
        }
        return (
          <BackupRestore 
            currentUser={currentUser} 
            users={users} 
            warga={warga} 
            transactions={transactions} 
            dbStatus={dbStatus} 
            onRestoreState={handleRestoreState} 
            onUpdateDbStatus={handleUpdateDbStatus} 
          />
        );
      default:
        return <Dashboard currentUser={currentUser} warga={warga} transactions={transactions} submissions={submissions} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Mobile Bar (Hidden in desktop) */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-xl">
        <div className="flex items-center gap-2">
          <Cms04Logo size={32} />
          <div>
            <span className="font-black text-white text-base tracking-tight block leading-tight">CMS04</span>
            <span className="text-[8px] text-amber-400 font-bold tracking-widest block uppercase">CMS RT04 PWA</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <PwaInstallPrompt variant="compact" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-amber-400 hover:text-white rounded-xl bg-slate-800 border border-slate-700 cursor-pointer"
            title="Buka menu navigasi"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* SIDEBAR (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-900/95 border-r border-slate-800/90 shrink-0 sticky top-0 h-screen justify-between p-5 shadow-2xl backdrop-blur-lg">
          <div className="space-y-6">
            
            {/* Logo Header */}
            <div className="flex items-center gap-3 px-2">
              <Cms04Logo size={44} />
              <div className="min-w-0">
                <span className="font-black text-white text-lg tracking-tight block leading-none">
                  CMS<span className="gold-gradient-text">04</span>
                </span>
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest block mt-1">PORTAL WARGA CMS RT04</span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5">
              {visibleNavItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <span className={isActive ? 'text-slate-950' : 'text-amber-500/80'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile Capsule & Logout (Desktop Bottom) */}
          <div className="border-t border-slate-800/80 pt-4 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/80 border border-amber-500/20">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black flex items-center justify-center text-xs font-mono shadow-sm">
                {currentUser.username.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-white text-xs block truncate leading-tight">{currentUser.fullName}</span>
                <span className="text-[9px] text-amber-400 font-mono block uppercase tracking-wider font-bold mt-0.5 flex items-center gap-1">
                  <Sparkles size={9} />
                  {currentUser.role}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-red-950/60 hover:text-red-400 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700/80 cursor-pointer"
            >
              <LogOut size={14} />
              Keluar Sesi
            </button>
          </div>
        </aside>

        {/* MOBILE MENU DRAWER (Mobile Only overlay) */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex justify-start animate-fadeIn">
            <div className="w-72 bg-slate-900 border-r border-slate-800 h-full p-5 flex flex-col justify-between shadow-2xl">
              <div className="space-y-6">
                
                {/* Logo with Close button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Cms04Logo size={32} />
                    <span className="font-black text-white tracking-tight">CMS04</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                    title="Tutup menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Mobile Links */}
                <nav className="space-y-1.5">
                  {visibleNavItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                          isActive 
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile Logout */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Pengguna:</span>
                  <span className="font-bold text-white mt-0.5 block">{currentUser.fullName} ({currentUser.role})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-slate-800 hover:bg-red-900/50 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700"
                >
                  <LogOut size={14} />
                  Keluar Sesi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW AREA (Content) */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto pb-24 md:pb-8">
          <PwaInstallPrompt variant="banner" />
          {renderTabContent()}
          <footer className="mt-12 pt-6 border-t border-slate-900 text-center text-[11px] text-slate-500">
            ©2026 by CMS04 Digital Team • PWA Mobile & Desktop App
          </footer>
        </main>

      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (App Like Experience on Mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 border-t border-slate-800/90 backdrop-blur-xl flex justify-around items-center py-2 px-1 shadow-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {visibleNavItems.slice(0, 5).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={isActive ? 'p-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400' : ''}>
                {item.icon}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}

