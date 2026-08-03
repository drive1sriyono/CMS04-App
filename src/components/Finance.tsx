import React, { useState, useRef, useEffect } from 'react';
import { 
  PlusCircle, 
  FileSpreadsheet, 
  Printer, 
  Eye, 
  X, 
  Upload, 
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
  Check,
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { User, Warga, FinancialTransaction, PaymentSubmission, DatabaseStatus } from '../types';
import { formatCurrency, formatDate, getStoredUsers } from '../data/initialData';
import { compressImageFile } from '../utils/imageCompressor';

interface FinanceProps {
  currentUser: User;
  warga: Warga[];
  transactions: FinancialTransaction[];
  submissions?: PaymentSubmission[];
  onAddTransaction: (newTx: FinancialTransaction) => void;
  onAddSubmission?: (newSub: PaymentSubmission) => void;
  onApproveSubmission?: (subId: string, reviewerName: string) => void;
  onRejectSubmission?: (subId: string, reason: string, reviewerName: string) => void;
  onRefreshSync?: () => Promise<any>;
  dbStatus?: DatabaseStatus;
}

// Spelled-out number helper in Indonesian (Terbilang)
function terbilang(n: number): string {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];
  if (n < 12) return bilangan[n];
  if (n < 20) return terbilang(n - 10) + ' Belas';
  if (n < 100) return terbilang(Math.floor(n / 10)) + ' Puluh ' + terbilang(n % 10);
  if (n < 200) return 'Seratus ' + terbilang(n - 100);
  if (n < 1000) return terbilang(Math.floor(n / 100)) + ' Ratus ' + terbilang(n % 100);
  if (n < 2000) return 'Seribu ' + terbilang(n - 1000);
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + ' Ribu ' + terbilang(n % 1000);
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + ' Juta ' + terbilang(n % 1000000);
  return n.toString();
}

const MONTH_LIST = [
  'Januari 2026', 'Februari 2026', 'Maret 2026', 'April 2026',
  'Mei 2026', 'Juni 2026', 'Juli 2026', 'Agustus 2026',
  'September 2026', 'Oktober 2026', 'November 2026', 'Desember 2026'
];

