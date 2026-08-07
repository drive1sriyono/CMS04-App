import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, 
  User as UserIcon, 
  Coins, 
  Users, 
  Lock, 
  Database, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  CreditCard
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

// Import Supabase Sync Helpers
import {
  fetchAllFromSupabase,
  pushAllLocalDataToSupabase,
  syncSingleUserToSupabase,
  deleteUserFromSupabase,
  syncSingleWargaToSupabase,
  deleteWargaFromSupabase,
  syncSingleTransactionToSupabase,
  deleteTransactionFromSupabase,
  syncSingleSubmissionToSupabase,
  deleteSubmissionFromSupabase,
  getSupabaseClient
} from './utils/supabase';

// Import Views
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MyProfile from './components/MyProfile';
import Finance from './components/Finance';
import WargaData from './components/WargaData';
import UserManagement from './components/UserManagement';
import BackupRestore from './components/BackupRestore';
import IuranSaya from './components/IuranSaya';

export default function App() {
  // Application Global States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [warga, setWarga] = useState<Warga[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({ connected: false, mode: 'offline' });
  const [activeToasts, setActiveToasts] = useState<Array<{ id: string; title: string; message: string; type: 'info' | 'success' }>>([]);
  
  // Navigation States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'finance' | 'warga' | 'users' | 'backup' | 'iuran-saya'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Reconcile users with warga list (all non-admin accounts MUST be in Warga list)
  const reconcileUsersAndWarga = (userList: User[], wargaList: Warga[]): Warga[] => {
    let updatedWarga = [...wargaList];

    userList.forEach(user => {
      if (user.role !== 'admin') {
        const idx = updatedWarga.findIndex(
          w => w.id === user.id || (w.username && user.username && w.username.toLowerCase() === user.username.toLowerCase())
        );
        if (idx >= 0) {
          updatedWarga[idx] = {
            ...updatedWarga[idx],
            id: user.id,
            fullName: user.fullName || updatedWarga[idx].fullName,
            username: user.username || updatedWarga[idx].username,
            blok: user.blok || updatedWarga[idx].blok,
            houseStatus: user.houseStatus || updatedWarga[idx].houseStatus || 'Pemilik',
            phone: user.phone || updatedWarga[idx].phone || '',
            birthDate: user.birthDate || updatedWarga[idx].birthDate || ''
          };
        } else {
          updatedWarga.push({
            id: user.id,
            fullName: user.fullName,
            username: user.username,
            blok: user.blok,
            houseStatus: user.houseStatus || 'Pemilik',
            phone: user.phone || '',
            statusIuran: 'Lunas',
            birthDate: user.birthDate || '',
            paidMonths: []
          });
        }
      } else {
        // Exclude admin accounts from Warga listing
        updatedWarga = updatedWarga.filter(
          w => w.id !== user.id && (!w.username || w.username.toLowerCase() !== user.username.toLowerCase())
        );
      }
    });

    return updatedWarga;
  };

  // Helper to notify other open tabs on same device
  const notifyBroadcast = () => {
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('rt_digital_sync_channel');
        bc.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
        bc.close();
      }
    } catch (e) {
      console.error('BroadcastChannel error:', e);
    }
  };

  // Synchronize data with Supabase Cloud
  const runSync = useCallback(async () => {
    try {
      const res = await fetchAllFromSupabase();
      if (res.error) {
        const isNetworkErr = res.error.includes('Failed to fetch') || res.error.includes('TypeError') || res.error.includes('network') || res.error.includes('unreachable');
        if (isNetworkErr) {
          console.warn("Supabase tidak terjangkau (Offline Mode):", res.error);
        } else {
          console.error("Sync error:", res.error);
        }

        setDbStatus(prev => {
          const errMsg = isNetworkErr ? 'Mode Lokal (Offline)' : `Gagal Sinkronisasi: ${res.error}`;
          const updated = {
            ...prev,
            connected: false,
            mode: 'offline' as const,
            lastTested: `${errMsg} (${new Date().toLocaleTimeString('id-ID')})`
          };
          saveStoredDbStatus(updated);
          return updated;
        });
        return;
      }

      if (res.users && res.users.length > 0) {
        const fetchedUsers = res.users;
        const fetchedWarga = res.warga || [];
        const reconciledWarga = reconcileUsersAndWarga(fetchedUsers, fetchedWarga);

        setUsers(fetchedUsers);
        saveStoredUsers(fetchedUsers);
        setWarga(reconciledWarga);
        saveStoredWarga(reconciledWarga);

        if (res.transactions) {
          setTransactions(prevTransactions => {
            const fetchedTxIds = new Set(res.transactions!.map(t => t.id));
            const localOnlyTx = prevTransactions.filter(t => !fetchedTxIds.has(t.id));
            
            // Auto-sync local-only transactions to Supabase!
            if (localOnlyTx.length > 0) {
              console.log(`Auto-syncing ${localOnlyTx.length} local-only transactions to Supabase...`);
              localOnlyTx.forEach(tx => {
                syncSingleTransactionToSupabase(tx);
              });
            }
            
            const merged = [...localOnlyTx, ...res.transactions!];
            saveStoredTransactions(merged);
            return merged;
          });
        }

        if (res.submissions) {
          setSubmissions(prevSubmissions => {
            const fetchedMap = new Map(res.submissions!.map(s => [s.id, s]));
            const localOnlyOrUpdated: PaymentSubmission[] = [];

            prevSubmissions.forEach(localSub => {
              const fetchedSub = fetchedMap.get(localSub.id);
              if (!fetchedSub) {
                // Local submission not yet on Cloud -> push to Cloud!
                localOnlyOrUpdated.push(localSub);
                syncSingleSubmissionToSupabase(localSub);
              } else if (localSub.status !== 'Pending' && fetchedSub.status === 'Pending') {
                // Local has been Approved/Rejected, but Cloud is still Pending -> push update to Cloud!
                localOnlyOrUpdated.push(localSub);
                syncSingleSubmissionToSupabase(localSub);
              }
            });

            // Combine remote submissions, preferring local status if local has approved/rejected it
            const mergedMap = new Map<string, PaymentSubmission>();
            res.submissions!.forEach(s => mergedMap.set(s.id, s));
            prevSubmissions.forEach(localSub => {
              const remote = mergedMap.get(localSub.id);
              if (!remote) {
                mergedMap.set(localSub.id, localSub);
              } else if (localSub.status !== 'Pending' && remote.status === 'Pending') {
                mergedMap.set(localSub.id, localSub);
              }
            });

            const merged = Array.from(mergedMap.values());
            saveStoredSubmissions(merged);

            // Reconcile Warga and Transactions with any Approved submissions received from Cloud
            const approvedSubs = merged.filter(s => s.status === 'Approved');
            if (approvedSubs.length > 0) {
              setWarga(prevWarga => {
                let anyChanged = false;
                const updatedWargaList = prevWarga.map(w => {
                  let itemChanged = false;
                  let monthsSet = new Set(w.paidMonths || []);
                  approvedSubs.forEach(sub => {
                    const isMatch = (
                      (sub.wargaId && w.id === sub.wargaId) ||
                      w.fullName.toLowerCase().trim() === sub.wargaName.toLowerCase().trim() ||
                      (w.username && sub.wargaName && w.username.toLowerCase().trim() === sub.wargaName.toLowerCase().trim()) ||
                      (sub.submittedBy && w.username && w.username.toLowerCase().trim() === sub.submittedBy.toLowerCase().trim())
                    );
                    if (isMatch && sub.paidMonths) {
                      sub.paidMonths.forEach(m => {
                        if (!monthsSet.has(m)) {
                          monthsSet.add(m);
                          itemChanged = true;
                          anyChanged = true;
                        }
                      });
                    }
                  });
                  if (itemChanged) {
                    return { ...w, paidMonths: Array.from(monthsSet), statusIuran: 'Lunas' as const };
                  }
                  return w;
                });
                if (anyChanged) {
                  saveStoredWarga(updatedWargaList);
                }
                return updatedWargaList;
              });

              setTransactions(prevTx => {
                let changed = false;
                const newTxList = [...prevTx];
                approvedSubs.forEach(sub => {
                  const subTxId = `tx-approved-${sub.id}`;
                  const exists = newTxList.some(t => t.id === subTxId || (t.wargaName === sub.wargaName && t.amount === sub.amount && t.date === sub.date));
                  if (!exists) {
                    newTxList.push({
                      id: subTxId,
                      type: 'Pemasukan',
                      amount: sub.amount,
                      date: sub.date,
                      description: `Iuran Bulanan RT (Verifikasi Online) - ${sub.paidMonths.join(', ')}`,
                      proofImage: sub.proofImage,
                      wargaId: sub.wargaId,
                      wargaName: sub.wargaName,
                      paidMonths: sub.paidMonths
                    });
                    changed = true;
                  }
                });
                if (changed) {
                  saveStoredTransactions(newTxList);
                }
                return newTxList;
              });
            }

            return merged;
          });
        }

        const newDbStatus: DatabaseStatus = {
          connected: true,
          mode: 'online',
          lastTested: `Terhubung (${new Date().toLocaleTimeString('id-ID')})`
        };
        setDbStatus(newDbStatus);
        saveStoredDbStatus(newDbStatus);
      } else if (!res.error) {
        // Remote database table 'users' is currently empty, push local state to Supabase Cloud
        const currentLocalUsers = getStoredUsers();
        const currentLocalWarga = getStoredWarga();
        const currentLocalTx = getStoredTransactions();
        const currentLocalSub = getStoredSubmissions();
        const reconciledWarga = reconcileUsersAndWarga(currentLocalUsers, currentLocalWarga);

        const pushRes = await pushAllLocalDataToSupabase({
          users: currentLocalUsers,
          warga: reconciledWarga,
          transactions: currentLocalTx,
          submissions: currentLocalSub
        });
        if (pushRes.success) {
          const newDbStatus: DatabaseStatus = {
            connected: true,
            mode: 'online',
            lastTested: `Tersinkron (${new Date().toLocaleTimeString('id-ID')})`
          };
          setDbStatus(newDbStatus);
          saveStoredDbStatus(newDbStatus);
        }
      }
    } catch (e: any) {
      console.error("Sync catch error:", e);
    }
  }, []);

  // Initialize and load states on mount
  useEffect(() => {
    document.title = 'CMS04';
    const initialLocalUsers = getStoredUsers();
    const initialLocalWarga = getStoredWarga();
    const initialLocalTx = getStoredTransactions();
    const initialLocalSub = getStoredSubmissions();

    const syncedLocalWarga = reconcileUsersAndWarga(initialLocalUsers, initialLocalWarga);

    setUsers(initialLocalUsers);
    setWarga(syncedLocalWarga);
    saveStoredWarga(syncedLocalWarga);
    setTransactions(initialLocalTx);
    setSubmissions(initialLocalSub);
    setDbStatus(getStoredDbStatus());

    // Auto-login session recovery from localStorage if available
    const cachedUser = localStorage.getItem('rt_digital_active_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setCurrentUser(parsed);
      } catch (e) {
        localStorage.removeItem('rt_digital_active_user');
      }
    }

    // Run sync immediately on mount
    runSync();

    // Setup background periodic synchronization (every 20 seconds for multi-device sync, avoids aggressive spamming when offline)
    const intervalId = setInterval(runSync, 20000);

    // Browser network status listeners to immediately trigger sync on recovery
    const handleOnline = () => {
      console.log('Perangkat kembali online, menjalankan sinkronisasi...');
      runSync();
    };
    window.addEventListener('online', handleOnline);

    // BroadcastChannel listener for multi-tab instant sync
    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('rt_digital_sync_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'DATA_UPDATED') {
            runSync();
          }
        };
      } catch (e) {
        console.error(e);
      }
    }

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      if (bc) bc.close();
    };
  }, [runSync]);

  // Setup audio notification tone generator using Web Audio API
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = ctx.currentTime;
      playTone(523.25, now, 0.4); // C5
      playTone(659.25, now + 0.1, 0.5); // E5
    } catch (e) {
      console.error('Audio notification failed:', e);
    }
  };

  // Request browser notification permission for bendahara
  useEffect(() => {
    if (currentUser?.role === 'bendahara' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [currentUser]);

  // Keep track of notified records
  const isNotificationInitializedRef = useRef(false);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Listen to submissions & transactions for bendahara notifications
  useEffect(() => {
    if (currentUser?.role === 'bendahara') {
      // 1. Load historical notified IDs from localStorage
      const saved = localStorage.getItem('rt_notified_payment_ids');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach(id => notifiedIdsRef.current.add(id));
          }
          // Mark as initialized so we immediately process newer offline items
          isNotificationInitializedRef.current = true;
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Baseline initialization on first load of submissions/transactions to avoid old alerts
      if (!isNotificationInitializedRef.current && (submissions.length > 0 || transactions.length > 0)) {
        // Only mark non-Pending submissions as already notified initially
        submissions.forEach(s => {
          if (s.status !== 'Pending') {
            notifiedIdsRef.current.add(s.id);
          }
        });
        transactions.forEach(t => notifiedIdsRef.current.add(t.id));
        isNotificationInitializedRef.current = true;
        localStorage.setItem('rt_notified_payment_ids', JSON.stringify(Array.from(notifiedIdsRef.current)));
        
        // If there are no pending submissions to alert, we can safely return.
        // Otherwise, proceed to trigger notifications for the pending ones.
        const hasPending = submissions.some(s => s.status === 'Pending' && !notifiedIdsRef.current.has(s.id));
        if (!hasPending) {
          return;
        }
      }

      // 3. Detect new pending submissions or income transactions
      let triggered = false;

      const newPendingSubmissions = submissions.filter(s => s.status === 'Pending' && !notifiedIdsRef.current.has(s.id));
      const newIncomeTransactions = transactions.filter(t => t.type === 'Pemasukan' && !notifiedIdsRef.current.has(t.id));

      newPendingSubmissions.forEach(s => {
        notifiedIdsRef.current.add(s.id);
        triggered = true;

        // Native Push Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Pengajuan Iuran Baru', {
              body: `Warga ${s.wargaName} mengajukan iuran Rp ${s.amount.toLocaleString('id-ID')} (${s.paidMonths.join(', ')}).`,
            });
          } catch (e) {
            console.error('Native notification error:', e);
          }
        }

        // In-app Toast Alert
        const newToast = {
          id: `toast-sub-${s.id}-${Date.now()}`,
          title: 'Pengajuan Iuran Online Baru',
          message: `Warga ${s.wargaName} mengirimkan pengajuan iuran Rp ${s.amount.toLocaleString('id-ID')} untuk ${s.paidMonths.join(', ')}.`,
          type: 'success' as const
        };
        setActiveToasts(prev => [...prev, newToast]);
        setTimeout(() => {
          setActiveToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, 10000);
      });

      newIncomeTransactions.forEach(t => {
        notifiedIdsRef.current.add(t.id);
        triggered = true;

        // Native Push Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Pembayaran Kas Masuk', {
              body: `Iuran senilai Rp ${t.amount.toLocaleString('id-ID')} dari ${t.wargaName || 'Warga'} berhasil dicatat.`,
            });
          } catch (e) {
            console.error('Native notification error:', e);
          }
        }

        // In-app Toast Alert
        const newToast = {
          id: `toast-tx-${t.id}-${Date.now()}`,
          title: 'Dana Kas Masuk Baru',
          message: `Pembayaran iuran Rp ${t.amount.toLocaleString('id-ID')} dari ${t.wargaName || 'Warga'} berhasil diverifikasi dan masuk kas.`,
          type: 'info' as const
        };
        setActiveToasts(prev => [...prev, newToast]);
        setTimeout(() => {
          setActiveToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, 10000);
      });

      if (triggered) {
        playNotificationSound();
        localStorage.setItem('rt_notified_payment_ids', JSON.stringify(Array.from(notifiedIdsRef.current)));
      }
    }
  }, [submissions, transactions, currentUser]);

  // Sync personal profile modifications instantly to currentUser session state & Supabase
  const handleUpdateUser = (updatedUser: User) => {
    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    syncSingleUserToSupabase(updatedUser);

    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      localStorage.setItem('rt_digital_active_user', JSON.stringify(updatedUser));
    }

    if (updatedUser.role !== 'admin') {
      const existingW = warga.find(w => w.id === updatedUser.id);
      const updatedWargaItem: Warga = {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        blok: updatedUser.blok,
        houseStatus: updatedUser.houseStatus || 'Pemilik',
        phone: updatedUser.phone || '',
        statusIuran: existingW ? existingW.statusIuran : 'Lunas',
        birthDate: updatedUser.birthDate || '',
        paidMonths: existingW ? existingW.paidMonths : []
      };
      const updatedWargaList = existingW
        ? warga.map(w => w.id === updatedUser.id ? updatedWargaItem : w)
        : [...warga, updatedWargaItem];

      setWarga(updatedWargaList);
      saveStoredWarga(updatedWargaList);
      syncSingleWargaToSupabase(updatedWargaItem);
    } else {
      // Admin account - remove from Warga listing
      const updatedWargaList = warga.filter(w => w.id !== updatedUser.id);
      setWarga(updatedWargaList);
      saveStoredWarga(updatedWargaList);
      deleteWargaFromSupabase(updatedUser.id);
    }
  };

  // Add User Trigger - synchronizes with Warga listing and Supabase Cloud
  const handleAddUser = (newUser: User) => {
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    syncSingleUserToSupabase(newUser);

    // Any non-admin account automatically creates/syncs a Warga record
    if (newUser.role !== 'admin') {
      const newWarga: Warga = {
        id: newUser.id,
        fullName: newUser.fullName,
        username: newUser.username,
        blok: newUser.blok,
        houseStatus: newUser.houseStatus || 'Pemilik',
        phone: newUser.phone || '',
        statusIuran: 'Lunas',
        birthDate: newUser.birthDate || '',
        paidMonths: []
      };
      const updatedWargaList = [...warga.filter(w => w.id !== newUser.id), newWarga];
      setWarga(updatedWargaList);
      saveStoredWarga(updatedWargaList);
      syncSingleWargaToSupabase(newWarga);
    }
  };

  // Delete user trigger - deletes corresponding citizens list (warga) and Supabase record
  const handleDeleteUser = (userId: string) => {
    // Prevent deletion of Main Admin account
    if (userId === 'user-admin') {
      alert('Akun Administrator System adalah akun admin utama dan tidak dapat dihapus.');
      return;
    }

    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    deleteUserFromSupabase(userId);

    const updatedWargaList = warga.filter(w => w.id !== userId);
    setWarga(updatedWargaList);
    saveStoredWarga(updatedWargaList);
    deleteWargaFromSupabase(userId);
  };

  // Add Citizen trigger
  const handleAddWarga = (newW: Warga) => {
    const updatedW = [...warga, newW];
    setWarga(updatedW);
    saveStoredWarga(updatedW);
    syncSingleWargaToSupabase(newW);
  };

  // Update Citizen status/block
  const handleUpdateWarga = (updatedW: Warga) => {
    const updatedWList = warga.map(w => w.id === updatedW.id ? updatedW : w);
    setWarga(updatedWList);
    saveStoredWarga(updatedWList);
    syncSingleWargaToSupabase(updatedW);

    // Also sync to matching user account if any
    const userAcc = users.find(u => u.id === updatedW.id);
    if (userAcc) {
      const updatedAcc = {
        ...userAcc,
        fullName: updatedW.fullName,
        username: updatedW.username || userAcc.username,
        blok: updatedW.blok,
        houseStatus: updatedW.houseStatus,
        phone: updatedW.phone,
        birthDate: updatedW.birthDate
      };
      const updatedUsers = users.map(u => u.id === updatedW.id ? updatedAcc : u);
      setUsers(updatedUsers);
      saveStoredUsers(updatedUsers);
      syncSingleUserToSupabase(updatedAcc);

      if (currentUser && currentUser.id === updatedW.id) {
        setCurrentUser(updatedAcc);
        localStorage.setItem('rt_digital_active_user', JSON.stringify(updatedAcc));
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

    if (targetWarga) {
      deleteWargaFromSupabase(targetWarga.id);
    }

    // Also remove matching user account to avoid orphan credentials
    const updatedUsers = users.filter(u => {
      if (u.id === id) return false;
      if (targetName && u.fullName.toLowerCase().trim() === targetName) return false;
      if (targetUsername && u.username && u.username.toLowerCase().trim() === targetUsername) return false;
      return true;
    });
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    const targetUser = users.find(u => {
      if (u.id === id) return true;
      if (targetName && u.fullName.toLowerCase().trim() === targetName) return true;
      if (targetUsername && u.username && u.username.toLowerCase().trim() === targetUsername) return true;
      return false;
    });
    if (targetUser) {
      deleteUserFromSupabase(targetUser.id);
    }
  };

  // Add financial transaction
  const handleAddTransaction = (newTx: FinancialTransaction) => {
    const updatedTx = [...transactions, newTx];
    setTransactions(updatedTx);
    saveStoredTransactions(updatedTx);
    syncSingleTransactionToSupabase(newTx);

    // Dynamic auto-action: If it is a Pemasukan related to a citizen payment,
    // let's set their citizen iuran status to 'Lunas'!
    if (newTx.type === 'Pemasukan' && (newTx.wargaName || newTx.wargaId)) {
      const match = warga.find(w => 
        (newTx.wargaId && w.id === newTx.wargaId) ||
        (newTx.wargaName && w.fullName.toLowerCase().trim() === newTx.wargaName.toLowerCase().trim()) ||
        (newTx.wargaName && w.username && w.username.toLowerCase().trim() === newTx.wargaName.toLowerCase().trim()) ||
        (newTx.wargaName && w.id === newTx.wargaName)
      );
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
  const handleAddSubmission = async (newSub: PaymentSubmission) => {
    const updated = [newSub, ...submissions];
    setSubmissions(updated);
    saveStoredSubmissions(updated);
    notifyBroadcast();
    
    const subRes = await syncSingleSubmissionToSupabase(newSub);
    if (!subRes.success) {
      setActiveToasts(prev => [
        ...prev,
        {
          id: `toast-sub-err-${Date.now()}`,
          title: 'Perhatian: Offline/Gagal Sync',
          message: `Pengajuan tersimpan di perangkat ini, tetapi gagal terkirim ke Cloud Supabase (${subRes.error || 'Cek Koneksi'}).`,
          type: 'info'
        }
      ]);
    }
  };

  const handleApproveSubmission = async (subId: string, reviewerName: string) => {
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

    const approvedSub = updatedSubmissions.find(s => s.id === subId);

    // 2. Convert submission to official FinancialTransaction
    const newTx: FinancialTransaction = {
      id: `tx-approved-${targetSub.id}`,
      type: 'Pemasukan',
      amount: targetSub.amount,
      date: targetSub.date,
      description: `Iuran Bulanan RT (Verifikasi Online) - ${targetSub.paidMonths.join(', ')}`,
      proofImage: targetSub.proofImage,
      wargaId: targetSub.wargaId,
      wargaName: targetSub.wargaName,
      paidMonths: targetSub.paidMonths
    };

    const updatedTx = [...transactions.filter(t => t.id !== newTx.id), newTx];
    setTransactions(updatedTx);
    saveStoredTransactions(updatedTx);

    // 3. Sync Citizen's paidMonths array and statusIuran
    const match = warga.find(w => 
      (targetSub.wargaId && w.id === targetSub.wargaId) ||
      w.fullName.toLowerCase().trim() === targetSub.wargaName.toLowerCase().trim() ||
      (w.username && targetSub.wargaName && w.username.toLowerCase().trim() === targetSub.wargaName.toLowerCase().trim()) ||
      (targetSub.submittedBy && w.username && w.username.toLowerCase().trim() === targetSub.submittedBy.toLowerCase().trim())
    );
    let updatedW: Warga | null = null;
    if (match) {
      const existingMonths = match.paidMonths || [];
      const mergedMonths = Array.from(new Set([...existingMonths, ...targetSub.paidMonths]));
      updatedW = { ...match, paidMonths: mergedMonths, statusIuran: 'Lunas' as const };
      handleUpdateWarga(updatedW);
    }

    notifyBroadcast();

    // 4. Push to Supabase Cloud & check sync result
    if (approvedSub) {
      const subRes = await syncSingleSubmissionToSupabase(approvedSub);
      await syncSingleTransactionToSupabase(newTx);
      if (updatedW) {
        await syncSingleWargaToSupabase(updatedW);
      }

      if (!subRes.success) {
        setActiveToasts(prev => [
          ...prev,
          {
            id: `toast-appr-err-${Date.now()}`,
            title: 'Peringatan Sync Cloud',
            message: `Approval berhasil disimpan di perangkat ini, tetapi gagal sync ke Cloud Supabase (${subRes.error || 'Offline'}). Mohon periksa koneksi Supabase agar sync ke device lain.`,
            type: 'info'
          }
        ]);
      }
    }
  };

  const handleRejectSubmission = async (subId: string, reason: string, reviewerName: string) => {
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

    const rejectedSub = updatedSubmissions.find(s => s.id === subId);
    notifyBroadcast();

    if (rejectedSub) {
      const subRes = await syncSingleSubmissionToSupabase(rejectedSub);
      if (!subRes.success) {
        setActiveToasts(prev => [
          ...prev,
          {
            id: `toast-rej-err-${Date.now()}`,
            title: 'Peringatan Sync Cloud',
            message: `Penolakan disimpan di perangkat ini, namun Supabase Cloud offline (${subRes.error || 'Gagal Sync'}).`,
            type: 'info'
          }
        ]);
      }
    }
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
        localStorage.setItem('rt_digital_active_user', JSON.stringify(exists));
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
    localStorage.setItem('rt_digital_active_user', JSON.stringify(user));
    setActiveTab('dashboard');
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rt_digital_active_user');
  };

  // If user is not logged in, render Login Page
  if (!currentUser) {
    return <Login users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  // Sidebar navigation options (role-based filter)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'iuran-saya', label: 'Iuran Saya', icon: <CreditCard size={18} /> },
    { id: 'profile', label: 'Profil Saya', icon: <UserIcon size={18} /> },
    { id: 'finance', label: 'Keuangan Kas RT', icon: <Coins size={18} /> },
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
        return <Dashboard currentUser={currentUser} warga={warga} transactions={transactions} submissions={submissions} dbStatus={dbStatus} />;
      case 'iuran-saya':
        return (
          <IuranSaya 
            currentUser={currentUser} 
            warga={warga}
            transactions={transactions}
            submissions={submissions}
            onAddSubmission={handleAddSubmission}
            onRefreshSync={runSync}
            dbStatus={dbStatus}
          />
        );
      case 'profile':
        return (
          <MyProfile 
            currentUser={currentUser} 
            warga={warga}
            transactions={transactions}
            submissions={submissions}
            onUpdateUser={handleUpdateUser} 
          />
        );
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
            onRefreshSync={runSync}
            dbStatus={dbStatus}
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
          return <Dashboard currentUser={currentUser} warga={warga} transactions={transactions} submissions={submissions} dbStatus={dbStatus} />;
        }
        return (
          <UserManagement 
            currentUser={currentUser} 
            users={users} 
            warga={warga}
            transactions={transactions}
            submissions={submissions}
            onAddUser={handleAddUser} 
            onUpdateUser={handleUpdateUser} 
            onDeleteUser={handleDeleteUser} 
          />
        );
      case 'backup':
        if (currentUser.role !== 'admin') {
          return <Dashboard currentUser={currentUser} warga={warga} transactions={transactions} submissions={submissions} dbStatus={dbStatus} />;
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
        return <Dashboard currentUser={currentUser} warga={warga} transactions={transactions} submissions={submissions} dbStatus={dbStatus} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      
      {/* Top Mobile Bar (Hidden in desktop) */}
      <header className="md:hidden bg-white border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <Cms04Logo size={32} />
          <div>
            <span className="font-black text-slate-900 text-base tracking-tight block leading-tight">CMS04</span>
            <span className="text-[8px] text-red-600 font-bold tracking-widest block uppercase">CMS RT04 PWA</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <PwaInstallPrompt variant="compact" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-red-600 hover:text-red-700 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer"
            title="Buka menu navigasi"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* SIDEBAR (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen justify-between p-5 shadow-sm">
          <div className="space-y-6">
            
            {/* Logo Header */}
            <div className="flex items-center gap-3 px-2">
              <Cms04Logo size={44} />
              <div className="min-w-0">
                <span className="font-black text-slate-800 text-lg tracking-tight block leading-none">
                  CMS<span className="text-red-600">04</span>
                </span>
                <span className="text-[9px] text-red-600 font-extrabold uppercase tracking-widest block mt-1">PORTAL WARGA CMS RT04</span>
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
                        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-500/10 font-black' 
                        : 'text-slate-500 hover:text-slate-850 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-red-500'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile Capsule & Logout (Desktop Bottom) */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-600 to-red-500 text-white font-black flex items-center justify-center text-xs font-mono shadow-sm">
                {currentUser.username.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-slate-800 text-xs block truncate leading-tight">{currentUser.fullName}</span>
                <span className="text-[9px] text-red-600 font-mono block uppercase tracking-wider font-bold mt-0.5 flex items-center gap-1">
                  <Sparkles size={9} />
                  {currentUser.role}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer"
            >
              <LogOut size={14} />
              Keluar Sesi
            </button>
          </div>
        </aside>

        {/* MOBILE MENU DRAWER (Mobile Only overlay) */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-start animate-fadeIn">
            <div className="w-72 bg-white border-r border-slate-200 h-full p-5 flex flex-col justify-between shadow-2xl">
              <div className="space-y-6">
                
                {/* Logo with Close button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Cms04Logo size={32} />
                    <span className="font-black text-slate-900 tracking-tight">CMS04</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg bg-slate-100"
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
                            ? 'bg-red-600 text-white font-black shadow-md shadow-red-600/10' 
                            : 'text-slate-600 hover:bg-slate-100'
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
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Pengguna:</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{currentUser.fullName} ({currentUser.role})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-200"
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
          <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400">
            ©2026 PORTAL WARGA CMS RT04 • by CMS04 Digital Team
          </footer>
        </main>

      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (App Like Experience on Mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 border-t border-slate-200 backdrop-blur-xl flex justify-around items-center py-2 px-1 shadow-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {visibleNavItems.slice(0, 6).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-red-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={isActive ? 'p-1 bg-red-50 border border-red-200 rounded-lg text-red-600' : ''}>
                {item.icon}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Floating Toast Notification Area */}
      <div id="toast-container" className="fixed top-20 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {activeToasts.map(toast => (
          <div
            key={toast.id}
            className={`p-4 rounded-2xl border shadow-2xl flex flex-col gap-1 text-slate-100 pointer-events-auto transition-all duration-300 animate-slideIn ${
              toast.type === 'success' 
                ? 'bg-emerald-950/95 border-emerald-500/40 shadow-emerald-500/10' 
                : 'bg-slate-900/95 border-amber-500/30 shadow-amber-500/5'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {toast.type === 'success' ? (
                  <Sparkles className="text-emerald-400 shrink-0" size={16} />
                ) : (
                  <Coins className="text-amber-400 shrink-0" size={16} />
                )}
                <span className="font-extrabold text-[10px] text-white leading-tight uppercase tracking-wider">{toast.title}</span>
              </div>
              <button
                onClick={() => setActiveToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium mt-1">{toast.message}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

