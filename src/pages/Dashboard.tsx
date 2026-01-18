import { useEffect, useState } from 'react';
import { 
  FileText, Wallet, BarChart3, Users, UserCheck, Settings, Bell, LogOut, 
  Trophy, Menu, Award, LogIn, Receipt, Calculator, Activity, Clock, CheckCircle2,
  Search, Database, Trash2, AlertTriangle, Download, Upload, Crown, Mail, Phone, Lock, UserPlus, UserCircle, User as UserIcon, Key, X, Check, Shield
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { DashboardButton } from '@/components/DashboardButton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  getStoredTransactions, 
  calculateAchievers, 
  createBackup, 
  restoreBackup, 
  clearAgents, 
  clearClients, 
  clearTransactions, 
  clearAllData,
  Transaction,
  getCurrentUser,
  logoutUser,
  User,
  changePassword,
  getLastBackupTime,
  fetchTransactionsFromCloud,
  getGlobalSettings,
  GlobalSettings,
  createEmployee,
  createSubscriptionRequest
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

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation(); // Hook to read URL params
  const [achievers, setAchievers] = useState<{name: string, count: number, total: number}[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  
  // Ticker State
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerStats, setTickerStats] = useState({ active: 0, inProgress: 0, completedWeek: 0 });

  // Inquiry State
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryId, setInquiryId] = useState('');
  const [foundTx, setFoundTx] = useState<Transaction | null>(null);
  const [inquiryError, setInquiryError] = useState('');

  // Backup State
  const [backupOpen, setBackupOpen] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  // Delete States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  // Pro State
  const [proOpen, setProOpen] = useState(false);
  // FIX: Start with 'duration' (Packages) instead of 'bank'
  const [subStep, setSubStep] = useState<'duration' | 'bank' | 'confirm'>('duration');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<'شهر' | 'سنة' | ''>('');
  const [subSuccess, setSubSuccess] = useState('');
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  // Employee Login State
  const [empLoginOpen, setEmpLoginOpen] = useState(false);

  // Employee Creation State (For Golden Members)
  const [createEmpOpen, setCreateEmpOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPass, setNewEmpPass] = useState('');
  const [empSuccess, setEmpSuccess] = useState('');
  const [empError, setEmpError] = useState('');

  // User Profile & Change Password States
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    // Load Settings
    const globalSettings = getGlobalSettings();
    setSettings(globalSettings);

    // Load User
    const user = getCurrentUser();
    setCurrentUser(user);

    const loadData = async () => {
        let txs: Transaction[] = [];
        if (user) {
            // If employee, use parentId for data fetching, else use id
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

  // Listen for URL params to open Pro modal from other pages
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openPro') === 'true') {
        setSubStep('duration'); // Ensure it starts at packages
        setSelectedDuration('');
        setSelectedBank('');
        setProOpen(true);
        // Clean URL without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

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

  // Permission Check Helper
  const canAccessPage = (page: keyof GlobalSettings['pagePermissions']) => {
    if (!settings) return true;
    const userRole = currentUser?.role || 'visitor';
    // Golden and Employee always access everything
    if (userRole === 'golden' || userRole === 'employee') return true;
    // @ts-ignore
    return settings.pagePermissions[page].includes(userRole);
  };

  // FIX: Unify Pro Path Logic
  const handlePageClick = (page: string, path: string) => {
      // @ts-ignore
      if (canAccessPage(page)) {
          navigate(path);
      } else {
          // Reset state to ensure it starts from packages
          setSubStep('duration');
          setSelectedDuration('');
          setSelectedBank('');
          setProOpen(true);
      }
  };

  const handleSubscribe = () => {
    if (!currentUser) {
        alert('يجب تسجيل الدخول أولاً');
        navigate('/login');
        return;
    }
    if (!selectedBank || !selectedDuration) return;

    const res = createSubscriptionRequest(currentUser.id, currentUser.officeName, currentUser.phone, selectedDuration, selectedBank);
    if (res.success) {
        setSubSuccess('تم إرسال طلب الاشتراك بنجاح! سيتم التفعيل قريباً.');
        setTimeout(() => {
            setSubSuccess('');
            setProOpen(false);
            setSubStep('duration'); // Reset to duration
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
            setSubStep('duration'); // Reset to start with packages
            setSelectedBank('');
            setSelectedDuration('');
            setSubSuccess('');
          }, 300);
      }
  };

  const monthlyBenefits = [
      "معاملات لا محدودة",
      "تقارير متكاملة",
      "عملاء بلا حدود",
      "معقبين بلا حدود",
      "نسخ احتياطي مؤمن",
      "10 أرقام معقبين منجزين",
      "10 دروس تعليمية",
      "حسابات تفصيلية للتحويلات"
  ];

  const annualBenefits = [
      "جميع مزايا الباقة الشهرية",
      "50 رقم معقب منجز",
      "50 درس تعقيب خاص",
      "أرقام مكاتب خدمات للتعاون",
      "تقارير تفصيلية"
  ];

  return (
    <div className="min-h-screen pb-10">
      
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
                    <DropdownMenuItem 
                        className="cursor-pointer focus:bg-white focus:text-blue-600 rounded-lg my-1 gap-2"
                        onClick={() => setProfileOpen(true)}
                    >
                        <UserIcon className="w-4 h-4" />
                        <span>الملف الشخصي</span>
                    </DropdownMenuItem>
                    
                    {currentUser.role === 'golden' && (
                        <DropdownMenuItem 
                            className="cursor-pointer focus:bg-white focus:text-blue-600 rounded-lg my-1 gap-2"
                            onClick={() => setCreateEmpOpen(true)}
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>إصدار عضوية موظف</span>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuItem 
                        className="cursor-pointer focus:bg-white focus:text-blue-600 rounded-lg my-1 gap-2"
                        onClick={() => setChangePassOpen(true)}
                    >
                        <Key className="w-4 h-4" />
                        <span>تغيير كلمة المرور</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-200" />
                    <DropdownMenuItem 
                        className="cursor-pointer focus:bg-red-50 focus:text-red-600 text-red-500 rounded-lg my-1 gap-2"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج</span>
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
                        <LogOut className="w-5 h-5" />
                        تسجيل خروج
                    </button>
                  ) : (
                    <button onClick={() => navigate('/login')} className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                        <LogIn className="w-5 h-5 text-blue-600" />
                        تسجيل دخول
                    </button>
                  )}

                  {/* Links for Privacy and Delete Data */}
                  <div className="flex flex-col gap-2 mt-2 px-4 text-center">
                    <Link to="/privacy-policy" className="text-xs text-gray-500 hover:text-blue-600 underline transition-colors">
                        سياسة الخصوصية
                    </Link>
                    <Link to="/delete-data" className="text-xs text-gray-500 hover:text-red-600 underline transition-colors">
                        حذف بياناتي
                    </Link>
                  </div>

                  <Separator className="my-2 bg-gray-300/50" />

                  <Dialog open={empLoginOpen} onOpenChange={setEmpLoginOpen}>
                    <DialogTrigger asChild>
                        <button className="relative flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                            <UserCheck className="w-5 h-5 text-gray-600" />
                            دخول الموظفين
                        </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#eef2f6] border-none shadow-3d" dir="rtl">
                        <DialogHeader><DialogTitle>دخول الموظفين</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>اسم الموظف</Label>
                                <Input className="bg-white shadow-3d-inset border-none" />
                            </div>
                            <div className="space-y-2">
                                <Label>كلمة المرور</Label>
                                <Input type="password" className="bg-white shadow-3d-inset border-none" />
                            </div>
                            <button onClick={() => { alert('تم تسجيل الدخول بنجاح'); setEmpLoginOpen(false); }} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">دخول</button>
                        </div>
                    </DialogContent>
                  </Dialog>
                  
                  {/* ... Inquiry Dialog ... */}
                  <Dialog open={inquiryOpen} onOpenChange={setInquiryOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                        <Search className="w-5 h-5 text-purple-600" />
                        استعلام عن معاملة
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#eef2f6] border-none shadow-3d" dir="rtl">
                      <DialogHeader><DialogTitle>الاستعلام عن معاملة</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                          <Input 
                            placeholder="رقم المعاملة (مثلاً 0001)" 
                            value={inquiryId}
                            onChange={(e) => setInquiryId(e.target.value)}
                            className="bg-white shadow-3d-inset border-none"
                          />
                          <button onClick={handleInquiry} className="bg-purple-600 text-white px-4 rounded-xl font-bold shadow-lg">بحث</button>
                        </div>
                        {inquiryError && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 shadow-sm animate-in fade-in">
                                <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
                                <p className="text-center">{inquiryError}</p>
                            </div>
                        )}
                        {foundTx && (
                          <div className="bg-white/50 p-4 rounded-xl border border-white space-y-3 animate-in fade-in">
                            <p className="flex justify-between"><span className="font-bold text-gray-500">النوع:</span> <span>{foundTx.type}</span></p>
                            <p className="flex justify-between"><span className="font-bold text-gray-500">العميل:</span> <span>{foundTx.clientName}</span></p>
                            <p className="flex justify-between"><span className="font-bold text-gray-500">السعر:</span> <span className="text-blue-600 font-bold">{foundTx.clientPrice} ر.س</span></p>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                <span className="font-bold text-gray-500">الحالة:</span>
                                {foundTx.status === 'completed' ? (
                                    <span className="text-green-600 font-bold animate-pulse">تم الإنجاز</span>
                                ) : foundTx.status === 'cancelled' ? (
                                    <span className="text-red-600 font-bold animate-pulse">تم إلغاء المعاملة</span>
                                ) : (
                                    <span className="text-orange-500 font-bold animate-pulse">تحت الإنجاز</span>
                                )}
                            </div>
                            {foundTx.status === 'active' && (
                                <p className="flex justify-between text-xs text-gray-400 mt-2">
                                    <span>الوقت المتبقي:</span> 
                                    <span>{calculateTimeLeft(foundTx.targetDate)}</span>
                                </p>
                            )}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={backupOpen} onOpenChange={setBackupOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                        <Database className="w-5 h-5 text-orange-600" />
                        النسخ الاحتياطي
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#eef2f6] border-none shadow-3d" dir="rtl">
                      <DialogHeader><DialogTitle>النسخ الاحتياطي والاستعادة</DialogTitle></DialogHeader>
                      <div className="space-y-6 py-4">
                        {lastBackup && (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-xs text-blue-700 font-bold text-center">
                                آخر نسخة احتياطية كانت يوم: {formatBackupDate(lastBackup)}
                            </div>
                        )}
                        <div className="space-y-2">
                        <Label>إنشاء نسخة احتياطية</Label>
                        <button onClick={handleCreateBackup} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                            <Download className="w-4 h-4" /> إنشاء نسخة احتياطية (Create Backup)
                        </button>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                        <Label>استعادة نسخة (لصق الكود)</Label>
                        <textarea 
                            className="w-full h-24 rounded-xl bg-white shadow-3d-inset border-none p-3 text-xs"
                            placeholder="الصق كود النسخة الاحتياطية هنا..."
                            value={restoreText}
                            onChange={(e) => setRestoreText(e.target.value)}
                        />
                        <button onClick={handleRestoreBackup} className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                            <Upload className="w-4 h-4" /> استرجاع نسخة احتياطية (Restore Backup)
                        </button>
                        </div>
                    </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={proOpen} onOpenChange={resetSubModal}>
                    {currentUser?.role !== 'golden' && (
                        <DialogTrigger asChild>
                            <button className="relative flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-yellow-200 to-yellow-400 shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-yellow-900 font-black animate-pulse overflow-hidden">
                                <Crown className="w-5 h-5" />
                                اشتراك ذهبي Pro
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                            </button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="bg-gradient-to-br from-yellow-400 to-yellow-600 border-none shadow-3d rounded-3xl text-white max-w-lg p-6 max-h-[90vh] overflow-y-auto" dir="rtl">
                        <button 
                            onClick={() => setProOpen(false)}
                            className="absolute top-4 left-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-center mb-1 flex items-center justify-center gap-2">
                                <Crown className="w-6 h-6" />
                                العضوية الذهبية
                            </DialogTitle>
                        </DialogHeader>
                        
                        {alreadySubscribed ? (
                             <div className="py-10 text-center animate-in zoom-in">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-green-600 mx-auto mb-4 shadow-lg">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold">أنت مشترك مسبقاً</h3>
                                <p className="text-sm mt-2 opacity-90">استمتع بمميزات العضوية الذهبية</p>
                            </div>
                        ) : subSuccess ? (
                            <div className="py-10 text-center animate-in zoom-in">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-green-600 mx-auto mb-4 shadow-lg">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold">{subSuccess}</h3>
                            </div>
                        ) : (
                            <div className="py-2 space-y-4">
                                {/* Step 1: Duration Selection (Packages) - MOVED TO FIRST STEP */}
                                {subStep === 'duration' && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <h3 className="text-center font-bold text-lg">اختر الباقة المناسبة</h3>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Monthly Plan */}
                                            <button 
                                                onClick={() => setSelectedDuration('شهر')}
                                                className={`p-4 rounded-xl border-2 transition-all text-right flex flex-col h-full ${selectedDuration === 'شهر' ? 'bg-white text-yellow-900 border-white' : 'bg-white/10 border-white/30 hover:bg-white/20 text-white'}`}
                                            >
                                                <div className="text-center mb-2 border-b border-current pb-2 w-full">
                                                    <div className="text-sm font-bold">باقة شهرية</div>
                                                    <div className="text-3xl font-black">59 <span className="text-xs font-medium">ريال</span></div>
                                                </div>
                                                <ul className="space-y-1 text-[10px] w-full">
                                                    {monthlyBenefits.map((b, i) => (
                                                        <li key={i} className="flex items-start gap-1">
                                                            <Check className="w-3 h-3 mt-0.5 shrink-0" />
                                                            <span>{b}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </button>

                                            {/* Annual Plan */}
                                            <button 
                                                onClick={() => setSelectedDuration('سنة')}
                                                className={`p-4 rounded-xl border-2 transition-all text-right flex flex-col h-full relative overflow-hidden ${selectedDuration === 'سنة' ? 'bg-white text-yellow-900 border-white' : 'bg-white/10 border-white/30 hover:bg-white/20 text-white'}`}
                                            >
                                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl">الأكثر توفيراً</div>
                                                <div className="text-center mb-2 border-b border-current pb-2 w-full">
                                                    <div className="text-sm font-bold">باقة سنوية</div>
                                                    <div className="text-3xl font-black">299 <span className="text-xs font-medium">ريال</span></div>
                                                </div>
                                                <ul className="space-y-1 text-[10px] w-full">
                                                    {annualBenefits.map((b, i) => (
                                                        <li key={i} className="flex items-start gap-1">
                                                            <Check className="w-3 h-3 mt-0.5 shrink-0" />
                                                            <span>{b}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </button>
                                        </div>

                                        <div className="flex gap-2 mt-2">
                                            <button 
                                                onClick={() => { if(selectedDuration) setSubStep('bank'); }}
                                                disabled={!selectedDuration}
                                                className="w-full py-3 bg-white text-yellow-700 rounded-xl font-bold shadow-lg hover:bg-gray-100 disabled:opacity-50"
                                            >
                                                التالي
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Bank Selection - MOVED TO SECOND STEP */}
                                {subStep === 'bank' && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <h3 className="text-center font-bold text-lg">اختر البنك للتحويل</h3>
                                        <div className="space-y-2">
                                            <Label className="text-white/90">البنك المحول إليه</Label>
                                            <Select onValueChange={(val) => setSelectedBank(val)} value={selectedBank}>
                                                <SelectTrigger className="bg-white/20 border-white/30 text-white placeholder:text-white/70 h-12 text-right flex-row-reverse">
                                                    <SelectValue placeholder="اختر البنك" />
                                                </SelectTrigger>
                                                <SelectContent dir="rtl">
                                                    <SelectItem value="الراجحي">الراجحي</SelectItem>
                                                    <SelectItem value="الأهلي">الأهلي</SelectItem>
                                                    <SelectItem value="الإنماء">الإنماء</SelectItem>
                                                    <SelectItem value="الرياض">الرياض</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button 
                                                onClick={() => setSubStep('duration')}
                                                className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30"
                                            >
                                                رجوع
                                            </button>
                                            <button 
                                                onClick={() => { if(selectedBank) setSubStep('confirm'); }}
                                                disabled={!selectedBank}
                                                className="flex-[2] py-3 bg-white text-yellow-700 rounded-xl font-bold shadow-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                التالي
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Confirmation */}
                                {subStep === 'confirm' && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4 text-center">
                                        <div className="bg-white/20 p-4 rounded-xl border border-white/30">
                                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-200" />
                                            <h3 className="font-bold text-lg mb-1">يرجى التحويل الآن</h3>
                                            <p className="text-sm opacity-90 mb-3">على حساب {selectedBank}</p>
                                            <div className="bg-white/20 p-2 rounded-lg font-mono text-lg select-all">
                                                1234567890
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 mt-2">
                                            <button 
                                                onClick={() => setSubStep('bank')}
                                                className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30"
                                            >
                                                رجوع
                                            </button>
                                            <button 
                                                onClick={handleSubscribe}
                                                className="flex-[2] py-3 bg-green-500 text-white rounded-xl font-bold shadow-lg hover:bg-green-600"
                                            >
                                                تأكيد الاشتراك
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                  </Dialog>

                  {/* System Settings Button */}
                  <button 
                    onClick={() => navigate('/admins')}
                    className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold"
                  >
                    <Settings className="w-5 h-5 text-gray-600" />
                    إعدادات النظام
                  </button>

                  <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                        <Trash2 className="w-5 h-5 text-red-600" />
                        بيانات النظام
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#eef2f6] border-none shadow-3d" dir="rtl">
                      <DialogHeader><DialogTitle>إدارة وحذف البيانات</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-4">
                        <button onClick={() => { if(confirm('هل أنت متأكد من حذف جميع المعقبين؟')) { clearAgents(); alert('تم الحذف'); window.location.reload(); } }} className="w-full py-3 bg-white text-red-600 rounded-xl font-bold shadow-3d hover:bg-red-50 text-right px-4">حذف المعقبين</button>
                        <button onClick={() => { if(confirm('هل أنت متأكد من حذف جميع العملاء؟')) { clearClients(); alert('تم الحذف'); window.location.reload(); } }} className="w-full py-3 bg-white text-red-600 rounded-xl font-bold shadow-3d hover:bg-red-50 text-right px-4">حذف العملاء</button>
                        <button onClick={() => { if(confirm('هل أنت متأكد من حذف جميع المعاملات؟')) { clearTransactions(); alert('تم الحذف'); window.location.reload(); } }} className="w-full py-3 bg-white text-red-600 rounded-xl font-bold shadow-3d hover:bg-red-50 text-right px-4">حذف المعاملات</button>
                        <div className="pt-4">
                          <button onClick={() => setDeleteAllConfirm(true)} className="w-full py-4 bg-red-600 text-white rounded-xl font-black shadow-lg flex items-center justify-center gap-2 animate-pulse">
                            <AlertTriangle className="w-5 h-5" />
                            حذف الكل (تهيئة النظام)
                          </button>
                        </div>
                        {deleteAllConfirm && (
                          <div className="bg-red-100 border-2 border-red-500 p-4 rounded-xl mt-4 text-center animate-in zoom-in">
                            <p className="text-red-800 font-bold mb-3">تحذير شديد اللهجة: سيتم حذف جميع البيانات نهائياً ولا يمكن استعادتها!</p>
                            <div className="flex gap-2">
                              <button onClick={() => { clearAllData(); window.location.reload(); }} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold">نعم، احذف كل شيء</button>
                              <button onClick={() => setDeleteAllConfirm(false)} className="flex-1 py-2 bg-gray-300 text-gray-800 rounded-lg font-bold">إلغاء</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <a href="mailto:Tageep2026@gmail.com" className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                    <Mail className="w-5 h-5 text-blue-500" />
                    اتصل بنا
                  </a>

                </div>

                <div className="absolute bottom-8 left-0 w-full px-6">
                   <div className="text-center text-xs text-gray-400">
                      الإصدار 1.0.0
                   </div>
                </div>
              </SheetContent>
            </Sheet>

            <button className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600 transition-all hidden sm:block">
              <Bell className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Main Grid with Permission Checks */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5 sm:gap-8">
          
          <DashboardButton 
              icon={FileText} 
              label="المعاملات" 
              locked={!canAccessPage('transactions')}
              onClick={() => handlePageClick('transactions', '/transactions')}
          />

          <DashboardButton 
              icon={Wallet} 
              label="الحسابات" 
              locked={!canAccessPage('accounts')}
              onClick={() => handlePageClick('accounts', '/accounts')}
          />

          <DashboardButton 
              icon={BarChart3} 
              label="التقارير" 
              locked={!canAccessPage('reports')}
              onClick={() => handlePageClick('reports', '/reports')}
          />

          <DashboardButton 
              icon={Users} 
              label="العملاء" 
              locked={!canAccessPage('clients')}
              onClick={() => handlePageClick('clients', '/clients')}
          />

          <DashboardButton 
              icon={UserCheck} 
              label="المعقبين" 
              locked={!canAccessPage('agents')}
              onClick={() => handlePageClick('agents', '/agents')}
          />

          <DashboardButton 
              icon={Receipt} 
              label="المنصرفات" 
              variant="danger" 
              locked={!canAccessPage('expenses')}
              onClick={() => handlePageClick('expenses', '/expenses')}
          />

          <DashboardButton 
              icon={Calculator} 
              label="الحاسبة" 
              locked={!canAccessPage('calculator')}
              onClick={() => handlePageClick('calculator', '/calculator')}
          />

        </div>

        <div className="my-10">
          <Separator className="bg-gray-300" />
        </div>

        {/* Achievers Section */}
        <div id="achievers-section" className="mb-12 scroll-mt-10">
          <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              قائمة أفضل المنجزين
          </h3>
          
          {achievers.length === 0 ? (
              <div className="text-center p-8 bg-[#eef2f6] rounded-2xl shadow-3d-inset text-gray-500">
                  لا توجد بيانات كافية لعرض المنجزين حتى الآن.
              </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {achievers.slice(0, 3).map((achiever, index) => (
                      <div key={achiever.name} className="relative bg-[#eef2f6] shadow-3d rounded-2xl p-4 flex items-center gap-4 border border-white/50">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                              index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-orange-400"
                          }`}>
                              {index + 1}
                          </div>
                          <div>
                              <h4 className="font-bold text-gray-800">{achiever.name}</h4>
                              <p className="text-xs text-gray-500">أنجز {achiever.count} معاملة</p>
                          </div>
                          <div className="mr-auto font-bold text-blue-600 text-sm">
                              {achiever.total.toLocaleString()} ر.س
                          </div>
                      </div>
                  ))}
              </div>
          )}
        </div>

        {/* Footer / Stats Area - CLEANED UP (Removed Logout/Delete Buttons) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#eef2f6] shadow-3d relative overflow-hidden">
                <h3 className="text-lg font-bold text-gray-700 mb-4">ملخص سريع</h3>
                
                {/* Ticker Container */}
                <div className="relative h-16 w-full">
                  {tickerItems.map((item, idx) => {
                    const isActive = idx === tickerIndex;
                    return (
                      <div 
                        key={idx}
                        className={`absolute top-0 left-0 w-full transition-all duration-500 ease-in-out transform ${
                          isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                        }`}
                      >
                        <div className="flex justify-between items-center p-3 rounded-xl shadow-3d-inset bg-[#eef2f6]">
                            <div className="flex items-center gap-3">
                              <item.icon className={`w-5 h-5 ${item.color}`} />
                              <span className="text-gray-600 font-bold">{item.label}</span>
                            </div>
                            <span className={`font-black text-xl ${item.color}`}>{item.value}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#eef2f6] shadow-3d flex flex-col items-center justify-center text-center">
                <p className="text-gray-500 mb-4">هل تحتاج إلى مساعدة؟</p>
                <a href="mailto:Tageep2026@gmail.com" className="text-blue-600 font-bold underline">
                    تواصل مع الدعم الفني
                </a>
            </div>
        </div>

        {/* ... Profile & Change Password Dialogs ... */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                <DialogHeader><DialogTitle className="text-center text-xl font-bold text-gray-800">الملف الشخصي</DialogTitle></DialogHeader>
                {currentUser && (
                    <div className="py-6 space-y-4">
                        <div className="flex flex-col items-center mb-4">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-3d mb-3">
                                <UserCircle className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-black text-gray-800">{currentUser.officeName}</h3>
                            <p className="text-gray-500 text-sm">
                                {currentUser.role === 'golden' ? 'عضو ذهبي' : currentUser.role === 'employee' ? 'موظف' : 'عضو مسجل'}
                            </p>
                            {currentUser.role === 'golden' && currentUser.subscriptionExpiry && (
                                <p className="text-xs text-red-500 font-bold mt-1">
                                    ينتهي الاشتراك: {new Date(currentUser.subscriptionExpiry).toLocaleDateString('ar-SA')}
                                </p>
                            )}
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl shadow-3d-inset space-y-3">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-500 text-sm font-bold">رقم الهاتف</span>
                                <span className="font-mono text-gray-800 font-bold" dir="ltr">{currentUser.phone}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm font-bold">تاريخ التسجيل</span>
                                <span className="text-gray-800 font-bold">{new Date(currentUser.createdAt).toLocaleDateString('ar-SA')}</span>
                            </div>
                        </div>

                        <button onClick={() => setProfileOpen(false)} className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all">إغلاق</button>
                    </div>
                )}
            </DialogContent>
        </Dialog>

        <Dialog open={changePassOpen} onOpenChange={setChangePassOpen}>
            <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                <DialogHeader><DialogTitle className="text-center text-xl font-bold text-gray-800">تغيير كلمة المرور</DialogTitle></DialogHeader>
                
                {passSuccess ? (
                    <div className="py-8 flex flex-col items-center justify-center animate-in zoom-in">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-3d">
                            <CheckCircle2 className="w-8 h-8" strokeWidth={3} />
                        </div>
                        <h3 className="text-lg font-bold text-green-700">تم تغيير كلمة المرور بنجاح</h3>
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        {passError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 shadow-sm animate-in fade-in">
                                <AlertTriangle className="w-4 h-4" />
                                {passError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>كلمة المرور الحالية</Label>
                            <div className="relative">
                                <Input 
                                    type="password"
                                    value={oldPass}
                                    onChange={(e) => setOldPass(e.target.value)}
                                    className="bg-white shadow-3d-inset border-none pl-10"
                                />
                                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>كلمة المرور الجديدة</Label>
                            <div className="relative">
                                <Input 
                                    type="password"
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    className="bg-white shadow-3d-inset border-none pl-10"
                                />
                                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>تأكيد كلمة المرور الجديدة</Label>
                            <div className="relative">
                                <Input 
                                    type="password"
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                    className="bg-white shadow-3d-inset border-none pl-10"
                                />
                                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            </div>
                        </div>

                        <button 
                            onClick={handleChangePassword}
                            disabled={passLoading}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
                        >
                            {passLoading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> : <Key className="w-4 h-4" />}
                            تحديث كلمة المرور
                        </button>
                    </div>
                )}
            </DialogContent>
        </Dialog>

        <Dialog open={createEmpOpen} onOpenChange={setCreateEmpOpen}>
            <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                <DialogHeader><DialogTitle className="text-center text-xl font-bold text-gray-800">إصدار عضوية موظف</DialogTitle></DialogHeader>
                
                {empSuccess ? (
                    <div className="py-8 flex flex-col items-center justify-center animate-in zoom-in">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-3d">
                            <CheckCircle2 className="w-8 h-8" strokeWidth={3} />
                        </div>
                        <h3 className="text-lg font-bold text-green-700 text-center">{empSuccess}</h3>
                        <p className="text-xs text-gray-500 mt-2">يرجى حفظ اسم الدخول للموظف</p>
                        <button onClick={() => { setEmpSuccess(''); setCreateEmpOpen(false); }} className="mt-4 px-6 py-2 bg-gray-200 rounded-lg font-bold">إغلاق</button>
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        {empError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 shadow-sm">
                                {empError}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>اسم الموظف</Label>
                            <Input 
                                value={newEmpName}
                                onChange={(e) => setNewEmpName(e.target.value)}
                                className="bg-white shadow-3d-inset border-none"
                                placeholder="اسم الموظف"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>كلمة المرور</Label>
                            <Input 
                                type="password"
                                value={newEmpPass}
                                onChange={(e) => setNewEmpPass(e.target.value)}
                                className="bg-white shadow-3d-inset border-none"
                                placeholder="••••"
                            />
                        </div>
                        <button 
                            onClick={handleCreateEmployee}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 mt-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            إنشاء حساب
                        </button>
                    </div>
                )}
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
