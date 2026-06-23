import { useEffect, useState } from 'react';
import { 
  FileText, Wallet, BarChart3, Users, UserCheck, Settings, Bell, LogOut, 
  Trophy, Menu, Award, LogIn, Receipt, Calculator, Activity, Clock, CheckCircle2,
  Search, Database, Trash2, AlertTriangle, Download, Upload, Crown, Mail, Phone, Lock, UserPlus, UserCircle, User as UserIcon, Key, X, Check, Shield, Sliders, Volume2, VolumeX,
  Building2, Pencil, Loader2, ArrowLeft, ArrowRight, Copy, Coins, Eye, EyeOff, Smartphone, MessageCircle, RefreshCw, Info, Headset, Share2
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { DashboardButton } from '@/components/DashboardButton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  getStoredTransactions, calculateAchievers, createBackup, restoreBackup, Transaction,
  getCurrentUser, logoutUser, User, changePassword, updateUserProfile, getLastBackupTime,
  fetchTransactionsFromCloud, fetchGlobalSettingsFromCloud, GlobalSettings, createEmployee,
  createSubscriptionRequest, createWithdrawalRequest, deleteAllAgents, deleteAllClients,
  deleteAllTransactions, deleteAllExpenses, deleteAllTransfers, deleteAllRefunds, isEmployeeRestricted
} from '@/lib/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [achievers, setAchievers] = useState<{name: string, count: number, total: number}[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('moaqeb_sound_enabled') !== 'false');
  const [hideEarnings, setHideEarnings] = useState(localStorage.getItem('moaqeb_hide_earnings') === 'true');
  const [tickerStats, setTickerStats] = useState({ active: 0, inProgress: 0, completedWeek: 0 });
  
  // Modal States
  const [aboutOpen, setAboutOpen] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [affiliateOpen, setAffiliateOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [mySettingsOpen, setMySettingsOpen] = useState(false);

  // Form States
  const [inquiryId, setInquiryId] = useState('');
  const [foundTx, setFoundTx] = useState<Transaction | null>(null);
  const [inquiryError, setInquiryError] = useState('');
  const [restoreText, setRestoreText] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [rajhiAccount, setRajhiAccount] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  useEffect(() => {
    fetchGlobalSettingsFromCloud().then(setSettings);
    const user = getCurrentUser();
    setCurrentUser(user);
    
    if (user && user.role === 'golden') {
        const hasSeen = localStorage.getItem(`moaqeb_onboarding_seen_${user.id}`);
        if (!hasSeen) setOnboardingOpen(true);
    }

    const loadData = async () => {
        if (!user) return;
        const targetId = user.role === 'employee' && user.parentId ? user.parentId : user.id;
        const txs = await fetchTransactionsFromCloud(targetId);
        setTransactions(txs);
        setAchievers(calculateAchievers(txs));
        const now = Date.now();
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        setTickerStats({
            active: txs.filter(t => t.status === 'active').length,
            inProgress: txs.filter(t => t.status === 'active' && t.targetDate > now).length,
            completedWeek: txs.filter(t => t.status === 'completed' && t.createdAt >= startOfWeek.getTime()).length
        });
    };
    loadData();
    setLastBackup(getLastBackupTime());
  }, []);

  // Admin Click Logic (3 clicks)
  useEffect(() => {
    if (adminClickCount >= 3) {
        navigate('/admins');
        setAdminClickCount(0);
    }
    const timer = setTimeout(() => {
        if (adminClickCount > 0) setAdminClickCount(0);
    }, 2000);
    return () => clearTimeout(timer);
  }, [adminClickCount, navigate]);

  const handleLogout = () => { logoutUser(); navigate('/login'); };

  const handleCopyReferral = () => {
      if (!currentUser) return;
      const link = `${window.location.origin}/register?ref=${currentUser.id}`;
      const msg = `سجل في تطبيق مان هوبات لإدارة مكاتب الخدمات العامه واستفد من المزايا المتعدده..\n${link}`;
      navigator.clipboard.writeText(msg);
      toast.success('تم نسخ رابط الدعوة بنجاح');
  };

  const handleWithdraw = async () => {
      setWithdrawError('');
      if (!currentUser || !rajhiAccount) return;
      if ((currentUser.affiliateBalance || 0) < 110) {
          setWithdrawError('الحد الأدنى للسحب هو 110 ريال');
          return;
      }
      const res = await createWithdrawalRequest(currentUser.id, currentUser.officeName, currentUser.affiliateBalance || 0, rajhiAccount);
      if (res.success) {
          setWithdrawSuccess(true);
          setRajhiAccount('');
          setTimeout(() => { setWithdrawOpen(false); setWithdrawSuccess(false); }, 3000);
      } else {
          setWithdrawError(res.message || 'فشل إرسال الطلب');
      }
  };

  const handlePageClick = (page: string, path: string) => {
      if (soundEnabled) new Audio('/sound2.mp3').play().catch(() => {});
      // @ts-ignore
      const userRole = currentUser?.role || 'visitor';
      if (userRole === 'golden' || userRole === 'employee' || settings?.pagePermissions[page]?.includes(userRole)) {
          navigate(path);
      } else {
          navigate('/?openPro=true');
      }
  };

  const whatsappShareText = `تطبيق مان هوبات لمكاتب الخدمات العامة والتعقيب\nإدارة شامله لمكتبك وانت بعيد\nجمل التطبيق الان من جوجل بلاي\nhttps://play.google.com/store/apps/details?id=apli3885642.ofh\nأو أدخل علي الرابط\nhttp://Www.manhobat.com.com`;

  return (
    <div className="min-h-screen pb-10 bg-[#eef2f6]">
      {/* Marquee */}
      {settings?.marquee && (
        <div 
          className="w-full py-2 mb-6 overflow-hidden shadow-sm border-b" 
          style={{ backgroundColor: settings.marquee.bgColor, color: settings.marquee.textColor }}
        >
          <div className="marquee-container">
            <div className="marquee-content font-bold text-sm">
              {settings.marquee.text}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-8 flex items-center justify-between">
          <div 
            onClick={() => setAdminClickCount(prev => prev + 1)} 
            className="cursor-pointer select-none active:scale-95 transition-transform"
          >
            <h1 className="text-2xl sm:text-4xl font-black text-gray-800 text-shadow">
              {settings?.siteTitle || 'مان هويات لمكاتب الخدمات'}
            </h1>
            <p className="text-gray-500 font-medium text-sm sm:text-base">
              لوحة التحكم الرئيسية <span className="text-red-600 text-xs font-bold mr-1">v. 1</span>
            </p>
          </div>
          
          <div className="flex gap-3 items-center">
            {currentUser && (
                <div className="flex flex-col items-center mr-2">
                    <button 
                        onClick={() => setAffiliateOpen(true)}
                        className="bg-green-50 text-green-600 rounded-2xl px-3 py-1 mb-2 flex flex-col items-center shadow-sm border border-green-100 hover:bg-green-100 transition-colors"
                    >
                        <span className="text-[10px] font-bold">أرباحك:</span>
                        <span className="text-xs font-black">{hideEarnings ? '****' : (currentUser.affiliateBalance || 0)} ريال</span>
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger className="outline-none">
                            <div className="relative w-10 h-10 rounded-full bg-blue-100 shadow-3d flex items-center justify-center text-blue-600 border border-blue-200">
                                <UserCircle className="w-6 h-6" />
                                {currentUser.role === 'golden' && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white animate-blink-slow"></span>
                                )}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-[#eef2f6] shadow-3d border-none rounded-xl" align="end" dir="rtl">
                            <DropdownMenuLabel className="text-center font-bold text-gray-700">{currentUser.officeName}</DropdownMenuLabel>
                            <div className="text-center">
                                <span className={`text-xs font-bold ${currentUser.role === 'golden' ? 'text-yellow-700' : 'text-blue-600'}`}>
                                    {currentUser.role === 'golden' ? 'عضو ذهبي' : currentUser.role === 'employee' ? 'موظف' : 'عضو'}
                                </span>
                            </div>
                            <DropdownMenuSeparator className="bg-gray-200" />
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => navigate('/profile')}><UserIcon className="w-4 h-4" /> الملف الشخصي</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={handleLogout}><LogOut className="w-4 h-4 text-red-500" /> تسجيل الخروج</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
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
                    <>
                        <button onClick={handleLogout} className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-red-600 font-bold">
                            <LogOut className="w-5 h-5" /> تسجيل خروج
                        </button>
                        <a href="https://wa.me/249118014777" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                            <Headset className="w-5 h-5 text-green-600" /> الدعم الفني السريع
                        </a>
                    </>
                  ) : (
                    <button onClick={() => navigate('/login')} className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                        <LogIn className="w-5 h-5 text-blue-600" /> تسجيل دخول
                    </button>
                  )}
                  <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappShareText)}`, '_blank')} className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                      <Share2 className="w-5 h-5 text-blue-400" /> ارسل لصديق واكسب
                  </button>
                  <Separator className="my-2 bg-gray-300/50" />
                  <button onClick={() => setAboutOpen(true)} className="flex items-center gap-3 p-4 rounded-xl bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all text-gray-700 font-bold">
                    <Info className="w-5 h-5 text-blue-500" /> عن التطبيق
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          <DashboardButton icon={FileText} label="المعاملات" onClick={() => handlePageClick('transactions', '/transactions')} />
          <DashboardButton icon={Wallet} label="الحسابات" onClick={() => handlePageClick('accounts', '/accounts')} />
          <DashboardButton icon={BarChart3} label="التقارير" onClick={() => handlePageClick('reports', '/reports')} />
          <DashboardButton icon={Users} label="العملاء" onClick={() => handlePageClick('clients', '/clients')} />
          <DashboardButton icon={UserCheck} label="المعقبين" onClick={() => handlePageClick('agents', '/agents')} />
          <DashboardButton icon={Award} label="المنجزين" variant="primary" onClick={() => handlePageClick('achievers', '/achievers')} />
          <DashboardButton icon={Receipt} label="المنصرفات" variant="danger" onClick={() => handlePageClick('expenses', '/expenses')} />
          <DashboardButton icon={Calculator} label="الحاسبة" onClick={() => handlePageClick('calculator', '/calculator')} />
          <DashboardButton icon={Building2} label="مكاتب الخدمات" className="col-span-2" onClick={() => handlePageClick('summary', '/summary')} />
        </div>

        {/* Quick Stats Ticker */}
        <div className="mt-8">
            <div className="p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-400 mb-3 text-right">ملخص سريع</h3>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        <span className="text-gray-600 font-bold text-sm">المعاملات النشطة</span>
                    </div>
                    <span className="font-black text-xl text-blue-600">{tickerStats.active}</span>
                </div>
            </div>
        </div>
      </div>

      {/* About Dialog */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
            <DialogHeader>
                <DialogTitle className="text-center text-xl font-black text-gray-800 flex items-center justify-center gap-2">
                    <Info className="w-6 h-6 text-blue-600" />
                    عن تطبيق مان هوبات
                </DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-4 text-gray-700 leading-relaxed text-center">
                <p className="text-sm font-bold">
                    تطبيق مان هوبات هو نظام محاسبي وإداري متكامل مخصص لمكاتب الخدمات العامة والاستقدام في المملكة العربية السعودية.
                </p>
                <div className="bg-white p-4 rounded-xl shadow-3d-inset border border-blue-100 text-right">
                    <h4 className="font-black text-blue-600 mb-2 text-sm">الهدف من التطبيق:</h4>
                    <ul className="text-xs space-y-2 list-disc list-inside font-medium text-gray-600">
                        <li>تنظيم المعاملات المالية والإدارية للمكاتب.</li>
                        <li>حفظ حقوق المكتب والعملاء والمعقبين.</li>
                        <li>متابعة الأرباح والمصروفات بدقة عالية.</li>
                    </ul>
                </div>
                <button onClick={() => setAboutOpen(false)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">إغلاق</button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Affiliate Dialog */}
      <Dialog open={affiliateOpen} onOpenChange={setAffiliateOpen}>
          <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl max-w-md" dir="rtl">
              <DialogHeader><DialogTitle className="text-center font-black text-xl text-gray-800">نظام العمولة والأرباح</DialogTitle></DialogHeader>
              <div className="py-4 space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-3d-inset text-center">
                      <p className="text-gray-500 font-bold text-sm mb-2">رصيدك الحالي القابل للسحب</p>
                      <h2 className="text-4xl font-black text-green-600">{(currentUser?.affiliateBalance || 0)} <span className="text-sm">ريال</span></h2>
                  </div>
                  <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                          <Trophy className="w-6 h-6 text-yellow-500" />
                          <p className="text-xs font-bold text-blue-800">احصل على 50 ريال عن كل صديق يشترك في الباقة السنوية عبر رابطك.</p>
                      </div>
                      <button onClick={handleCopyReferral} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"><Copy className="w-4 h-4" /> نسخ رابط الدعوة الخاص بي</button>
                      <button 
                          onClick={() => setWithdrawOpen(true)}
                          disabled={(currentUser?.affiliateBalance || 0) < 110}
                          className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          <Wallet className="w-4 h-4" /> طلب سحب الأرباح
                      </button>
                      <p className="text-[10px] text-gray-400 text-center">الحد الأدنى للسحب هو 110 ريال سعودي.</p>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
