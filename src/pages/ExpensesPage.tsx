import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Receipt, Plus, Wallet, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { 
  getStoredExpenses, 
  saveStoredExpenses, 
  Expense, 
  getStoredBalances, 
  saveStoredBalances, 
  BANKS_LIST,
  getCurrentUser,
  addExpenseToCloud,
  fetchExpensesFromCloud,
  deleteExpenseFromCloud,
  User,
  getGlobalSettings,
  GlobalSettings
} from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [open, setOpen] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  // Initial Load
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setSettings(getGlobalSettings());
    setBalances(getStoredBalances());

    if (user) {
        // Fetch from Cloud if logged in
        fetchExpensesFromCloud(user.id).then(data => {
            setExpenses(data);
        });
    } else {
        // Fetch from Local
        setExpenses(getStoredExpenses());
    }
  }, [open]);

  // Realtime Subscription Effect
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to changes in 'expenses' table for this user
    const channel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, DELETE, UPDATE
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${currentUser.id}` // Only listen for current user's data
        },
        (payload) => {
          console.log('Realtime change detected:', payload);
          // When a change is detected, re-fetch the list
          fetchExpensesFromCloud(currentUser.id).then(data => {
            setExpenses(data);
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or user change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const canAccessFeature = (feature: keyof GlobalSettings['featurePermissions']) => {
    if (!settings) return true;
    const userRole = currentUser?.role || 'visitor';
    // @ts-ignore
    return settings.featurePermissions[feature].includes(userRole);
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

    // Update Balance (Locally for now to reflect immediately)
    const newBalances = { ...balances };
    newBalances[selectedBank] = currentBalance - cost;
    saveStoredBalances(newBalances);
    setBalances(newBalances);

    // Prepare Expense Object
    const newExp: Expense = {
      id: Date.now(), // Temporary ID for local, DB will generate its own
      title,
      amount: cost,
      bank: selectedBank,
      date: Date.now()
    };

    if (currentUser) {
        // 1. Save to Cloud
        const success = await addExpenseToCloud(newExp, currentUser.id);
        if (success) {
            // Success: Realtime subscription will automatically update the list
            console.log('Expense saved to cloud, waiting for realtime update...');
        } else {
            // Show error if cloud save fails
            setErrorMsg("فشل حفظ المصروف في قاعدة البيانات. يرجى التأكد من الاتصال والمحاولة مرة أخرى.");
            setLoading(false);
            // Revert balance change locally if needed
            return;
        }
    } else {
        // 2. Save Locally (Visitor)
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
    if(!confirm('هل أنت متأكد من حذف هذا المصروف؟ سيتم إعادة المبلغ للحساب.')) return;

    const expenseToDelete = expenses.find(e => e.id === id);
    if (!expenseToDelete) return;

    // Refund balance (Add amount back to the bank)
    const currentBalance = balances[expenseToDelete.bank] || 0;
    const newBalances = { ...balances };
    newBalances[expenseToDelete.bank] = currentBalance + expenseToDelete.amount;
    saveStoredBalances(newBalances);
    setBalances(newBalances);

    if (currentUser) {
        // Delete from Cloud
        await deleteExpenseFromCloud(id);
        // Realtime subscription will update the list
    } else {
        // Delete Locally
        const updatedExpenses = expenses.filter(e => e.id !== id);
        setExpenses(updatedExpenses);
        saveStoredExpenses(updatedExpenses);
    }
  };

  return (
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
                <div className="space-y-4 py-4">
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
                        <Label>خصم من حساب</Label>
                        <Select onValueChange={setSelectedBank} value={selectedBank}>
                            <SelectTrigger className="bg-white shadow-3d-inset border-none h-12 text-right flex-row-reverse">
                                <SelectValue placeholder="اختر البنك للخصم" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                                {BANKS_LIST.map((bank) => (
                                    <SelectItem key={bank} value={bank} className="text-right cursor-pointer my-1">
                                        <div className="flex justify-between w-full gap-4">
                                            <span>{bank}</span>
                                            <span className={`font-bold ${(balances[bank] || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {(balances[bank] || 0).toLocaleString()} ر.س
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
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
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="font-bold text-red-600 text-lg">-{exp.amount.toLocaleString()} ر.س</span>
                    
                    {canAccessFeature('deleteExpense') ? (
                        <button 
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm active:scale-95"
                            title="حذف المصروف"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="relative group/pro">
                            <Trash2 className="w-5 h-5 text-gray-300 cursor-not-allowed" />
                            <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[8px] px-1 font-black rounded">PRO</span>
                        </div>
                    )}
                </div>
            </div>
        ))}
        {expenses.length === 0 && <p className="text-center text-gray-400 py-10">لا توجد مصروفات مسجلة.</p>}
      </div>
    </div>
  );
}
