import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, Plus, Search, Filter, Phone, MessageCircle, Briefcase, MapPin, Crown, CheckCircle2, Loader2, X } from 'lucide-react';
import { 
    getCurrentUser, User, 
    SAUDI_CITIES, 
    addOfficeListingToCloud, 
    fetchOfficeListingsFromCloud, 
    OfficeListing 
} from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/lib/supabase';

// --- Vertical Service Ticker Component ---
const VerticalServiceTicker = ({ services }: { services: string[] }) => {
    const [topIndex, setTopIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isRed, setIsRed] = useState(true);

    useEffect(() => {
        if (!services || services.length === 0) return;

        // Timer 1: Hold Red for 3s
        const timer1 = setTimeout(() => {
            setIsRed(false); // Revert to original color
            
            // Start Transition (Move Down)
            setIsTransitioning(true);

            // Timer 2: End Transition after 1s (Movement Duration)
            const timer2 = setTimeout(() => {
                setTopIndex(prev => (prev + 1) % services.length);
                setIsTransitioning(false);
                setIsRed(true); // Reset to Red for the new item
            }, 1000); 

            return () => clearTimeout(timer2);

        }, 3000); // 3 Seconds Hold

        return () => clearTimeout(timer1);
    }, [topIndex, services.length]);

    if (!services || services.length === 0) return null;

    // Helper to get cyclic service
    const getS = (offset: number) => {
        let idx = topIndex + offset;
        while(idx < 0) idx += services.length;
        return services[idx % services.length];
    };

    return (
        <div className="h-24 overflow-hidden relative bg-yellow-100/50 rounded-xl border border-yellow-200 mb-6">
            <div 
                className={`absolute w-full flex flex-col transition-transform duration-1000 ease-in-out ${isTransitioning ? 'translate-y-8' : 'translate-y-0'}`}
                style={{ top: '-2rem' }} // Shift up by 1 unit so Incoming is hidden initially
            >
                {/* Incoming (Next Top) - Always Red */}
                <div className="h-8 flex items-center px-4 font-bold text-xs text-red-600 truncate">
                    <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" />
                    {getS(1)}
                </div>
                
                {/* Current Top - Red then Normal */}
                <div className={`h-8 flex items-center px-4 font-bold text-xs truncate transition-colors duration-300 ${isRed && !isTransitioning ? 'text-red-600' : 'text-yellow-800'}`}>
                    <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" />
                    {getS(0)}
                </div>

                {/* Current Mid - Normal */}
                <div className="h-8 flex items-center px-4 font-bold text-xs text-yellow-800 truncate">
                    <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" />
                    {getS(-1)}
                </div>

                {/* Current Bot - Normal */}
                <div className="h-8 flex items-center px-4 font-bold text-xs text-yellow-800 truncate">
                    <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" />
                    {getS(-2)}
                </div>
            </div>
        </div>
    );
};

