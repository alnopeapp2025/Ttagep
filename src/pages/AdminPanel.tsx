import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, CheckCircle2, Shield, Key, LogOut, Trash2, Lock, Unlock, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from '@/components/ui/label';
import { 
    getGlobalSettings, GlobalSettings, saveGlobalSettings,
    getSubscriptionRequests, approveSubscription, SubscriptionRequest,
    getGoldenUsers, GoldenUserRecord, cancelSubscription, rejectSubscriptionRequest
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

  const handleFeatureToggle = (feature: keyof GlobalSettings['featurePermissions'], allowed: boolean) => {
      const newSettings = { ...settings };
      // If allowed, we add 'member' role (assuming visitors shouldn't access these anyway, or adjust as needed)
      // Actually, the request says "PRO Page Access Permissions... lock and unlock".
      // Let's assume locking means removing 'member' access, unlocking means adding it.
      // Golden/Employee always have access.
      
      if (allowed) {
          if (!newSettings.featurePermissions[feature].includes('member')) {
              newSettings.featurePermissions[feature].push('member');
          }
      } else {
          newSettings.featurePermissions[feature] = newSettings.featurePermissions[feature].filter(r => r !== 'member');
      }
      setSettings(newSettings);
      saveGlobalSettings(newSettings);
  };

  const handleLimitChange = (role: 'visitor' | 'member', type: 'transactions' | 'clients' | 'agents', value: string) => {
      const num = parseInt(value) || 0;
      const newSettings = { ...settings };
      if (!newSettings.limits) newSettings.limits = { visitor: { transactions: 5, clients: 3, agents: 2 }, member: { transactions: 20, clients: 10, agents: 5 } };
      newSettings.limits[role][type] = num;
      setSettings(newSettings);
      saveGlobalSettings(newSettings);
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
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-white shadow-3d p-1 rounded-xl h-12">
                    <TabsTrigger value="requests" className="rounded-lg h-10 font-bold text-sm data-[state=active]:bg-gray-100 relative">
                        طلبات التفعيل
                        {requests.filter(r => r.status === 'pending').length > 0 && (
                            <span className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="active" className="rounded-lg h-10 font-bold text-sm data-[state=active]:bg-gray-100">الأعضاء النشطين</TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-lg h-10 font-bold text-sm data-[state=active]:bg-gray-100">الإعدادات والصلاحيات</TabsTrigger>
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

                <TabsContent value="settings">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* PRO Features Permissions */}
                        <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-blue-600" />
                                صلاحيات الصفحات PRO
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">قفل وفتح الميزات للأعضاء العاديين (الأعضاء الذهبيين يملكون صلاحية كاملة دائماً)</p>
                            
                            <div className="space-y-4">
                                {[
                                    { key: 'transfer', label: 'تحويل بين البنوك' },
                                    { key: 'deleteExpense', label: 'حذف مصروف' },
                                    { key: 'achieversNumbers', label: 'أرقام معقبين منجزين' },
                                    { key: 'lessons', label: 'دروس الخدمات العامة' },
                                    { key: 'monthStats', label: 'إحصائيات الشهر' },
                                ].map((feature) => (
                                    <div key={feature.key} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
                                        <span className="text-sm font-bold text-gray-700">{feature.label}</span>
                                        <div className="flex items-center gap-2">
                                            <Switch 
                                                checked={settings.featurePermissions[feature.key as keyof GlobalSettings['featurePermissions']].includes('member')}
                                                onCheckedChange={(checked) => handleFeatureToggle(feature.key as keyof GlobalSettings['featurePermissions'], checked)}
                                            />
                                            {settings.featurePermissions[feature.key as keyof GlobalSettings['featurePermissions']].includes('member') ? 
                                                <Unlock className="w-4 h-4 text-green-500" /> : 
                                                <Lock className="w-4 h-4 text-red-500" />
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Limits Settings */}
                        <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-orange-600" />
                                حدود الإضافة
                            </h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-600 mb-2">حدود الزوار</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <Label className="text-[10px]">معاملات</Label>
                                            <Input 
                                                type="number" 
                                                className="bg-white h-8 text-center" 
                                                value={settings.limits?.visitor?.transactions || 0}
                                                onChange={(e) => handleLimitChange('visitor', 'transactions', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px]">عملاء</Label>
                                            <Input 
                                                type="number" 
                                                className="bg-white h-8 text-center" 
                                                value={settings.limits?.visitor?.clients || 0}
                                                onChange={(e) => handleLimitChange('visitor', 'clients', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px]">معقبين</Label>
                                            <Input 
                                                type="number" 
                                                className="bg-white h-8 text-center" 
                                                value={settings.limits?.visitor?.agents || 0}
                                                onChange={(e) => handleLimitChange('visitor', 'agents', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-4">
                                    <h4 className="text-sm font-bold text-gray-600 mb-2">حدود الأعضاء</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <Label className="text-[10px]">معاملات</Label>
                                            <Input 
                                                type="number" 
                                                className="bg-white h-8 text-center" 
                                                value={settings.limits?.member?.transactions || 0}
                                                onChange={(e) => handleLimitChange('member', 'transactions', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px]">عملاء</Label>
                                            <Input 
                                                type="number" 
                                                className="bg-white h-8 text-center" 
                                                value={settings.limits?.member?.clients || 0}
                                                onChange={(e) => handleLimitChange('member', 'clients', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px]">معقبين</Label>
                                            <Input 
                                                type="number" 
                                                className="bg-white h-8 text-center" 
                                                value={settings.limits?.member?.agents || 0}
                                                onChange={(e) => handleLimitChange('member', 'agents', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Admin Password */}
                        <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50 md:col-span-2">
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

                    </div>
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}
