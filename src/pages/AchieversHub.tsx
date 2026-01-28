import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, BookOpen, User, Plus, MessageCircle, Edit, UserPlus, Lock, Crown, X } from 'lucide-react';
import { 
    getStoredExtAgents, 
    saveStoredExtAgents,
    getStoredLessons, 
    ExternalAgent, Lesson,
    getGlobalSettings, getCurrentUser, User
} from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  
  // Services Tags State
  const [services, setServices] = useState<string[]>([]);
  const [newServiceInput, setNewServiceInput] = useState('');

  // Premium Alert State
  const [showPremiumAlert, setShowPremiumAlert] = useState(false);

  // User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myAgentId, setMyAgentId] = useState<number | null>(null);

  useEffect(() => {
    // Load Data safely
    try {
        const loadedAgents = getStoredExtAgents() || [];
        setExtAgents(loadedAgents);
        setLessons(getStoredLessons() || []);
        
        const user = getCurrentUser();
        setCurrentUser(user);

        // Check if current user already has an agent entry
        if (user) {
            const myAgent = loadedAgents.find(a => a.userId === user.id);
            if (myAgent) {
                setMyAgentId(myAgent.id);
            }
        }
    } catch (e) {
        console.error("Error loading AchieversHub data", e);
    }
  }, []);

  const handleAddService = () => {
      if (!newServiceInput.trim()) return;
      if (services.length >= 9) return; // Max 9
      
      setServices([...services, newServiceInput.trim()]);
      setNewServiceInput('');
  };

  const handleRemoveService = (index: number) => {
      setServices(services.filter((_, i) => i !== index));
  };

  const handleSaveAgent = () => {
    if(!newAgentName || !newAgentPhone || !currentUser) return;
    
    // Check if updating existing
    if (myAgentId) {
        const updatedAgents = extAgents.map(a => {
            if (a.id === myAgentId) {
                return {
                    ...a,
                    name: newAgentName,
                    phone: newAgentPhone,
                    whatsapp: newAgentWhatsapp,
                    services: services
                };
            }
            return a;
        });
        setExtAgents(updatedAgents);
        saveStoredExtAgents(updatedAgents);
    } else {
        // Create New
        const newAgent: ExternalAgent = {
            id: Date.now(),
            userId: currentUser.id,
            name: newAgentName,
            phone: newAgentPhone,
            whatsapp: newAgentWhatsapp,
            services: services,
            createdAt: Date.now()
        };
        const updated = [newAgent, ...extAgents];
        setExtAgents(updated);
        saveStoredExtAgents(updated);
        setMyAgentId(newAgent.id);
    }
    
    setOpenAgent(false);
  };

  const openAddModal = () => {
      if (!currentUser) {
          navigate('/login'); // Redirect visitors
          return;
      }

      // Pre-fill if editing
      if (myAgentId) {
          const myAgent = extAgents.find(a => a.id === myAgentId);
          if (myAgent) {
              setNewAgentName(myAgent.name);
              setNewAgentPhone(myAgent.phone);
              setNewAgentWhatsapp(myAgent.whatsapp || '');
              setServices(myAgent.services || []);
          }
      } else {
          // Reset for new
          setNewAgentName(currentUser.officeName.substring(0, 27)); // Auto-fill name
          setNewAgentPhone(currentUser.phone);
          setNewAgentWhatsapp('');
          setServices([]);
      }
      setOpenAgent(true);
  };

  // Check if user has access (Golden or Employee)
  const isGolden = currentUser?.role === 'golden' || currentUser?.role === 'employee';

  const handleContactClick = (type: 'phone' | 'whatsapp', value: string, agentUserId?: number) => {
      // Allow if Golden OR if it's my own card
      const isMyCard = currentUser && agentUserId === currentUser.id;
      
      if (!isGolden && !isMyCard) {
          setShowPremiumAlert(true);
          return;
      }

      if (type === 'phone') {
          window.location.href = `tel:${value}`;
      } else {
          const number = value.startsWith('0') ? '966' + value.substring(1) : value;
          window.open(`https://wa.me/${number}`, '_blank');
      }
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
        <div className="space-y-6">
            
            {/* Add/Edit Button */}
            <Dialog open={openAgent} onOpenChange={setOpenAgent}>
                <button 
                    onClick={openAddModal}
                    className={`w-full py-4 rounded-2xl font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all flex items-center justify-center gap-2 ${myAgentId ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-[#eef2f6] text-blue-600'}`}
                >
                    {myAgentId ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    {myAgentId ? 'تعديل بياناتي كمعقب' : 'أضف نفسك كمعقب منجز'}
                </button>
                
                <DialogContent className="bg-[#eef2f6] shadow-3d border-none max-w-md" dir="rtl">
                    <DialogHeader><DialogTitle>{myAgentId ? 'تعديل بياناتي' : 'إضافة نفسي كمعقب'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>الاسم (27 حرف كحد أقصى)</Label>
                            <Input 
                                value={newAgentName} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if(val.length <= 27) setNewAgentName(val);
                                }} 
                                className="bg-white shadow-3d-inset border-none" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>رقم الجوال (اتصال)</Label>
                            <Input value={newAgentPhone} onChange={(e) => setNewAgentPhone(e.target.value)} className="bg-white shadow-3d-inset border-none" placeholder="05xxxxxxxx" />
                        </div>
                        <div className="space-y-2">
                            <Label>رقم الواتساب</Label>
                            <Input value={newAgentWhatsapp} onChange={(e) => setNewAgentWhatsapp(e.target.value)} className="bg-white shadow-3d-inset border-none" placeholder="05xxxxxxxx" />
                        </div>
                        
                        {/* Services Tags Input */}
                        <div className="space-y-2">
                            <Label>الخدمات ({services.length}/9)</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={newServiceInput} 
                                    onChange={(e) => setNewServiceInput(e.target.value)} 
                                    className="bg-white shadow-3d-inset border-none" 
                                    placeholder="اكتب الخدمة..." 
                                    disabled={services.length >= 9}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddService()}
                                />
                                <button 
                                    onClick={handleAddService}
                                    disabled={services.length >= 9}
                                    className="bg-green-600 text-white p-3 rounded-xl shadow-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {services.map((s, i) => (
                                    <span key={i} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-gray-600 shadow-sm flex items-center gap-2">
                                        {s}
                                        <button onClick={() => handleRemoveService(i)} className="text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleSaveAgent} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg mt-2">حفظ البيانات</button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extAgents.map(agent => {
                    const isMyCard = currentUser && agent.userId === currentUser.id;
                    const canAccess = isGolden || isMyCard;

                    return (
                        <div key={agent.id} className={`p-4 rounded-2xl shadow-3d border relative transition-all ${isMyCard ? 'bg-blue-50 border-blue-200' : 'bg-[#eef2f6] border-white/50'}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 w-full">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div className="w-full">
                                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            {agent.name}
                                            {isMyCard && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">أنا</span>}
                                        </h3>
                                        
                                        {/* Services Tags Display */}
                                        {agent.services && agent.services.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {agent.services.map((s, idx) => (
                                                    <span key={idx} className="text-[10px] font-bold bg-white text-gray-600 px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Contact Buttons */}
                            <div className="flex gap-2 mt-4 justify-end">
                                 {agent.phone && (
                                    <button 
                                        onClick={() => handleContactClick('phone', agent.phone, agent.userId)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-3d transition-all relative ${
                                            canAccess 
                                            ? 'bg-blue-100 text-blue-600 hover:scale-110' 
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-80'
                                        }`}
                                    >
                                        <Phone className="w-5 h-5" />
                                        {!canAccess && (
                                            <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                                                <Lock className="w-3 h-3 text-yellow-500" />
                                            </div>
                                        )}
                                    </button>
                                 )}
                                 {agent.whatsapp && (
                                    <button 
                                        onClick={() => handleContactClick('whatsapp', agent.whatsapp!, agent.userId)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-3d transition-all relative ${
                                            canAccess 
                                            ? 'bg-green-100 text-green-600 hover:scale-110' 
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-80'
                                        }`}
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        {!canAccess && (
                                            <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                                                <Lock className="w-3 h-3 text-yellow-500" />
                                            </div>
                                        )}
                                    </button>
                                 )}
                            </div>
                        </div>
                    );
                })}
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

      {/* Premium Feature Alert Modal */}
      <Dialog open={showPremiumAlert} onOpenChange={setShowPremiumAlert}>
        <DialogContent className="bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-400 shadow-3d rounded-3xl max-w-sm" dir="rtl">
            <DialogHeader>
                <DialogTitle className="text-center text-xl font-black text-yellow-800 flex items-center justify-center gap-2">
                    <Crown className="w-6 h-6 text-yellow-600" />
                    ميزة ذهبية
                </DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2 text-yellow-600 shadow-inner">
                    <Lock className="w-8 h-8" />
                </div>
                <p className="text-gray-700 font-bold">
                    التواصل المباشر مع المعقبين المنجزين متاح فقط للأعضاء الذهبيين.
                </p>
                <p className="text-xs text-gray-500">
                    رقي حسابك الآن واحصل على وصول كامل لأرقام أفضل المعقبين، بالإضافة لتقارير متقدمة وحدود لا نهائية.
                </p>
                <button 
                    onClick={() => { setShowPremiumAlert(false); navigate('/?openPro=true'); }}
                    className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                    <Crown className="w-5 h-5" />
                    الترقية للعضوية الذهبية
                </button>
                <button 
                    onClick={() => setShowPremiumAlert(false)}
                    className="text-sm text-gray-400 hover:text-gray-600 font-medium"
                >
                    إغلاق
                </button>
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
