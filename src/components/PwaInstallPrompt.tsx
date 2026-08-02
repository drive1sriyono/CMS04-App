import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, CheckCircle, X, Share2, PlusSquare, Info } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallPromptProps {
  onDismiss?: () => void;
  variant?: 'banner' | 'compact' | 'card';
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({ variant = 'banner' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is running in standalone mode (installed as PWA)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen for PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // If browser doesn't trigger automated prompt (e.g. desktop safari/firefox), explain how to install
      alert('Untuk menginstal CMS04:\n- Di Chrome/Edge Laptop: Klik ikon Instal di sebelah kanan address bar browser.\n- Di Android: Ketuk menu titik tiga (⋮) lalu pilih "Tambahkan ke Layar Utama".');
      return;
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // If already standalone mode, render a clean badge or hide
  if (isStandalone || isInstalled) {
    if (variant === 'compact') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold font-mono">
          <CheckCircle size={14} />
          <span>App Terinstal</span>
        </div>
      );
    }
    return null;
  }

  if (dismissed && variant === 'banner') {
    return null;
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleInstallClick}
        className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        title="Instal Aplikasi di HP atau Laptop"
      >
        <Download size={15} className="animate-bounce" />
        <span>Instal PWA</span>
      </button>
    );
  }

  return (
    <>
      {/* Banner Floating Top/Card */}
      <div className="mb-6 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl shrink-0 shadow-inner">
              <Smartphone size={24} className="hidden sm:block" />
              <Monitor size={24} className="sm:hidden" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white tracking-wide">PWA CMS04 Siap Diinstal</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[9px] font-mono font-bold uppercase">
                  Mobile & Laptop
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Akses cepat tanpa perlu membuka browser. Dapat digunakan secara offline dan responsif di HP Android, iOS, maupun Laptop.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            <button
              onClick={handleInstallClick}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Download size={16} />
              <span>Instal Aplikasi</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all cursor-pointer"
              title="Tutup pemberitahuan"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Guide for iOS Safari Users */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone size={20} className="text-amber-400" />
                <h3 className="font-bold text-white text-sm">Instal di iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ikuti langkah mudah berikut di Safari untuk memasang CMS04 ke layar utama iOS Anda:
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                  <Share2 size={16} />
                </div>
                <div>
                  <span className="font-bold text-white block">1. Ketuk Tombol Bagikan</span>
                  <span className="text-slate-400 text-[11px]">Ketuk ikon Share di bagian bawah Safari.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                  <PlusSquare size={16} />
                </div>
                <div>
                  <span className="font-bold text-white block">2. Pilih "Tambah ke Layar Utama"</span>
                  <span className="text-slate-400 text-[11px]">Gulir ke bawah daftar opsi dan pilih "Add to Home Screen".</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                  <Info size={16} />
                </div>
                <div>
                  <span className="font-bold text-white block">3. Selesai!</span>
                  <span className="text-slate-400 text-[11px]">Aplikasi CMS04 langsung muncul di layar HP Anda.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400 transition-all"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
