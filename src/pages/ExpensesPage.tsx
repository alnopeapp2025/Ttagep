import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Receipt, Plus, Wallet, AlertCircle, Trash2, Loader2, Calculator } from 'lucide-react';
import { 
  getStoredExpenses, 
  saveStoredExpenses, 
  Expense, 
  getStoredBalances, 
  saveStoredBalances, 
  getStoredPendingBalances, 
  getCurrentUser,
  addExpenseToCloud,
  fetchExpensesFromCloud,
  deleteExpenseFromCloud,
  fetchAccountsFromCloud, 
  updateAccountInCloud, 
  User,
  getGlobalSettings,
  GlobalSettings,
  checkLimit,
  getBankNames
} from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LimitModals } from '@/components/LimitModals';

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [open, setOpen] = useState(false);
  
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [pendingBalances, setPendingBalances] = useState<Record<string, number>>({});

  const [errorMsg, setErrorMsg] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [banksList, setBanksList] = useState<string[]>([]);

  // Limit Modal State
  const [limitModalType, setLimitModalType] = useState<'none' | 'visitor' | 'member' | 'golden'>('none');

  // Initial Load
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setSettings(getGlobalSettings());
    setBanksList(getBankNames());
    
    // Initial load from local storage
    setBalances(getStoredBalances());
    setPendingBalances(getStoredPendingBalances());

    if (user) {
        const targetId = user.role === 'employee' && user.parentId ? user.parentId : user.id;
        
        // Fetch Expenses
        fetchExpensesFromCloud(targetId).then(data => {
            setExpenses(data);
        });

        // Fetch Latest Balances (Important for the modal display)
        fetchAccountsFromCloud(targetId).then(data => {
            setBalances(data.balances);
            setPendingBalances(data.pending);
        });
    } else {
        // Fetch from Local
        setExpenses(getStoredExpenses());
    }
  }, [open]); // Refresh when modal opens

  // Realtime Subscription Effect
  useEffect(() => {
    if (!currentUser) return;
    const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;

    // Subscribe to changes in 'expenses' table
    const expensesChannel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${targetId}`
        },
        (payload) => {
          fetchExpensesFromCloud(targetId).then(data => setExpenses(data));
        }
      )
      .subscribe();

    // Subscribe to changes in 'accounts' table (to keep balances updated in realtime)
    const accountsChannel = supabase
      .channel('expenses-accounts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `user_id=eq.${targetId}`
        },
        (payload) => {
           fetchAccountsFromCloud(targetId).then(data => {
               setBalances(data.balances);
               setPendingBalances(data.pending);
           });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(accountsChannel);
    };
  }, [currentUser]);

  const canAccessFeature = (feature: keyof GlobalSettings['featurePermissions']) => {
    if (!settings) return true;
    const userRole = currentUser?.role || 'visitor';
    if (userRole === 'golden' || userRole === 'employee') return true;
    // @ts-ignore
    return settings.featurePermissions[feature].includes(userRole);
  };

  const checkAddPermission = () => {
      const role = currentUser?.role || 'visitor';
      const check = checkLimit(role, 'expenses', expenses.length);
      if (!check.allowed) {
          if (check.reason === 'visitor') setLimitModalType('visitor');
          else if (check.reason === 'member') setLimitModalType('member');
          else if (check.reason === 'golden') setLimitModalType('golden');
          return false;
      }
      return true;
  };

  const handleAddExpense = async () => {
    setErrorMsg('');
    if (!title || !amount || !selectedBank) return;
    const cost = parseFloat(amount);
    if (cost <= 0) return;

    const currentBalance = balances[selectedBank] || 0;

    if (currentBalance < cost) {
        setErrorMsg("رصيد الحساب المختار غير كافي لتغطية المصروف");
        return;
    }

    setLoading(true);

    const newExp: Expense = {
      id: Date.now(),
      title,
      amount: cost,
      bank: selectedBank,
      date: Date.now(),
      createdBy: currentUser?.officeName
    };

    if (currentUser) {
        const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
        const result = await addExpenseToCloud(newExp, targetId);
        
        if (result.success) {
            // Optimistic update for balances
            const newBalances = { ...balances };
            const newBalance = currentBalance - cost;
            newBalances[selectedBank] = newBalance;
            
            saveStoredBalances(newBalances);
            setBalances(newBalances);

            // IMMEDIATE DEDUCTION: Update Cloud Account
            const currentPending = pendingBalances[selectedBank] || 0;
            await updateAccountInCloud(targetId, selectedBank, newBalance, currentPending);

            // Optimistic update for list (Realtime will confirm)
            setExpenses(prev => [newExp, ...prev]);

        } else {
            setErrorMsg(`فشل حفظ المصروف: ${result.error}`);
            setLoading(false);
            return;
        }
    } else {
        const newBalances = { ...balances };
        newBalances[selectedBank] = currentBalance - cost;
        saveStoredBalances(newBalances);
        setBalances(newBalances);

        const updated = [newExp, ...expenses];
        setExpenses(updated);
        saveStoredExpenses(updated);
    }
    
    setLoading(false);
    setTitle('');
    setAmount('');
    setSelectedBank('');
    setOpen(false);
  };

  const handleDeleteExpense = async (id: number) => {
    if(!canAccessFeature('deleteExpense')) {
        // Redirect to home with openPro param
        navigate('/?openPro=true');
        return;
    }

    if(!confirm('هل أنت متأكد من حذف هذا المصروف؟ سيتم إعادة المبلغ للحساب.')) return;

    const expenseToDelete = expenses.find(e => e.id === id);
    if (!expenseToDelete) return;

    // Optimistic Refund
    const currentBalance = balances[expenseToDelete.bank] || 0;
    const newBalances = { ...balances };
    const newBalance = currentBalance + expenseToDelete.amount;
    newBalances[expenseToDelete.bank] = newBalance;
    
    saveStoredBalances(newBalances);
    setBalances(newBalances);

    if (currentUser) {
        const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
        const success = await deleteExpenseFromCloud(id);
        if(!success) {
            alert("فشل حذف المصروف من قاعدة البيانات");
        } else {
            // IMMEDIATE REFUND: Update Cloud Account
            const currentPending = pendingBalances[expenseToDelete.bank] || 0;
            await updateAccountInCloud(targetId, expenseToDelete.bank, newBalance, currentPending);
            
            // FIX: Update UI immediately by removing the item from state
            setExpenses(prev => prev.filter(e => e.id !== id));
        }
    } else {
        const updatedExpenses = expenses.filter(e => e.id !== id);
        setExpenses(updatedExpenses);
        saveStoredExpenses(updatedExpenses);
    }
  };

  // Calculate Total Treasury for Display
  const totalTreasury = Object.values(balances).reduce((acc, val) => acc + val, 0);

  // Calculate Total Expenses
  const totalExpenses = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  return (
    <>
    <LimitModals 
        type={limitModalType} 
        isOpen={limitModalType !== 'none'} 
        onClose={() => setLimitModalType('none')} 
    />
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600">
          <ArrowRight className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-800 text-shadow">المنصرفات</h1>
          <p className="text-gray-500">تسجيل المصروفات اليومية</p>
        </div>
      </header>

      <div className="mb-6">
        <Dialog open={open} onOpenChange={(val) => {
            if(val && !checkAddPermission()) return;
            if(!val) setErrorMsg('');
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                <button className="w-full py-4 rounded-2xl bg-[#eef2f6] text-red-500 font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    تسجيل مصروف جديد
                </button>
            </DialogTrigger>
            <DialogContent className="bg-[#eef2f6] shadow-3d border-none" dir="rtl">
                <DialogHeader><DialogTitle>تسجيل مصروف</DialogTitle></DialogHeader>
                
                {/* Total Treasury Display */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-2 flex justify-between items-center shadow-sm">
                     <div className="flex items-center gap-2 text-blue-700">
                         <Wallet className="w-5 h-5" />
                         <span className="font-bold text-sm">رصيد الخزينة المتاح</span>
                     </div>
                     <span className="font-black text-xl text-blue-800">
                         {totalTreasury.toLocaleString()} <span className="text-xs font-medium">ر.س</span>
                     </span>
                </div>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>بيان المصروف</Label>
                        <Input 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            className="bg-white shadow-3d-inset border-none"
                            placeholder="مثلاً: فواتير كهرباء، ضيافة..."
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>خصم من حساب</Label>
                            {selectedBank && (
                                <span className={`text-xs font-bold px-2 py-1 rounded-md shadow-sm ${
                                    (balances[selectedBank] || 0) > 0 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'
                                }`}>
                                    الرصيد: {(balances[selectedBank] || 0).toLocaleString()} ر.س
                                </span>
                            )}
                        </div>
                        <Select onValueChange={setSelectedBank} value={selectedBank}>
                            <SelectTrigger className="bg-white shadow-3d-inset border-none h-12 text-right flex-row-reverse">
                                <SelectValue placeholder="اختر البنك للخصم" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right max-h-[300px]" dir="rtl">
                                {banksList.map((bank) => {
                                    const bal = balances[bank] || 0;
                                    return (
                                        <SelectItem key={bank} value={bank} className="text-right cursor-pointer my-1 w-full">
                                            <div className="flex items-center justify-between w-full gap-8 min-w-[200px]">
                                                <span className="font-bold text-gray-700">{bank}</span>
                                                <span className={`font-bold text-sm ${bal > 0 ? 'text-green-600' : 'text-red-500'}`} dir="ltr">
                                                    {bal.toLocaleString()} ر.س
                                                </span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>المبلغ</Label>
                        <Input 
                            type="number"
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)} 
                            className="bg-white shadow-3d-inset border-none"
                        />
                    </div>

                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100 shadow-sm animate-in fade-in">
                            <AlertCircle className="w-4 h-4" />
                            {errorMsg}
                        </div>
                    )}

                    <button 
                        onClick={handleAddExpense} 
                        disabled={loading}
                        className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'خصم وتسجيل'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {expenses.map(exp => (
            <div key={exp.id} className="bg-[#eef2f6] p-4 rounded-2xl shadow-3d flex justify-between items-center border border-white/50 group">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-500 shadow-sm">
                        <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-700">{exp.title}</h3>
                        <div className="flex gap-2 text-xs text-gray-400 mt-1">
                            <span>{new Date(exp.date).toLocaleDateString('ar-SA')}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Wallet className="w-3 h-3"/> {exp.bank || 'غير محدد'}</span>
                        </div>
                        {exp.createdBy && <p className="text-[10px] text-gray-400 mt-1">بواسطة: {exp.createdBy}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="font-bold text-red-600 text-lg">-{exp.amount.toLocaleString()} ر.س</span>
                    
                    <button 
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm active:scale-95"
                        title="حذف المصروف"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
        ))}
        {expenses.length === 0 && <p className="text-center text-gray-400 py-10">لا توجد مصروفات مسجلة.</p>}
      </div>

      {/* Total Expenses Summary */}
      {expenses.length > 0 && (
          <div className="mt-6 bg-white p-4 rounded-2xl shadow-3d-inset border border-gray-100 flex justify-between items-center animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 text-gray-700">
                  <Calculator className="w-5 h-5 text-red-500" />
                  <span className="font-bold">إجمالي المنصرفات</span>
              </div>
              <span className="font-black text-2xl text-red-600">
                  {totalExpenses.toLocaleString()} <span className="text-sm font-medium text-gray-400">ر.س</span>
              </span>
          </div>
      )}
    </div>
    </>
  );
}
