import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, CheckCircle2, Shield, Key, LogOut, Trash2, Save, Palette, Type, Sliders, CreditCard, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { 
    getGlobalSettings, GlobalSettings, saveGlobalSettings,
    getSubscriptionRequests, approveSubscription, SubscriptionRequest,
    getGoldenUsers, GoldenUserRecord, cancelSubscription, rejectSubscriptionRequest,
    BankAccount
} from '@/lib/store';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [settings, setSettings] = useState<GlobalSettings>(getGlobalSettings());
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [activeGolden, setActiveGolden] = useState<GoldenUserRecord[]>([]);

  // Admin Password Change
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [passMsg, setPassMsg] = useState('');

  // Appearance Settings
  const [siteTitle, setSiteTitle] = useState(settings.siteTitle || 'مان هويات لمكاتب الخدمات');
  const [marqueeText, setMarqueeText] = useState(settings.marquee?.text || 'مرحباً بكم في تطبيق مان هويات لمكاتب الخدمات');
  const [marqueeBg, setMarqueeBg] = useState(settings.marquee?.bgColor || '#DC2626');
  const [marqueeColor, setMarqueeColor] = useState(settings.marquee?.textColor || '#FFFFFF');
  const [appearanceMsg, setAppearanceMsg] = useState('');

  // Limits Settings
  const [limitsMsg, setLimitsMsg] = useState('');

  // Subscription Settings
  const [subMsg, setSubMsg] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newBankAcc, setNewBankAcc] = useState('');
  const [newBenefit, setNewBenefit] = useState('');

  // Simple Hash for Admin (Match Store)
  const hashPassword = (pwd: string) => btoa(pwd).split('').reverse().join('');

  useEffect(() => {
    // Refresh requests periodically
    const interval = setInterval(() => {
        setRequests(getSubscriptionRequests());
        setActiveGolden(getGoldenUsers());
    }, 2000);
    setRequests(getSubscriptionRequests());
    setActiveGolden(getGoldenUsers());
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    if (hashPassword(password) === settings.adminPasswordHash) {
        setIsAuthenticated(true);
        setError('');
    } else {
        setError('كلمة المرور غير صحيحة');
    }
  };

  const handleApprove = async (id: number) => {
    if(confirm('هل أنت متأكد من تفعيل العضوية الذهبية لهذا المستخدم؟')) {
        await approveSubscription(id);
        setRequests(getSubscriptionRequests()); // Refresh
        setActiveGolden(getGoldenUsers());
    }
  };

  const handleReject = (id: number) => {
      if(confirm('هل أنت متأكد من رفض وحذف هذا الطلب؟')) {
          rejectSubscriptionRequest(id);
          setRequests(getSubscriptionRequests());
      }
  };

  const handleCancelSub = async (userId: number) => {
      if(confirm('هل أنت متأكد من حذف اشتراك هذا العضو؟ سيتم إلغاء صلاحياته فوراً.')) {
          await cancelSubscription(userId);
          setActiveGolden(getGoldenUsers());
      }
  };

  const formatExpiry = (ts: number) => {
      const date = new Date(ts);
      return date.toLocaleDateString('ar-SA', { 
          day: 'numeric', 
          month: 'numeric', 
          hour: 'numeric', 
          minute: 'numeric' 
      });
  };

  const handleChangeAdminPassword = () => {
      if (!newAdminPass || !confirmAdminPass) {
          setPassMsg('يرجى ملء الحقول');
          return;
      }
      if (newAdminPass !== confirmAdminPass) {
          setPassMsg('كلمتا المرور غير متطابقتين');
          return;
      }
      
      const newSettings = { ...settings, adminPasswordHash: hashPassword(newAdminPass) };
      setSettings(newSettings);
      saveGlobalSettings(newSettings);
      setPassMsg('تم تغيير كلمة المرور بنجاح');
      setNewAdminPass('');
      setConfirmAdminPass('');
      setTimeout(() => setPassMsg(''), 3000);
  };

  const handleSaveAppearance = () => {
      const newSettings = { 
          ...settings, 
          siteTitle: siteTitle,
          marquee: {
              text: marqueeText,
              bgColor: marqueeBg,
              textColor: marqueeColor
          }
      };
      setSettings(newSettings);
      saveGlobalSettings(newSettings);
      setAppearanceMsg('تم حفظ إعدادات المظهر بنجاح');
      setTimeout(() => setAppearanceMsg(''), 3000);
  };

  const handleLimitChange = (role: 'visitor' | 'member' | 'golden', type: string, value: string) => {
      const val = parseInt(value) || 0;
      setSettings(prev => ({
          ...prev,
          limits: {
              ...prev.limits,
              [role]: {
                  ...prev.limits[role],
                  [type]: val
              }
          }
      }));
  };

  const handleSaveLimits = () => {
      saveGlobalSettings(settings);
      setLimitsMsg('تم حفظ حدود الإضافة بنجاح');
      setTimeout(() => setLimitsMsg(''), 3000);
  };

  // --- Subscription Management Handlers ---

  const handleAddBank = () => {
      if (!newBankName) return;
      const newBank: BankAccount = {
          id: Date.now(),
          name: newBankName,
          accountNumber: newBankAcc || '-'
      };
      setSettings(prev => ({
          ...prev,
          banks: [...prev.banks, newBank]
      }));
      setNewBankName('');
      setNewBankAcc('');
  };

  const handleDeleteBank = (id: number) => {
      if(confirm('هل أنت متأكد من حذف هذا البنك؟')) {
          setSettings(prev => ({
              ...prev,
              banks: prev.banks.filter(b => b.id !== id)
          }));
      }
  };

  const handleUpdateBank = (id: number, field: 'name' | 'accountNumber', value: string) => {
      setSettings(prev => ({
          ...prev,
          banks: prev.banks.map(b => b.id === id ? { ...b, [field]: value } : b)
      }));
  };

  const handleUpdatePackagePrice = (type: 'monthly' | 'annual', price: string) => {
      const val = parseFloat(price) || 0;
      setSettings(prev => ({
          ...prev,
          packages: {
              ...prev.packages,
              [type]: { ...prev.packages[type], price: val }
          }
      }));
  };

  const handleAddBenefit = (type: 'monthly' | 'annual') => {
      if(!newBenefit) return;
      setSettings(prev => ({
          ...prev,
          packages: {
              ...prev.packages,
              [type]: { 
                  ...prev.packages[type], 
                  benefits: [...prev.packages[type].benefits, newBenefit] 
              }
          }
      }));
      setNewBenefit('');
  };

  const handleDeleteBenefit = (type: 'monthly' | 'annual', index: number) => {
      setSettings(prev => ({
          ...prev,
          packages: {
              ...prev.packages,
              [type]: { 
                  ...prev.packages[type], 
                  benefits: prev.packages[type].benefits.filter((_, i) => i !== index) 
              }
          }
      }));
  };

  const handleUpdateBenefit = (type: 'monthly' | 'annual', index: number, value: string) => {
      setSettings(prev => {
          const newBenefits = [...prev.packages[type].benefits];
          newBenefits[index] = value;
          return {
              ...prev,
              packages: {
                  ...prev.packages,
                  [type]: { ...prev.packages[type], benefits: newBenefits }
              }
          };
      });
  };

  const handleSaveSubscriptionSettings = () => {
      saveGlobalSettings(settings);
      setSubMsg('تم حفظ إعدادات الاشتراك والبنوك بنجاح');
      setTimeout(() => setSubMsg(''), 3000);
  };

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#eef2f6] p-4" dir="rtl">
            <div className="bg-[#eef2f6] p-8 rounded-3xl shadow-3d border border-white/50 w-full max-w-md text-center">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-3d text-white">
                    <Shield className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black text-gray-800 mb-6">لوحة التحكم الإدارية</h1>
                <div className="space-y-4">
                    <div className="relative">
                        <Input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="كلمة المرور"
                            className="bg-white shadow-3d-inset border-none pl-10 h-12 text-center"
                        />
                        <Key className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    </div>
                    {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                    <button 
                        onClick={handleLogin}
                        className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold shadow-3d hover:scale-[1.02] transition-transform"
                    >
                        دخول
                    </button>
                    <button 
                        onClick={() => navigate('/')}
                        className="w-full py-3 bg-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                    >
                        عودة للموقع
                    </button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f6] p-4 sm:p-8" dir="rtl">
        <header className="max-w-5xl mx-auto mb-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-white shadow-3d">
                    <Settings className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-gray-800">لوحة التحكم</h1>
                    <p className="text-gray-500 text-xs">إدارة الصلاحيات والطلبات</p>
                </div>
            </div>
            <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 rounded-xl font-bold shadow-sm hover:bg-gray-50 text-sm"
            >
                <LogOut className="w-4 h-4" /> خروج
            </button>
        </header>

        <div className="max-w-5xl mx-auto">
            <Tabs defaultValue="requests" className="w-full">
                <TabsList className="grid w-full grid-cols-6 mb-6 bg-white shadow-3d p-1 rounded-xl h-12 overflow-x-auto">
                    <TabsTrigger value="requests" className="rounded-lg h-10 font-bold text-xs sm:text-sm data-[state=active]:bg-gray-100 relative">
                        طلبات التفعيل
                        {requests.filter(r => r.status === 'pending').length > 0 && (
                            <span className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="active" className="rounded-lg h-10 font-bold text-xs sm:text-sm data-[state=active]:bg-gray-100">الأعضاء النشطين</TabsTrigger>
                    <TabsTrigger value="limits" className="rounded-lg h-10 font-bold text-xs sm:text-sm data-[state=active]:bg-gray-100">حدود الإضافة</TabsTrigger>
                    <TabsTrigger value="subscription" className="rounded-lg h-10 font-bold text-xs sm:text-sm data-[state=active]:bg-gray-100 flex gap-1">
                        <CreditCard className="w-3 h-3" />
                        الاشتراكات
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-lg h-10 font-bold text-xs sm:text-sm data-[state=active]:bg-gray-100">كلمة المرور</TabsTrigger>
                    <TabsTrigger value="appearance" className="rounded-lg h-10 font-bold text-xs sm:text-sm data-[state=active]:bg-gray-100">المظهر</TabsTrigger>
                </TabsList>

                <TabsContent value="requests">
                    <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50 min-h-[400px]">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">طلبات العضوية الذهبية</h3>
                        
                        {requests.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 text-sm">لا توجد طلبات حالياً</div>
                        ) : (
                            <div className="space-y-3">
                                {requests.map(req => (
                                    <div key={req.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base ${req.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`}>
                                                {req.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-sm">{req.userName}</h4>
                                                <p className="text-xs text-gray-500 font-mono">{req.phone}</p>
                                                <div className="flex gap-2 text-[10px] mt-1">
                                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">المدة: {req.duration}</span>
                                                    <span className="text-gray-400">{new Date(req.createdAt).toLocaleDateString('ar-SA')}</span>
                                                    {req.bank && <span className="text-gray-500">({req.bank})</span>}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {req.status === 'pending' ? (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleApprove(req.id)}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2 text-xs"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    تفعيل العضوية
                                                </button>
                                                <button 
                                                    onClick={() => handleReject(req.id)}
                                                    className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all flex items-center gap-2 text-xs"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    رفض
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-1 rounded-xl text-xs">
                                                <CheckCircle2 className="w-4 h-4" />
                                                تم التفعيل
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="active">
                    <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50 min-h-[400px]">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">الأعضاء الذهبيين النشطين</h3>
                        
                        {activeGolden.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 text-sm">لا يوجد أعضاء نشطين حالياً</div>
                        ) : (
                            <div className="space-y-3">
                                {activeGolden.map(user => (
                                    <div key={user.userId} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base bg-yellow-500 shadow-md">
                                                {user.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-sm">{user.userName}</h4>
                                                <div className="flex flex-col text-[10px] mt-1 text-gray-500">
                                                    <span>ينتهي في:</span>
                                                    <span className="font-bold text-red-500">{formatExpiry(user.expiry)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleCancelSub(user.userId)}
                                            className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all flex items-center gap-2 text-xs"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            حذف
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="limits">
                    <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-blue-600" />
                            إدارة حدود الإضافة
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Visitor Limits */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-600 border-b pb-2">حدود الزوار (غير المسجلين)</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">المعاملات</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.visitor.transactions}
                                            onChange={(e) => handleLimitChange('visitor', 'transactions', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">العملاء</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.visitor.clients}
                                            onChange={(e) => handleLimitChange('visitor', 'clients', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">المعقبين</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.visitor.agents}
                                            onChange={(e) => handleLimitChange('visitor', 'agents', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">المصروفات</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.visitor.expenses}
                                            onChange={(e) => handleLimitChange('visitor', 'expenses', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Member Limits */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-blue-600 border-b pb-2 border-blue-200">حدود الأعضاء (المسجلين)</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">المعاملات</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.member.transactions}
                                            onChange={(e) => handleLimitChange('member', 'transactions', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">العملاء</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.member.clients}
                                            onChange={(e) => handleLimitChange('member', 'clients', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">المعقبين</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.member.agents}
                                            onChange={(e) => handleLimitChange('member', 'agents', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">المصروفات</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.member.expenses}
                                            onChange={(e) => handleLimitChange('member', 'expenses', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Golden Limits */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-yellow-600 border-b pb-2 border-yellow-200">حدود الذهبيين (PRO)</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">المعاملات</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.golden.transactions}
                                            onChange={(e) => handleLimitChange('golden', 'transactions', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">العملاء</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.golden.clients}
                                            onChange={(e) => handleLimitChange('golden', 'clients', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">المعقبين</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.golden.agents}
                                            onChange={(e) => handleLimitChange('golden', 'agents', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">المصروفات</Label>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-white shadow-sm text-center" 
                                            value={settings.limits.golden.expenses}
                                            onChange={(e) => handleLimitChange('golden', 'expenses', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSaveLimits}
                            className="w-full mt-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            حفظ الحدود
                        </button>
                        
                        {limitsMsg && (
                            <p className="text-green-600 font-bold text-center mt-3 animate-in fade-in">{limitsMsg}</p>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="subscription">
                    <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-green-600" />
                            إعدادات الاشتراك والبنوك
                        </h3>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Banks Management */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-700 border-b pb-2">إدارة البنوك والحسابات</h4>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                    {settings.banks.map(bank => (
                                        <div key={bank.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 space-y-2">
                                            <div className="flex gap-2">
                                                <Input 
                                                    value={bank.name}
                                                    onChange={(e) => handleUpdateBank(bank.id, 'name', e.target.value)}
                                                    className="bg-gray-50 border-none h-8 text-xs font-bold"
                                                    placeholder="اسم البنك"
                                                />
                                                <button 
                                                    onClick={() => handleDeleteBank(bank.id)}
                                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <Input 
                                                value={bank.accountNumber}
                                                onChange={(e) => handleUpdateBank(bank.id, 'accountNumber', e.target.value)}
                                                className="bg-gray-50 border-none h-8 text-xs font-mono text-left"
                                                placeholder="رقم الحساب / الآيبان"
                                                dir="ltr"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-gray-200">
                                    <Input 
                                        value={newBankName}
                                        onChange={(e) => setNewBankName(e.target.value)}
                                        placeholder="اسم بنك جديد"
                                        className="bg-white shadow-sm h-10 text-sm"
                                    />
                                    <Input 
                                        value={newBankAcc}
                                        onChange={(e) => setNewBankAcc(e.target.value)}
                                        placeholder="رقم الحساب"
                                        className="bg-white shadow-sm h-10 text-sm font-mono"
                                        dir="ltr"
                                    />
                                    <button 
                                        onClick={handleAddBank}
                                        className="px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Packages Management */}
                            <div className="space-y-6">
                                <h4 className="font-bold text-gray-700 border-b pb-2">إدارة الباقات</h4>
                                
                                {/* Monthly Package */}
                                <div className="bg-white/50 p-4 rounded-xl border border-blue-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-blue-600">الباقة الشهرية</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">السعر:</span>
                                            <Input 
                                                type="number"
                                                value={settings.packages.monthly.price}
                                                onChange={(e) => handleUpdatePackagePrice('monthly', e.target.value)}
                                                className="w-20 h-8 bg-white text-center font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-500">المزايا (Benefit List)</Label>
                                        {settings.packages.monthly.benefits.map((benefit, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <Input 
                                                    value={benefit}
                                                    onChange={(e) => handleUpdateBenefit('monthly', idx, e.target.value)}
                                                    className="h-8 text-xs bg-white"
                                                />
                                                <button onClick={() => handleDeleteBenefit('monthly', idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex gap-2">
                                            <Input 
                                                value={newBenefit}
                                                onChange={(e) => setNewBenefit(e.target.value)}
                                                placeholder="ميزة جديدة..."
                                                className="h-8 text-xs bg-white"
                                            />
                                            <button onClick={() => handleAddBenefit('monthly')} className="text-green-600 hover:bg-green-50 p-1 rounded">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Annual Package */}
                                <div className="bg-white/50 p-4 rounded-xl border border-yellow-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-yellow-600">الباقة السنوية</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">السعر:</span>
                                            <Input 
                                                type="number"
                                                value={settings.packages.annual.price}
                                                onChange={(e) => handleUpdatePackagePrice('annual', e.target.value)}
                                                className="w-20 h-8 bg-white text-center font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-500">المزايا (Benefit List)</Label>
                                        {settings.packages.annual.benefits.map((benefit, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <Input 
                                                    value={benefit}
                                                    onChange={(e) => handleUpdateBenefit('annual', idx, e.target.value)}
                                                    className="h-8 text-xs bg-white"
                                                />
                                                <button onClick={() => handleDeleteBenefit('annual', idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex gap-2">
                                            <Input 
                                                value={newBenefit}
                                                onChange={(e) => setNewBenefit(e.target.value)}
                                                placeholder="ميزة جديدة..."
                                                className="h-8 text-xs bg-white"
                                            />
                                            <button onClick={() => handleAddBenefit('annual')} className="text-green-600 hover:bg-green-50 p-1 rounded">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSaveSubscriptionSettings}
                            className="w-full mt-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            حفظ التغييرات
                        </button>
                        
                        {subMsg && (
                            <p className="text-green-600 font-bold text-center mt-3 animate-in fade-in">{subMsg}</p>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="settings">
                    <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Key className="w-5 h-5 text-red-600" />
                            تغيير كلمة مرور الأدمن
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full space-y-2">
                                <Label>كلمة المرور الجديدة</Label>
                                <Input 
                                    type="password" 
                                    className="bg-white" 
                                    value={newAdminPass}
                                    onChange={(e) => setNewAdminPass(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 w-full space-y-2">
                                <Label>تأكيد كلمة المرور</Label>
                                <Input 
                                    type="password" 
                                    className="bg-white" 
                                    value={confirmAdminPass}
                                    onChange={(e) => setConfirmAdminPass(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleChangeAdminPassword}
                                className="w-full md:w-auto px-6 py-2 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900"
                            >
                                حفظ
                            </button>
                        </div>
                        {passMsg && <p className="text-green-600 font-bold text-sm mt-2">{passMsg}</p>}
                    </div>
                </TabsContent>

                <TabsContent value="appearance">
                    <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Palette className="w-5 h-5 text-pink-600" />
                            إعدادات المظهر العام
                        </h3>

                        <div className="space-y-6">
                            {/* Site Title */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Type className="w-4 h-4 text-gray-500" />
                                    عنوان الموقع الرئيسي
                                </Label>
                                <Input 
                                    value={siteTitle}
                                    onChange={(e) => setSiteTitle(e.target.value)}
                                    className="bg-white shadow-3d-inset border-none"
                                />
                            </div>

                            {/* Marquee Settings */}
                            <div className="border-t border-gray-200 pt-4 space-y-4">
                                <Label className="text-base font-bold text-gray-700">شريط النص المتحرك</Label>
                                
                                <div className="space-y-2">
                                    <Label>نص الشريط</Label>
                                    <Input 
                                        value={marqueeText}
                                        onChange={(e) => setMarqueeText(e.target.value)}
                                        className="bg-white shadow-3d-inset border-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>لون الخلفية (Hex Code)</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                value={marqueeBg}
                                                onChange={(e) => setMarqueeBg(e.target.value)}
                                                className="bg-white shadow-3d-inset border-none flex-1"
                                                dir="ltr"
                                            />
                                            <div className="w-10 h-10 rounded-lg border shadow-sm" style={{ backgroundColor: marqueeBg }}></div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>لون النص (Hex Code)</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                value={marqueeColor}
                                                onChange={(e) => setMarqueeColor(e.target.value)}
                                                className="bg-white shadow-3d-inset border-none flex-1"
                                                dir="ltr"
                                            />
                                            <div className="w-10 h-10 rounded-lg border shadow-sm" style={{ backgroundColor: marqueeColor }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleSaveAppearance}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                حفظ التغييرات
                            </button>
                            
                            {appearanceMsg && (
                                <p className="text-green-600 font-bold text-center animate-in fade-in">{appearanceMsg}</p>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}
