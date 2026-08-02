export type UserRole = 'admin' | 'RT' | 'bendahara' | 'warga';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  birthDate: string; // format YYYY-MM-DD
}

export interface User {
  id: string;
  fullName: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  blok: string;
  houseStatus?: 'Pemilik' | 'Sewa';
  phone: string;
  birthDate: string; // format YYYY-MM-DD
  family: FamilyMember[];
}

export interface Warga {
  id: string;
  fullName: string;
  username?: string;
  blok: string;
  houseStatus?: 'Pemilik' | 'Sewa';
  phone: string;
  statusIuran: 'Lunas' | 'Menunggak' | 'Pending';
  birthDate: string; // YYYY-MM-DD
  paidMonths?: string[]; // E.g. ['Januari 2026', 'Februari 2026', ...]
}

export interface FinancialTransaction {
  id: string;
  type: 'Pemasukan' | 'Pengeluaran';
  // If Pemasukan
  wargaName?: string; // Reference to citizen full name
  // If Pengeluaran
  recipient?: string; // Kepada siapa
  amount: number;
  date: string; // format YYYY-MM-DD
  description: string;
  proofImage?: string; // Base64 or placeholder url
  paidMonths?: string[]; // Months covered by this payment
}

export interface PaymentSubmission {
  id: string;
  wargaId?: string;
  wargaName: string;
  blok?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paidMonths: string[];
  proofImage: string; // Base64
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedBy?: string;
  submittedAt: string; // ISO string
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface DatabaseStatus {
  connected: boolean;
  lastTested?: string;
  mode: 'offline' | 'online';
}
