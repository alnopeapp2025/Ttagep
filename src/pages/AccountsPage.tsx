import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet, Trash2, Landmark, ArrowLeftRight, Check, AlertCircle } from 'lucide-react';
import { 
  BANKS_LIST, 
  getStoredBalances, 
  saveStoredBalances, 
  getStoredPendingBalances, 
  saveStoredPendingBalances,
  getCurrentUser,
  fetchAccountsFromCloud,
  updateAccountInCloud,
  User,
  getGlobalSettings,
  GlobalSettings
} from '@/lib/store';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AccountsPage() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [pendingBalances, setPendingBalances] = useState<Record<string, number>>({});
  const [totalTreasury, setTotalTreasury] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  // Dialog States
  const [transferOpen, setTransferOpen] = useState(false);
  const [zeroOpen, setZeroOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Transfer Form
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setSettings(getGlobalSettings());

    if (user) {
        // Load from Cloud
        fetchAccountsFromCloud(user.id).then(data => {
            setBalances(data.balances);
            setPendingBalances(data.pending);
            calculateTotals(data.balances, data.pending);
        });
    } else {
        // Load from Local
        const localBal = getStoredBalances();
        const localPending = getStoredPendingBalances();
        setBalances(localBal);
        setPendingBalances(localPending);
        calculateTotals(localBal, localPending);
    }
  }, []);

  // Realtime Subscription
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('accounts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          // Re-fetch on change
          fetchAccountsFromCloud(currentUser.id).then(data => {
            setBalances(data.balances);
            setPendingBalances(data.pending);
            calculateTotals(data.balances, data.pending);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const calculateTotals = (bal: Record<string, number>, pending: Record<string, number>) => {
    const total = Object.values(bal).reduce((sum, val) => sum + val, 0);
    setTotalTreasury(total);
    const pTotal = Object.values(pending).reduce((sum, val) => sum + val, 0);
    setTotalPending(pTotal);
  };

  const canAccessFeature = (feature: keyof GlobalSettings['featurePermissions']) => {
    if (!settings) return true;
    const userRole = currentUser?.role || 'visitor';
    // @ts-ignore
    return settings.featurePermissions[feature].includes(userRole);
  };

  const handleTransfer = async () => {
    setErrorMsg('');
    const amount = parseFloat(transferAmount);

    if (!transferFrom || !transferTo) {
        setErrorMsg("يرجى اختيار الحسابات");
        return;
    }

    if (!amount || amount <= 0) {
        setErrorMsg("المبلغ المحول يجب أن يكون أكبر من 0");
        return;
    }

    const currentFromBalance = balances[transferFrom] || 0;
    const currentToBalance = balances[transferTo] || 0;

    if (currentFromBalance < amount) {
      setErrorMsg("رصيد البنك المحول منه غير كافي");
      return;
    }

    const newBalances = { ...balances };
    newBalances[transferFrom] = currentFromBalance - amount;
    newBalances[transferTo] = currentToBalance + amount;

    // Update Local State (Optimistic)
    setBalances(newBalances);
    calculateTotals(newBalances, pendingBalances);

    if (currentUser) {
        // Update Cloud
        await updateAccountInCloud(currentUser.id, transferFrom, newBalances[transferFrom], pendingBalances[transferFrom] || 0);
        await updateAccountInCloud(currentUser.id, transferTo, newBalances[transferTo], pendingBalances[transferTo] || 0);
    } else {
        // Update Local Storage
        saveStoredBalances(newBalances);
    }
    
    setSuccessMsg(true);
    setTimeout(() => {
        setSuccessMsg(false);
        setTransferOpen(false);
        setTransferFrom('');
        setTransferTo('');
        setTransferAmount('');
    }, 2000);
  };

  const handleZeroTreasury = async () => {
    if (confirm("تحذير هام: سيتم حذف جميع الأرصدة وتصفير الخزينة نهائياً. هل أنت متأكد؟")) {
        const zeroed = BANKS_LIST.reduce((acc, bank) => ({ ...acc, [bank]: 0 }), {});
        
        setBalances(zeroed);
        setPendingBalances(zeroed);
        calculateTotals(zeroed, zeroed);

        if (currentUser) {
            // Update Cloud for ALL banks
            for (const bank of BANKS_LIST) {
                await updateAccountInCloud(currentUser.id, bank, 0, 0);
            }
        } else {
            saveStoredBalances(zeroed);
            saveStoredPendingBalances(zeroed);
        }
        
        setZeroOpen(false);
    }
  };

  // Sort banks by balance (Highest first)
  const sortedBanks = [...BANKS_LIST].sort((a, b) => {
    const balA = balances[a] || 0;
    const balB = balances[b] || 0;
    return balB - balA;
  });

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600 transition-all"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-800 text-shadow">الحسابات والخزينة</h1>
          <p className="text-gray-500">إدارة السيولة النقدية والحسابات البنكية</p>
        </div>
      </header>

      <div className="mb-10">
        <div className="relative overflow-hidden rounded-3xl shadow-3d flex flex-col min-h-[250px]">
           {/* Top 33% - Pending Treasury (Faded) */}
           <div className="h-[33%] bg-blue-100/50 backdrop-blur-sm flex items-center justify-center relative border-b border-blue-200/50">
                <div className="text-center opacity-70">
                    <h3 className="text-sm font-bold text-blue-800 mb-1 flex items-center justify-center gap-2">
                        <Wallet className="w-4 h-4" />
                        خزنة غير مستحقة بعد
                    </h3>
                    <p className="text-2xl font-black text-blue-900">
                        {totalPending.toLocaleString()} <span className="text-sm">ر.س</span>
                    </p>
                </div>
           </div>

           {/* Bottom 66% - Actual Treasury */}
           <div className="h-[67%] bg-gradient-to-br from-blue-600 to-blue-800 text-white flex flex-col items-center justify-center text-center relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <Wallet className="w-12 h-12 mb-2 opacity-80" />
                <h2 className="text-xl font-medium opacity-90 mb-1">جملة الخزينة الفعلية</h2>
                <div className="text-5xl sm:text-6xl font-black tracking-tight">
                    {totalTreasury.toLocaleString()} <span className="text-2xl font-medium">ر.س</span>
                </div>
           </div>
        </div>
      </div>

      <div className="flex gap-4 mb-10 justify-center">
        <button 
          onClick={() => {
              if(canAccessFeature('transfer')) {
                  setTransferOpen(true);
              } else {
                  alert('هذه الميزة متاحة للأعضاء الذهبيين فقط');
              }
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all relative overflow-hidden ${
              canAccessFeature('transfer') ? 'bg-[#eef2f6] text-blue-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ArrowLeftRight className="w-5 h-5" />
          تحويل بين البنوك
          {!canAccessFeature('transfer') && <span className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[8px] px-1 font-black">PRO</span>}
        </button>
        <button 
          onClick={() => setZeroOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#eef2f6] text-red-500 font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all"
        >
          <Trash2 className="w-5 h-5" />
          تصفير الخزينة
        </button>
      </div>

      <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2">
        <Landmark className="w-6 h-6 text-gray-500" />
        تفاصيل البنوك (الأعلى رصيداً)
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {sortedBanks.map((bank) => (
          <div key={bank} className="bg-[#eef2f6] rounded-2xl shadow-3d p-4 flex flex-col items-center justify-center text-center transition-all duration-500 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-white shadow-3d-inset flex items-center justify-center mb-3 text-blue-600">
              {bank.includes('كاش') ? <Wallet className="w-6 h-6" /> : <Landmark className="w-6 h-6" />}
            </div>
            <h4 className="font-bold text-gray-600 text-sm mb-1">{bank}</h4>
            <span className="text-lg font-black text-blue-800">
              {(balances[bank] || 0).toLocaleString()} <span className="text-xs text-gray-400">ر.س</span>
            </span>
            {/* Show pending for this bank if exists */}
            {(pendingBalances[bank] || 0) > 0 && (
                <span className="text-[10px] font-bold text-orange-500 mt-1 bg-orange-50 px-2 py-0.5 rounded-full">
                    معلق: {(pendingBalances[bank] || 0).toLocaleString()}
                </span>
            )}
          </div>
        ))}
      </div>

      <Dialog open={transferOpen} onOpenChange={(open) => {
          if(!open) {
              setSuccessMsg(false);
              setErrorMsg('');
          }
          setTransferOpen(open);
      }}>
        <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">تحويل رصيد</DialogTitle>
          </DialogHeader>
          
          {successMsg ? (
              <div className="py-10 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-[#eef2f6] rounded-full shadow-3d flex items-center justify-center mb-4 text-green-500 border-4 border-green-100">
                      <Check className="w-10 h-10" strokeWidth={3} />
                  </div>
                  <h3 className="text-xl font-bold text-green-600">تم التحويل بنجاح</h3>
              </div>
          ) : (
            <>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>من حساب</Label>
                        {transferFrom && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-md shadow-sm ${
                                (balances[transferFrom] || 0) > 0 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'
                            }`}>
                                الرصيد: {(balances[transferFrom] || 0).toLocaleString()} ر.س
                            </span>
                        )}
                    </div>
                    <Select onValueChange={setTransferFrom} value={transferFrom}>
                        <SelectTrigger className="bg-white shadow-3d-inset border-none h-12"><SelectValue placeholder="اختر البنك" /></SelectTrigger>
                        <SelectContent dir="rtl">
                        {BANKS_LIST.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    </div>

                    <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>إلى حساب</Label>
                        {transferTo && (
                             <span className={`text-xs font-bold px-2 py-1 rounded-md shadow-sm ${
                                (balances[transferTo] || 0) > 0 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'
                            }`}>
                                الرصيد: {(balances[transferTo] || 0).toLocaleString()} ر.س
                            </span>
                        )}
                    </div>
                    <Select onValueChange={setTransferTo} value={transferTo}>
                        <SelectTrigger className="bg-white shadow-3d-inset border-none h-12"><SelectValue placeholder="اختر البنك" /></SelectTrigger>
                        <SelectContent dir="rtl">
                        {BANKS_LIST.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    </div>

                    <div className="space-y-2">
                    <Label>المبلغ</Label>
                    <Input 
                        type="number" 
                        className="bg-white shadow-3d-inset border-none h-12"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                    />
                    </div>

                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="w-4 h-4" />
                            {errorMsg}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <button onClick={handleTransfer} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all">تأكيد التحويل</button>
                </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={zeroOpen} onOpenChange={setZeroOpen}>
        <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
            <DialogHeader><DialogTitle className="text-red-600">تصفير الخزينة</DialogTitle></DialogHeader>
            <div className="py-6 text-center">
                <p className="font-bold text-gray-700 mb-4">هل أنت متأكد من رغبتك في تصفير جميع الحسابات؟</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={handleZeroTreasury} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold shadow-lg">نعم، تصفير</button>
                    <button onClick={() => setZeroOpen(false)} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-xl font-bold">إلغاء</button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