export default function SummaryPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [listings, setListings] = useState<OfficeListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('all');

  // Form State
  const [formData, setFormData] = useState({
      officeName: '',
      phone: '',
      whatsapp: '',
      workType: 'office',
      city: '',
      services: [] as string[],
      newService: ''
  });

  useEffect(() => {
      const user = getCurrentUser();
      setCurrentUser(user);
      loadListings();

      // Realtime subscription
      const channel = supabase
        .channel('public-offices-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'public_offices' }, () => {
            loadListings();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, []);

  const loadListings = async () => {
      const data = await fetchOfficeListingsFromCloud();
      setListings(data);
  };

  const handleAddService = () => {
      if (!formData.newService.trim()) return;
      
      const role = currentUser?.role || 'visitor';
      const limit = role === 'golden' ? 50 : 20;
      
      if (formData.services.length >= limit) {
          alert(`عفواً، الحد الأقصى للخدمات هو ${limit}. ${role !== 'golden' ? 'رقي حسابك للذهبي لإضافة المزيد.' : ''}`);
          return;
      }

      setFormData(prev => ({
          ...prev,
          services: [...prev.services, prev.newService.trim().substring(0, 20)], // Max 20 chars per service
          newService: ''
      }));
  };

  const handleRemoveService = (index: number) => {
      setFormData(prev => ({
          ...prev,
          services: prev.services.filter((_, i) => i !== index)
      }));
  };

  const handleSubmit = async () => {
      if (!currentUser || !currentUser.id) {
          alert('يرجى تسجيل الدخول أولاً');
          return;
      }
      if (!formData.officeName || !formData.phone || !formData.whatsapp) {
          alert('يرجى ملء البيانات الأساسية');
          return;
      }
      
      // WhatsApp Validation
      if (!formData.whatsapp.startsWith('5') || formData.whatsapp.length !== 9) {
          alert('رقم الواتساب يجب أن يبدأ بـ 5 ويتكون من 9 أرقام');
          return;
      }

      setLoading(true);
      
      const newListing: OfficeListing = {
          id: Date.now(), // Temp ID
          userId: currentUser.id,
          officeName: formData.officeName,
          phone: formData.phone,
          whatsapp: `https://wa.me/966${formData.whatsapp}`,
          workType: formData.workType as 'online' | 'office',
          city: formData.workType === 'office' ? formData.city : undefined,
          services: formData.services,
          isGolden: currentUser.role === 'golden',
          createdAt: Date.now()
      };

      const result = await addOfficeListingToCloud(newListing);
      
      if (result.success) {
          setAddOpen(false);
          setFormData({
              officeName: '',
              phone: '',
              whatsapp: '',
              workType: 'office',
              city: '',
              services: [],
              newService: ''
          });
          alert('تم إضافة مكتبك بنجاح!');
      } else {
          alert('فشل إضافة المكتب: ' + (result.message || 'خطأ غير معروف'));
      }
      setLoading(false);
  };

  const filteredListings = listings.filter(l => {
      const matchesSearch = l.officeName.includes(searchTerm) || l.services.some(s => s.includes(searchTerm));
      const matchesCity = filterCity === 'all' || l.city === filterCity;
      return matchesSearch && matchesCity;
  });

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600 transition-all">
            <ArrowRight className="w-6 h-6" />
            </button>
            <div>
            <h1 className="text-3xl font-black text-gray-800 text-shadow">دليل المكاتب والخدمات</h1>
            <p className="text-gray-500">تصفح أفضل مكاتب الخدمات والمعقبين</p>
            </div>
        </div>
        
        {currentUser ? (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">أضف مكتبك هنا</span>
                    </button>
                </DialogTrigger>
                <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader><DialogTitle className="text-center font-black text-xl text-gray-800">إضافة مكتب جديد</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>اسم المكتب (حد أقصى 29 حرف)</Label>
                            <Input 
                                value={formData.officeName} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length <= 29 && /^[\u0600-\u06FFa-zA-Z\s]*$/.test(val)) setFormData({...formData, officeName: val});
                                }} 
                                className="bg-white shadow-3d-inset border-none" 
                                placeholder="اسم المكتب..." 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>رقم الاتصال</Label>
                                <Input 
                                    value={formData.phone} 
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setFormData({...formData, phone: val});
                                    }} 
                                    className="bg-white shadow-3d-inset border-none" 
                                    placeholder="05xxxxxxxx" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>رقم الواتساب (9 أرقام يبدأ بـ 5)</Label>
                                <div className="relative" dir="ltr">
                                    <span className="absolute left-3 top-3.5 text-gray-400 text-xs font-bold">+966</span>
                                    <Input type="tel" maxLength={9} value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g,'')})} className="bg-white shadow-3d-inset border-none pl-12" placeholder="5xxxxxxxx" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>طبيعة العمل</Label>
                            <div className="flex bg-white p-1 rounded-xl shadow-3d-inset">
                                <button onClick={() => setFormData({...formData, workType: 'office'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.workType === 'office' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'text-gray-500'}`}>عبر مكتب</button>
                                <button onClick={() => setFormData({...formData, workType: 'online'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.workType === 'online' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'text-gray-500'}`}>أون لاين</button>
                            </div>
                        </div>

                        {formData.workType === 'office' && (
                            <div className="space-y-2 animate-in fade-in">
                                <Label>المدينة</Label>
                                <Select onValueChange={(val) => setFormData({...formData, city: val})} value={formData.city}>
                                    <SelectTrigger className="bg-white shadow-3d-inset border-none h-12 text-right flex-row-reverse"><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                                    <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                                        {SAUDI_CITIES.map(city => <SelectItem key={city} value={city} className="text-right">{city}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>الخدمات ({formData.services.length}/{currentUser.role === 'golden' ? 50 : 20})</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={formData.newService} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.length <= 20 && /^[\u0600-\u06FFa-zA-Z\s]*$/.test(val)) setFormData({...formData, newService: val});
                                    }} 
                                    className="bg-white shadow-3d-inset border-none" 
                                    placeholder="اسم الخدمة (20 حرف)" 
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddService()}
                                />
                                <button onClick={handleAddService} className="bg-green-600 text-white p-3 rounded-xl shadow-lg hover:bg-green-700"><Plus className="w-5 h-5" /></button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.services.map((s, i) => (
                                    <span key={i} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-gray-600 shadow-sm flex items-center gap-2">
                                        {s}
                                        <button onClick={() => handleRemoveService(i)} className="text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 mt-4 disabled:opacity-70">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'حفظ ونشر المكتب'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        ) : (
            <button onClick={() => navigate('/register')} className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-xl font-bold shadow-lg hover:bg-gray-900 transition-all">
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">سجل لإضافة مكتبك</span>
            </button>
        )}
      </header>

      {/* Search & Filter */}
      <div className="bg-[#eef2f6] p-4 rounded-3xl shadow-3d border border-white/50 mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
              <Search className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white shadow-3d-inset border-none h-12 pr-12" 
                placeholder="ابحث عن اسم مكتب أو خدمة..." 
              />
          </div>
          <div className="w-full md:w-64">
            <Select onValueChange={setFilterCity} value={filterCity}>
                <SelectTrigger className="bg-white shadow-3d-inset border-none h-12 text-right flex-row-reverse">
                    <div className="flex items-center gap-2 text-gray-500">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm">{filterCity === 'all' ? 'كل المدن' : filterCity}</span>
                    </div>
                </SelectTrigger>
                <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                    <SelectItem value="all" className="text-right font-bold">كل المدن</SelectItem>
                    {SAUDI_CITIES.map(city => <SelectItem key={city} value={city} className="text-right">{city}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map(listing => (
              <div 
                key={listing.id} 
                className={`relative overflow-hidden rounded-3xl p-6 transition-all hover:-translate-y-1 duration-300 ${
                    listing.isGolden 
                    ? 'bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-400 shadow-3d' 
                    : 'bg-[#eef2f6] shadow-3d border border-white/50'
                }`}
              >
                  {listing.isGolden && (
                      <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1 rounded-br-xl flex items-center gap-1 shadow-sm z-10">
                          <Crown className="w-3 h-3" />
                          مكتب مميز
                      </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                      <div>
                          <h3 className={`font-black text-xl mb-1 ${listing.isGolden ? 'text-yellow-800' : 'text-gray-800'}`}>
                              {listing.officeName}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                              {listing.workType === 'online' ? (
                                  <span className="flex items-center gap-1 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg"><Briefcase className="w-3 h-3" /> أون لاين</span>
                              ) : (
                                  <span className="flex items-center gap-1 bg-gray-200 text-gray-600 px-2 py-0.5 rounded-lg"><MapPin className="w-3 h-3" /> {listing.city}</span>
                              )}
                          </div>
                      </div>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm text-white font-bold text-lg ${listing.isGolden ? 'bg-yellow-500' : 'bg-gray-400'}`}>
                          {listing.officeName.charAt(0)}
                      </div>
                  </div>

                  {/* Vertical Services Ticker for Golden */}
                  {listing.isGolden ? (
                      <VerticalServiceTicker services={listing.services} />
                  ) : (
                      <div className="mb-6 flex flex-wrap gap-2">
                          {listing.services.slice(0, 3).map((s, i) => (
                              <span key={i} className="text-[10px] bg-white px-2 py-1 rounded-lg text-gray-600 border border-gray-100">{s}</span>
                          ))}
                          {listing.services.length > 3 && <span className="text-[10px] text-gray-400">+{listing.services.length - 3}</span>}
                      </div>
                  )}

                  <div className="flex gap-3 mt-auto">
                      <a 
                        href={`tel:${listing.phone}`} 
                        className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${listing.isGolden ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}
                      >
                          <Phone className="w-4 h-4" /> اتصال
                      </a>
                      <a 
                        href={listing.whatsapp} 
                        target="_blank"
                        className="flex-1 py-2 bg-green-500 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-md hover:bg-green-600 transition-all"
                      >
                          <MessageCircle className="w-4 h-4" /> واتساب
                      </a>
                  </div>
              </div>
          ))}
      </div>

      {/* Upgrade CTA for Regular Members */}
      {currentUser && currentUser.role !== 'golden' && (
          <div className="mt-12 text-center bg-gradient-to-r from-yellow-50 to-white p-8 rounded-3xl shadow-3d border border-yellow-200">
              <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
              <h2 className="text-2xl font-black text-yellow-800 mb-2">ميز مكتبك واجذب المزيد من العملاء</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">احصل على تصميم ذهبي مميز، ظهور في أعلى القائمة، وإمكانية إضافة حتى 50 خدمة لتصل لعملاء أكثر.</p>
              <button 
                onClick={() => navigate('/?openPro=true')}
                className="px-8 py-3 bg-yellow-500 text-white rounded-xl font-bold shadow-lg hover:bg-yellow-600 transition-all transform hover:-translate-y-1"
              >
                  الترقية للعضوية الذهبية
              </button>
          </div>
      )}
    </div>
  );
}
