import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, BookOpen, User, Lock } from 'lucide-react';
import { 
    getStoredExtAgents, 
    getStoredLessons, 
    ExternalAgent, Lesson,
    getGlobalSettings, getCurrentUser
} from '@/lib/store';

export default function AchieversHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'numbers' | 'lessons'>('numbers');
  
  // Data State
  const [extAgents, setExtAgents] = useState<ExternalAgent[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [settings, setSettings] = useState(getGlobalSettings());
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  useEffect(() => {
    setExtAgents(getStoredExtAgents());
    setLessons(getStoredLessons());
    setSettings(getGlobalSettings());
    setCurrentUser(getCurrentUser());
  }, []);

  // Permission Check
  const canAccessFeature = (feature: 'achieversNumbers' | 'lessons') => {
    const role = currentUser?.role || 'visitor';
    // @ts-ignore
    return settings.featurePermissions[feature].includes(role);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600">
          <ArrowRight className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-800 text-shadow">مركز المنجزين</h1>
          <p className="text-gray-500">أرقام المعقبين ودروس الخدمات العامة</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-[#eef2f6] p-1 rounded-2xl shadow-3d-inset mb-8">
        <button 
            onClick={() => setActiveTab('numbers')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'numbers' ? 'bg-white shadow-3d text-blue-600' : 'text-gray-500'}`}
        >
            <Phone className="w-5 h-5" />
            أرقام معقبين منجزين
        </button>
        <button 
            onClick={() => setActiveTab('lessons')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'lessons' ? 'bg-white shadow-3d text-orange-600' : 'text-gray-500'}`}
        >
            <BookOpen className="w-5 h-5" />
            تعلم الخدمات العامة
        </button>
      </div>

      {/* Content */}
      {activeTab === 'numbers' ? (
        canAccessFeature('achieversNumbers') ? (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {extAgents.map(agent => (
                        <div key={agent.id} className="bg-[#eef2f6] p-4 rounded-2xl shadow-3d border border-white/50 flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-sm">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{agent.name}</h3>
                                <p className="text-gray-500 text-sm font-mono" dir="ltr">{agent.phone}</p>
                            </div>
                        </div>
                    ))}
                    {extAgents.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-400">
                            لا توجد أرقام معقبين حالياً.
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="text-center py-12 bg-[#eef2f6] rounded-3xl shadow-3d border border-white/50">
                <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-600">هذا المحتوى غير متاح لعضويتك</h3>
                <p className="text-gray-500 mt-2">يرجى الترقية للعضوية الذهبية للوصول</p>
            </div>
        )
      ) : (
        canAccessFeature('lessons') ? (
            <div className="space-y-6">
                <div className="space-y-4">
                    {lessons.map(lesson => (
                        <div key={lesson.id} className="bg-[#eef2f6] p-6 rounded-2xl shadow-3d border border-white/50">
                            <div className="flex items-center gap-3 mb-3">
                                <BookOpen className="w-5 h-5 text-orange-600" />
                                <h3 className="font-bold text-gray-800 text-lg">{lesson.title}</h3>
                            </div>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{lesson.content}</p>
                            <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-400">
                                تم النشر: {new Date(lesson.createdAt).toLocaleDateString('ar-SA')}
                            </div>
                        </div>
                    ))}
                    {lessons.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            لا توجد دروس حالياً.
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="text-center py-12 bg-[#eef2f6] rounded-3xl shadow-3d border border-white/50">
                <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-600">هذا المحتوى غير متاح لعضويتك</h3>
                <p className="text-gray-500 mt-2">يرجى الترقية للعضوية الذهبية للوصول</p>
            </div>
        )
      )}
    </div>
  );
}
