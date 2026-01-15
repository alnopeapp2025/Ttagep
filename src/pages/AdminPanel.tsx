import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Settings, Users, CheckCircle2, XCircle, Shield, Key, LogOut, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
    getGlobalSettings, saveGlobalSettings, GlobalSettings, 
    getSubscriptionRequests, approveSubscription, SubscriptionRequest,
    UserRole
} from '@/lib/store';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [settings, setSettings] = useState<GlobalSettings>(getGlobalSettings());
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);

  // Simple Hash for Admin (Match Store)
  const hashPassword = (pwd: string) => btoa(pwd).split('').reverse().join('');

  useEffect(() => {
    // Refresh requests periodically
    const interval = setInterval(() => {
        setRequests(getSubscriptionRequests());
    }, 2000);
    setRequests(getSubscriptionRequests());
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

  const handlePermissionChange = (
    type: 'page' | 'feature', 
    key: string, 
    role: UserRole, 
    checked: boolean
  ) => {
    const newSettings = { ...settings };
    
    if (type === 'page') {
        const list = newSettings.pagePermissions[key as keyof GlobalSettings['pagePermissions']];
        if (checked && !list.includes(role)) list.push(role);
        if (!checked) {
            const idx = list.indexOf(role);
            if (idx > -1) list.splice(idx, 1);
        }
    } else {
        const list = newSettings.featurePermissions[key as keyof GlobalSettings['featurePermissions']];
        if (checked && !list.includes(role)) list.push(role);
        if (!checked) {
            const idx = list.indexOf(role);
            if (idx > -1) list.splice(idx, 1);
        }
    }

    setSettings(newSettings);
    saveGlobalSettings(newSettings);
  };

  const handleApprove = async (id: number) => {
    if(confirm('هل أنت متأكد من تفعيل العضوية الذهبية لهذا المستخدم؟')) {
        await approveSubscription(id);
        setRequests(getSubscriptionRequests()); // Refresh
    }
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

  const PermissionRow = ({ label, type, pKey }: { label: string, type: 'page' | 'feature', pKey: string }) => {
    // @ts-ignore
    const list = type === 'page' ? settings.pagePermissions[pKey] : settings.featurePermissions[pKey];
    
    return (
        <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <span className="font-bold text-gray-700">{label}</span>
            <div className="flex gap-4">
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-500">زائر</Label>
                    <Switch 
                        checked={list.includes('visitor')}
                        onCheckedChange={(c) => handlePermissionChange(type, pKey, 'visitor', c)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-blue-500">عضو</Label>
                    <Switch 
                        checked={list.includes('member')}
                        onCheckedChange={(c) => handlePermissionChange(type, pKey, 'member', c)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-yellow-600">ذهبي</Label>
                    <Switch 
                        checked={list.includes('golden')}
                        onCheckedChange={(c) => handlePermissionChange(type, pKey, 'golden', c)}
                    />
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#eef2f6] p-4 sm:p-8" dir="rtl">
        <header className="max-w-5xl mx-auto mb-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-white shadow-3d">
                    <Settings className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-800">لوحة التحكم</h1>
                    <p className="text-gray-500 text-sm">إدارة الصلاحيات والطلبات</p>
                </div>
            </div>
            <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 rounded-xl font-bold shadow-sm hover:bg-gray-50"
            >
                <LogOut className="w-4 h-4" /> خروج
            </button>
        </header>

        <div className="max-w-5xl mx-auto">
            <Tabs defaultValue="permissions" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-white shadow-3d p-1 rounded-xl h-14">
                    <TabsTrigger value="permissions" className="rounded-lg h-12 font-bold data-[state=active]:bg-gray-100">التحكم في الصلاحيات</TabsTrigger>
                    <TabsTrigger value="requests" className="rounded-lg h-12 font-bold data-[state=active]:bg-gray-100 relative">
                        طلبات التفعيل
                        {requests.filter(r => r.status === 'pending').length > 0 && (
                            <span className="absolute top-2 left-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="permissions" className="space-y-6">
                    <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ArrowRight className="w-5 h-5 text-blue-600" /> صلاحيات الصفحات
                        </h3>
                        <div className="space-y-3">
                            <PermissionRow label="صفحة المعاملات" type="page" pKey="transactions" />
                            <PermissionRow label="صفحة الحسابات" type="page" pKey="accounts" />
                            <PermissionRow label="صفحة التقارير" type="page" pKey="reports" />
                            <PermissionRow label="صفحة العملاء" type="page" pKey="clients" />
                            <PermissionRow label="صفحة المعقبين" type="page" pKey="agents" />
                            <PermissionRow label="صفحة المنجزين" type="page" pKey="achievers" />
                            <PermissionRow label="صفحة المنصرفات" type="page" pKey="expenses" />
                            <PermissionRow label="صفحة الحاسبة" type="page" pKey="calculator" />
                        </div>
                    </div>

                    <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ArrowRight className="w-5 h-5 text-orange-600" /> صلاحيات الأزرار والوظائف (PRO)
                        </h3>
                        <div className="space-y-3">
                            <PermissionRow label="زر النسخ الاحتياطي" type="feature" pKey="backup" />
                            <PermissionRow label="زر دخول الموظفين" type="feature" pKey="employeeLogin" />
                            <PermissionRow label="زر واتساب للعميل" type="feature" pKey="whatsapp" />
                            <PermissionRow label="زر الطباعة" type="feature" pKey="print" />
                            <PermissionRow label="زر التحويل بين البنوك" type="feature" pKey="transfer" />
                            <PermissionRow label="زر حذف مصروف" type="feature" pKey="deleteExpense" />
                            <PermissionRow label="أرقام معقبين منجزين" type="feature" pKey="achieversNumbers" />
                            <PermissionRow label="دروس الخدمات العامة" type="feature" pKey="lessons" />
                            <PermissionRow label="إحصائيات الشهر (تقارير)" type="feature" pKey="monthStats" />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="requests">
                    <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50 min-h-[400px]">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">طلبات العضوية الذهبية</h3>
                        
                        {requests.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">لا توجد طلبات حالياً</div>
                        ) : (
                            <div className="space-y-4">
                                {requests.map(req => (
                                    <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${req.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`}>
                                                {req.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">{req.userName}</h4>
                                                <p className="text-sm text-gray-500 font-mono">{req.phone}</p>
                                                <div className="flex gap-2 text-xs mt-1">
                                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">المدة: {req.duration}</span>
                                                    <span className="text-gray-400">{new Date(req.createdAt).toLocaleDateString('ar-SA')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {req.status === 'pending' ? (
                                            <button 
                                                onClick={() => handleApprove(req.id)}
                                                className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                تفعيل العضوية
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-xl">
                                                <CheckCircle2 className="w-5 h-5" />
                                                تم التفعيل
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}
