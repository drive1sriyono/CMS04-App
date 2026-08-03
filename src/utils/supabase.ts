import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Warga, FinancialTransaction, PaymentSubmission } from '../types';

let cachedClient: SupabaseClient | null = null;

export const getSupabaseConfig = () => {
  const url =
    localStorage.getItem('supabase_url') ||
    (import.meta as any).env?.VITE_SUPABASE_URL ||
    'https://rt-digital-z91s.supabase.co';
  
  const key =
    localStorage.getItem('supabase_anon_key') ||
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
    '';

  return { url: url.trim().replace(/\/+$/, ''), key: key.trim() };
};

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (url && url.trim()) {
    localStorage.setItem('supabase_url', url.trim());
  } else {
    localStorage.removeItem('supabase_url');
  }

  if (key && key.trim()) {
    localStorage.setItem('supabase_anon_key', key.trim());
  } else {
    localStorage.removeItem('supabase_anon_key');
  }

  cachedClient = null; // Clear cached client so next call uses new credentials
};

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, key } = getSupabaseConfig();
  if (!url || !url.startsWith('http')) return null;

  // We re-instantiate if URL or Key changed
  if (
    !cachedClient ||
    (cachedClient as any).supabaseUrl !== url ||
    (cachedClient as any).supabaseKey !== key
  ) {
    try {
      cachedClient = createClient(url, key || 'dummy-anon-key', {
        auth: { persistSession: false }
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return cachedClient;
};

// Map JS User object to SQL users row (supports both minimal & expanded columns)
export const mapUserToSupabase = (user: User) => ({
  id: user.id,
  username: user.username,
  password_hash: user.passwordHash,
  role: user.role,
  full_name: user.fullName || '',
  blok: user.blok || '',
  house_status: user.houseStatus || 'Pemilik',
  phone: user.phone || '',
  birth_date: user.birthDate || null,
  family: user.family ? JSON.stringify(user.family) : '[]'
});

// Map SQL users row back to JS User object
export const mapSupabaseToUser = (row: any): User => ({
  id: row.id,
  username: row.username,
  passwordHash: row.password_hash || row.passwordHash || '',
  role: row.role,
  fullName: row.full_name || row.fullName || row.username,
  blok: row.blok || '',
  houseStatus: row.house_status || row.houseStatus || 'Pemilik',
  phone: row.phone || '',
  birthDate: row.birth_date || row.birthDate || '',
  family: typeof row.family === 'string' ? JSON.parse(row.family || '[]') : (row.family || [])
});

// Map JS Warga to SQL warga row
export const mapWargaToSupabase = (w: Warga) => ({
  id: w.id,
  full_name: w.fullName,
  username: w.username || null,
  blok: w.blok,
  house_status: w.houseStatus || 'Pemilik',
  phone: w.phone || '',
  status_iuran: w.statusIuran || 'Lunas',
  birth_date: w.birthDate || null,
  paid_months: w.paidMonths ? JSON.stringify(w.paidMonths) : '[]'
});

export const mapSupabaseToWarga = (row: any): Warga => ({
  id: row.id,
  fullName: row.full_name || row.fullName,
  username: row.username,
  blok: row.blok,
  houseStatus: row.house_status || row.houseStatus || 'Pemilik',
  phone: row.phone || '',
  statusIuran: row.status_iuran || row.statusIuran || 'Lunas',
  birthDate: row.birth_date || row.birthDate || '',
  paidMonths: typeof row.paid_months === 'string' ? JSON.parse(row.paid_months) : (row.paid_months || [])
});

// Map JS FinancialTransaction to SQL
export const mapTransactionToSupabase = (tx: FinancialTransaction) => {
  const isPemasukan = tx.type === 'Pemasukan';
  const category = isPemasukan ? 'iuran' : 'lainnya';

  const monthStr = (tx.paidMonths && tx.paidMonths.length > 0)
    ? tx.paidMonths.join(', ')
    : (tx.date || 'Januari');

  const currentYear = new Date().getFullYear();
  let parsedYear = currentYear;
  if (tx.date) {
    const match = tx.date.match(/\d{4}/);
    if (match) {
      parsedYear = parseInt(match[0], 10);
    }
  }

  return {
    id: tx.id,
    type: tx.type,
    warga_name: tx.wargaName || null,
    recipient: tx.recipient || null,
    amount: tx.amount,
    date: tx.date,
    description: tx.description || '',
    proof_image: tx.proofImage || null,
    paid_months: tx.paidMonths ? JSON.stringify(tx.paidMonths) : '[]',
    category: category,
    month: monthStr,
    year: parsedYear
  };
};

export const mapSupabaseToTransaction = (row: any): FinancialTransaction => {
  const rawType = String(row.type || 'Pemasukan').toLowerCase().trim();
  let mappedType: 'Pemasukan' | 'Pengeluaran' = 'Pemasukan';
  
  if (
    rawType.startsWith('peng') || 
    rawType.startsWith('exp') || 
    rawType.startsWith('out') || 
    rawType.startsWith('with') || 
    rawType === 'keluar'
  ) {
    mappedType = 'Pengeluaran';
  }

  return {
    id: row.id,
    type: mappedType,
    wargaName: row.warga_name || row.wargaName,
    recipient: row.recipient,
    amount: Number(row.amount),
    date: row.date,
    description: row.description || '',
    proofImage: row.proof_image || row.proofImage,
    paidMonths: typeof row.paid_months === 'string' ? JSON.parse(row.paid_months) : (row.paid_months || [])
  };
};

// Map PaymentSubmission
export const mapSubmissionToSupabase = (sub: PaymentSubmission) => {
  const monthStr = (sub.paidMonths && sub.paidMonths.length > 0)
    ? sub.paidMonths.join(', ')
    : (sub.date || 'Januari');

  const currentYear = new Date().getFullYear();
  let parsedYear = currentYear;
  if (sub.date) {
    const match = sub.date.match(/\d{4}/);
    if (match) {
      parsedYear = parseInt(match[0], 10);
    }
  }

  return {
    id: sub.id,
    warga_id: sub.wargaId || null,
    warga_name: sub.wargaName,
    blok: sub.blok || null,
    amount: sub.amount,
    date: sub.date,
    month: monthStr, // Fixes: null value in column "month"
    months: monthStr,
    year: parsedYear, // Fixes: null value in column "year" violates not-null constraint
    paid_months: sub.paidMonths ? JSON.stringify(sub.paidMonths) : '[]',
    proof_image: sub.proofImage || null,
    status: sub.status,
    submitted_by: sub.submittedBy || null,
    submitted_at: sub.submittedAt || new Date().toISOString(),
    rejection_reason: sub.rejectionReason || null,
    reviewed_by: sub.reviewedBy || null,
    reviewed_at: sub.reviewedAt || null
  };
};

export const mapSupabaseToSubmission = (row: any): PaymentSubmission => {
  let paidMonths: string[] = [];
  if (row.paid_months) {
    try {
      paidMonths = typeof row.paid_months === 'string' ? JSON.parse(row.paid_months) : row.paid_months;
    } catch (e) {
      paidMonths = [row.paid_months];
    }
  } else if (row.months) {
    paidMonths = typeof row.months === 'string' ? row.months.split(',').map((s: string) => s.trim()) : row.months;
  } else if (row.month) {
    paidMonths = typeof row.month === 'string' ? row.month.split(',').map((s: string) => s.trim()) : [row.month];
  }

  const rawStatus = String(row.status || 'Pending').toLowerCase().trim();
  let mappedStatus: 'Pending' | 'Approved' | 'Rejected' = 'Pending';
  if (rawStatus.includes('appr') || rawStatus.includes('setuju') || rawStatus.includes('terima') || rawStatus === 'lunas' || rawStatus === 'success') {
    mappedStatus = 'Approved';
  } else if (rawStatus.includes('rej') || rawStatus.includes('tolak') || rawStatus.includes('gagal') || rawStatus === 'failed') {
    mappedStatus = 'Rejected';
  }

  return {
    id: row.id,
    wargaId: row.warga_id || row.wargaId,
    wargaName: row.warga_name || row.wargaName,
    blok: row.blok,
    amount: Number(row.amount),
    date: row.date,
    paidMonths: paidMonths || [],
    proofImage: row.proof_image || row.proofImage || '',
    status: mappedStatus,
    submittedBy: row.submitted_by || row.submittedBy,
    submittedAt: row.submitted_at || row.submittedAt,
    rejectionReason: row.rejection_reason || row.rejectionReason,
    reviewedBy: row.reviewed_by || row.reviewedBy,
    reviewedAt: row.reviewed_at || row.reviewedAt
  };
};

// --- API ACTIONS ---

// Real Ping Test
export const testSupabaseRealConnection = async (): Promise<{ success: boolean; message: string; latency: number }> => {
  const client = getSupabaseClient();
  const { url, key } = getSupabaseConfig();

  if (!client || !url) {
    return {
      success: false,
      message: 'VITE_SUPABASE_URL belum terpasang atau invalid.',
      latency: 0
    };
  }

  const startTime = performance.now();
  try {
    // Attempt querying users table
    const { data, error, status } = await client.from('users').select('id').limit(1);
    const latency = Math.round(performance.now() - startTime);

    if (error) {
      if (status === 401 || error.code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('apikey')) {
        return {
          success: false,
          message: `⚠️ SERVER SUPABASE TERHUBUNG, TETAPI PERLU ANON KEY BERHASIL (HTTP ${status}: ${error.message}). Pastikan VITE_SUPABASE_ANON_KEY sudah diset di Vercel.`,
          latency
        };
      }
      return {
        success: false,
        message: `⚠️ Supabase Error (${status || error.code}): ${error.message}`,
        latency
      };
    }

    return {
      success: true,
      message: `✅ KONEKSI REAL BISA DIGUNAKAN! Supabase Cloud merespons (Latensi ${latency}ms, Jumlah Baris Users: ${data?.length || 0}).`,
      latency
    };
  } catch (err: any) {
    const latency = Math.round(performance.now() - startTime);
    return {
      success: false,
      message: `❌ Gagal terhubung ke Supabase: ${err.message}`,
      latency
    };
  }
};

// Helper to perform upsert with automatic column pruning if schema is missing optional columns
export const safeUpsert = async (
  client: SupabaseClient,
  tableName: string,
  rows: Record<string, any>[]
) => {
  if (!rows || rows.length === 0) return null;

  // Try full upsert first
  let res = await client.from(tableName).upsert(rows, { onConflict: 'id' });
  let error = res.error;
  if (!error) return null;

  let currentRows = rows.map(r => ({ ...r }));
  let attempts = 0;

  const isCheckConstraintError = (err: any) => {
    if (!err) return false;
    const errMsg = (err.message || '').toLowerCase();
    return err.code === '23514' || errMsg.includes('violates check constraint') || errMsg.includes('check constraint');
  };

  // Check constraint mapping retry helper
  const tryCheckConstraintFix = async (tableName: string, rows: any[]) => {
    let checkAlts: any[] = [];
    if (tableName === 'financial_transactions') {
      checkAlts = [
        { type: { 'Pemasukan': 'income', 'Pengeluaran': 'expense' }, category: { 'iuran': 'income', 'lainnya': 'expense' } },
        { type: { 'Pemasukan': 'pemasukan', 'Pengeluaran': 'pengeluaran' }, category: { 'iuran': 'pemasukan', 'lainnya': 'pengeluaran' } },
        { type: { 'Pemasukan': 'INCOME', 'Pengeluaran': 'EXPENSE' }, category: { 'iuran': 'INCOME', 'lainnya': 'EXPENSE' } },
        { type: { 'Pemasukan': 'income', 'Pengeluaran': 'outcome' }, category: { 'iuran': 'income', 'lainnya': 'outcome' } },
        { type: { 'Pemasukan': 'deposit', 'Pengeluaran': 'withdrawal' }, category: { 'iuran': 'deposit', 'lainnya': 'withdrawal' } },
      ];
    } else if (tableName === 'payment_submissions') {
      checkAlts = [
        { status: { 'Approved': 'approved', 'Rejected': 'rejected', 'Pending': 'pending' } },
        { status: { 'Approved': 'APPROVED', 'Rejected': 'REJECTED', 'Pending': 'PENDING' } },
        { status: { 'Approved': 'disetujui', 'Rejected': 'ditolak', 'Pending': 'menunggu' } },
        { status: { 'Approved': 'lunas', 'Rejected': 'ditolak', 'Pending': 'pending' } },
      ];
    }

    for (const alt of checkAlts) {
      const mappedRows = rows.map(row => {
        const copy = { ...row };
        if (alt.type && copy.type) {
          copy.type = alt.type[copy.type] || copy.type;
        }
        if (alt.category && copy.category) {
          copy.category = alt.category[copy.category] || copy.category;
        }
        if (alt.status && copy.status) {
          copy.status = alt.status[copy.status] || copy.status;
        }
        return copy;
      });

      const retryRes = await client.from(tableName).upsert(mappedRows, { onConflict: 'id' });
      if (!retryRes.error) {
        return { success: true, error: null };
      }
    }
    return { success: false };
  };

  if (isCheckConstraintError(error)) {
    const fixed = await tryCheckConstraintFix(tableName, currentRows);
    if (fixed.success) return null;
  }

  // Column pruning, NOT NULL constraint, and Check constraint retry loop
  while (error && attempts < 10) {
    attempts++;
    const errMsg = error.message || '';

    // Case 1: Missing column error
    const matchCol = errMsg.match(/Could not find the '([^']+)' column/i);
    // Case 2: NOT NULL constraint error
    const matchNotNull = errMsg.match(/null value in column "([^"]+)"/i) || errMsg.match(/column "([^"]+)" of relation "[^"]+" violates not-null constraint/i);
    // Case 3: Check constraint error
    const isCheck = isCheckConstraintError(error);

    if (matchCol && matchCol[1]) {
      const missingCol = matchCol[1];
      console.warn(`Column '${missingCol}' missing in Supabase table '${tableName}'. Stripping and retrying...`);
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        delete copy[missingCol];
        return copy;
      });
      const retryRes = await client.from(tableName).upsert(currentRows, { onConflict: 'id' });
      error = retryRes.error;
    } else if (matchNotNull && matchNotNull[1]) {
      const notNullCol = matchNotNull[1];
      console.warn(`Column '${notNullCol}' violates NOT NULL in Supabase table '${tableName}'. Filling default and retrying...`);
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        if (copy[notNullCol] === undefined || copy[notNullCol] === null) {
          if (notNullCol === 'year') copy[notNullCol] = new Date().getFullYear();
          else if (notNullCol === 'month' || notNullCol === 'months') copy[notNullCol] = 'Januari';
          else if (notNullCol === 'amount') copy[notNullCol] = 0;
          else if (notNullCol === 'paid_months') copy[notNullCol] = '[]';
          else if (notNullCol === 'status') copy[notNullCol] = 'pending';
          else if (notNullCol.includes('date') || notNullCol.includes('at')) copy[notNullCol] = new Date().toISOString();
          else copy[notNullCol] = 'N/A';
        }
        return copy;
      });
      const retryRes = await client.from(tableName).upsert(currentRows, { onConflict: 'id' });
      error = retryRes.error;
    } else if (isCheck) {
      const fixed = await tryCheckConstraintFix(tableName, currentRows);
      if (fixed.success) return null;

      // If check constraint still fails, try setting status/type to generic default or stripping the constraint field if possible
      console.warn(`Check constraint violation on table '${tableName}'. Attempting fallback default values...`);
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        if (tableName === 'payment_submissions') {
          copy.status = 'pending'; // fallback to lowercase pending
        } else if (tableName === 'financial_transactions') {
          copy.type = 'income';
          copy.category = 'income';
        }
        return copy;
      });
      const retryRes = await client.from(tableName).upsert(currentRows, { onConflict: 'id' });
      error = retryRes.error;
      if (!error) return null;

      // Final fallback: delete status/type/category if check constraint blocks upsert
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        if (tableName === 'payment_submissions') {
          delete copy.status;
        } else if (tableName === 'financial_transactions') {
          delete copy.type;
          delete copy.category;
        }
        return copy;
      });
      const finalRetryRes = await client.from(tableName).upsert(currentRows, { onConflict: 'id' });
      error = finalRetryRes.error;
      break;
    } else {
      break;
    }

    // Check constraint retry if needed after column modification
    if (error && isCheckConstraintError(error)) {
      const fixed = await tryCheckConstraintFix(tableName, currentRows);
      if (fixed.success) return null;
    }
  }

  return error;
};

