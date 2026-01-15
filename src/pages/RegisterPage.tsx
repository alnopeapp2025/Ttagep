import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Phone, Lock, UserPlus, ArrowRight, HelpCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerUser } from '@/lib/store';

const securityQuestions = [
  "اين ولدت والدتك؟",
  "ماهو اقرب صديق لك؟",
  "متي تزوجت؟",
  "ماهي الهواية المفضله؟",
  "مدينة في السعوديه اقرب لقلبك؟",
  "ما وجبتك المفضلة؟"
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    officeName: '',
    phone: '',
    password: '',
    securityQuestion: '',
    securityAnswer: ''
  });

  const handleRegister = async () => {
    // Strict Validation
    if (!formData.officeName || !formData.phone || !formData.password || !formData.securityQuestion || !formData.securityAnswer) {
      alert('يرجى ملء جميع الحقول المطلوبة (بما في ذلك سؤال الأمان وإجابته)');
      return;
    }

    setLoading(true);
    
    try {
        const result = await registerUser({
            officeName: formData.officeName,
            phone: formData.phone,
            password: formData.password,
            securityQuestion: formData.securityQuestion,
            securityAnswer: formData.securityAnswer
        });

        if (result.success) {
            // Redirect to Login with Auto-fill Data
            navigate('/login', { 
                state: { 
                    phone: formData.phone, 
                    password: formData.password,
                    registeredSuccess: true 
                } 
            });
        } else {
            alert(result.message || 'فشل التسجيل');
        }
    } catch (error) {
        alert('حدث خطأ غير متوقع');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#eef2f6] rounded-3xl shadow-3d p-8 border border-white/50 relative">
        
        <button 
          onClick={() => navigate('/login')}
          className="absolute top-6 right-6 p-2 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-500"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="text-center mb-8 mt-4">
          <div className="w-20 h-20 bg-gray-700 rounded-2xl mx-auto shadow-3d flex items-center justify-center mb-4">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-800 text-shadow">عضوية جديدة</h1>
          <p className="text-gray-500 text-sm mt-1">انضم لنظام المعقب المحاسبي</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold text-gray-600">اسم المكتب <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input 
                value={formData.officeName}
                onChange={(e) => setFormData({...formData, officeName: e.target.value})}
                className="bg-[#eef2f6] shadow-3d-inset border-none pl-10 h-12"
                placeholder="أدخل اسم المكتب"
              />
              <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-gray-600">رقم الجوال <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="bg-[#eef2f6] shadow-3d-inset border-none pl-10 h-12"
                placeholder="05xxxxxxxx"
              />
              <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-gray-600">كلمة المرور <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input 
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="bg-[#eef2f6] shadow-3d-inset border-none pl-10 h-12"
                placeholder="••••••••"
              />
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-gray-600">سؤال الأمان <span className="text-red-500">*</span></Label>
            <Select 
              onValueChange={(val) => setFormData({...formData, securityQuestion: val})}
            >
              <SelectTrigger className="bg-[#eef2f6] shadow-3d-inset border-none h-12 text-right flex-row-reverse">
                <SelectValue placeholder="اختر سؤالاً..." />
              </SelectTrigger>
              <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                {securityQuestions.map((q) => (
                  <SelectItem key={q} value={q} className="text-right cursor-pointer my-1">{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <Label className="font-bold text-gray-600">إجابة السؤال <span className="text-red-500">*</span></Label>
            <div className="relative">
            <Input 
                value={formData.securityAnswer}
                onChange={(e) => setFormData({...formData, securityAnswer: e.target.value})}
                className="bg-[#eef2f6] shadow-3d-inset border-none pl-10 h-12"
                placeholder="اكتب إجابتك هنا"
            />
            <HelpCircle className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <button 
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            تسجيل العضوية
          </button>
        </div>
      </div>
    </div>
  );
}
