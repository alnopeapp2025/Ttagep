import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DeleteDataPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) return;
    
    setLoading(true);
    // Simulate API call
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
          <h1 className="text-2xl font-black text-gray-800 text-shadow">حذف البيانات</h1>
        </header>

        <div className="bg-[#eef2f6] p-8 rounded-3xl shadow-3d border border-white/50 relative overflow-hidden">
            {success ? (
                <div className="text-center py-10 animate-in zoom-in">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-3d text-green-600">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">تم استلام طلبك بنجاح</h3>
                    <p className="text-gray-500 mb-6">سيتم حذف حسابك وجميع البيانات المرتبطة به نهائياً خلال 24 ساعة.</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
                    >
                        عودة للرئيسية
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-3d text-red-600">
                            <Trash2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">طلب حذف الحساب</h3>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                            لحذف بياناتك وحسابك من تطبيق مان هويات لمكاتب الخدمات، يرجى تعبئة النموذج أدناه لتأكيد هويتك.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>رقم الجوال</Label>
                            <Input 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="05xxxxxxxx"
                                className="bg-white shadow-3d-inset border-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>كلمة المرور</Label>
                            <Input 
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-white shadow-3d-inset border-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex gap-3 items-start">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-700 font-bold">
                            تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم فقدان جميع سجلات المعاملات والعملاء.
                        </p>
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إرسال طلب الحذف'}
                    </button>
                    
                    <div className="text-center pt-4 border-t border-gray-200">
                        <p className="text-[10px] text-gray-400">تطبيق مان هويات لمكاتب الخدمات</p>
                        <p className="text-[10px] text-gray-400">المطور: ELTAIB HAMED ELTAIB</p>
                        <a href="/privacy-policy" className="text-[10px] text-blue-500 underline mt-1 block">سياسة الخصوصية</a>
                    </div>
                </form>
            )}
        </div>
      </div>
    </div>
  );
}
