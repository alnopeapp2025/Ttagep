import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#eef2f6] p-4 sm:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600 transition-all"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black text-gray-800 text-shadow">سياسة الخصوصية</h1>
        </header>

        <div className="bg-[#eef2f6] p-8 rounded-3xl shadow-3d border border-white/50 space-y-6 text-gray-700 leading-relaxed">
            <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-3d">
                    <Shield className="w-10 h-10" />
                </div>
            </div>
            
            <p>نحن في نظام المعقب المحاسبي نولي اهتماماً كبيراً لخصوصية بياناتك. توضح هذه السياسة كيفية تعاملنا مع البيانات.</p>
            
            <div>
                <h4 className="font-bold text-gray-900 mb-2">1. جمع البيانات</h4>
                <p className="text-sm">يتم تخزين جميع البيانات (المعاملات، العملاء، الحسابات) محلياً على جهازك (Local Storage). نحن لا نقوم برفع أي بيانات لسيرفرات خارجية بشكل افتراضي إلا في حال تفعيل المزامنة السحابية الاختيارية.</p>
            </div>

            <div>
                <h4 className="font-bold text-gray-900 mb-2">2. استخدام البيانات</h4>
                <p className="text-sm">تستخدم البيانات فقط لغرض إدارة حساباتك وعرض التقارير داخل التطبيق. لا يتم مشاركة بياناتك مع أي طرف ثالث.</p>
            </div>

            <div>
                <h4 className="font-bold text-gray-900 mb-2">3. أمان البيانات</h4>
                <p className="text-sm">أنت المسؤول عن حماية جهازك. نوصي بعمل نسخ احتياطية دورية باستخدام ميزة النسخ الاحتياطي في التطبيق لضمان عدم فقدان البيانات.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
