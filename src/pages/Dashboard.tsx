import { useEffect, useState } from 'react';
import { 
  FileText, Wallet, BarChart3, Users, UserCheck, Settings, Bell, LogOut, 
  Trophy, Menu, Award, LogIn, Receipt, Calculator, Activity, Clock, CheckCircle2,
  Search, Database, Trash2, AlertTriangle, Download, Upload, Crown, Mail, Phone, Lock, UserPlus, UserCircle, User as UserIcon, Key, X, Check, Shield, Sliders, Volume2, VolumeX,
  Building2, Pencil, Loader2, ArrowLeft, ArrowRight, Copy, Coins, Eye, EyeOff, Smartphone, MessageCircle, RefreshCw, Info
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { DashboardButton } from '@/components/DashboardButton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  getStoredTransactions, 
  calculateAchievers, 
  createBackup, 
  restoreBackup, 
  Transaction,
  getCurrentUser,
  logoutUser,
  User,
  changePassword,
  updateUserProfile,
  getLastBackupTime,
  fetchTransactionsFromCloud,
  getGlobalSettings,
  GlobalSettings,
  createEmployee,
  createSubscriptionRequest,
  createWithdrawalRequest,
  deleteAllAgents,
  deleteAllClients,
  deleteAllTransactions,
  deleteAllExpenses,
  deleteAllTransfers,
  deleteAllRefunds,
  isEmployeeRestricted
} from '@/lib/store';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

