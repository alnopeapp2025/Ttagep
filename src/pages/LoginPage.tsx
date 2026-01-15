import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Lock, LogIn, UserPlus, HelpCircle, AlertCircle, RefreshCw, CheckCircle2, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loginUser, verifySecurityInfo, resetPassword } from '@/lib/store';

const securityQuestions = [
  "اين ولدت والدتك؟",
  "ماهو اقرب صديق لك؟",
  "متي تزوجت؟",
  "ماهي الهواية المفضله؟",
  "مدينة في السعوديه اقرب لقلبك؟",
  "ما وجبتك المفضلة؟"
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Refs for auto-focus
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Forgot Password State
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'verify' | 'reset'>('verify');
  
  // Recovery Fields
  const [recPhone, setRecPhone] = useState('');
  const [recQuestion, setRecQuestion] = useState('');
  const [recAnswer, setRecAnswer] = useState('');
  
  // Reset Fields
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  
  const [recError, setRecError] = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const [recSuccess, setRecSuccess] = useState(false);

  // Auto-fill from Registration
  useEffect(() => {
    if (location.state) {
        if (location.state.phone) setPhone(location.state.phone);
        if (location.state.password) setPassword(location.state.password);
        
        if (location.state.registeredSuccess) {
            setSuccessMsg(true);
            // Hide success message after 2 seconds
            const timer = setTimeout(() => {
                setSuccessMsg(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }
  }, [location]);

  // Reset Recovery State when Dialog Closes
  useEffect(() => {
    if (!forgotOpen) {
        setRecoveryStep('verify');
        setRecPhone('');
        setRecQuestion('');
        setRecAnswer('');
        setNewPass('');
        setConfirmPass('');
        setRecError('');
        setRecSuccess(false);
    }
  }, [forgotOpen]);

  const handleLogin = async () => {
    setError('');
    
    if (!phone) {
        setError('يرجى ملء جميع الحقول');
        phoneRef.current?.focus();
        return;
    }

    if (!password) {
        setError('يرجى ملء جميع الحقول');
        passwordRef.current?.focus();
        return;
    }

    setLoading(true);
    try {
        const result = await loginUser(phone, password);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.message || 'فشل الدخول');
        }
    } catch (err) {
        setError('حدث خطأ غير متوقع');
    } finally {
        setLoading(false);
    }
  };

  const handleVerifySecurity = async () => {
    setRecError('');
    if (!recPhone || !recQuestion || !recAnswer) {
        setRecError('يرجى ملء جميع حقول التحقق');
        return;
    }

    setRecLoading(true);
    try {
        const result = await verifySecurityInfo(recPhone, recQuestion, recAnswer);
        if (result.success) {
            setRecoveryStep('reset');
        } else {
            setRecError(result.message || 'البيانات غير صحيحة');
        }
    } catch (err) {
        setRecError('حدث خطأ أثناء التحقق');
    } finally {
        setRecLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setRecError('');
    if (!newPass || !confirmPass) {
        setRecError('يرجى إدخال كلمة المرور الجديدة');
        return;
    }

    if (newPass !== confirmPass) {
        setRecError('كلمتا المرور غير متطابقتين');
        return;
    }

    setRecLoading(true);
    try {
        const result = await resetPassword(recPhone, newPass);
        if (result.success) {
            setRecSuccess(true);
            setTimeout(() => {
                setForgotOpen(false);
            }, 2000);
        } else {
            setRecError(result.message || 'فشل التحديث');
        }
    } catch (err) {
        setRecError('حدث خطأ أثناء التحديث');
    } finally {
        setRecLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#eef2f6] rounded-3xl shadow-3d p-8 border border-white/50 relative">
        
        {/* Success Message Overlay */}
        {successMsg && (
            <div className="absolute inset-0 bg-[#eef2f6]/95 backdrop-blur-sm z-50 rounded-3xl flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="w-20 h-20 bg-green-100 rounded-full shadow-3d flex items-center justify-center mb-4 text-green-600 border-4 border-green-200">
                    <CheckCircle2 className="w-10 h-10" strokeWidth={3} />
                </div>
                <h2 className="text-xl font-black text-green-700">تم تسجيل حسابك بنجاح</h2>
            </div>
        )}

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto shadow-3d flex items-center justify-center mb-4 rotate-3 hover:rotate-0 transition-all duration-500">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-800 text-shadow">تسجيل الدخول</h1>
          <p className="text-gray-500 text-sm mt-1">نظام المعقب المحاسبي</p>
        </div>

        {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-in slide-in-from-top-2 shadow-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
            </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold text-gray-600">رقم الهاتف</Label>
            <div className="relative">
              <Input 
                ref={phoneRef}
                value={phone}
                onChange={(e) => {
                    setPhone(e.target.value);
                    if(error) setError('');
                }}
                className={`bg-[#eef2f6] shadow-3d-inset border-none pl-10 h-12 ${error && !phone ? 'ring-2 ring-red-400' : ''}`}
                placeholder="05xxxxxxxx"
              />
              <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-gray-600">كلمة المرور</Label>
            <div className="relative">
              <Input 
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => {
                    setPassword(e.target.value);
                    if(error) setError('');
                }}
                className={`bg-[#eef2f6] shadow-3d-inset border-none pl-10 h-12 ${error && !password ? 'ring-2 ring-red-400' : ''}`}
                placeholder="••••••••"
              />
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            دخول
          </button>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <button 
              onClick={() => navigate('/register')}
              className="py-3 bg-[#eef2f6] text-gray-600 rounded-xl font-bold text-xs shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all flex items-center justify-center gap-1"
            >
              <UserPlus className="w-4 h-4" />
              عضوية جديدة
            </button>
            
            <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                <DialogTrigger asChild>
                    <button className="py-3 bg-[#eef2f6] text-gray-600 rounded-xl font-bold text-xs shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all flex items-center justify-center gap-1">
                        <HelpCircle className="w-4 h-4" />
                        نسيت كلمة المرور؟
                    </button>
                </DialogTrigger>
                <DialogContent className="bg-[#eef2f6] shadow-3d border-none" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-center font-bold text-gray-800">استعادة كلمة المرور</DialogTitle>
                    </DialogHeader>
                    
                    {recSuccess ? (
                        <div className="py-8 flex flex-col items-center justify-center animate-in zoom-in">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-3d">
                                <Check className="w-8 h-8" strokeWidth={3} />
                            </div>
                            <h3 className="text-lg font-bold text-green-700">تم تحديث كلمة المرور بنجاح</h3>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            {recError && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 shadow-sm animate-in fade-in">
                                    <AlertCircle className="w-4 h-4" />
                                    {recError}
                                </div>
                            )}

                            {recoveryStep === 'verify' ? (
                                <div className="space-y-4 animate-in slide-in-from-right-2">
                                    <div className="space-y-2">
                                        <Label>رقم الهاتف</Label>
                                        <Input 
                                            value={recPhone}
                                            onChange={(e) => setRecPhone(e.target.value)}
                                            className="bg-white shadow-3d-inset border-none" 
                                            placeholder="05xxxxxxxx" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>سؤال الأمان</Label>
                                        <Select value={recQuestion} onValueChange={setRecQuestion}>
                                            <SelectTrigger className="bg-white shadow-3d-inset border-none h-10 text-right flex-row-reverse">
                                                <SelectValue placeholder="اختر السؤال..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                                                {securityQuestions.map((q) => (
                                                <SelectItem key={q} value={q} className="text-right cursor-pointer my-1">{q}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>الإجابة</Label>
                                        <Input 
                                            value={recAnswer}
                                            onChange={(e) => setRecAnswer(e.target.value)}
                                            className="bg-white shadow-3d-inset border-none" 
                                            placeholder="إجابتك..." 
                                        />
                                    </div>
                                    <button 
                                        onClick={handleVerifySecurity}
                                        disabled={recLoading}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        {recLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        تحقق
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in slide-in-from-left-2">
                                    <div className="space-y-2">
                                        <Label>كلمة المرور الجديدة</Label>
                                        <div className="relative">
                                            <Input 
                                                type="password"
                                                value={newPass}
                                                onChange={(e) => setNewPass(e.target.value)}
                                                className="bg-white shadow-3d-inset border-none pl-10" 
                                                placeholder="••••••••" 
                                            />
                                            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>تأكيد كلمة المرور</Label>
                                        <div className="relative">
                                            <Input 
                                                type="password"
                                                value={confirmPass}
                                                onChange={(e) => setConfirmPass(e.target.value)}
                                                className="bg-white shadow-3d-inset border-none pl-10" 
                                                placeholder="••••••••" 
                                            />
                                            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleResetPassword}
                                        disabled={recLoading}
                                        className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        {recLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        تحديث
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
