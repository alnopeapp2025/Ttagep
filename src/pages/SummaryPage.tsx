import { useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';

export default function SummaryPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600">
          <ArrowRight className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-800 text-shadow">الملخص</h1>
          <p className="text-gray-500">عرض سريع لأهم البيانات</p>
        </div>
      </header>

      <div className="bg-[#eef2f6] p-8 rounded-3xl shadow-3d border border-white/50 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-3d text-blue-600">
              <ClipboardList className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">صفحة الملخص</h3>
          <p className="text-gray-500">هذه الصفحة قيد التطوير حالياً.</p>
      </div>
    </div>
  );
}