export default function Finance({ 
  currentUser, 
  warga, 
  transactions, 
  submissions = [],
  onAddTransaction,
  onAddSubmission,
  onApproveSubmission,
  onRejectSubmission,
  onRefreshSync,
  dbStatus
}: FinanceProps) {
  const isWarga = currentUser.role === 'warga';

  // Helper function to calculate months already paid for any citizen (Cumulative Sequential Rule)
  const getWargaAlreadyPaidMonths = (citizenNameOrId: string): string[] => {
    if (!citizenNameOrId) return [];
    const searchClean = citizenNameOrId.trim().toLowerCase();
    const matchWarga = warga.find(
      w => w.id === citizenNameOrId ||
           w.fullName.toLowerCase().trim() === searchClean ||
           (w.username && w.username.toLowerCase().trim() === searchClean)
    );

    const paidSet = new Set<string>();
    if (matchWarga?.paidMonths) {
      matchWarga.paidMonths.forEach(m => paidSet.add(m));
    }

    const targetName = matchWarga ? matchWarga.fullName.toLowerCase().trim() : searchClean;
    const targetUsername = matchWarga?.username?.toLowerCase().trim();
    const targetId = matchWarga?.id;

    transactions.forEach(t => {
      if (t.type === 'Pemasukan') {
        const txWName = t.wargaName?.trim().toLowerCase() || '';
        const txWId = t.wargaId;

        const isMatch = (
          (targetId && txWId && txWId === targetId) ||
          (txWName && (
            txWName === targetName ||
            (targetUsername && txWName === targetUsername) ||
            (targetId && txWName === targetId) ||
            txWName === searchClean
          ))
        );

        if (isMatch) {
          if (t.paidMonths) {
            t.paidMonths.forEach(m => paidSet.add(m));
          }
          MONTH_LIST.forEach(m => {
            const shortM = m.replace(' 2026', '').toLowerCase();
            if (t.description.toLowerCase().includes(shortM)) {
              paidSet.add(m);
            }
          });
        }
      }
    });

    submissions.forEach(s => {
      if (s.status === 'Approved') {
        const subName = s.wargaName?.trim().toLowerCase() || '';
        const subUser = s.submittedBy?.trim().toLowerCase() || '';
        const subId = s.wargaId;

        const isMatch = (
          (targetId && subId && subId === targetId) ||
          subName === targetName ||
          (targetUsername && (subName === targetUsername || subUser === targetUsername)) ||
          (targetId && subName === targetId) ||
          subName === searchClean
        );

        if (isMatch && s.paidMonths) {
          s.paidMonths.forEach(m => paidSet.add(m));
        }
      }
    });

    // Find the highest month index in MONTH_LIST that has been paid
    let maxPaidIdx = -1;
    MONTH_LIST.forEach((m, idx) => {
      if (paidSet.has(m)) {
        if (idx > maxPaidIdx) maxPaidIdx = idx;
      }
    });

    if (maxPaidIdx < 0) return [];

    // All months up to maxPaidIdx are automatically marked as paid (Lunas)
    return MONTH_LIST.filter((_, idx) => idx <= maxPaidIdx);
  };

  // Helper function to calculate months with pending approval for any citizen
  const getWargaPendingSubmissionMonths = (citizenNameOrId: string): string[] => {
    if (!citizenNameOrId) return [];
    const searchClean = citizenNameOrId.trim().toLowerCase();
    const matchWarga = warga.find(
      w => w.id === citizenNameOrId ||
           w.fullName.toLowerCase().trim() === searchClean ||
           (w.username && w.username.toLowerCase().trim() === searchClean)
    );

    const targetName = matchWarga ? matchWarga.fullName.toLowerCase().trim() : searchClean;
    const targetUsername = matchWarga?.username?.toLowerCase().trim();
    const targetId = matchWarga?.id;

    const pendingSet = new Set<string>();

    submissions.forEach(s => {
      if (s.status === 'Pending') {
        const subName = s.wargaName?.trim().toLowerCase() || '';
        const subUser = s.submittedBy?.trim().toLowerCase() || '';
        const subId = s.wargaId;

        const isMatch = (
          (targetId && subId && subId === targetId) ||
          subName === targetName ||
          (targetUsername && (subName === targetUsername || subUser === targetUsername)) ||
          (targetId && subName === targetId) ||
          subName === searchClean
        );

        if (isMatch && s.paidMonths) {
          s.paidMonths.forEach(m => pendingSet.add(m));
        }
      }
    });

    return MONTH_LIST.filter(m => pendingSet.has(m));
  };

  // Fixed Monthly Rate
  const IURAN_RATE_PER_MONTH = 60000;

  // State Management for Forms
  const [txType, setTxType] = useState<'Pemasukan' | 'Pengeluaran'>('Pemasukan');
  const [pemasukanCategory, setPemasukanCategory] = useState<'iuran' | 'lainnya'>('iuran');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState('');
  const [proofImage, setProofImage] = useState<string>('');
  const [isCompressingManual, setIsCompressingManual] = useState(false);
  
  // Multi-month selection for Iuran
  const [isIuranPayment, setIsIuranPayment] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // Specific inputs
  const [wargaName, setWargaName] = useState('');
  const [recipient, setRecipient] = useState('');

  // Warga Online Submission Form State
  const [wargaSubMonths, setWargaSubMonths] = useState<string[]>([]);
  const [wargaSubRate] = useState<number>(60000);
  const [wargaSubAmount, setWargaSubAmount] = useState('');
  const [wargaSubDate, setWargaSubDate] = useState(new Date().toISOString().substring(0, 10));
  const [wargaSubProof, setWargaSubProof] = useState<string>('');
  const [isCompressingWarga, setIsCompressingWarga] = useState(false);
  const wargaFileInputRef = useRef<HTMLInputElement>(null);

  // Table search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Semua' | 'Pemasukan' | 'Pengeluaran'>('Semua');

  // Minimize toggle states for RT, Bendahara & Warga (default minimized for clean widescreen layout)
  const [isApprovalQueueOpen, setIsApprovalQueueOpen] = useState(false);

  // Auto-expand approval queue if there are pending submissions
  useEffect(() => {
    const hasPending = submissions && submissions.some(s => s.status === 'Pending');
    if (hasPending) {
      setIsApprovalQueueOpen(true);
    }
  }, [submissions]);
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [isWargaFormOpen, setIsWargaFormOpen] = useState(false);
  const [isMySubmissionsOpen, setIsMySubmissionsOpen] = useState(false);

  // Modals for Approve and Reject actions
  const [subToApprove, setSubToApprove] = useState<PaymentSubmission | null>(null);
  const [subToReject, setSubToReject] = useState<PaymentSubmission | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<FinancialTransaction | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // File Upload Reference for Manual Offline Form
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-init initial selected months for RT/Bendahara form when wargaName or category changes
  useEffect(() => {
    if (!isWarga && txType === 'Pemasukan' && pemasukanCategory === 'iuran' && wargaName.trim()) {
      const alreadyPaid = getWargaAlreadyPaidMonths(wargaName);
      const availableMonths = MONTH_LIST.filter(m => !alreadyPaid.includes(m));
      
      // Filter out any selected months that are already paid
      const validSelected = selectedMonths.filter(m => !alreadyPaid.includes(m));
      if (validSelected.length > 0) {
        setSelectedMonths(validSelected);
        setAmount((validSelected.length * IURAN_RATE_PER_MONTH).toString());
        setDescription(`Iuran Bulanan RT - ${validSelected.join(', ')}`);
      } else if (availableMonths.length > 0) {
        setSelectedMonths([availableMonths[0]]);
        setAmount((1 * IURAN_RATE_PER_MONTH).toString());
        setDescription(`Iuran Bulanan RT - ${availableMonths[0]}`);
      } else {
        setSelectedMonths([]);
        setAmount('');
        setDescription('Semua iuran bulan tahun 2026 sudah lunas');
      }
    }
  }, [wargaName, pemasukanCategory, txType]);

  // Auto-init initial selected month for Warga online submission form on mount/user change
  useEffect(() => {
    if (isWarga) {
      const alreadyPaid = getWargaAlreadyPaidMonths(currentUser.fullName);
      const pendingMonths = getWargaPendingSubmissionMonths(currentUser.fullName);
      const availableMonths = MONTH_LIST.filter(m => !alreadyPaid.includes(m) && !pendingMonths.includes(m));

      if (availableMonths.length > 0) {
        setWargaSubMonths([availableMonths[0]]);
        setWargaSubAmount((1 * wargaSubRate).toString());
      } else {
        setWargaSubMonths([]);
        setWargaSubAmount('');
      }
    }
  }, [currentUser]);

  // Toggle month selection for RT/Bendahara manual input (Strict sequential order, no gaps allowed)
  const handleToggleMonth = (month: string) => {
    if (!wargaName.trim()) {
      alert('Pilih Nama Warga Penyetor terlebih dahulu.');
      return;
    }

    const alreadyPaid = getWargaAlreadyPaidMonths(wargaName);
    const pendingMonths = getWargaPendingSubmissionMonths(wargaName);

    if (alreadyPaid.includes(month)) {
      alert(`Bulan ${month} sudah terbayar lunas untuk warga ${wargaName}.`);
      return;
    }
    if (pendingMonths.includes(month)) {
      alert(`Bulan ${month} sedang dalam proses verifikasi.`);
      return;
    }

    const unpaidMonths = MONTH_LIST.filter(m => !alreadyPaid.includes(m) && !pendingMonths.includes(m));
    if (unpaidMonths.length === 0) {
      alert(`Semua bulan iuran 2026 untuk warga ${wargaName} sudah lunas.`);
      return;
    }

    const targetIdx = unpaidMonths.indexOf(month);
    if (targetIdx === -1) return;

    const currentCount = selectedMonths.length;

    // Case 1: Deselecting the last selected month
    if (targetIdx + 1 === currentCount) {
      const updated = unpaidMonths.slice(0, currentCount - 1);
      setSelectedMonths(updated);
      if (updated.length > 0) {
        setAmount((updated.length * IURAN_RATE_PER_MONTH).toString());
        setDescription(`Iuran Bulanan RT - ${updated.join(', ')}`);
      } else {
        setAmount('');
        setDescription('');
      }
      return;
    }

    // Case 2: Clicking an earlier selected month -> trim selection
    if (targetIdx < currentCount - 1) {
      const updated = unpaidMonths.slice(0, targetIdx);
      setSelectedMonths(updated);
      if (updated.length > 0) {
        setAmount((updated.length * IURAN_RATE_PER_MONTH).toString());
        setDescription(`Iuran Bulanan RT - ${updated.join(', ')}`);
      } else {
        setAmount('');
        setDescription('');
      }
      return;
    }

    // Case 3: Clicking the exact next unpaid month
    if (targetIdx === currentCount) {
      const updated = unpaidMonths.slice(0, currentCount + 1);
      setSelectedMonths(updated);
      setAmount((updated.length * IURAN_RATE_PER_MONTH).toString());
      setDescription(`Iuran Bulanan RT - ${updated.join(', ')}`);
      return;
    }

    // Case 4: Skipping months
    if (targetIdx > currentCount) {
      const nextExpected = unpaidMonths[currentCount];
      const shortExpected = nextExpected.replace(' 2026', '');
      alert(`Pembayaran iuran harus berurutan tanpa meloncat bulan. Silakan pilih bulan ${shortExpected} terlebih dahulu.`);
      return;
    }
  };

  // Toggle month selection for Warga submission form (Strict sequential order, no gaps allowed)
  const handleWargaToggleMonth = (month: string) => {
    const alreadyPaid = getWargaAlreadyPaidMonths(currentUser.fullName);
    const pendingMonths = getWargaPendingSubmissionMonths(currentUser.fullName);

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

    // Case 1: Deselecting the last selected month
    if (targetIdx + 1 === currentCount) {
      const updated = unpaidMonths.slice(0, currentCount - 1);
      setWargaSubMonths(updated);
      setWargaSubAmount(updated.length > 0 ? (updated.length * wargaSubRate).toString() : '');
      return;
    }

    // Case 2: Clicking an earlier selected month -> trim selection
    if (targetIdx < currentCount - 1) {
      const updated = unpaidMonths.slice(0, targetIdx);
      setWargaSubMonths(updated);
      setWargaSubAmount(updated.length > 0 ? (updated.length * wargaSubRate).toString() : '');
      return;
    }

    // Case 3: Clicking the exact next unpaid month
    if (targetIdx === currentCount) {
      const updated = unpaidMonths.slice(0, currentCount + 1);
      setWargaSubMonths(updated);
      setWargaSubAmount((updated.length * wargaSubRate).toString());
      return;
    }

    // Case 4: Skipping months
    if (targetIdx > currentCount) {
      const nextExpected = unpaidMonths[currentCount];
      const shortExpected = nextExpected.replace(' 2026', '');
      alert(`Pembayaran iuran harus berurutan tanpa meloncat bulan. Silakan pilih bulan ${shortExpected} terlebih dahulu.`);
      return;
    }
  };

  // Handle Photo/Proof Selection for RT/Bendahara manual input (Compressed via HTML5 Canvas)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressingManual(true);
      try {
        const compressedBase64 = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.78 });
        setProofImage(compressedBase64);
      } catch (err) {
        console.error('Error compressing image:', err);
        const reader = new FileReader();
        reader.onloadend = () => setProofImage(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsCompressingManual(false);
      }
    }
  };

  // Handle Photo/Proof Selection for Warga online submission (Compressed via HTML5 Canvas)
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

  // Handle Submit Manual Input for RT & Bendahara
  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      alert('Jumlah transaksi harus lebih dari Rp 0.');
      return;
    }
    if (!description.trim()) {
      alert('Keterangan transaksi wajib diisi.');
      return;
    }
    if (txType === 'Pemasukan' && !wargaName.trim()) {
      alert('Nama penyetor / donatur wajib diisi.');
      return;
    }
    if (txType === 'Pengeluaran' && !recipient.trim()) {
      alert('Nama penerima dana wajib diisi.');
      return;
    }

    // Find matching citizen ID if Pemasukan
    const matchedCitizen = txType === 'Pemasukan' ? warga.find(
      w => w.fullName.toLowerCase().trim() === wargaName.trim().toLowerCase() ||
           (w.username && w.username.toLowerCase().trim() === wargaName.trim().toLowerCase()) ||
           w.id === wargaName.trim()
    ) : undefined;

    const newTx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      type: txType,
      amount: Number(amount),
      date,
      description: description.trim(),
      proofImage: proofImage || undefined,
      wargaId: matchedCitizen?.id,
      wargaName: txType === 'Pemasukan' ? (matchedCitizen?.fullName || wargaName.trim()) : undefined,
      recipient: txType === 'Pengeluaran' ? recipient.trim() : undefined,
      paidMonths: (txType === 'Pemasukan' && pemasukanCategory === 'iuran' && selectedMonths.length > 0) ? [...selectedMonths] : undefined
    };

    onAddTransaction(newTx);

    // Reset Form fields
    setAmount('');
    setDescription('');
    setWargaName('');
    setRecipient('');
    setProofImage('');
    setSelectedMonths([]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setFeedbackToast({
      message: `Transaksi ${txType.toLowerCase()} sebesar ${formatCurrency(Number(amount))} berhasil dicatatkan.`,
      type: 'success'
    });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Handle Submit Warga Online Submission
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

    if (onAddSubmission) {
      onAddSubmission(newSub);
    }

    // Reset Warga Form
    setWargaSubProof('');
    if (wargaFileInputRef.current) wargaFileInputRef.current.value = '';

    // Re-evaluate next unpaid month
    const alreadyPaid = getWargaAlreadyPaidMonths(currentUser.fullName);
    const pendingMonths = [...getWargaPendingSubmissionMonths(currentUser.fullName), ...wargaSubMonths];
    const availableMonths = MONTH_LIST.filter(m => !alreadyPaid.includes(m) && !pendingMonths.includes(m));

    if (availableMonths.length > 0) {
      setWargaSubMonths([availableMonths[0]]);
      setWargaSubAmount((1 * wargaSubRate).toString());
    } else {
      setWargaSubMonths([]);
      setWargaSubAmount('');
    }

    alert('Pengajuan pembayaran iuran Anda berhasil dikirim! Silakan menunggu verifikasi oleh RT atau Bendahara.');
  };

  // Handle Approve Submission Trigger (Opens Modal)
  const handleApprove = (sub: PaymentSubmission) => {
    setSubToApprove(sub);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Reject Submission Trigger (Opens Modal)
  const handleReject = (sub: PaymentSubmission) => {
    setRejectionReasonInput('Bukti transfer tidak jelas / nominal tidak sesuai');
    setSubToReject(sub);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate running balance map for all transactions in chronological order
  const chronologicalTxs = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return transactions.indexOf(a) - transactions.indexOf(b);
  });

  const txBalanceMap = new Map<string, number>();
  let currentRunningBalance = 0;
  chronologicalTxs.forEach((t) => {
    if (t.type === 'Pemasukan') {
      currentRunningBalance += t.amount;
    } else {
      currentRunningBalance -= t.amount;
    }
    txBalanceMap.set(t.id, currentRunningBalance);
  });

  // Export to Excel-compatible CSV format
  const exportToExcel = () => {
    if (isWarga) return;

    let headers = 'No,Tanggal,Jenis Transaksi,Nama Warga/Penerima,Keterangan,Jumlah (Rp),Saldo (Rp)\n';
    
    // Reverse filteredTxs for Excel output: oldest data at top, newest data at bottom
    const exportTxs = [...filteredTxs].reverse();

    const rows = exportTxs.map((t, index) => {
      const name = t.type === 'Pemasukan' ? t.wargaName : t.recipient;
      const cleanDesc = t.description.replace(/,/g, ';');
      const bal = txBalanceMap.get(t.id) ?? 0;
      return `${index + 1},${t.date},${t.type},"${name}","${cleanDesc}",${t.amount},${bal}`;
    }).join('\n');

    const csvContent = '\uFEFF' + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Riwayat_Keuangan_CMS04_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Native Print receipt handler
  const printReceipt = () => {
    window.print();
  };

  // Filtered transactions (newest to oldest)
  const filteredTxs = transactions.filter(t => {
    const matchesSearch = 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.wargaName && t.wargaName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.recipient && t.recipient.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'Semua' || t.type === typeFilter;

    return matchesSearch && matchesType;
  }).sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return transactions.indexOf(b) - transactions.indexOf(a);
  });

  // Pending Submissions list for RT & Bendahara (Only show pending items per request)
  const pendingSubmissions = submissions.filter(s => s.status === 'Pending');
  const filteredSubmissions = pendingSubmissions;

  // Warga's own submissions (or any account's own submissions)
  const mySubmissions = submissions.filter(s => {
    const sName = s.wargaName ? s.wargaName.toLowerCase().trim() : '';
    const uFullName = currentUser.fullName ? currentUser.fullName.toLowerCase().trim() : '';
    const nameMatch = sName !== '' && uFullName !== '' && sName === uFullName;

    const sSubBy = s.submittedBy ? s.submittedBy.toLowerCase().trim() : '';
    const uUsername = currentUser.username ? currentUser.username.toLowerCase().trim() : '';
    const userMatch = sSubBy !== '' && uUsername !== '' && sSubBy === uUsername;

    const idMatch = Boolean(s.wargaId && currentUser.id && s.wargaId === currentUser.id);

    return nameMatch || userMatch || idMatch;
  });

  const hasPendingMySubmissions = mySubmissions.some(s => s.status === 'Pending');

  // Calculations for sub-widgets
  const incTotal = transactions.filter(t => t.type === 'Pemasukan').reduce((s, t) => s + t.amount, 0);
  const expTotal = transactions.filter(t => t.type === 'Pengeluaran').reduce((s, t) => s + t.amount, 0);

  // Selected citizen paid months (for RT/Bendahara form)
  const activeWargaPaidMonths = wargaName.trim() ? getWargaAlreadyPaidMonths(wargaName) : [];

  // Warga current user paid months
  const currentUserPaidMonths = getWargaAlreadyPaidMonths(currentUser.fullName);
  const currentUserPendingMonths = getWargaPendingSubmissionMonths(currentUser.fullName);

  return (
    <div id="finance_panel" className="space-y-8 animate-fadeIn text-slate-100">
      
      {/* Feedback Toast Notification */}
      {feedbackToast && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-fadeIn shadow-xl ${
          feedbackToast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
            : 'bg-red-950/90 border-red-500/50 text-red-300'
        }`}>
          {feedbackToast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> : <XCircle size={18} className="text-red-400 shrink-0" />}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Coins className="text-amber-400" size={26} />
            Pengelolaan Kas & Keuangan RT
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Catatan kas masuk dari iuran warga dan mutasi kas keluar secara terperinci demi asas keterbukaan informasi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onRefreshSync && (
            <button
              type="button"
              onClick={async () => {
                const btnIcon = document.getElementById('manual-sync-icon');
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
              title="Sinkronkan data iuran dan transaksi sekarang dari database Supabase Cloud"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-amber-400 border border-amber-500/30 font-bold rounded-xl text-xs transition-all shadow-lg shrink-0 cursor-pointer"
            >
              <RefreshCw id="manual-sync-icon" size={14} />
              <span>Refresh & Sync</span>
              {dbStatus && (
                <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.connected ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} title={dbStatus.lastTested}></span>
              )}
            </button>
          )}

          {!isWarga && (
            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 shrink-0 cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              Download Riwayat Transaksi (Excel)
            </button>
          )}
        </div>
      </div>

      {/* Overview Widget: Total Saldo Kas RT */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/40 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Coins size={30} />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Saldo Kas RT</span>
            <h3 className="text-2xl md:text-3xl font-black gold-gradient-text mt-0.5 tracking-tight">
              {formatCurrency(incTotal - expTotal)}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 self-start sm:self-auto shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Status Kas Transparan & Ter-update</span>
        </div>
      </div>

      {/* RULE 2: APPROVAL QUEUE SECTION (RT & Bendahara Role) */}
      {!isWarga && (
        <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Persetujuan Pembayaran Iuran Warga (Online)</span>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full transition-all ${
                    pendingSubmissions.length > 0
                      ? 'bg-red-950/90 text-red-400 border border-red-500/60 font-black animate-pulse'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {pendingSubmissions.length} Menunggu Approval
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Verifikasi pengajuan bukti bayar transfer warga sebelum dimasukkan ke Kas RT</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsApprovalQueueOpen(!isApprovalQueueOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-400 border-2 border-amber-500/80 text-[11px] font-bold shadow-md shadow-amber-500/10 transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              {isApprovalQueueOpen ? (
                <>
                  <ChevronUp size={14} className="text-amber-400" />
                  <span>Sembunyikan (Minimize)</span>
                </>
              ) : (
                <>
                  <ChevronDown size={14} className="text-amber-400" />
                  <span>
                    Buka Antrean (<strong className={pendingSubmissions.length > 0 ? 'text-red-400 font-black' : 'text-amber-400 font-bold'}>{pendingSubmissions.length}</strong>)
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Collapsible Pending items queue */}
          {isApprovalQueueOpen && (
            <>
              {filteredSubmissions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {filteredSubmissions.map((sub) => {
                    const isPending = sub.status === 'Pending';
                    const isApproved = sub.status === 'Approved';
                    const isRejected = sub.status === 'Rejected';

                    return (
                      <div
                        key={sub.id}
                        className={`bg-slate-950/80 border rounded-2xl p-4 transition-all relative flex flex-col justify-between gap-4 ${
                          isPending ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' :
                          isApproved ? 'border-emerald-500/30' : 'border-red-500/30 opacity-80'
                        }`}
                      >
                        <div>
                          {/* Top Header */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-white truncate">{sub.wargaName}</h4>
                              <span className="text-[10px] text-amber-300 font-mono font-bold bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full inline-block mt-1 shrink-0 whitespace-nowrap">
                                Blok {sub.blok || '-'}
                              </span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 whitespace-nowrap ${
                              isPending ? 'bg-red-950/90 text-red-400 border border-red-500/60 font-black' :
                              isApproved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                              'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}>
                              {isPending && <Clock size={10} />}
                              {isApproved && <CheckCircle2 size={10} />}
                              {isRejected && <XCircle size={10} />}
                              {isPending ? 'Menunggu Approval' : isApproved ? 'Disetujui' : 'Ditolak'}
                            </span>
                          </div>

                          {/* Content Grid */}
                          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block">Nominal Setoran</span>
                              <span className="font-mono font-black text-amber-400 text-sm">{formatCurrency(sub.amount)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block">Tanggal Transfer</span>
                              <span className="font-mono text-slate-300">{formatDate(sub.date)}</span>
                            </div>
                          </div>

                          <div className="mb-3">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Bulan Pembayaran ({sub.paidMonths.length})</span>
                            <div className="flex flex-wrap gap-1">
                              {sub.paidMonths.map(m => (
                                <span key={m} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-amber-300 border border-slate-800">
                                  {m.replace(' 2026', '')}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Rejection Note if any */}
                          {isRejected && sub.rejectionReason && (
                            <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] mb-3">
                              <span className="font-bold block text-[10px] uppercase">Alasan Penolakan:</span>
                              {sub.rejectionReason}
                            </div>
                          )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => setZoomedImage(sub.proofImage)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-[11px] font-bold border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Eye size={12} />
                            Lihat Bukti Foto
                          </button>

                          {isPending && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleReject(sub)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-xl text-xs font-bold border border-red-500/40 transition-colors cursor-pointer"
                              >
                                <XCircle size={13} />
                                Tolak
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApprove(sub)}
                                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
                              >
                                <CheckCircle2 size={13} />
                                Setujui (Approve)
                              </button>
                            </div>
                          )}

                          {!isPending && sub.reviewedBy && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Oleh: {sub.reviewedBy}
                            </span>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 bg-slate-950/60 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                  <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2 opacity-60" />
                  Tidak ada pengajuan pembayaran iuran warga yang menunggu verifikasi saat ini.
                </div>
              )}
            </>
          )}
        </div>
      )}



      {/* RULE 3 & 4: MANUAL OFFLINE INPUT FORM & MUTASI TABLE (RT & Bendahara Role) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Input Form Column (RT & Bendahara only) */}
        {!isWarga ? (
          <div className="lg:col-span-1 bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl h-fit">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-5">
              <div className="flex items-center gap-2">
                <PlusCircle size={20} className="text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Input Transaksi</h3>
                  <p className="text-[10px] text-slate-400">Pencatatan langsung bayar tunai/offline</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsManualInputOpen(!isManualInputOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-400 border-2 border-amber-500/80 text-[11px] font-bold shadow-md shadow-amber-500/10 transition-all cursor-pointer shrink-0"
              >
                {isManualInputOpen ? (
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

            {isManualInputOpen && (
              <form onSubmit={handleAddTx} className="space-y-4">
              
              {/* Jenis Transaksi Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setTxType('Pemasukan'); setWargaName(''); setSelectedMonths([]); }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${txType === 'Pemasukan' ? 'gold-gradient-bg text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    Pemasukan
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTxType('Pengeluaran'); setRecipient(''); }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${txType === 'Pengeluaran' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    Pengeluaran
                  </button>
                </div>
              </div>

              {/* Conditional Inputs */}
              {txType === 'Pemasukan' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Kategori Pemasukan
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPemasukanCategory('iuran');
                          setWargaName('');
                          setSelectedMonths([]);
                          setAmount('');
                          setDescription('');
                        }}
                        className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          pemasukanCategory === 'iuran'
                            ? 'gold-gradient-bg text-slate-950 shadow-md font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Iuran Bulanan Warga
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPemasukanCategory('lainnya');
                          setWargaName('');
                          setSelectedMonths([]);
                          setAmount('');
                          setDescription('');
                        }}
                        className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          pemasukanCategory === 'lainnya'
                            ? 'gold-gradient-bg text-slate-950 shadow-md font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Donasi / Pemasukan Lain
                      </button>
                    </div>
                  </div>

                  {pemasukanCategory === 'iuran' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Nama Warga Penyetor
                        </label>
                        <select
                          value={wargaName}
                          onChange={(e) => {
                            setWargaName(e.target.value);
                            setSelectedMonths([]);
                            setAmount('');
                            setDescription('');
                          }}
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                        >
                          <option value="">-- Pilih Nama Warga Penyetor --</option>
                          {warga.map((w) => (
                            <option key={w.id} value={w.fullName}>
                              {w.fullName} ({w.blok})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Multi-month selection for Iuran */}
                      <div className="p-3.5 bg-slate-950 border border-amber-500/20 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Calendar size={14} />
                            Pilihan Bulan Pembayaran
                          </label>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Status Bulan 2026:</span>
                          <span className="text-[10px] text-amber-400 font-mono font-bold">
                            {wargaName ? `${activeWargaPaidMonths.length}/12 Lunas` : 'Pilih warga dulu'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                          {MONTH_LIST.map((m) => {
                            const isAlreadyPaid = activeWargaPaidMonths.includes(m);
                            const isSelected = selectedMonths.includes(m);
                            const shortName = m.replace(' 2026', '');

                            if (isAlreadyPaid) {
                              return (
                                <div
                                  key={m}
                                  className="px-2 py-1.5 rounded-lg text-[9px] font-bold border bg-emerald-950/60 border-emerald-500/40 text-emerald-400 text-center flex flex-col items-center justify-center cursor-not-allowed opacity-80"
                                  title={`Bulan ${m} sudah lunas untuk warga ${wargaName}`}
                                >
                                  <span className="font-bold">{shortName}</span>
                                  <span className="text-[8px] uppercase tracking-tighter">✓ Lunas</span>
                                </div>
                              );
                            }

                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => handleToggleMonth(m)}
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

                        {selectedMonths.length > 0 && (
                          <div className="text-[11px] text-amber-300 font-bold pt-1">
                            {selectedMonths.length} Bulan Dipilih: <span className="font-normal text-slate-300">{selectedMonths.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Nama Penyetor / Donatur (Lain-lain)
                      </label>
                      <input
                        type="text"
                        value={wargaName}
                        onChange={(e) => setWargaName(e.target.value)}
                        placeholder="Contoh: Donatur Hamba Allah / Bapak H. Ahmad / PT Swadaya"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 italic">
                        *Nama penyetor ini hanya dicatat pada transaksi kas dan tidak dimasukkan ke Data Warga.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Dibayarkan Kepada</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Contoh: PLN, Toko Cat, Satpam Joko"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  />
                </div>
              )}

              {/* Jumlah (IDR) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Jumlah Uang (Rp)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-amber-400">Rp</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Contoh: 120000"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-mono font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Calendar size={12} className="text-amber-400" />
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition-all font-medium"
                />
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Keterangan Pembayaran</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Iuran Bulanan Juli 2026"
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all resize-none font-medium"
                />
              </div>

              {/* Bukti Foto (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Bukti Foto / Transaksi (Opsional)</span>
                  <span className="text-[9px] text-amber-400 font-mono font-normal">Kompresi Canvas</span>
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border border-slate-800 border-dashed rounded-xl cursor-pointer bg-slate-950 hover:bg-slate-800/50 transition-all">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      {isCompressingManual ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[10px] text-amber-300 font-bold">Mengompresi Gambar...</span>
                        </div>
                      ) : proofImage ? (
                        <div className="relative group w-full h-20 px-2 flex justify-center items-center">
                          <img src={proofImage} alt="Preview Bukti" className="h-full max-w-full object-cover rounded-lg border border-slate-700" />
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setProofImage(''); if (fileInputRef.current) fileInputRef.current.value=''; }}
                            className="absolute -top-1 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload size={16} className="text-slate-500 mb-1" />
                          <p className="text-[10px] text-slate-400"><span className="font-bold text-amber-400">Klik untuk upload</span></p>
                          <p className="text-[8px] text-slate-500">Otomatis terkompresi & jernih</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 gold-gradient-bg text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                Simpan Transaksi Kas Manual
              </button>

            </form>
            )}
          </div>
        ) : null}

        {/* History Table Column (Fills remaining space) */}
        <div className={`bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl ${isWarga ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Riwayat Mutasi Keuangan Kas RT</h4>
            
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute inset-y-0 left-3 my-auto text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari transaksi..."
                  className="pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
                />
              </div>

              {/* Filter Type */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-amber-500 transition-all"
              >
                <option value="Semua">Semua Aliran</option>
                <option value="Pemasukan">Pemasukan (In)</option>
                <option value="Pengeluaran">Pengeluaran (Out)</option>
              </select>
            </div>
          </div>

          {/* Table container with spacious column layouts */}
          <div className="overflow-x-auto min-w-full rounded-2xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-widest text-[10px] font-bold bg-slate-950">
                  <th className="px-4 py-3.5 font-bold min-w-[110px] whitespace-nowrap">Tanggal</th>
                  <th className="px-4 py-3.5 font-bold min-w-[160px]">Nama / Penerima</th>
                  <th className="px-4 py-3.5 font-bold min-w-[220px]">Keterangan</th>
                  <th className="px-4 py-3.5 font-bold text-center min-w-[100px]">Jenis</th>
                  <th className="px-4 py-3.5 font-bold text-right min-w-[130px] whitespace-nowrap">Jumlah</th>
                  <th className="px-4 py-3.5 font-bold text-right min-w-[130px] whitespace-nowrap text-amber-400">Saldo</th>
                  <th className="px-4 py-3.5 font-bold text-center min-w-[90px]">Bukti</th>
                  <th className="px-4 py-3.5 font-bold text-right min-w-[120px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredTxs.map((tx) => {
                  const isPemasukan = tx.type === 'Pemasukan';
                  const entityName = isPemasukan ? tx.wargaName : tx.recipient;
                  const txSaldo = txBalanceMap.get(tx.id) ?? 0;
                  
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-400 whitespace-nowrap">{tx.date}</td>
                      <td className="px-4 py-3.5 font-bold text-white">{entityName}</td>
                      <td className="px-4 py-3.5 text-slate-300 leading-normal">{tx.description}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPemasukan ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                          {isPemasukan ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap ${isPemasukan ? 'text-amber-400' : 'text-slate-300'}`}>
                        {isPemasukan ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black whitespace-nowrap text-emerald-400">
                        {formatCurrency(txSaldo)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {tx.proofImage ? (
                          <button
                            type="button"
                            onClick={() => setZoomedImage(tx.proofImage!)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-colors cursor-pointer"
                          >
                            <Eye size={12} />
                            Lihat
                          </button>
                        ) : (
                          <span className="text-slate-600 font-mono text-[10px]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTxForReceipt(tx)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-700 hover:border-amber-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          <Printer size={12} />
                          Kuitansi
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredTxs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      Tidak ada data transaksi ditemukan yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* MODAL: Zoom Proof Image */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-md">
          <div className="relative max-w-lg w-full bg-slate-900 border border-amber-500/30 p-5 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full shadow-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-widest pb-3 border-b border-slate-800 mb-3 flex-shrink-0">Lampiran Bukti Pembayaran</div>
            <div className="overflow-hidden flex-1 flex items-center justify-center">
              <img src={zoomedImage} alt="Bukti Mutasi Kas" className="max-w-full max-h-[65vh] object-contain rounded-xl border border-slate-800" />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Printable Receipt (Kuitansi) */}
      {selectedTxForReceipt && (
        <div id="receipt_modal_wrapper" className="fixed inset-0 bg-slate-950/80 flex items-start justify-center pt-4 sm:pt-10 p-4 z-50 animate-fadeIn backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative border border-amber-500/40">
            
            {/* Close Button on Modal (Hidden in Print) */}
            <button
              onClick={() => setSelectedTxForReceipt(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full print:hidden transition-colors cursor-pointer"
              title="Tutup"
            >
              <X size={18} />
            </button>

            {/* Receipt Printable Card Area */}
            <div id="receipt_print_area" className="space-y-6 pt-6 sm:pt-8">
              
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b-2 border-amber-500/50 pb-4">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">KUITANSI</h3>
                  <p className="text-xs text-amber-400 font-mono mt-0.5">
                    No: {(() => {
                      let yyyy = '2026';
                      let mm = '01';
                      let dd = '01';
                      if (selectedTxForReceipt.date) {
                        const parts = selectedTxForReceipt.date.split('-');
                        if (parts.length === 3) {
                          yyyy = parts[0];
                          mm = parts[1];
                          dd = parts[2];
                        }
                      }
                      const idx = chronologicalTxs.findIndex(t => t.id === selectedTxForReceipt.id);
                      const seq = idx !== -1 ? idx + 1 : 1;
                      return `${yyyy}/${mm}/${dd}/CMS04/${seq}`;
                    })()}
                  </p>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-black gold-gradient-text">CMS-04</h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Cluster Mutiara Satria
                  </p>
                </div>
              </div>

              {/* Receipt Fields Body */}
              <div className="space-y-3.5 text-xs text-slate-200">
                
                <div className="grid grid-cols-4 border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-400">Telah Terima Dari:</span>
                  <span className="col-span-3 font-bold text-sm text-white">
                    {selectedTxForReceipt.type === 'Pemasukan' ? selectedTxForReceipt.wargaName : 'Kas Rukun Tetangga (RT)'}
                  </span>
                </div>

                <div className="grid grid-cols-4 border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-400">Dibayarkan Kepada:</span>
                  <span className="col-span-3 font-bold text-sm text-white">
                    {selectedTxForReceipt.type === 'Pemasukan' ? 'Bendahara RT' : selectedTxForReceipt.recipient}
                  </span>
                </div>

                {selectedTxForReceipt.type === 'Pengeluaran' && (
                  <div className="grid grid-cols-4 border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-400">Dibayarkan Oleh:</span>
                    <span className="col-span-3 font-bold text-sm text-white">
                      Bendahara RT
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-4 border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-400">Uang Sejumlah:</span>
                  <span className="col-span-3 italic bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl font-bold text-amber-300 leading-relaxed">
                    {terbilang(selectedTxForReceipt.amount)} Rupiah
                  </span>
                </div>

                <div className="grid grid-cols-4 border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-400">Untuk Keperluan:</span>
                  <span className="col-span-3 text-slate-200 font-semibold leading-normal">{selectedTxForReceipt.description}</span>
                </div>

                <div className="grid grid-cols-4 border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-400">Tanggal Transaksi:</span>
                  <span className="col-span-3 font-mono text-white font-bold">{formatDate(selectedTxForReceipt.date)}</span>
                </div>

              </div>

              {/* Receipt Footer Signatures & Large Price Badge */}
              <div className="flex justify-between items-end pt-4">
                
                {/* Large Amount Box */}
                <div className="border border-amber-500/40 bg-slate-950 px-5 py-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Jumlah Nominal</span>
                  <span className="text-xl font-black gold-gradient-text mt-1 block">
                    {formatCurrency(selectedTxForReceipt.amount)}
                  </span>
                </div>

                {/* Signatures */}
                <div className="text-center w-48 text-xs text-slate-200 space-y-12">
                  <div>
                    <p className="font-mono text-[9px] text-amber-400">Tanda Tangan Digital Resmi</p>
                  </div>
                  <div>
                    <p className="font-bold border-b border-amber-500/40 pb-0.5 mx-4 text-white">
                      {getStoredUsers().find(u => u.role === 'bendahara')?.fullName || 'Sarah Amelia'}
                    </p>
                    <p className="text-[10px] text-slate-400">Bendahara RT</p>
                  </div>
                </div>

              </div>

              {/* Stamp of validation notice */}
              <div className="border-t border-slate-800 pt-3 text-center text-[9px] text-slate-500 leading-normal">
                kuitansi ini dibuat secara digital dan diakui sebagai bukti transaksi dalam lingkup RT04
              </div>

            </div>

            {/* Print action Buttons bar (Hidden in Print) */}
            <div className="mt-8 pt-4 border-t border-slate-800 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setSelectedTxForReceipt(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                onClick={printReceipt}
                className="inline-flex items-center gap-1.5 px-5 py-2 gold-gradient-bg text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Printer size={13} />
                Cetak / Save PDF
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Print Styles inject directly to DOM */}
      <style>{`
        @media print {
          html, body {
            background: #0f172a !important;
            height: 100% !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #receipt_modal_wrapper, #receipt_modal_wrapper * {
            visibility: visible !important;
          }
          #receipt_modal_wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: #0f172a !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: 999999 !important;
            overflow: hidden !important;
            display: block !important;
          }
          #receipt_modal_wrapper > div {
            background: #0f172a !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
          }
          #receipt_print_area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 40px !important;
            background: #0f172a !important;
            color: #f8fafc !important;
            box-sizing: border-box !important;
          }
          .print\:hidden {
            display: none !important;
            height: 0 !important;
            width: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* APPROVAL CONFIRMATION MODAL */}
      {subToApprove && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-4 sm:pt-10 p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={20} />
                <h3 className="font-bold text-sm text-white">Konfirmasi Persetujuan Pembayaran</h3>
              </div>
              <button
                type="button"
                onClick={() => setSubToApprove(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-medium">Nama Warga:</span>
                <span className="font-bold text-white">{subToApprove.wargaName} (Blok {subToApprove.blok || '-'})</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-medium">Nominal:</span>
                <span className="font-mono font-black text-amber-400 text-sm">{formatCurrency(subToApprove.amount)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-medium">Bulan Pembayaran:</span>
                <span className="font-bold text-amber-300">{subToApprove.paidMonths.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Tanggal Transfer:</span>
                <span className="font-mono text-slate-300">{formatDate(subToApprove.date)}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl text-[11px] text-emerald-300">
              Dengan menyetujui, dana pembayaran ini akan otomatis dicatat sebagai <strong>Pemasukan Kas RT</strong> dan status iuran warga untuk bulan terkait diubah menjadi <strong>Lunas</strong>.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSubToApprove(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onApproveSubmission) {
                    onApproveSubmission(subToApprove.id, currentUser.fullName);
                  }
                  setFeedbackToast({
                    message: `Pembayaran ${subToApprove.wargaName} sebesar ${formatCurrency(subToApprove.amount)} berhasil diverifikasi & masuk Kas RT!`,
                    type: 'success'
                  });
                  setSubToApprove(null);
                  setTimeout(() => setFeedbackToast(null), 4000);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 size={16} />
                Setujui & Verifikasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION CONFIRMATION MODAL */}
      {subToReject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-4 sm:pt-10 p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle size={20} />
                <h3 className="font-bold text-sm text-white">Tolak Pengajuan Pembayaran</h3>
              </div>
              <button
                type="button"
                onClick={() => { setSubToReject(null); setRejectionReasonInput(''); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-slate-300">
                Anda akan menolak pengajuan pembayaran dari <strong className="text-white">{subToReject.wargaName}</strong> ({formatCurrency(subToReject.amount)}).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Alasan Penolakan</label>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                rows={3}
                placeholder="Contoh: Bukti transfer tidak jelas / Nominal tidak sesuai / Saldo belum masuk"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setSubToReject(null); setRejectionReasonInput(''); }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const reason = rejectionReasonInput.trim() || 'Bukti transfer tidak valid/sesuai';
                  if (onRejectSubmission) {
                    onRejectSubmission(subToReject.id, reason, currentUser.fullName);
                  }
                  setFeedbackToast({
                    message: `Pengajuan pembayaran ${subToReject.wargaName} telah ditolak.`,
                    type: 'error'
                  });
                  setSubToReject(null);
                  setRejectionReasonInput('');
                  setTimeout(() => setFeedbackToast(null), 4000);
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition-all shadow-lg shadow-red-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <XCircle size={16} />
                Konfirmasi Penolakan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

