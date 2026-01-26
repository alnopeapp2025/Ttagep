import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Phone, Lock, LogIn, UserPlus, HelpCircle, AlertCircle, RefreshCw, CheckCircle2, Loader2, Check, User, MessageSquare } from 'lucide-react';
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
import { loginUser, verifySecurityInfo, resetPassword, getStoredEmployees } from '@/lib/store';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { supabase } from '@/lib/supabase';

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
  
  // OTP Login State
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  
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

  // Initialize Recaptcha
  useEffect(() => {
    if (!recaptchaVerifier && useOtp) {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': () => {
                // reCAPTCHA solved, allow signInWithPhoneNumber.
            }
        });
        setRecaptchaVerifier(verifier);
    }
  }, [useOtp]);

  const handleLogin = async () => {
    setError('');
    
    if (!phone) {
        setError('يرجى ملء جميع الحقول');
        phoneRef.current?.focus();
        return;
    }

    if (!useOtp && !password) {
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

  const handleSendOtp = async () => {
      setError('');
      if (!phone || phone.length < 10) {
          setError('يرجى إدخال رقم جوال صحيح');
          return;
      }

      setLoading(true);
      try {
          // Format phone for Firebase: Remove leading 0, add +966
          let formattedPhone = phone;
          if (formattedPhone.startsWith('0')) {
              formattedPhone = formattedPhone.substring(1);
          }
          formattedPhone = `+966${formattedPhone}`;

          if (!recaptchaVerifier) return;

          const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
          setConfirmationResult(confirmation);
          setOtpSent(true);
          setLoading(false);
      } catch (err: any) {
          console.error("OTP Error:", err);
          setLoading(false);
          if (err.code === 'auth/invalid-phone-number') {
              setError('رقم الهاتف غير صحيح');
          } else if (err.code === 'auth/too-many-requests') {
              setError('محاولات كثيرة جداً، يرجى الانتظار قليلاً');
          } else {
              setError('فشل إرسال رمز التحقق: ' + err.message);
          }
      }
  };

  const handleVerifyOtp = async () => {
      if (!otpCode || !confirmationResult) return;
      setLoading(true);
      try {
          await confirmationResult.confirm();
          
          // OTP Verified - Now check if user exists in Supabase
          // We need to find the user by phone number
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone)
            .single();

          if (data) {
              // User exists, log them in manually
              // We reuse the logic from loginUser but bypass password check
              // Or we can just set the local storage if we replicate the logic
              
              // Replicate loginUser logic for session
              let expiry = null;
              let role = data.role || 'member';

              if (data.subscription_expiry) {
                  expiry = new Date(data.subscription_expiry).getTime();
                  if (role === 'golden' && expiry < Date.now()) {
                      role = 'member';
                  }
              }

              const user = {
                  id: data.id,
                  officeName: data.office_name,
                  phone: data.phone,
                  passwordHash: data.password_hash,
                  securityQuestion: data.security_question,
                  securityAnswer: data.security_answer,
                  createdAt: new Date(data.created_at).getTime(),
                  role: role as any,
                  subscriptionExpiry: expiry || undefined,
                  affiliateBalance: Number(data.affiliate_balance) || 0
              };
              
              // Also check for Golden Users list update
              if (role === 'golden' && expiry) {
                  const GOLDEN_USERS_KEY = 'moaqeb_golden_users_v2';
                  const stored = localStorage.getItem(GOLDEN_USERS_KEY);
                  const goldenUsers = stored ? JSON.parse(stored) : [];
                  if (!goldenUsers.find((u: any) => u.userId === user.id)) {
                      goldenUsers.push({ userId: user.id, expiry: expiry, userName: user.officeName });
                      localStorage.setItem(GOLDEN_USERS_KEY, JSON.stringify(goldenUsers));
                  }
              }

              localStorage.setItem('moaqeb_current_user_v1', JSON.stringify(user));
              navigate('/');
          } else {
              // Check if it's an employee (stored locally)
              const employees = getStoredEmployees();
              const emp = employees.find(e => e.phone === phone); // Employee phones are usually fake, but if they matched
              if (emp) {
                   localStorage.setItem('moaqeb_current_user_v1', JSON.stringify(emp));
                   navigate('/');
              } else {
                  setError('رقم الهاتف غير مسجل في النظام. يرجى تسجيل عضوية جديدة.');
                  setLoading(false);
              }
          }

      } catch (err) {
          console.error("Verify Error:", err);
          setError('رمز التحقق غير صحيح');
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#eef2f6] rounded-3xl shadow-3d p-8 border border-white/50 relative">
        
        {/* Recaptcha Container */}
        <div id="recaptcha-container"></div>

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
          <p className="text-gray-500 text-sm mt-1">تطبيق مان هويات</p>
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
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(val);
                    if(error) setError('');
                }}
                className={`bg-[#eef2f6] shadow-3d-inset border-none pl-10 h-12 ${error && !phone ? 'ring-2 ring-red-400' : ''}`}
                placeholder="05xxxxxxxx"
                disabled={otpSent}
              />
              <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {!useOtp ? (
              <div className="space-y-2 animate-in fade-in">
                <Label className="font-bold text-gray-600">كلمة المرور</Label>
                <div className="relative">
                  <Input 
                    ref={passwordRef}
                    type="password"
                    value={password}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 10 && /^[a-zA-Z0-9]*$/.test(val)) {
                            setPassword(val);
                            if(error) setError('');
                        }
                    }}
                    className={`bg-[#eef2f6] shadow-3d-inset border-none pl-10 h-12 ${error && !password ? 'ring-2 ring-red-400' : ''}`}
                    placeholder="••••••••"
                  />
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
          ) : (
              <div className="space-y-2 animate-in fade-in">
                  {otpSent && (
                      <>
                        <Label className="font-bold text-gray-600">رمز التحقق (OTP)</Label>
                        <div className="relative">
                            <Input 
                                type="text"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                className="bg-[#eef2f6] shadow-3d-inset border-none pl-10 h-12 text-center tracking-widest text-lg"
                                placeholder="------"
                            />
                            <MessageSquare className="absolute left-3 top-3.5 w-5 h-5 text-green-500" />
                        </div>
                      </>
                  )}
              </div>
          )}

          {!useOtp ? (
              <button 
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                دخول
              </button>
          ) : (
              <button 
                onClick={otpSent ? handleVerifyOtp : handleSendOtp}
                disabled={loading}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (otpSent ? 'تحقق ودخول' : 'إرسال رمز التحقق')}
              </button>
          )}

          <div className="flex justify-center mt-2">
              <button 
                onClick={() => { setUseOtp(!useOtp); setError(''); setOtpSent(false); setOtpCode(''); }}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                  {useOtp ? 'العودة لتسجيل الدخول بكلمة المرور' : 'تسجيل الدخول برمز التحقق (OTP)'}
              </button>
          </div>

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
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setRecPhone(val);
                                            }}
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
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val.length <= 10 && /^[\u0600-\u06FFa-zA-Z0-9\s]*$/.test(val)) setRecAnswer(val);
                                            }}
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
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val.length <= 10 && /^[a-zA-Z0-9]*$/.test(val)) setNewPass(val);
                                                }}
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
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val.length <= 10 && /^[a-zA-Z0-9]*$/.test(val)) setConfirmPass(val);
                                                }}
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

          {/* Guest Login Button */}
          <button 
            onClick={() => navigate('/')}
            className="w-full py-3 mt-4 bg-gray-200 text-gray-600 rounded-xl font-bold shadow-sm hover:bg-gray-300 transition-all flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" />
            دخول كضيف
          </button>
        </div>
      </div>

      {/* Footer Links Removed as requested */}
      <div className="mt-8 flex flex-col items-center gap-3 text-gray-500">
        <p className="text-[10px] opacity-60">جميع الحقوق محفوظة © 2025</p>
      </div>
    </div>
  );
}
