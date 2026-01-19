import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet, Trash2, Landmark, ArrowLeftRight, Check, AlertCircle, CheckCircle2, FileText, Users, Calendar, Clock, Percent, Crown, User as UserIcon, ArrowUpRight, ArrowDownLeft, Send, X, DollarSign, StopCircle } from 'lucide-react';
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
  GlobalSettings,
  getStoredEmployees,
  fetchTransactionsFromCloud,
  fetchExpensesFromCloud,
  Transaction,
  getStoredAgentTransfers,
  addExpenseToCloud,
  Expense
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Helper for Countdown
const SalaryTimer = ({ startDate }: { startDate: number }) => {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const start = new Date(startDate);
            // Calculate next pay date (30 days cycle)
            const nextPay = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
            
            // If passed, add another 30 days
            while (nextPay.getTime() < now) {
                nextPay.setDate(nextPay.getDate() + 30);
            }

            const diff = nextPay.getTime() - now;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${days} يوم : ${hours} ساعة : ${minutes} دقيقة : ${seconds} ثانية`);
        }, 1000);
        return () => clearInterval(interval);
    }, [startDate]);

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-blue-600 font-bold mb-2 text-sm">الوقت المتبقي للراتب القادم</p>
            <div className="font-mono text-xl sm:text-2xl font-black text-blue-800 dir-ltr tracking-wider">
                {timeLeft || 'جاري الحساب...'}
            </div>
        </div>
    );
};

export default function AccountsPage() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [pendingBalances, setPendingBalances] = useState<Record<string, number>>({});
  const [totalTreasury, setTotalTreasury] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  // New Data for Statement & Salaries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [statementData, setStatementData] = useState<any[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Dialog States
  const [transferOpen, setTransferOpen] = useState(false);
  const [zeroOpen, setZeroOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [zeroSuccess, setZeroSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Transfer Form
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Salary System State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [salaryStartDate, setSalaryStartDate] = useState('');
  const [salaryType, setSalaryType] = useState<'monthly' | 'commission' | 'both'>('monthly');
  const [commissionRate, setCommissionRate] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  
  // Pay Salary State
  const [paySalaryOpen, setPaySalaryOpen] = useState(false);
  const [payBank, setPayBank] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setSettings(getGlobalSettings());

    const loadData = async () => {
        if (user) {
            const targetId = user.role === 'employee' && user.parentId ? user.parentId : user.id;
            
            // Fetch Accounts
            const accData = await fetchAccountsFromCloud(targetId);
            setBalances(accData.balances);
            setPendingBalances(accData.pending);
            calculateTotals(accData.balances, accData.pending);

            // Fetch Data for Statement & Salaries
            const [txs, exps] = await Promise.all([
                fetchTransactionsFromCloud(targetId),
                fetchExpensesFromCloud(targetId)
            ]);
            
            // Get local transfers as well
            const transfers = getStoredAgentTransfers();

            setTransactions(txs);

            // Prepare Statement (Merge Txs, Expenses, Transfers)
            const statement = [
                ...txs.map(t => ({ 
                    id: `tx-${t.id}`,
                    type: 'deposit', 
                    title: `إيداع: ${t.type}`,
                    subTitle: t.clientName,
                    amount: parseFloat(t.clientPrice) || 0, 
                    date: t.createdAt,
                    bank: t.paymentMethod
                })),
                ...exps.map(e => ({ 
                    id: `exp-${e.id}`,
                    type: 'withdrawal', 
                    title: `صرف: ${e.title}`, 
                    subTitle: 'مصروفات',
                    amount: e.amount, 
                    date: e.date,
                    bank: e.bank
                })),
                ...transfers.map(tr => ({
                    id: `tr-${tr.id}`,
                    type: 'transfer',
                    title: `تحويل للمعقب: ${tr.agentName}`,
                    subTitle: `${tr.transactionCount} معاملة`,
                    amount: tr.amount,
                    date: tr.date,
                    bank: tr.bank
                }))
            ].sort((a, b) => b.date - a.date);
            
            setStatementData(statement);

            // Fetch Employees
            const allEmps = getStoredEmployees();
            const myEmps = allEmps.filter(e => e.parentId === targetId);
            setEmployees(myEmps);

            // Restore Salary Config from LocalStorage
            const savedConfig = localStorage.getItem(`salary_config_${targetId}`);
            if (savedConfig) {
                const parsed = JSON.parse(savedConfig);
                // Only restore if employee ID matches or general config
                // For simplicity, we just load if user selects an employee, handled in effect below
            }

        } else {
            // Local fallback
            const localBal = getStoredBalances();
            const localPending = getStoredPendingBalances();
            setBalances(localBal);
            setPendingBalances(localPending);
            calculateTotals(localBal, localPending);
        }
    };
    loadData();
  }, []);

  // Load Employee Config when selected
  useEffect(() => {
      if (selectedEmpId) {
          const config = localStorage.getItem(`salary_config_${selectedEmpId}`);
          if (config) {
              const parsed = JSON.parse(config);
              setSalaryStartDate(parsed.startDate || '');
              setSalaryType(parsed.type || 'monthly');
              setCommissionRate(parsed.rate || '');
              setSalaryAmount(parsed.amount || '');
          } else {
              // Reset if no config
              setSalaryStartDate('');
              setSalaryType('monthly');
              setCommissionRate('');
              setSalaryAmount('');
          }
      }
  }, [selectedEmpId]);

  // Save Config when changed (if valid)
  useEffect(() => {
      if (selectedEmpId && salaryStartDate) {
          const config = {
              startDate: salaryStartDate,
              type: salaryType,
              rate: commissionRate,
              amount: salaryAmount
          };
          localStorage.setItem(`salary_config_${selectedEmpId}`, JSON.stringify(config));
      }
  }, [selectedEmpId, salaryStartDate, salaryType, commissionRate, salaryAmount]);

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
          const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
          fetchAccountsFromCloud(targetId).then(data => {
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
    if (userRole === 'golden' || userRole === 'employee') return true;
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

    setBalances(newBalances);
    calculateTotals(newBalances, pendingBalances);

    if (currentUser) {
        const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
        await updateAccountInCloud(targetId, transferFrom, newBalances[transferFrom], pendingBalances[transferFrom] || 0);
        await updateAccountInCloud(targetId, transferTo, newBalances[transferTo], pendingBalances[transferTo] || 0);
    } else {
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
    const zeroed = BANKS_LIST.reduce((acc, bank) => ({ ...acc, [bank]: 0 }), {});
    
    setBalances(zeroed);
    setPendingBalances(zeroed);
    calculateTotals(zeroed, zeroed);

    if (currentUser) {
        const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
        for (const bank of BANKS_LIST) {
            await updateAccountInCloud(targetId, bank, 0, 0);
        }
    } else {
        saveStoredBalances(zeroed);
        saveStoredPendingBalances(zeroed);
    }
    
    setZeroSuccess(true);
    setTimeout(() => {
        setZeroSuccess(false);
        setZeroOpen(false);
    }, 2000);
  };

  // Sort Banks by (Balance + Pending) Descending
  const sortedBanks = [...BANKS_LIST].sort((a, b) => {
    const totalA = (balances[a] || 0) + (pendingBalances[a] || 0);
    const totalB = (balances[b] || 0) + (pendingBalances[b] || 0);
    return totalB - totalA;
  });

  // Calculate Commission for Selected Employee
  const getEmployeeTransactions = () => {
      if (!selectedEmpId) return [];
      const emp = employees.find(e => e.id.toString() === selectedEmpId);
      if (!emp) return [];
      
      return transactions.filter(t => 
          (t.createdBy && t.createdBy === emp.officeName) || 
          (!t.createdBy && t.agent === emp.officeName)
      );
  };

  const empTransactions = getEmployeeTransactions();
  const empCommissionTotal = empTransactions.reduce((sum, t) => {
      const price = parseFloat(t.clientPrice) || 0;
      const rate = parseFloat(commissionRate) || 0;
      return sum + (price * (rate / 100));
  }, 0);

  // Date Constraints
  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Check if salary is due (30 days passed)
  const isSalaryDue = () => {
      if (!salaryStartDate) return false;
      const start = new Date(salaryStartDate).getTime();
      const now = Date.now();
      const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      return diffDays >= 30; // Show after 30 days
  };

  const handleStopWork = () => {
      if (!salaryStartDate || !salaryAmount) return;
      const start = new Date(salaryStartDate).getTime();
      const now = Date.now();
      const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      const dailyRate = parseFloat(salaryAmount) / 30;
      const due = dailyRate * diffDays;
      
      alert(`يصدر لكم بطرفنا مبلغ ${due.toFixed(2)} ريال عن فترة عمل ${diffDays} يوم.`);
  };

  const handlePaySalary = async () => {
      if (!payBank || !salaryAmount || !selectedEmpId) return;
      const amount = parseFloat(salaryAmount);
      const emp = employees.find(e => e.id.toString() === selectedEmpId);
      
      if (!emp) return;

      // 1. Deduct from Balance
      const currentBalance = balances[payBank] || 0;
      if (currentBalance < amount) {
          alert('رصيد البنك غير كافي');
          return;
      }

      const newBalances = { ...balances };
      newBalances[payBank] = currentBalance - amount;
      setBalances(newBalances);
      
      // 2. Add Expense
      const newExp: Expense = {
          id: Date.now(),
          title: `راتب شهري: ${emp.officeName}`,
          amount: amount,
          bank: payBank,
          date: Date.now(),
          createdBy: currentUser?.officeName
      };

      if (currentUser) {
          const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
          await addExpenseToCloud(newExp, targetId);
          await updateAccountInCloud(targetId, payBank, newBalances[payBank], pendingBalances[payBank] || 0);
      } else {
          // Local fallback
      }

      setPaySuccess(true);
      setTimeout(() => {
          setPaySuccess(false);
          setPaySalaryOpen(false);
          // Reset start date to today to restart cycle? Or keep it?
          // Usually resets cycle.
          setSalaryStartDate(today); 
      }, 2000);
  };

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

      {/* Top Section: Treasury Card & Action Buttons */}
      <div className="mb-6 relative">
        {/* Treasury Card */}
        <div className="relative overflow-hidden rounded-3xl shadow-3d flex flex-col min-h-[250px] z-10 bg-white">
           <div className="h-[35%] bg-blue-50 flex items-center justify-center relative border-b border-blue-100">
                <div className="text-center opacity-80">
                    <h3 className="text-sm font-bold text-blue-600 mb-1 flex items-center justify-center gap-2">
                        <Wallet className="w-4 h-4" />
                        خزنة غير مستحقة بعد
                    </h3>
                    <p className="text-2xl font-black text-blue-800">
                        {totalPending.toLocaleString()} <span className="text-sm">ر.س</span>
                    </p>
                </div>
           </div>

           <div className="h-[65%] bg-blue-600 text-white flex flex-col items-center justify-center text-center relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <Wallet className="w-12 h-12 mb-2 opacity-90" />
                <h2 className="text-xl font-medium opacity-90 mb-1">جملة الخزينة الفعلية</h2>
                <div className="text-5xl sm:text-6xl font-black tracking-tight">
                    {totalTreasury.toLocaleString()} <span className="text-2xl font-medium">ر.س</span>
                </div>
           </div>
        </div>

        {/* Action Buttons - Raised to align with gray border area */}
        <div className="flex gap-4 justify-center px-4 -mt-6 relative z-20">
            <button 
            onClick={() => {
                if(canAccessFeature('transfer')) {
                    setTransferOpen(true);
                } else {
                    navigate('/?openPro=true');
                }
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-2xl font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all bg-[#eef2f6] text-blue-600 border border-white/50"
            >
            <ArrowLeftRight className="w-5 h-5" />
            تحويل بين البنوك
            </button>
            <button 
            onClick={() => setZeroOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-[#eef2f6] text-red-500 font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all border border-white/50"
            >
            <Trash2 className="w-5 h-5" />
            تصفير الخزينة
            </button>
        </div>
      </div>

      {/* Tabs System */}
      <Tabs defaultValue="banks" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#eef2f6] shadow-3d-inset rounded-xl p-1 h-14">
            <TabsTrigger value="banks" className="rounded-lg h-12 font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all">
                <Landmark className="w-4 h-4 ml-2" />
                الحسابات
            </TabsTrigger>
            <TabsTrigger value="statement" className="rounded-lg h-12 font-bold data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all">
                <FileText className="w-4 h-4 ml-2" />
                كشف الحساب
            </TabsTrigger>
            <TabsTrigger value="salaries" className="rounded-lg h-12 font-bold data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm transition-all">
                <Users className="w-4 h-4 ml-2" />
                الرواتب
            </TabsTrigger>
        </TabsList>

        {/* Banks Tab */}
        <TabsContent value="banks">
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
                    {(pendingBalances[bank] || 0) > 0 && (
                        <span className="text-[10px] font-bold text-orange-500 mt-1 bg-orange-50 px-2 py-0.5 rounded-full">
                            معلق: {(pendingBalances[bank] || 0).toLocaleString()}
                        </span>
                    )}
                </div>
                ))}
            </div>
        </TabsContent>

        {/* Account Statement Tab */}
        <TabsContent value="statement">
            <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50 min-h-[400px]">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    سجل العمليات المالية (كشف الحساب)
                </h3>
                {statementData.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">لا توجد عمليات مسجلة حتى الآن.</div>
                ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {statementData.map((item) => (
                            <div key={item.id} className="bg-white/60 p-4 rounded-2xl border border-white flex justify-between items-center hover:bg-white transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                                        item.type === 'deposit' ? 'bg-green-100 text-green-600' : 
                                        item.type === 'withdrawal' ? 'bg-red-100 text-red-600' :
                                        'bg-orange-100 text-orange-600'
                                    }`}>
                                        {item.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : 
                                         item.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5" /> :
                                         <ArrowLeftRight className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                                        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 mt-1">
                                            <span>{new Date(item.date).toLocaleDateString('ar-SA')}</span>
                                            <span>{new Date(item.date).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</span>
                                            <span className="text-blue-500 font-medium">• {item.bank}</span>
                                            {item.subTitle && <span className="text-gray-400">• {item.subTitle}</span>}
                                        </div>
                                    </div>
                                </div>
                                <span className={`font-black text-lg ${
                                    item.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {item.type === 'deposit' ? '+' : '-'}{item.amount.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </TabsContent>

        {/* Salaries Tab */}
        <TabsContent value="salaries">
            <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50 min-h-[400px]">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    نظام الرواتب والنسب
                </h3>

                {/* Check if Golden & Has Employees */}
                {currentUser?.role !== 'golden' ? (
                    <div className="text-center py-12 bg-white/50 rounded-2xl border-2 border-dashed border-yellow-300">
                        <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-gray-800 mb-2">ميزة حصرية للأعضاء الذهبيين</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">لإدارة رواتب الموظفين وحساب النسب، يرجى ترقية باقتك للعضوية الذهبية وإضافة موظفين.</p>
                        <button 
                            onClick={() => navigate('/?openPro=true')}
                            className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                        >
                            ترقية الباقة الآن
                        </button>
                    </div>
                ) : employees.length === 0 ? (
                    <div className="text-center py-12">
                        <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">لم تقم بإضافة أي موظفين بعد.</p>
                        <button onClick={() => navigate('/')} className="text-blue-600 font-bold mt-2 underline">الذهاب للرئيسية لإضافة موظف</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Employee Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>اختر الموظف</Label>
                                <Select value={selectedEmpId} onValueChange={setSelectedEmpId} disabled={!!salaryStartDate}>
                                    <SelectTrigger className="bg-white shadow-3d-inset border-none h-12 text-right flex-row-reverse disabled:opacity-70">
                                        <SelectValue placeholder="اختر موظف..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id.toString()} className="text-right">{emp.officeName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>تاريخ بداية العمل</Label>
                                <div className="relative">
                                    <Input 
                                        type="date" 
                                        value={salaryStartDate}
                                        onChange={(e) => setSalaryStartDate(e.target.value)}
                                        className="bg-white shadow-3d-inset border-none h-12 pl-10 disabled:opacity-70"
                                        min={lastWeek}
                                        max={today}
                                        disabled={!!salaryStartDate} // Lock after set
                                    />
                                    <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {selectedEmpId && salaryStartDate && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                                {/* Salary Type Selection */}
                                <div className="bg-white/50 p-4 rounded-2xl border border-white">
                                    <Label className="mb-3 block font-bold text-gray-700">نظام الراتب</Label>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setSalaryType('monthly')}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${salaryType === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            راتب شهري
                                        </button>
                                        <button 
                                            onClick={() => setSalaryType('commission')}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${salaryType === 'commission' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            نسبة %
                                        </button>
                                        <button 
                                            onClick={() => setSalaryType('both')}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${salaryType === 'both' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            الاثنين معاً
                                        </button>
                                    </div>
                                </div>

                                {/* Salary Amount Input */}
                                {(salaryType === 'monthly' || salaryType === 'both') && (
                                    <div className="space-y-2">
                                        <Label>قيمة الراتب الشهري</Label>
                                        <div className="relative">
                                            <Input 
                                                type="number"
                                                value={salaryAmount}
                                                onChange={(e) => setSalaryAmount(e.target.value)}
                                                className="bg-white shadow-3d-inset border-none h-12 pl-10"
                                                placeholder="أدخل الراتب"
                                            />
                                            <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                        </div>
                                    </div>
                                )}

                                {/* Timer Section */}
                                {(salaryType === 'monthly' || salaryType === 'both') && (
                                    <div className="bg-white p-6 rounded-2xl shadow-3d-inset text-center space-y-2 border border-blue-100">
                                        <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                                            <Clock className="w-6 h-6" />
                                            <h4 className="font-bold text-lg">موعد الراتب القادم</h4>
                                        </div>
                                        <SalaryTimer startDate={new Date(salaryStartDate).getTime()} />
                                        
                                        {/* Action Buttons for Golden Member */}
                                        <div className="flex gap-3 mt-4 justify-center">
                                            {isSalaryDue() && (
                                                <button 
                                                    onClick={() => setPaySalaryOpen(true)}
                                                    className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                                                >
                                                    <DollarSign className="w-4 h-4" />
                                                    سداد وتحويل الراتب
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleStopWork}
                                                className="px-6 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all flex items-center gap-2"
                                            >
                                                <StopCircle className="w-4 h-4" />
                                                توقف عن العمل
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Commission Section */}
                                {(salaryType === 'commission' || salaryType === 'both') && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                                            <div className="flex-1">
                                                <Label>نسبة الموظف (%)</Label>
                                                <div className="relative mt-1">
                                                    <Input 
                                                        type="number" 
                                                        placeholder="مثلاً 10" 
                                                        value={commissionRate}
                                                        onChange={(e) => setCommissionRate(e.target.value)}
                                                        className="bg-[#eef2f6] border-none h-12 pl-10"
                                                    />
                                                    <Percent className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                                </div>
                                            </div>
                                            <div className="flex-1 text-center bg-green-50 rounded-xl p-2 border border-green-100">
                                                <p className="text-xs text-green-600 font-bold mb-1">إجمالي العمولة المستحقة</p>
                                                <p className="text-xl font-black text-green-700">{empCommissionTotal.toLocaleString()} ر.س</p>
                                            </div>
                                        </div>

                                        <div className="bg-white/50 rounded-2xl border border-white overflow-hidden">
                                            <table className="w-full text-right text-sm">
                                                <thead className="bg-gray-100 text-gray-600 font-bold">
                                                    <tr>
                                                        <th className="p-3">المعاملة</th>
                                                        <th className="p-3">التاريخ</th>
                                                        <th className="p-3">المبلغ</th>
                                                        <th className="p-3">حصة الموظف</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {empTransactions.length === 0 ? (
                                                        <tr><td colSpan={4} className="p-6 text-center text-gray-400">لا توجد معاملات مسجلة لهذا الموظف</td></tr>
                                                    ) : (
                                                        empTransactions.map(t => {
                                                            const price = parseFloat(t.clientPrice) || 0;
                                                            const share = price * ((parseFloat(commissionRate) || 0) / 100);
                                                            return (
                                                                <tr key={t.id} className="hover:bg-white transition-colors">
                                                                    <td className="p-3 font-bold text-gray-700">{t.type}</td>
                                                                    <td className="p-3 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString('ar-SA')}</td>
                                                                    <td className="p-3 font-bold text-blue-600">{price}</td>
                                                                    <td className="p-3 font-black text-green-600">{share.toFixed(2)}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </TabsContent>
      </Tabs>

      {/* Pay Salary Dialog */}
      <Dialog open={paySalaryOpen} onOpenChange={setPaySalaryOpen}>
          <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
              <DialogHeader><DialogTitle>سداد الراتب</DialogTitle></DialogHeader>
              {paySuccess ? (
                  <div className="py-10 flex flex-col items-center justify-center animate-in zoom-in">
                      <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
                      <h3 className="text-xl font-bold text-green-700">تم سداد الراتب بنجاح</h3>
                  </div>
              ) : (
                  <div className="py-4 space-y-4">
                      <div className="space-y-2">
                          <Label>اختر البنك للسداد</Label>
                          <Select onValueChange={setPayBank} value={payBank}>
                              <SelectTrigger className="bg-white shadow-3d-inset border-none h-12 text-right flex-row-reverse">
                                  <SelectValue placeholder="اختر البنك" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                                  {BANKS_LIST.map(bank => (
                                      <SelectItem key={bank} value={bank} className="text-right">
                                          <div className="flex justify-between w-full gap-4">
                                              <span>{bank}</span>
                                              <span className={`font-bold ${(balances[bank] || 0) >= parseFloat(salaryAmount) ? 'text-green-600' : 'text-red-500'}`}>
                                                  {(balances[bank] || 0).toLocaleString()} ر.س
                                              </span>
                                          </div>
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <button 
                          onClick={handlePaySalary}
                          className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700"
                      >
                          تأكيد السداد ({salaryAmount} ر.س)
                      </button>
                  </div>
              )}
          </DialogContent>
      </Dialog>

      {/* Dialogs (Transfer & Zero) - Same as before */}
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
                        {BANKS_LIST.map(b => (
                            <SelectItem key={b} value={b} className="text-right cursor-pointer my-1">
                                <div className="flex justify-between w-full gap-4">
                                    <span>{b}</span>
                                    <span className={`font-bold ${(balances[b] || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {(balances[b] || 0).toLocaleString()} ر.س
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
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
                        {BANKS_LIST.map(b => (
                            <SelectItem key={b} value={b} className="text-right cursor-pointer my-1">
                                <div className="flex justify-between w-full gap-4">
                                    <span>{b}</span>
                                    <span className={`font-bold ${(balances[b] || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {(balances[b] || 0).toLocaleString()} ر.س
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
            {zeroSuccess ? (
                <div className="py-10 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-[#eef2f6] rounded-full shadow-3d flex items-center justify-center mb-4 text-green-500 border-4 border-green-100">
                        <CheckCircle2 className="w-10 h-10" strokeWidth={3} />
                    </div>
                    <h3 className="text-xl font-bold text-green-600">تم تصفير الخزينة بنجاح</h3>
                </div>
            ) : (
                <div className="py-6 text-center">
                    <p className="font-bold text-gray-700 mb-4">هل أنت متأكد من رغبتك في تصفير جميع الحسابات؟</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={handleZeroTreasury} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold shadow-lg">نعم، تصفير</button>
                        <button onClick={() => setZeroOpen(false)} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-xl font-bold">إلغاء</button>
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