const securityQuestions = [
  "اين ولدت والدتك؟",
  "ماهو اقرب صديق لك؟",
  "متي تزوجت؟",
  "ماهي الهواية المفضله؟",
  "مدينة في السعوديه اقرب لقلبك؟",
  "ما وجبتك المفضلة؟"
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [achievers, setAchievers] = useState<{name: string, count: number, total: number}[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  
  // Settings State
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('moaqeb_sound_enabled') !== 'false');
  const [hideEarnings, setHideEarnings] = useState(localStorage.getItem('moaqeb_hide_earnings') === 'true');
  const [mySettingsOpen, setMySettingsOpen] = useState(false);

  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerStats, setTickerStats] = useState({ active: 0, inProgress: 0, completedWeek: 0 });
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryId, setInquiryId] = useState('');
  const [foundTx, setFoundTx] = useState<Transaction | null>(null);
  const [inquiryError, setInquiryError] = useState('');
  const [backupOpen, setBackupOpen] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  
  // About App State
  const [aboutOpen, setAboutOpen] = useState(false);

  // System Reset State
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'menu' | 'confirm1' | 'confirm2'>('menu');
  const [resetAction, setResetAction] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const [proOpen, setProOpen] = useState(false);
  const [subStep, setSubStep] = useState<'duration' | 'bank' | 'confirm'>('duration');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<'شهر' | 'سنة' | ''>('');
  const [subSuccess, setSubSuccess] = useState('');
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  
  // Employee Creation
  const [createEmpOpen, setCreateEmpOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPass, setNewEmpPass] = useState('');
  const [showEmpPass, setShowEmpPass] = useState(false); // Toggle Eye
  const [empSuccess, setEmpSuccess] = useState('');
  const [empError, setEmpError] = useState('');

  // Profile
  const [profileOpen, setProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editOfficeName, setEditOfficeName] = useState('');
  const [editSecurityQuestion, setEditSecurityQuestion] = useState('');
  const [editSecurityAnswer, setEditSecurityAnswer] = useState('');
  const [verifyOldPass, setVerifyOldPass] = useState('');
  const [showVerifyPass, setShowVerifyPass] = useState(false); // Toggle Eye
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Change Password
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOldPass, setShowOldPass] = useState(false); // Toggle Eye
  const [showNewPass, setShowNewPass] = useState(false); // Toggle Eye
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Affiliate State
  const [affiliateOpen, setAffiliateOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [rajhiAccount, setRajhiAccount] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  useEffect(() => {
    const globalSettings = getGlobalSettings();
    setSettings(globalSettings);
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user && user.role === 'golden') {
        const hasSeen = localStorage.getItem(`moaqeb_onboarding_seen_${user.id}`);
        if (!hasSeen) {
            setOnboardingOpen(true);
        }
    }
    const loadData = async () => {
        let txs: Transaction[] = [];
        if (user) {
            const targetId = user.role === 'employee' && user.parentId ? user.parentId : user.id;
            txs = await fetchTransactionsFromCloud(targetId);
        } else {
            txs = getStoredTransactions();
        }
        setTransactions(txs);
        setAchievers(calculateAchievers(txs));
        const now = Date.now();
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const active = txs.filter(t => t.status === 'active').length;
        const inProgress = txs.filter(t => t.status === 'active' && t.targetDate > now).length;
        const completedWeek = txs.filter(t => t.status === 'completed' && t.createdAt >= startOfWeek.getTime()).length;
        setTickerStats({ active, inProgress, completedWeek });
    };
    loadData();
    setLastBackup(getLastBackupTime());
    const interval = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % 3);
    }, 4000);
    return () => {
        clearInterval(interval);
    };
  }, []);

  // Realtime subscription for User Balance Updates
  useEffect(() => {
      if (!currentUser) return;
      
      const channel = supabase
        .channel('user-balance-realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${currentUser.id}`
          },
          (payload) => {
            if (payload.new) {
                const newBalance = Number(payload.new.affiliate_balance) || 0;
                setCurrentUser(prev => prev ? { ...prev, affiliateBalance: newBalance } : null);
                
                // Update local storage as well to persist
                const stored = localStorage.getItem('moaqeb_current_user_v1');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    parsed.affiliateBalance = newBalance;
                    localStorage.setItem('moaqeb_current_user_v1', JSON.stringify(parsed));
                }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
  }, [currentUser?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openPro') === 'true') {
        setSubStep('duration');
        setSelectedDuration('');
        setSelectedBank('');
        setProOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  useEffect(() => {
      if (currentUser && profileOpen) {
          setEditOfficeName(currentUser.officeName);
          setEditSecurityQuestion(currentUser.securityQuestion || '');
          setEditSecurityAnswer(currentUser.securityAnswer || '');
          setIsEditingProfile(false);
          setVerifyOldPass('');
          setProfileError('');
          setProfileSuccess('');
      }
  }, [currentUser, profileOpen]);

  const handleLogout = () => { logoutUser(); navigate('/login'); };
  
  // --- System Reset Handlers ---
  const handleInitiateReset = (action: string) => {
      setResetAction(action);
      setResetStep('confirm1');
  };

  const handleConfirmReset = async () => {
      if (resetStep === 'confirm1') {
          setResetStep('confirm2');
          return;
      }

      if (!currentUser || !resetAction) return;
      setResetLoading(true);

      const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
      let success = false;

      switch (resetAction) {
          case 'agents':
              success = await deleteAllAgents(targetId);
              break;
          case 'clients':
              success = await deleteAllClients(targetId);
              break;
          case 'expenses':
              success = await deleteAllExpenses(targetId);
              break;
          case 'transactions':
              success = await deleteAllTransactions(targetId);
              break;
          case 'statement':
              // Clears Transfers & Refunds (part of statement not covered by others)
              const tSuccess = await deleteAllTransfers(targetId);
              const rSuccess = await deleteAllRefunds(targetId);
              success = tSuccess && rSuccess;
              break;
          case 'reports':
              // Clears EVERYTHING related to reports/stats
              // 1. Transactions (General Stats, Quick Stats)
              await deleteAllTransactions(targetId);
              // 2. Expenses (Expenses Log, Salary Log)
              await deleteAllExpenses(targetId);
              // 3. Transfers (Agent Transfers Log)
              await deleteAllTransfers(targetId);
              // 4. Refunds (Client Refunds Log)
              await deleteAllRefunds(targetId);
              
              // Note: Employee Reports are derived from these logs, so they are cleared too.
              // Clients and Agents directories are preserved.
              success = true;
              break;
      }

      setResetLoading(false);
      if (success) {
          alert('تم تنفيذ العملية بنجاح');
          window.location.reload();
      } else {
          alert('حدث خطأ أثناء التنفيذ');
      }
      setResetOpen(false);
      setResetStep('menu');
      setResetAction(null);
  };

  // ... (Rest of handlers) ...
  const handleCreateEmployee = async () => {
    setEmpError('');
    if (!currentUser || !newEmpName || !newEmpPass) return;
    const res = await createEmployee({ name: newEmpName, password: newEmpPass, permissions: [] }, currentUser);
    if (res.success) {
        setEmpSuccess(`تم إنشاء حساب الموظف بنجاح. اسم الدخول: ${res.username}`);
        setNewEmpName('');
        setNewEmpPass('');
    } else {
        setEmpError(res.message || 'فشل إنشاء الموظف');
    }
  };

  const handleUpdateProfile = async () => {
      setProfileError('');
      if (!currentUser) return;
      if (!editOfficeName || !editSecurityQuestion || !editSecurityAnswer || !verifyOldPass) {
          setProfileError('يرجى ملء جميع الحقول وكلمة المرور للتأكيد');
          return;
      }
      setProfileLoading(true);
      try {
          const res = await updateUserProfile(
              currentUser.id, 
              verifyOldPass, 
              editOfficeName, 
              editSecurityQuestion, 
              editSecurityAnswer
          );
          if (res.success) {
              setProfileSuccess('تم تحديث البيانات بنجاح');
              const updated = getCurrentUser();
              setCurrentUser(updated);
              setTimeout(() => {
                  setIsEditingProfile(false);
                  setProfileSuccess('');
                  setVerifyOldPass('');
              }, 1500);
          } else {
              setProfileError(res.message || 'فشل التحديث');
          }
      } catch (e) {
          setProfileError('حدث خطأ غير متوقع');
      } finally {
          setProfileLoading(false);
      }
  };

  const handleChangePassword = async () => {
    setPassError('');
    if (!currentUser) return;
    if (!oldPass || !newPass || !confirmPass) {
        setPassError('يرجى ملء جميع الحقول');
        return;
    }
    if (newPass !== confirmPass) {
        setPassError('كلمتا المرور غير متطابقتين');
        return;
    }
    setPassLoading(true);
    try {
        const result = await changePassword(currentUser.phone, oldPass, newPass);
        if (result.success) {
            setPassSuccess(true);
            setTimeout(() => {
                setChangePassOpen(false);
                setPassSuccess(false);
                setOldPass('');
                setNewPass('');
                setConfirmPass('');
            }, 2000);
        } else {
            setPassError(result.message || 'فشل التحديث');
        }
    } catch (err) {
        setPassError('حدث خطأ غير متوقع');
    } finally {
        setPassLoading(false);
    }
  };

  const handleInquiry = () => {
    setInquiryError('');
    setFoundTx(null);
    const tx = transactions.find(t => t.serialNo === inquiryId);
    if (!tx) {
        setInquiryError('لم يتم العثور على معاملة بهذا الرقم، يرجى التحقق والمحاولة مرة أخرى.');
    } else {
        setFoundTx(tx);
    }
  };

  const calculateTimeLeft = (targetDate: number) => {
    const diff = targetDate - Date.now();
    if (diff <= 0) return "منتهية";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} يوم و ${hours} ساعة`;
  };

  const handleCreateBackup = () => {
    const data = createBackup();
    setLastBackup(Date.now().toString());
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_moaqeb_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRestoreBackup = () => {
    if (!restoreText) return;
    const success = restoreBackup(restoreText);
    if (success) {
      alert('تم استعادة النسخة الاحتياطية بنجاح! سيتم إعادة تحميل الصفحة.');
      window.location.reload();
    } else {
      alert('فشل استعادة النسخة. تأكد من صحة الكود.');
    }
  };

  const formatBackupDate = (ts: string) => {
    const date = new Date(parseInt(ts));
    const timeStr = date.toLocaleTimeString('ar-SA', { hour: 'numeric', minute: 'numeric' });
    const dayName = date.toLocaleDateString('ar-SA', { weekday: 'long' });
    const monthName = date.toLocaleDateString('ar-SA', { month: 'long' });
    const year = date.toLocaleDateString('ar-SA', { year: 'numeric' });
    return `${timeStr}، ${dayName}، ${monthName}، ${year}`;
  };
  
  const tickerItems = [
    { label: "المعاملات النشطة", value: tickerStats.active, icon: Activity, color: "text-blue-600" },
    { label: "تحت الإنجاز", value: tickerStats.inProgress, icon: Clock, color: "text-orange-600" },
    { label: "إنجاز هذا الأسبوع", value: tickerStats.completedWeek, icon: CheckCircle2, color: "text-green-600" }
  ];

  const canAccessPage = (page: keyof GlobalSettings['pagePermissions']) => {
    if (!settings) return true;
    const userRole = currentUser?.role || 'visitor';
    if (userRole === 'golden' || userRole === 'employee') return true;
    // @ts-ignore
    return settings.pagePermissions[page].includes(userRole);
  };

  const handlePageClick = (page: string, path: string) => {
      if (soundEnabled) {
          new Audio('/sound2.mp3').play().catch(() => {});
      }
      // @ts-ignore
      if (canAccessPage(page)) {
          navigate(path);
      } else {
          setSubStep('duration');
          setSelectedDuration('');
          setSelectedBank('');
          setProOpen(true);
      }
  };

  const handleSubscribe = async () => {
    if (!currentUser) {
        alert('يجب تسجيل الدخول أولاً');
        navigate('/login');
        return;
    }
    if (!selectedBank || !selectedDuration) return;
    const res = await createSubscriptionRequest(currentUser.id, currentUser.officeName, currentUser.phone, selectedDuration, selectedBank);
    if (res.success) {
        setSubSuccess('تم إرسال طلب الاشتراك بنجاح! سيتم التفعيل قريباً.');
        setTimeout(() => {
            setSubSuccess('');
            setProOpen(false);
            setSubStep('duration');
            setSelectedBank('');
            setSelectedDuration('');
        }, 3000);
    } else {
        alert(res.message);
    }
  };

  const resetSubModal = (open: boolean) => {
      setProOpen(open);
      if(open && currentUser?.role === 'golden' && currentUser.subscriptionExpiry && currentUser.subscriptionExpiry > Date.now()) {
          setAlreadySubscribed(true);
      } else {
          setAlreadySubscribed(false);
      }
      if(!open) {
          setTimeout(() => {
            setSubStep('duration');
            setSelectedBank('');
            setSelectedDuration('');
            setSubSuccess('');
          }, 300);
      }
  };

  const toggleSound = (checked: boolean) => {
      setSoundEnabled(checked);
      localStorage.setItem('moaqeb_sound_enabled', String(checked));
  };

  const toggleHideEarnings = (checked: boolean) => {
      setHideEarnings(checked);
      localStorage.setItem('moaqeb_hide_earnings', String(checked));
  };

  const nextOnboardingStep = () => {
      if (settings && onboardingStep < settings.onboardingSteps.length - 1) {
          setOnboardingStep(prev => prev + 1);
      } else {
          if (currentUser) {
              localStorage.setItem(`moaqeb_onboarding_seen_${currentUser.id}`, 'true');
          }
          setOnboardingOpen(false);
      }
  };

  const prevOnboardingStep = () => {
      if (onboardingStep > 0) {
          setOnboardingStep(prev => prev - 1);
      }
  };

  const handleCopyReferral = () => {
      if (!currentUser) return;
      const link = `${window.location.origin}/register?ref=${currentUser.id}`;
      const msg = `سجل في تطبيق مان هوبات لإدارة مكاتب الخدمات العامه واستفد من المزايا المتعدده..\n${link}`;
      navigator.clipboard.writeText(msg);
      alert('تم نسخ رابط الدعوة بنجاح');
  };

  const handleWithdraw = async () => {
      setWithdrawError('');
      if (!currentUser) return;
      if (!rajhiAccount) {
          setWithdrawError('يرجى إدخال رقم حساب الراجحي');
          return;
      }
      
      const balance = currentUser.affiliateBalance || 0;
      if (balance < 110) {
          setWithdrawError('الحد الأدنى للسحب هو 110 ريال');
          return;
      }

      const res = await createWithdrawalRequest(currentUser.id, currentUser.officeName, balance, rajhiAccount);
      if (res.success) {
          setWithdrawSuccess(true);
          setTimeout(() => {
              setWithdrawSuccess(false);
              setWithdrawOpen(false);
              setAffiliateOpen(false);
              setRajhiAccount('');
          }, 2000);
      } else {
          setWithdrawError(res.message || 'فشل إرسال الطلب');
      }
  };

  const monthlyBenefits = settings?.packages.monthly.benefits || [];
  const annualBenefits = settings?.packages.annual.benefits || [];
  const monthlyPrice = settings?.packages.monthly.price || 59;
  const annualPrice = settings?.packages.annual.price || 299;
  const banksList = settings?.banks || [];

  return (
    <div className="min-h-screen pb-10">
      {/* ... (Marquee & Header) ... */}
      <div 
        className="w-full py-2 mb-6 overflow-hidden shadow-sm border-b"
        style={{ 
            backgroundColor: settings?.marquee?.bgColor || '#DC2626', 
            color: settings?.marquee?.textColor || '#FFFFFF',
            borderColor: `${settings?.marquee?.bgColor}33` 
        }}
      >
        <div className="marquee-container">
          <div className="marquee-content font-bold text-sm sm:text-base">
            {settings?.marquee?.text || 'مرحباً بكم في تطبيق مان هويات لمكاتب الخدمات'}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-gray-800 mb-1 text-shadow">
              {settings?.siteTitle || 'مان هويات لمكاتب الخدمات'}
            </h1>
            <p className="text-gray-500 font-medium text-sm sm:text-base">
              لوحة التحكم الرئيسية <span className="text-red-600 text-xs font-bold mr-1">v. 1</span>
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {currentUser && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="outline-none">
                    <div className="flex flex-col items-center justify-center mr-2 cursor-pointer group">
                        
                        {/* Affiliate Earnings Button - Double Click */}
                        <button 
                            onDoubleClick={(e) => { e.stopPropagation(); setAffiliateOpen(true); }}
                            className="bg-green-50 text-green-600 rounded-2xl px-3 py-2 mb-2 flex flex-col items-center justify-center shadow-sm border border-green-100 hover:bg-green-100 transition-colors select-none"
                        >
                            <span className="text-[10px] font-bold">أرباحك:</span>
                            <span className="text-xs font-black">
                                {hideEarnings ? '****' : (currentUser.affiliateBalance || 0)} ريال
                            </span>
                        </button>

                        <div className="relative w-10 h-10 rounded-full bg-blue-100 shadow-3d flex items-center justify-center text-blue-600 mb-1 group-hover:scale-105 transition-transform border border-blue-200">
                            <UserCircle className="w-6 h-6" />
                            {currentUser.role === 'golden' && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white animate-blink-slow"></span>
                            )}
                        </div>
                        <div className="text-center leading-3 mt-1">
                            <span className="block text-[10px] font-bold text-gray-600">مرحبا</span>
                            <span className="block text-[10px] font-bold text-red-600 truncate max-w-[80px]">{currentUser.officeName}</span>
                        </div>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-[#eef2f6] shadow-3d border-none rounded-xl" align="end" dir="rtl">
                    <DropdownMenuLabel className="text-center font-bold text-gray-700">{currentUser.officeName}</DropdownMenuLabel>
                    <div className="text-center">
                        <span className="text-xs text-blue-600 font-bold">{currentUser.role === 'golden' ? 'عضو ذهبي' : currentUser.role === 'employee' ? 'موظف' : 'عضو'}</span>
                        {currentUser.role === 'golden' && currentUser.subscriptionExpiry && (
                            <span className="block text-[10px] text-red-500 mt-1">
                                ينتهي: {new Date(currentUser.subscriptionExpiry).toLocaleDateString('ar-SA')}
                            </span>
                        )}
                    </div>
                    <DropdownMenuSeparator className="bg-gray-200" />
                    <DropdownMenuItem className="cursor-pointer focus:bg-white focus:text-blue-600 rounded-lg my-1 gap-2" onClick={() => setProfileOpen(true)}>
                        <UserIcon className="w-4 h-4" /> <span>الملف الشخصي</span>
                    </DropdownMenuItem>
                    {currentUser.role === 'golden' && (
                        <DropdownMenuItem className="cursor-pointer focus:bg-white focus:text-blue-600 rounded-lg my-1 gap-2" onClick={() => setCreateEmpOpen(true)}>
                            <UserPlus className="w-4 h-4" /> <span>إصدار عضوية موظف</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="cursor-pointer focus:bg-white focus:text-blue-600 rounded-lg my-1 gap-2" onClick={() => setChangePassOpen(true)}>
                        <Key className="w-4 h-4" /> <span>تغيير كلمة المرور</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-200" />
                    <DropdownMenuItem className="cursor-pointer focus:bg-red-50 focus:text-red-600 text-red-500 rounded-lg my-1 gap-2" onClick={handleLogout}>
                        <LogOut className="w-4 h-4" /> <span>تسجيل الخروج</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600 transition-all">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#eef2f6] w-[300px] sm:w-[400px] overflow-y-auto" dir="rtl">
                <SheetHeader className="mb-6 text-right">
                  <SheetTitle className="text-2xl font-black text-gray-800">القائمة الرئيسية</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3">
                  {currentUser ? (
                    <button onClick={handleLogout} className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-red-600 font-bold">
                        <LogOut className="w-5 h-5" /> تسجيل خروج
                    </button>
                  ) : (
                    <button onClick={() => navigate('/login')} className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                        <LogIn className="w-5 h-5 text-blue-600" /> تسجيل دخول
                    </button>
                  )}
                  <div className="flex flex-col gap-2 mt-2 px-4 text-center">
                    <Link to="/privacy-policy" className="text-xs text-gray-500 hover:text-blue-600 underline transition-colors">سياسة الخصوصية</Link>
                    <Link to="/delete-data" className="text-xs text-gray-500 hover:text-red-600 underline transition-colors">حذف بياناتي</Link>
                  </div>
                  <Separator className="my-2 bg-gray-300/50" />
                  
                  {/* About App Dialog */}
                  <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                        <Info className="w-5 h-5 text-blue-500" /> عن التطبيق
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="text-center text-xl font-black text-gray-800 flex items-center justify-center gap-2">
                                <Info className="w-6 h-6 text-blue-600" />
                                عن تطبيق مان هوبات
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-6 space-y-4 text-gray-700 leading-relaxed">
                            <p className="text-sm font-bold text-center">
                                تطبيق مان هوبات هو نظام محاسبي وإداري متكامل مخصص لمكاتب الخدمات العامة والاستقدام في المملكة العربية السعودية.
                            </p>
                            <div className="bg-white p-4 rounded-xl shadow-3d-inset border border-blue-100">
                                <h4 className="font-black text-blue-600 mb-2 text-sm">الهدف من التطبيق:</h4>
                                <ul className="text-xs space-y-2 list-disc list-inside font-medium text-gray-600">
                                    <li>تنظيم المعاملات المالية والإدارية للمكاتب.</li>
                                    <li>حفظ حقوق المكتب والعملاء والمعقبين.</li>
                                    <li>متابعة الأرباح والمصروفات بدقة عالية.</li>
                                    <li>تسهيل الوصول لأفضل المعقبين المنجزين.</li>
                                    <li>إصدار تقارير تفصيلية للأداء المالي والإداري.</li>
                                </ul>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-gray-400">الإصدار 1.0.0</p>
                                <p className="text-[10px] text-gray-400 mt-1">تطوير: ELTAIB HAMED ELTAIB</p>
                            </div>
                            <button onClick={() => setAboutOpen(false)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">إغلاق</button>
                        </div>
                    </DialogContent>
                  </Dialog>

                  {/* ... (Existing Dialogs) ... */}
                  <Dialog open={inquiryOpen} onOpenChange={setInquiryOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                        <Search className="w-5 h-5 text-purple-600" /> استعلام عن معاملة
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#eef2f6] border-none shadow-3d" dir="rtl">
                        <DialogHeader><DialogTitle>الاستعلام عن معاملة</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex gap-2">
                                <Input placeholder="رقم المعاملة (مثلاً 0001)" value={inquiryId} onChange={(e) => setInquiryId(e.target.value)} className="bg-white shadow-3d-inset border-none" />
                                <button onClick={handleInquiry} className="bg-purple-600 text-white px-4 rounded-xl font-bold shadow-lg">بحث</button>
                            </div>
                            {inquiryError && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 shadow-sm">{inquiryError}</div>}
                            {foundTx && (
                                <div className="bg-white/50 p-4 rounded-xl border border-white space-y-3">
                                    <p className="flex justify-between"><span className="font-bold text-gray-500">النوع:</span> <span>{foundTx.type}</span></p>
                                    <p className="flex justify-between"><span className="font-bold text-gray-500">العميل:</span> <span>{foundTx.clientName}</span></p>
                                    <p className="flex justify-between"><span className="font-bold text-gray-500">السعر:</span> <span className="text-blue-600 font-bold">{foundTx.clientPrice} ر.س</span></p>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                        <span className="font-bold text-gray-500">الحالة:</span>
                                        {foundTx.status === 'completed' ? <span className="text-green-600 font-bold">تم الإنجاز</span> : foundTx.status === 'cancelled' ? <span className="text-red-600 font-bold">تم إلغاء المعاملة</span> : <span className="text-orange-500 font-bold">تحت الإنجاز</span>}
                                    </div>
                                    {foundTx.status === 'active' && <p className="flex justify-between text-xs text-gray-400 mt-2"><span>الوقت المتبقي:</span> <span>{calculateTimeLeft(foundTx.targetDate)}</span></p>}
                                </div>
                            )}
                        </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog open={backupOpen} onOpenChange={setBackupOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                        <Database className="w-5 h-5 text-orange-600" /> النسخ الاحتياطي
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#eef2f6] border-none shadow-3d" dir="rtl">
                        <DialogHeader><DialogTitle>النسخ الاحتياطي والاستعادة</DialogTitle></DialogHeader>
                        <div className="space-y-6 py-4">
                            {lastBackup && <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-xs text-blue-700 font-bold text-center">آخر نسخة احتياطية كانت يوم: {formatBackupDate(lastBackup)}</div>}
                            <div className="space-y-2"><Label>إنشاء نسخة احتياطية</Label><button onClick={handleCreateBackup} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"><Download className="w-4 h-4" /> إنشاء نسخة احتياطية (Create Backup)</button></div>
                            <Separator />
                            <div className="space-y-2"><Label>استعادة نسخة (لصق الكود)</Label><textarea className="w-full h-24 rounded-xl bg-white shadow-3d-inset border-none p-3 text-xs" placeholder="الصق كود النسخة الاحتياطية هنا..." value={restoreText} onChange={(e) => setRestoreText(e.target.value)} /><button onClick={handleRestoreBackup} className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"><Upload className="w-4 h-4" /> استرجاع نسخة احتياطية (Restore Backup)</button></div>
                        </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={proOpen} onOpenChange={resetSubModal}>
                    {/* Only show trigger if not golden */}
                    <DialogTrigger asChild>
                        <button className="relative flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-yellow-200 to-yellow-400 shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-yellow-900 font-black animate-pulse overflow-hidden">
                            <Crown className="w-5 h-5" /> اشتراك ذهبي Pro
                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                        </button>
                    </DialogTrigger>
                    <DialogContent className="bg-gradient-to-br from-yellow-400 to-yellow-600 border-none shadow-3d rounded-3xl text-white max-w-lg p-6 max-h-[90vh] overflow-y-auto" dir="rtl">
                        <button onClick={() => setProOpen(false)} className="absolute top-4 left-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors text-white"><X className="w-4 h-4" /></button>
                        <DialogHeader><DialogTitle className="text-2xl font-black text-center mb-1 flex items-center justify-center gap-2"><Crown className="w-6 h-6" /> العضوية الذهبية</DialogTitle></DialogHeader>
                        {alreadySubscribed ? (
                             <div className="py-10 text-center animate-in zoom-in">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-green-600 mx-auto mb-4 shadow-lg"><CheckCircle2 className="w-8 h-8" /></div>
                                <h3 className="text-xl font-bold">أنت مشترك مسبقاً</h3>
                                <p className="text-sm mt-2 opacity-90">استمتع بمميزات العضوية الذهبية</p>
                            </div>
                        ) : subSuccess ? (
                            <div className="py-10 text-center animate-in zoom-in">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-green-600 mx-auto mb-4 shadow-lg"><CheckCircle2 className="w-8 h-8" /></div>
                                <h3 className="text-xl font-bold">{subSuccess}</h3>
                            </div>
                        ) : (
                            <div className="py-2 space-y-4">
                                {subStep === 'duration' && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <h3 className="text-center font-bold text-lg">اختر الباقة المناسبة</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button onClick={() => setSelectedDuration('شهر')} className={`p-4 rounded-xl border-2 transition-all text-right flex flex-col h-full ${selectedDuration === 'شهر' ? 'bg-white text-yellow-900 border-white' : 'bg-white/10 border-white/30 hover:bg-white/20 text-white'}`}>
                                                <div className="text-center mb-2 border-b border-current pb-2 w-full"><div className="text-sm font-bold">باقة شهرية</div><div className="text-3xl font-black">{settings?.packages.monthly.price || 59} <span className="text-xs font-medium">ريال</span></div></div>
                                                <ul className="space-y-1 text-[10px] w-full">{settings?.packages.monthly.benefits.map((b, i) => (<li key={i} className="flex items-start gap-1"><Check className="w-3 h-3 mt-0.5 shrink-0" /><span>{b}</span></li>))}</ul>
                                            </button>
                                            <button onClick={() => setSelectedDuration('سنة')} className={`p-4 rounded-xl border-2 transition-all text-right flex flex-col h-full relative overflow-hidden ${selectedDuration === 'سنة' ? 'bg-white text-yellow-900 border-white' : 'bg-white/10 border-white/30 hover:bg-white/20 text-white'}`}>
                                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl">الأكثر توفيراً</div>
                                                <div className="text-center mb-2 border-b border-current pb-2 w-full"><div className="text-sm font-bold">باقة سنوية</div><div className="text-3xl font-black">{settings?.packages.annual.price || 299} <span className="text-xs font-medium">ريال</span></div></div>
                                                <ul className="space-y-1 text-[10px] w-full">{settings?.packages.annual.benefits.map((b, i) => (<li key={i} className="flex items-start gap-1"><Check className="w-3 h-3 mt-0.5 shrink-0" /><span>{b}</span></li>))}</ul>
                                            </button>
                                        </div>
                                        <div className="flex gap-2 mt-2"><button onClick={() => { if(selectedDuration) setSubStep('bank'); }} disabled={!selectedDuration} className="w-full py-3 bg-white text-yellow-700 rounded-xl font-bold shadow-lg hover:bg-gray-100 disabled:opacity-50">التالي</button></div>
                                    </div>
                                )}
                                {subStep === 'bank' && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <h3 className="text-center font-bold text-lg">اختر البنك للتحويل</h3>
                                        <div className="space-y-2">
                                            <Label className="text-white/90">البنك المحول إليه</Label>
                                            <Select onValueChange={(val) => setSelectedBank(val)} value={selectedBank}>
                                                <SelectTrigger className="bg-white/20 border-white/30 text-white placeholder:text-white/70 h-12 text-right flex-row-reverse"><SelectValue placeholder="اختر البنك" /></SelectTrigger>
                                                <SelectContent dir="rtl">{settings?.banks.map(bank => (<SelectItem key={bank.id} value={bank.name}>{bank.name}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-2 mt-2"><button onClick={() => setSubStep('duration')} className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30">رجوع</button><button onClick={() => { if(selectedBank) setSubStep('confirm'); }} disabled={!selectedBank} className="flex-[2] py-3 bg-white text-yellow-700 rounded-xl font-bold shadow-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">التالي</button></div>
                                    </div>
                                )}
                                {subStep === 'confirm' && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4 text-center">
                                        <div className="bg-white/20 p-4 rounded-xl border border-white/30"><AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-200" /><h3 className="font-bold text-lg mb-1">يرجى التحويل الآن</h3><p className="text-sm opacity-90 mb-3">على حساب {selectedBank}</p><div className="bg-white/20 p-2 rounded-lg font-mono text-lg select-all">{settings?.banks.find(b => b.name === selectedBank)?.accountNumber || '---'}</div></div>
                                        <div className="flex gap-2 mt-2"><button onClick={() => setSubStep('bank')} className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30">رجوع</button><button onClick={handleSubscribe} className="flex-[2] py-3 bg-green-500 text-white rounded-xl font-bold shadow-lg hover:bg-green-600">تأكيد الاشتراك</button></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                  </Dialog>

                  <Dialog open={mySettingsOpen} onOpenChange={setMySettingsOpen}>
                    <DialogTrigger asChild>
                        <button className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                            <Sliders className="w-5 h-5 text-gray-600" /> إعداداتي
                        </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                        <DialogHeader><DialogTitle className="text-center text-xl font-bold text-gray-800">إعداداتي</DialogTitle></DialogHeader>
                        <div className="py-6 space-y-4">
                            <div className="bg-white p-4 rounded-xl shadow-3d-inset flex items-center justify-center gap-4">
                                <div className="flex items-center gap-3">{soundEnabled ? <Volume2 className="w-5 h-5 text-blue-600" /> : <VolumeX className="w-5 h-5 text-gray-400" />}<Label className="font-bold text-gray-700">كتم صوت الأزرار</Label></div>
                                <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-3d-inset flex flex-col items-center justify-center gap-2">
                                <div className="flex items-center gap-4 w-full justify-center">
                                    <div className="flex items-center gap-3">{hideEarnings ? <EyeOff className="w-5 h-5 text-red-500" /> : <Eye className="w-5 h-5 text-green-500" />}<Label className="font-bold text-gray-700">إخفاء الأرباح</Label></div>
                                    <Switch checked={hideEarnings} onCheckedChange={toggleHideEarnings} />
                                </div>
                                <p className="text-[10px] text-red-500 font-bold mt-1">نقرتين سريعين علي ارباحك لفتح الشاشه</p>
                            </div>
                            <button onClick={() => setMySettingsOpen(false)} className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all">إغلاق</button>
                        </div>
                    </DialogContent>
                  </Dialog>

                  {/* System Reset Button - DISABLED FOR RESTRICTED EMPLOYEES */}
                  <Dialog open={resetOpen} onOpenChange={(val) => { if(val && isEmployeeRestricted(currentUser)) return; if(!val) { setResetStep('menu'); setResetAction(null); } setResetOpen(val); }}>
                    <DialogTrigger asChild>
                      <button disabled={isEmployeeRestricted(currentUser)} className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-red-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                        <RefreshCw className="w-5 h-5" /> تهيئة النظام
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                        <DialogHeader><DialogTitle className="text-center text-xl font-black text-red-600 flex items-center justify-center gap-2"><AlertTriangle className="w-6 h-6" /> تهيئة النظام وحذف البيانات</DialogTitle></DialogHeader>
                        
                        {resetStep === 'menu' && (
                            <div className="py-4 space-y-3">
                                <button onClick={() => handleInitiateReset('agents')} className="w-full py-3 bg-white text-gray-700 rounded-xl font-bold shadow-sm hover:bg-red-50 hover:text-red-600 text-right px-4 flex items-center justify-between"><span>حذف المعقبين</span><Trash2 className="w-4 h-4" /></button>
                                <button onClick={() => handleInitiateReset('clients')} className="w-full py-3 bg-white text-gray-700 rounded-xl font-bold shadow-sm hover:bg-red-50 hover:text-red-600 text-right px-4 flex items-center justify-between"><span>حذف العملاء</span><Trash2 className="w-4 h-4" /></button>
                                <button onClick={() => handleInitiateReset('expenses')} className="w-full py-3 bg-white text-gray-700 rounded-xl font-bold shadow-sm hover:bg-red-50 hover:text-red-600 text-right px-4 flex items-center justify-between"><span>حذف المنصرفات</span><Trash2 className="w-4 h-4" /></button>
                                <button onClick={() => handleInitiateReset('transactions')} className="w-full py-3 bg-white text-gray-700 rounded-xl font-bold shadow-sm hover:bg-red-50 hover:text-red-600 text-right px-4 flex items-center justify-between"><span>حذف المعاملات</span><Trash2 className="w-4 h-4" /></button>
                                <button onClick={() => handleInitiateReset('statement')} className="w-full py-3 bg-white text-gray-700 rounded-xl font-bold shadow-sm hover:bg-red-50 hover:text-red-600 text-right px-4 flex items-center justify-between"><span>حذف كشف الحساب (تحويلات/مرتجعات)</span><Trash2 className="w-4 h-4" /></button>
                                <div className="pt-2 border-t border-gray-200 mt-2">
                                    <button onClick={() => handleInitiateReset('reports')} className="w-full py-4 bg-red-600 text-white rounded-xl font-black shadow-lg hover:bg-red-700 flex items-center justify-center gap-2 animate-pulse"><Trash2 className="w-5 h-5" /> حذف بيانات التقارير والإحصائيات (تصفير شامل)</button>
                                </div>
                            </div>
                        )}

                        {resetStep === 'confirm1' && (
                            <div className="py-6 text-center space-y-4 animate-in zoom-in">
                                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto text-yellow-600"><AlertTriangle className="w-8 h-8" /></div>
                                <h3 className="text-lg font-bold text-gray-800">هل أنت متأكد من تنفيذ هذا الإجراء؟</h3>
                                <p className="text-sm text-gray-500">سيتم حذف البيانات المحددة بشكل نهائي.</p>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={handleConfirmReset} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">نعم، متأكد</button>
                                    <button onClick={() => setResetStep('menu')} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold">إلغاء</button>
                                </div>
                            </div>
                        )}

                        {resetStep === 'confirm2' && (
                            <div className="py-6 text-center space-y-4 animate-in zoom-in">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 border-4 border-red-50"><AlertTriangle className="w-8 h-8" /></div>
                                <h3 className="text-lg font-black text-red-600">تأكيد نهائي وأخير!</h3>
                                <p className="text-sm text-gray-600 font-bold">لا يمكن التراجع عن هذه العملية أبداً. هل أنت موافق تماماً؟</p>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={handleConfirmReset} disabled={resetLoading} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                                        {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'نعم، احذف الآن'}
                                    </button>
                                    <button onClick={() => setResetStep('menu')} disabled={resetLoading} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold">تراجع</button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                  </Dialog>

                  <a href="mailto:Tageep2026@gmail.com" className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                    <Mail className="w-5 h-5 text-blue-500" /> اتصل بنا
                  </a>
                </div>
                <div className="absolute bottom-8 left-0 w-full px-6"><div className="text-center text-xs text-gray-400">الإصدار 1.0.0</div></div>
              </SheetContent>
            </Sheet>
            <button className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600 transition-all hidden sm:block">
              <Bell className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* ... (Rest of Dashboard Content: Affiliate, Modals, Grid, etc.) ... */}
        {/* Affiliate Modal */}
        <Dialog open={affiliateOpen} onOpenChange={setAffiliateOpen}>
            <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl font-black text-gray-800 flex items-center justify-center gap-2">
                        <Coins className="w-6 h-6 text-yellow-500" />
                        نظام الأرباح والتسويق
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="bg-white p-4 rounded-2xl shadow-3d-inset text-center border border-yellow-100">
                        <p className="text-gray-500 font-bold mb-1">رصيد أرباحك الحالي</p>
                        <h2 className="text-4xl font-black text-green-600">{currentUser?.affiliateBalance || 0} <span className="text-lg">ريال</span></h2>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 mb-2">
                        <p className="text-red-600 font-bold text-xs mb-2">لتربح 50 ريال لكل عميل اشترك عبر رابطك:</p>
                        <ul className="text-[10px] text-red-500 space-y-1 list-decimal list-inside font-medium leading-relaxed">
                            <li>قم بنسخ رابط الإحالة الخاص بك وارسله للعضو.</li>
                            <li>بعد اشتراك العضو في الباقة الذهبية يزيد رصيدك بمقدار 50ريال.</li>
                            <li>لسحبه أضغط على سحب الرصيد وينزل بحسابك الراجحي أو الأهلي فوراً.</li>
                        </ul>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-blue-600 font-bold">رابط الإحالة الخاص بك</Label>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-white p-3 rounded-xl shadow-sm text-xs text-gray-500 truncate font-mono border border-gray-100">
                                {currentUser ? `${window.location.origin}/register?ref=${currentUser.id}` : '...'}
                            </div>
                            <button onClick={handleCopyReferral} className="bg-blue-600 text-white p-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all"><Copy className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed mt-2">سجل في تطبيق مان هوبات لإدارة مكاتب الخدمات العامه واستفد من المزايا المتعدده..<br/><span className="font-mono text-blue-600">Www.manhobat.com</span></p>
                    </div>
                    <button onClick={() => setWithdrawOpen(true)} disabled={(currentUser?.affiliateBalance || 0) < 110} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Wallet className="w-5 h-5" /> سحب الرصيد</button>
                    {(currentUser?.affiliateBalance || 0) >= 50 && (currentUser?.affiliateBalance || 0) < 110 && (<p className="text-center text-xs text-red-500 font-bold">الحد الأدنى للسحب هو 110 ريال</p>)}
                </div>
            </DialogContent>
        </Dialog>

        {/* Withdraw Request Modal */}
        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                <DialogHeader><DialogTitle className="text-center text-xl font-bold text-gray-800">طلب سحب الرصيد</DialogTitle></DialogHeader>
                {withdrawSuccess ? (
                    <div className="py-10 text-center animate-in zoom-in"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4 shadow-lg"><CheckCircle2 className="w-8 h-8" /></div><h3 className="text-lg font-bold text-green-700">تم إرسال طلب السحب بنجاح</h3></div>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="space-y-2"><Label>المبلغ المراد سحبه</Label><Input value={`${currentUser?.affiliateBalance || 0} ريال`} disabled className="bg-gray-100 border-none text-center font-bold text-green-600" /></div>
                        <div className="space-y-2"><Label>رقم حساب الراجحي</Label><Input value={rajhiAccount} onChange={(e) => setRajhiAccount(e.target.value)} placeholder="SA..." className="bg-white shadow-3d-inset border-none" dir="ltr" /></div>
                        {withdrawError && <p className="text-red-500 text-xs font-bold text-center">{withdrawError}</p>}
                        <button onClick={handleWithdraw} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">إرسال الطلب</button>
                    </div>
                )}
            </DialogContent>
        </Dialog>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5 sm:gap-8">
          <DashboardButton icon={FileText} label="المعاملات" locked={!canAccessPage('transactions')} onClick={() => handlePageClick('transactions', '/transactions')} />
          <DashboardButton icon={Wallet} label="الحسابات" locked={!canAccessPage('accounts')} onClick={() => handlePageClick('accounts', '/accounts')} />
          <DashboardButton icon={BarChart3} label="التقارير" locked={!canAccessPage('reports')} onClick={() => handlePageClick('reports', '/reports')} />
          <DashboardButton icon={Users} label="العملاء" locked={!canAccessPage('clients')} onClick={() => handlePageClick('clients', '/clients')} />
          <DashboardButton icon={UserCheck} label="المعقبين" locked={!canAccessPage('agents')} onClick={() => handlePageClick('agents', '/agents')} />
          <DashboardButton icon={Award} label="المنجزين" variant="primary" locked={!canAccessPage('achievers')} onClick={() => handlePageClick('achievers', '/achievers')} />
          <DashboardButton icon={Receipt} label="المنصرفات" variant="danger" locked={!canAccessPage('expenses')} onClick={() => handlePageClick('expenses', '/expenses')} />
          <DashboardButton icon={Calculator} label="الحاسبة" locked={!canAccessPage('calculator')} onClick={() => handlePageClick('calculator', '/calculator')} />
          <DashboardButton icon={Building2} label="مكاتب الخدمات" locked={!canAccessPage('summary')} onClick={() => handlePageClick('summary', '/summary')} />
        </div>

        <div className="my-10"><Separator className="bg-gray-300" /></div>

        <div id="achievers-section" className="mb-12 scroll-mt-10">
          <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-500" /> قائمة أفضل المنجزين</h3>
          {achievers.length === 0 ? (
              <div className="text-center p-8 bg-[#eef2f6] rounded-2xl shadow-3d-inset text-gray-500">لا توجد بيانات كافية لعرض المنجزين حتى الآن.</div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {achievers.slice(0, 3).map((achiever, index) => (
                      <div key={achiever.name} className="relative bg-[#eef2f6] shadow-3d rounded-2xl p-4 flex items-center gap-4 border border-white/50">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-orange-400"}`}>{index + 1}</div>
                          <div><h4 className="font-bold text-gray-800">{achiever.name}</h4><p className="text-xs text-gray-500">أنجز {achiever.count} معاملة</p></div>
                          <div className="mr-auto font-bold text-blue-600 text-sm">{achiever.total.toLocaleString()} ر.س</div>
                      </div>
                  ))}
              </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#eef2f6] shadow-3d relative overflow-hidden">
                <h3 className="text-lg font-bold text-gray-700 mb-4">ملخص سريع</h3>
                <div className="relative h-16 w-full">
                  {tickerItems.map((item, idx) => {
                    const isActive = idx === tickerIndex;
                    return (
                      <div key={idx} className={`absolute top-0 left-0 w-full transition-all duration-500 ease-in-out transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                        <div className="flex justify-between items-center p-3 rounded-xl shadow-3d-inset bg-[#eef2f6]">
                            <div className="flex items-center gap-3"><item.icon className={`w-5 h-5 ${item.color}`} /><span className="text-gray-600 font-bold">{item.label}</span></div>
                            <span className={`font-black text-xl ${item.color}`}>{item.value}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
            <div className="p-6 rounded-2xl bg-[#eef2f6] shadow-3d flex flex-col items-center justify-center text-center">
                <p className="text-gray-500 mb-4">هل تحتاج إلى مساعدة؟</p>
                <a href="mailto:Tageep2026@gmail.com" className="text-blue-600 font-bold underline">تواصل مع الدعم الفني</a>
            </div>
        </div>

        {/* Footer Buttons Section */}
        <div className="max-w-6xl mx-auto px-4 mt-8 mb-4">
            <div className="flex justify-between items-end gap-4">
                <a href="https://play.google.com/store/apps/details?id=apli3885642.ofh" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-gray-800 text-white px-4 py-3 rounded-2xl shadow-lg hover:bg-gray-900 transition-all transform hover:-translate-y-1">
                    <Smartphone className="w-6 h-6" />
                    <div className="text-right"><p className="text-[9px] opacity-80 font-normal">حمل التطبيق من</p><p className="text-xs font-bold">Google Play</p></div>
                </a>
                {currentUser?.role === 'golden' && (
                    <a href="https://wa.me/966501148480" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-2xl shadow-lg hover:bg-green-600 transition-all transform hover:-translate-y-1">
                        <MessageCircle className="w-6 h-6" />
                        <div className="text-right"><p className="text-[9px] opacity-80 font-normal">الدعم الفني</p><p className="text-xs font-bold">24 ساعة</p></div>
                    </a>
                )}
            </div>
            <div className="mt-6 flex flex-col items-center gap-3 text-gray-500"><p className="text-[10px] opacity-60">جميع الحقوق محفوظة © 2025</p></div>
        </div>

        {/* ... (Existing Profile, Change Pass, Create Emp, Onboarding Modals) ... */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                <DialogHeader><DialogTitle className="text-center text-xl font-bold text-gray-800">الملف الشخصي</DialogTitle></DialogHeader>
                {currentUser && (
                    <div className="py-6 space-y-4">
                        <div className="flex flex-col items-center mb-4">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-3d mb-3"><UserCircle className="w-10 h-10" /></div>
                            {!isEditingProfile ? (
                                <><h3 className="text-xl font-black text-gray-800">{currentUser.officeName}</h3><p className="text-gray-500 text-sm">{currentUser.role === 'golden' ? 'عضو ذهبي' : currentUser.role === 'employee' ? 'موظف' : 'عضو مسجل'}</p></>
                            ) : (
                                <div className="w-full space-y-2"><Label>اسم المكتب (25 حرف كحد أقصى)</Label><Input value={editOfficeName} onChange={(e) => { const val = e.target.value; if(val.length <= 25 && /^[\u0600-\u06FFa-zA-Z\s]*$/.test(val)) setEditOfficeName(val); }} className="bg-white shadow-3d-inset border-none text-center" /></div>
                            )}
                            {currentUser.role === 'golden' && currentUser.subscriptionExpiry && (<p className="text-xs text-red-500 font-bold mt-1">ينتهي الاشتراك: {new Date(currentUser.subscriptionExpiry).toLocaleDateString('ar-SA')}</p>)}
                        </div>
                        {!isEditingProfile ? (
                            <div className="bg-white p-4 rounded-xl shadow-3d-inset space-y-3">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2"><span className="text-gray-500 text-sm font-bold">رقم الهاتف</span><span className="font-mono text-gray-800 font-bold" dir="ltr">{currentUser.phone}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-500 text-sm font-bold">تاريخ التسجيل</span><span className="text-gray-800 font-bold">{new Date(currentUser.createdAt).toLocaleDateString('ar-SA')}</span></div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="space-y-2"><Label>سؤال الأمان</Label><Select value={editSecurityQuestion} onValueChange={setEditSecurityQuestion}><SelectTrigger className="bg-white shadow-3d-inset border-none h-10 text-right flex-row-reverse"><SelectValue placeholder="اختر السؤال..." /></SelectTrigger><SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">{securityQuestions.map((q) => (<SelectItem key={q} value={q} className="text-right cursor-pointer my-1">{q}</SelectItem>))}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>إجابة السؤال (10 خانات كحد أقصى)</Label><Input value={editSecurityAnswer} onChange={(e) => { const val = e.target.value; if(val.length <= 10 && /^[\u0600-\u06FFa-zA-Z0-9\s]*$/.test(val)) setEditSecurityAnswer(val); }} className="bg-white shadow-3d-inset border-none" /></div>
                                <div className="space-y-2 pt-2 border-t border-gray-200">
                                    <Label className="text-red-500">كلمة المرور الحالية (للتأكيد)</Label>
                                    <div className="relative">
                                        <Input 
                                            type={showVerifyPass ? "text" : "password"} 
                                            value={verifyOldPass} 
                                            onChange={(e) => setVerifyOldPass(e.target.value)} 
                                            className="bg-white shadow-3d-inset border-none pl-10" 
                                            placeholder="••••••••" 
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowVerifyPass(!showVerifyPass)}
                                            className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600"
                                        >
                                            {showVerifyPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {profileError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100">{profileError}</div>}
                        {profileSuccess && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-xs font-bold text-center border border-green-100">{profileSuccess}</div>}
                        <div className="flex gap-2 pt-2">
                            {!isEditingProfile ? (
                                <><button onClick={() => setIsEditingProfile(true)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"><Pencil className="w-4 h-4" /> تعديل</button><button onClick={() => setProfileOpen(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all">إغلاق</button></>
                            ) : (
                                <><button onClick={handleUpdateProfile} disabled={profileLoading} className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70">{profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التغييرات'}</button><button onClick={() => setIsEditingProfile(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all">إلغاء</button></>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>

        <Dialog open={changePassOpen} onOpenChange={setChangePassOpen}>
            <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                <DialogHeader><DialogTitle className="text-center text-xl font-bold text-gray-800">تغيير كلمة المرور</DialogTitle></DialogHeader>
                {passSuccess ? (
                    <div className="py-8 flex flex-col items-center justify-center animate-in zoom-in"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-3d"><CheckCircle2 className="w-8 h-8" strokeWidth={3} /></div><h3 className="text-lg font-bold text-green-700">تم تغيير كلمة المرور بنجاح</h3></div>
                ) : (
                    <div className="py-4 space-y-4">
                        {passError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 shadow-sm animate-in fade-in"><AlertTriangle className="w-4 h-4" />{passError}</div>}
                        <div className="space-y-2">
                            <Label>كلمة المرور الحالية</Label>
                            <div className="relative">
                                <Input 
                                    type={showOldPass ? "text" : "password"} 
                                    value={oldPass} 
                                    onChange={(e) => setOldPass(e.target.value)} 
                                    className="bg-white shadow-3d-inset border-none pl-10" 
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowOldPass(!showOldPass)}
                                    className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                    {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>كلمة المرور الجديدة (10 خانات كحد أقصى)</Label>
                            <div className="relative">
                                <Input 
                                    type={showNewPass ? "text" : "password"} 
                                    value={newPass} 
                                    onChange={(e) => { const val = e.target.value; if(val.length <= 10 && /^[a-zA-Z0-9]*$/.test(val)) setNewPass(val); }} 
                                    className="bg-white shadow-3d-inset border-none pl-10" 
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowNewPass(!showNewPass)}
                                    className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2"><Label>تأكيد كلمة المرور الجديدة</Label><div className="relative"><Input type="password" value={confirmPass} onChange={(e) => { const val = e.target.value; if(val.length <= 10 && /^[a-zA-Z0-9]*$/.test(val)) setConfirmPass(val); }} className="bg-white shadow-3d-inset border-none pl-10" /><Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /></div></div>
                        <button onClick={handleChangePassword} disabled={passLoading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-70">{passLoading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> : <Key className="w-4 h-4" />} تحديث كلمة المرور</button>
                    </div>
                )}
            </DialogContent>
        </Dialog>

        <Dialog open={createEmpOpen} onOpenChange={setCreateEmpOpen}>
            <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                <DialogHeader><DialogTitle className="text-center text-xl font-bold text-gray-800">إصدار عضوية موظف</DialogTitle></DialogHeader>
                {empSuccess ? (
                    <div className="py-8 flex flex-col items-center justify-center animate-in zoom-in"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-3d"><CheckCircle2 className="w-8 h-8" strokeWidth={3} /></div><h3 className="text-lg font-bold text-green-700 text-center">{empSuccess}</h3><p className="text-xs text-gray-500 mt-2">يرجى حفظ اسم الدخول للموظف</p><button onClick={() => { setEmpSuccess(''); setCreateEmpOpen(false); }} className="mt-4 px-6 py-2 bg-gray-200 rounded-lg font-bold">إغلاق</button></div>
                ) : (
                    <div className="py-4 space-y-4">
                        {empError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 shadow-sm">{empError}</div>}
                        <div className="space-y-2"><Label>اسم الموظف (15 حرف كحد أقصى)</Label><Input value={newEmpName} onChange={(e) => { const val = e.target.value; if(val.length <= 15 && /^[\u0600-\u06FFa-zA-Z\s]*$/.test(val)) setNewEmpName(val); }} className="bg-white shadow-3d-inset border-none" placeholder="اسم الموظف" /></div>
                        <div className="space-y-2">
                            <Label>كلمة المرور (10 خانات إنجليزي/أرقام)</Label>
                            <div className="relative">
                                <Input 
                                    type={showEmpPass ? "text" : "password"} 
                                    value={newEmpPass} 
                                    onChange={(e) => { const val = e.target.value; if(val.length <= 10 && /^[a-zA-Z0-9]*$/.test(val)) setNewEmpPass(val); }} 
                                    className="bg-white shadow-3d-inset border-none pl-10" 
                                    placeholder="••••" 
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowEmpPass(!showEmpPass)}
                                    className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                    {showEmpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <button onClick={handleCreateEmployee} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 mt-2"><UserPlus className="w-4 h-4" /> إنشاء حساب</button>
                    </div>
                )}
            </DialogContent>
        </Dialog>

        <Dialog open={onboardingOpen} onOpenChange={(val) => { if(!val) { if (currentUser) { localStorage.setItem(`moaqeb_onboarding_seen_${currentUser.id}`, 'true'); } setOnboardingOpen(false); } }}>
            <DialogContent className="bg-gradient-to-br from-yellow-50 via-slate-50 to-yellow-50 border-4 border-double border-yellow-400 shadow-3d rounded-3xl max-w-md p-8" dir="rtl">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-lg text-white animate-pulse"><Crown className="w-10 h-10" /></div>
                    <h2 className="text-2xl font-black text-yellow-700 drop-shadow-sm">أهلاً بك في العضوية الذهبية</h2>
                    <div className="min-h-[120px] flex items-center justify-center"><p className="text-blue-800 text-base font-bold leading-relaxed whitespace-pre-line">{settings?.onboardingSteps[onboardingStep]}</p></div>
                    <div className="flex justify-between items-center pt-4">
                        <button onClick={prevOnboardingStep} className={`flex items-center gap-1 text-gray-500 hover:text-gray-700 font-bold ${onboardingStep === 0 ? 'invisible' : ''}`}><ArrowRight className="w-4 h-4" /> عودة</button>
                        <div className="flex gap-1">{settings?.onboardingSteps.map((_, i) => (<div key={i} className={`w-2 h-2 rounded-full transition-all ${i === onboardingStep ? 'bg-blue-600 w-4' : 'bg-gray-300'}`} />))}</div>
                        <button onClick={nextOnboardingStep} className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">{onboardingStep === (settings?.onboardingSteps.length || 0) - 1 ? 'ابدأ الآن' : 'التالي'} {onboardingStep !== (settings?.onboardingSteps.length || 0) - 1 && <ArrowLeft className="w-4 h-4" />}</button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
