import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, BookOpen, User, Plus, MessageCircle, Briefcase } from 'lucide-react';
import { 
    getStoredExtAgents, 
    saveStoredExtAgents,
    getStoredLessons, 
    ExternalAgent, Lesson,
    getGlobalSettings, getCurrentUser
} from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AchieversHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'numbers' | 'lessons'>('numbers');
  
  // Data State
  const [extAgents, setExtAgents] = useState<ExternalAgent[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // Form State
  const [openAgent, setOpenAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentWhatsapp, setNewAgentWhatsapp] = useState('');
  const [newAgentServices, setNewAgentServices] = useState('');

  // We keep these for consistency but don't use them for blocking anymore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [settings, setSettings] = useState(getGlobalSettings());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  useEffect(() => {
    setExtAgents(getStoredExtAgents());
    setLessons(getStoredLessons());
    setSettings(getGlobalSettings());
    setCurrentUser(getCurrentUser());
  }, []);

  const handleAddAgent = () => {
    if(!newAgentName || !newAgentPhone) return;
    
    const newAgent: ExternalAgent = {
        id: Date.now(),
        name: newAgentName,
        phone: newAgentPhone,
        whatsapp: newAgentWhatsapp,
        services: newAgentServices,
        createdAt: Date.now()
    };
    
    const updated = [newAgent, ...extAgents];
    setExtAgents(updated);
    saveStoredExtAgents(updated);
    
    setNewAgentName('');
    setNewAgentPhone('');
    setNewAgentWhatsapp('');
    setNewAgentServices('');
    setOpenAgent(false);
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

      {/* Content - Unlocked for Everyone */}
      {activeTab === 'numbers' ? (
        <div className="space-y-6">
            <Dialog open={openAgent} onOpenChange={setOpenAgent}>
                <DialogTrigger asChild>
                    <button className="w-full py-4 rounded-2xl bg-[#eef2f6] text-blue-600 font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all flex items-center justify-center gap-2">
                        <Plus className="w-5 h-5" />
                        أضف معقب منجز
                    </button>
                </DialogTrigger>
                <DialogContent className="bg-[#eef2f6] shadow-3d border-none" dir="rtl">
                    <DialogHeader><DialogTitle>إضافة معقب جديد</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>اسم المعقب</Label>
                            <Input value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} className="bg-white shadow-3d-inset border-none" />
                        </div>
                        <div className="space-y-2">
                            <Label>رقم الجوال (اتصال)</Label>
                            <Input value={newAgentPhone} onChange={(e) => setNewAgentPhone(e.target.value)} className="bg-white shadow-3d-inset border-none" placeholder="05xxxxxxxx" />
                        </div>
                        <div className="space-y-2">
                            <Label>رقم الواتساب</Label>
                            <Input value={newAgentWhatsapp} onChange={(e) => setNewAgentWhatsapp(e.target.value)} className="bg-white shadow-3d-inset border-none" placeholder="05xxxxxxxx" />
                        </div>
                        <div className="space-y-2">
                            <Label>الخدمات التي يقدمها</Label>
                            <Textarea value={newAgentServices} onChange={(e) => setNewAgentServices(e.target.value)} className="bg-white shadow-3d-inset border-none min-h-[80px]" placeholder="اكتب الخدمات هنا..." />
                        </div>
                        <button onClick={handleAddAgent} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">حفظ</button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extAgents.map(agent => (
                    <div key={agent.id} className="bg-[#eef2f6] p-4 rounded-2xl shadow-3d border border-white/50 relative">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{agent.name}</h3>
                                    {agent.services && (
                                        <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-500 bg-white/50 p-2 rounded-lg">
                                            <Briefcase className="w-3 h-3 mt-0.5 shrink-0" />
                                            <p className="leading-relaxed">{agent.services}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4 justify-end">
                             {agent.phone && (
                                <a 
                                    href={`tel:${agent.phone}`}
                                    className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-3d hover:scale-110 transition-transform"
                                >
                                    <Phone className="w-5 h-5" />
                                </a>
                             )}
                             {agent.whatsapp && (
                                <a 
                                    href={`https://wa.me/${agent.whatsapp.startsWith('0') ? '966' + agent.whatsapp.substring(1) : agent.whatsapp}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-3d hover:scale-110 transition-transform"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                </a>
                             )}
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
      )}
    </div>
  );
}
