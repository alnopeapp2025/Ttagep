import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2, Phone, Lock, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DeleteDataPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    
    if (!phone || !password) {
      setError('يرجى تعبئة رقم الجوال وكلمة المرور');
      return;
    }

    setLoading(true);

    // محاكاة عملية إرسال الطلب للسيرفر
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#eef2f6] p-4 sm:p-8" dir="rtl">
      <div className="max-w-md mx-auto">
        <header className="mb-8 flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600 transition-all"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black text-gray-800 text-shadow">حذف بياناتي</h1>
        </header>

        <div className="bg-[#eef2f6] p-8 rounded-3xl shadow-3d border border-white/50 relative overflow-hidden">
            
            {success ? (
                <div className="flex flex-col items-center justify-center text-center py-10 animate-in zoom-in duration-300">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-3d border-4 border-green-50">
                        <CheckCircle2 className="w-12 h-12" strokeWidth={3} />
                    </div>
                    <h2 className="text-xl font-black text-green-700 mb-2">تم ارسال طلب الحذف بنجاح</h2>
                    <p className="text-gray-600 font-medium">
                        سيتم مراجعة الطلب وحذف حسابك وكافة البيانات المرتبطة به نهائياً خلال 24 ساعة.
                    </p>
                    <button 
                        onClick={() => navigate('/')}
                        className="mt-8 px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all shadow-sm"
                    >
                        عودة للرئيسية
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 shadow-inner">
                            <Trash2 className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-black text-gray-800 mb-2">طلب حذف الحساب والبيانات</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            لحذف حسابك وكافة البيانات المرتبطة به (المعاملات، العملاء، السجلات) من تطبيق المعقب المحاسبي نهائياً، يرجى تأكيد هويتك أدناه.
                        </p>
                        <p className="text-xs text-red-500 mt-2 font-bold">
                            تنبيه: هذا الإجراء لا يمكن التراجع عنه.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-gray-600">رقم الجوال المسجل</Label>
                            <div className="relative">
                                <Input 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="bg-[#eef2f6] shadow-3d-inset border-none pl-10 h-12"
                                    placeholder="05xxxxxxxx"
                                />
                                <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-gray-600">كلمة المرور</Label>
                            <div className="relative">
                                <Input 
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-[#eef2f6] shadow-3d-inset border-none pl-10 h-12"
                                    placeholder="••••••••"
                                />
                                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 animate-in fade-in">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button 
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full py-4 bg-red-600 text-white rounded-xl font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            تأكيد وحذف الحساب
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