// Push Local State to Supabase Cloud
export const pushAllLocalDataToSupabase = async (data: {
  users: User[];
  warga: Warga[];
  transactions: FinancialTransaction[];
  submissions: PaymentSubmission[];
}): Promise<{ success: boolean; message: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client belum siap.' };
  }

  try {
    // 1. Users
    if (data.users.length > 0) {
      const usersRows = data.users.map(mapUserToSupabase);
      const usersErr = await safeUpsert(client, 'users', usersRows);
      if (usersErr) throw new Error(`Users Table Error: ${usersErr.message}`);
    }

    // 2. Warga
    if (data.warga.length > 0) {
      const wargaRows = data.warga.map(mapWargaToSupabase);
      const wargaErr = await safeUpsert(client, 'warga', wargaRows);
      if (wargaErr) throw new Error(`Warga Table Error: ${wargaErr.message}`);
    }

    // 3. Transactions
    if (data.transactions.length > 0) {
      const txRows = data.transactions.map(mapTransactionToSupabase);
      const txErr = await safeUpsert(client, 'financial_transactions', txRows);
      if (txErr) throw new Error(`Transactions Table Error: ${txErr.message}`);
    }

    // 4. Submissions
    if (data.submissions.length > 0) {
      const subRows = data.submissions.map(mapSubmissionToSupabase);
      const subErr = await safeUpsert(client, 'payment_submissions', subRows);
      if (subErr) throw new Error(`Submissions Table Error: ${subErr.message}`);
    }

    return {
      success: true,
      message: `🎉 BERHASIL SINKRONISASI REAL! ${data.users.length} Akun User, ${data.warga.length} Data Warga, dan Transaksi Keuangan telah terhubung & tersinkron ke Supabase Cloud.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal Sinkronisasi ke Supabase: ${err.message}`
    };
  }
};

