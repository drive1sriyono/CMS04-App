import { User, Warga, FinancialTransaction, PaymentSubmission, DatabaseStatus } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    fullName: 'Administrator System',
    username: 'admin',
    passwordHash: 'admin',
    role: 'admin',
    blok: 'Pusat',
    houseStatus: 'Pemilik',
    phone: '081000000000',
    birthDate: '1990-01-01',
    family: []
  }
];

export const INITIAL_WARGA: Warga[] = [];

export const INITIAL_TRANSACTIONS: FinancialTransaction[] = [];

export const INITIAL_SUBMISSIONS: PaymentSubmission[] = [];

export const INITIAL_DB_STATUS: DatabaseStatus = {
  connected: false,
  mode: 'offline',
  lastTested: 'Belum diuji'
};

// State Managers
export const getStoredUsers = (): User[] => {
  const data = localStorage.getItem('rt_digital_users');
  if (!data) {
    localStorage.setItem('rt_digital_users', JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  const parsed: User[] = JSON.parse(data);
  const hasAdmin = parsed.some(u => u.role === 'admin' || u.username === 'admin');
  if (!hasAdmin) {
    const adminUser: User = INITIAL_USERS[0];
    const updated = [adminUser, ...parsed];
    localStorage.setItem('rt_digital_users', JSON.stringify(updated));
    return updated;
  }
  return parsed;
};

export const saveStoredUsers = (users: User[]) => {
  localStorage.setItem('rt_digital_users', JSON.stringify(users));
};

export const getStoredWarga = (): Warga[] => {
  const data = localStorage.getItem('rt_digital_warga');
  if (!data) {
    localStorage.setItem('rt_digital_warga', JSON.stringify(INITIAL_WARGA));
    return INITIAL_WARGA;
  }
  return JSON.parse(data);
};

export const saveStoredWarga = (warga: Warga[]) => {
  localStorage.setItem('rt_digital_warga', JSON.stringify(warga));
};

export const getStoredTransactions = (): FinancialTransaction[] => {
  const data = localStorage.getItem('rt_digital_transactions');
  if (!data) {
    localStorage.setItem('rt_digital_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
    return INITIAL_TRANSACTIONS;
  }
  return JSON.parse(data);
};

export const saveStoredTransactions = (transactions: FinancialTransaction[]) => {
  // Sort descending by date so most recent are first
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Keep only the most recent 50 transactions to prevent infinite storage growth on device
  const trimmed = sorted.slice(0, 50);

  // Strip out heavy base64 proof images for stored transactions,
  // keeping it only for the 3 most recent transactions for brief offline/recent check
  const optimized = trimmed.map((tx, idx) => {
    if (idx >= 3) {
      return { ...tx, proofImage: undefined };
    }
    return tx;
  });

  localStorage.setItem('rt_digital_transactions', JSON.stringify(optimized));
};

export const getStoredSubmissions = (): PaymentSubmission[] => {
  const data = localStorage.getItem('rt_digital_submissions');
  if (!data) {
    localStorage.setItem('rt_digital_submissions', JSON.stringify(INITIAL_SUBMISSIONS));
    return INITIAL_SUBMISSIONS;
  }
  return JSON.parse(data);
};

export const saveStoredSubmissions = (submissions: PaymentSubmission[]) => {
  // Always preserve ALL "Pending" submissions (extremely crucial so local/unsynced submissions are safe)
  const pendingSubmissions = submissions.filter(s => s.status === 'Pending');
  
  // Sort completed submissions (Approved/Rejected) by submission date descending
  const completedSubmissions = submissions
    .filter(s => s.status !== 'Pending')
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  // Only keep the most recent 20 completed submissions in the local cache
  const trimmedCompleted = completedSubmissions.slice(0, 20);

  // Combine both arrays
  const combined = [...pendingSubmissions, ...trimmedCompleted];

  // Strip out heavy base64 proof images for ALL completed submissions.
  // Since they are already processed and synced in Supabase, we can retrieve them on-demand online.
  const optimized = combined.map(sub => {
    if (sub.status !== 'Pending') {
      return { ...sub, proofImage: '' };
    }
    return sub;
  });

  localStorage.setItem('rt_digital_submissions', JSON.stringify(optimized));
};

export const getStoredDbStatus = (): DatabaseStatus => {
  const data = localStorage.getItem('rt_digital_db_status');
  if (!data) {
    localStorage.setItem('rt_digital_db_status', JSON.stringify(INITIAL_DB_STATUS));
    return INITIAL_DB_STATUS;
  }
  return JSON.parse(data);
};

export const saveStoredDbStatus = (status: DatabaseStatus) => {
  localStorage.setItem('rt_digital_db_status', JSON.stringify(status));
};

export const resetToDefault = () => {
  localStorage.setItem('rt_digital_users', JSON.stringify(INITIAL_USERS));
  localStorage.setItem('rt_digital_warga', JSON.stringify(INITIAL_WARGA));
  localStorage.setItem('rt_digital_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
  localStorage.setItem('rt_digital_submissions', JSON.stringify(INITIAL_SUBMISSIONS));
  localStorage.setItem('rt_digital_db_status', JSON.stringify(INITIAL_DB_STATUS));
  return {
    users: INITIAL_USERS,
    warga: INITIAL_WARGA,
    transactions: INITIAL_TRANSACTIONS,
    submissions: INITIAL_SUBMISSIONS,
    dbStatus: INITIAL_DB_STATUS
  };
};

export const calculateAge = (birthDateString: string): number => {
  if (!birthDateString) return 0;
  const birthDate = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return isNaN(age) || age < 0 ? 0 : age;
};

// Beautiful formatting helpers
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};
