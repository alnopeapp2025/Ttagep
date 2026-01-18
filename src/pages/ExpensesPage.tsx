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
        // If employee, use parentId
        const targetId = user.role === 'employee' && user.parentId ? user.parentId : user.id;
        fetchExpensesFromCloud(targetId).then(data => {
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
    const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;

    // Subscribe to changes in 'expenses' table for this user
    const channel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, DELETE, UPDATE
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${targetId}` // Only listen for current user's data
        },
        (payload) => {
          // When a change is detected, re-fetch the list
          fetchExpensesFromCloud(targetId).then(data => {
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
    // Golden and Employee always access everything
    if (userRole === 'golden' || userRole === 'employee') return true;
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

    // Prepare Expense Object
    const newExp: Expense = {
      id: Date.now(), // Temporary ID for local, DB will generate its own
      title,
      amount: cost,
      bank: selectedBank,
      date: Date.now(),
      createdBy: currentUser?.officeName // Save creator
    };

    if (currentUser) {
        const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
        // 1. Save to Cloud
        const result = await addExpenseToCloud(newExp, targetId);
        
        if (result.success) {
            // Success: Update local balance immediately
            const newBalances = { ...balances };
            newBalances[selectedBank] = currentBalance - cost;
            saveStoredBalances(newBalances);
            setBalances(newBalances);
            
            // Realtime subscription will automatically update the list
        } else {
            // Show error if cloud save fails
            setErrorMsg(`فشل حفظ المصروف: ${result.error}`);
            setLoading(false);
            return;
        }
    } else {
        // 2. Save Locally (Visitor)
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
        const success = await deleteExpenseFromCloud(id);
        if(!success) {
            alert("فشل حذف المصروف من قاعدة البيانات");
        }
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
    </div>
  );
}