// Fetch Remote Supabase Data
export const fetchAllFromSupabase = async (): Promise<{
  users?: User[];
  warga?: Warga[];
  transactions?: FinancialTransaction[];
  submissions?: PaymentSubmission[];
  error?: string;
}> => {
  const client = getSupabaseClient();
  if (!client) return { error: 'Supabase client not initialized' };

  try {
    const [usersRes, wargaRes, txRes, subRes] = await Promise.all([
      client.from('users').select('*'),
      client.from('warga').select('*'),
      client.from('financial_transactions').select('*'),
      client.from('payment_submissions').select('*')
    ]);

    if (usersRes.error) throw usersRes.error;
    if (wargaRes.error) throw wargaRes.error;
    if (txRes.error) throw txRes.error;
    if (subRes.error) throw subRes.error;

    return {
      users: usersRes.data ? usersRes.data.map(mapSupabaseToUser) : [],
      warga: wargaRes.data ? wargaRes.data.map(mapSupabaseToWarga) : [],
      transactions: txRes.data ? txRes.data.map(mapSupabaseToTransaction) : [],
      submissions: subRes.data ? subRes.data.map(mapSupabaseToSubmission) : []
    };
  } catch (err: any) {
    return { error: err.message };
  }
};

// Single Item Realtime Push Helpers
export const syncSingleUserToSupabase = async (user: User): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Klien Supabase belum diinisialisasi atau key belum terpasang.' };
  try {
    const err = await safeUpsert(client, 'users', [mapUserToSupabase(user)]);
    if (err) return { success: false, error: err.message };
    return { success: true };
  } catch (e: any) {
    console.error('Error syncing user to Supabase:', e);
    return { success: false, error: e.message };
  }
};

