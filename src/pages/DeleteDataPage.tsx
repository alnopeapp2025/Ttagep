import { useNavigate } from 'react-router-dom';
import { ArrowRight, UserCheck, Mail } from 'lucide-react';

export default function DeleteDataPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#eef2f6] p-4 sm:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto text-center">
        <header className="mb-8 flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600 transition-all"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black text-gray-800 text-shadow">حذف بياناتي</h1>
        </header>

        <div className="bg-[#eef2f6] p-8 rounded-3xl shadow-3d border border-white/50 flex flex-col items-center">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 text-4xl shadow-inner">
                😢
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-4">حذف الحساب والبيانات</h2>
            <p className="text-gray-600 mb-6 max-w-md">
                يؤسفنا أنك تفكر في المغادرة. يرجى العلم أن حذف البيانات من التطبيق يمكن أن يتم يدوياً عبر إعدادات النظام (تصفير النظام). أما إذا كنت ترغب في حذف حسابك المسجل لدينا نهائياً، يرجى اتباع التعليمات أدناه.
            </p>

            <div className="bg-white p-6 rounded-2xl shadow-3d-inset w-full mb-6">
                <p className="text-sm text-gray-500 mb-3 font-bold">لإرسال طلب حذف البيانات نهائياً، يرجى التواصل معنا عبر البريد الإلكتروني:</p>
                <div className="flex items-center justify-center gap-2 text-blue-600 font-mono font-bold text-lg select-all bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <Mail className="w-5 h-5" />
                    Tageep2026@gmail.com
                </div>
            </div>

            <p className="text-xs text-gray-400">
                سيتم معالجة طلبك خلال 48 ساعة عمل.
            </p>
        </div>
      </div>
    </div>
  );
}