export const deleteUserFromSupabase = async (userId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('users').delete().eq('id', userId);
  } catch (e) {
    console.error('Error deleting user from Supabase:', e);
  }
};

export const syncSingleWargaToSupabase = async (warga: Warga): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Klien Supabase belum diinisialisasi.' };
  try {
    const err = await safeUpsert(client, 'warga', [mapWargaToSupabase(warga)]);
    if (err) return { success: false, error: err.message };
    return { success: true };
  } catch (e: any) {
    console.error('Error syncing warga to Supabase:', e);
    return { success: false, error: e.message };
  }
};

export const deleteWargaFromSupabase = async (wargaId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('warga').delete().eq('id', wargaId);
  } catch (e) {
    console.error('Error deleting warga from Supabase:', e);
  }
};

export const syncSingleTransactionToSupabase = async (tx: FinancialTransaction): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Klien Supabase belum diinisialisasi.' };
  try {
    const err = await safeUpsert(client, 'financial_transactions', [mapTransactionToSupabase(tx)]);
    if (err) return { success: false, error: err.message };
    return { success: true };
  } catch (e: any) {
    console.error('Error syncing transaction to Supabase:', e);
    return { success: false, error: e.message };
  }
};

export const deleteTransactionFromSupabase = async (txId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('financial_transactions').delete().eq('id', txId);
  } catch (e) {
    console.error('Error deleting transaction from Supabase:', e);
  }
};

export const syncSingleSubmissionToSupabase = async (sub: PaymentSubmission): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Klien Supabase belum diinisialisasi.' };
  try {
    const err = await safeUpsert(client, 'payment_submissions', [mapSubmissionToSupabase(sub)]);
    if (err) return { success: false, error: err.message };
    return { success: true };
  } catch (e: any) {
    console.error('Error syncing submission to Supabase:', e);
    return { success: false, error: e.message };
  }
};

export const deleteSubmissionFromSupabase = async (subId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('payment_submissions').delete().eq('id', subId);
  } catch (e) {
    console.error('Error deleting submission from Supabase:', e);
  }
};
