import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet, Trash2, Landmark, ArrowLeftRight, Check, AlertCircle, CheckCircle2, FileText, Users, Calendar, Clock, Percent, Crown, User as UserIcon, ArrowUpRight, ArrowDownLeft, Send, X, StopCircle, Save, Receipt, History, Archive } from 'lucide-react';
import { 
  getStoredBalances, 
  saveStoredBalances, 
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
  addExpenseToCloud,
  Expense,
  getBankNames,
  deleteEmployee,
  fetchAccountStatementFromCloud
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
import { AlertModal, ConfirmModal } from '@/components/CustomAlerts';

// ... (Helper Functions remain same) ...
const getNextCycleDate = (startDateStr: string) => {
    if (!startDateStr) return null;
    const parts = startDateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const date = new Date(Date.UTC(year, month, day));
    if (day === 1) {
        return new Date(Date.UTC(year, month + 1, 1));
    } else {
        return new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
};

const getCurrentCycleEndDate = (startDateStr: string) => {
    if (!startDateStr) return null;
    const nextCycleStart = getNextCycleDate(startDateStr);
    if (!nextCycleStart) return null;
    return new Date(nextCycleStart.getTime() - 24 * 60 * 60 * 1000);
};

const SalaryTimer = ({ startDate }: { startDate: string }) => {
    const [timeLeft, setTimeLeft] = useState("");
    const [label, setLabel] = useState("الوقت المتبقي للراتب القادم");
    const [periodText, setPeriodText] = useState("");

    useEffect(() => {
        const calculateTime = () => {
            const now = Date.now();
            const nextPayDate = getNextCycleDate(startDate);
            const cycleEndDate = getCurrentCycleEndDate(startDate);
            
            if (!nextPayDate || !cycleEndDate) return;

            const startObj = new Date(startDate);
            const formattedStart = `${startObj.getMonth() + 1}/${startObj.getDate()}`;
            const endYear = cycleEndDate.getFullYear();
            const endMonth = cycleEndDate.getMonth() + 1;
            const endDay = cycleEndDate.getDate();
            const fullEnd = `${endYear}/${endMonth}/${endDay}`;
            
            setPeriodText(`${formattedStart} وحتى ${fullEnd}`);

            const diff = nextPayDate.getTime() - now;

            if (diff <= 0) {
                setTimeLeft("مستحق الدفع الآن");
                setLabel("الوقت المتبقي للراتب القادم");
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setLabel(`المتبقي للراتب: ${days} يوم`);
                setTimeLeft(`${days} يوم : ${hours} ساعة : ${minutes} دقيقة : ${seconds} ثانية`);
            }
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [startDate]);

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-blue-600 font-bold mb-2 text-sm">{label}</p>
            <div className="font-mono text-xl sm:text-2xl font-black text-blue-800 dir-ltr tracking-wider">
                {timeLeft || 'جاري الحساب...'}
            </div>
            {timeLeft === "مستحق الدفع الآن" && (
                <p className="text-xs text-gray-400 font-medium mt-1">
                    {periodText}
                </p>
            )}
        </div>
    );
};

export default function AccountsPage() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [totalTreasury, setTotalTreasury] = useState(0);
  const [totalAgentsDue, setTotalAgentsDue] = useState(0); // New State for Agents Due
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [statementData, setStatementData] = useState<any[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  // ... (Other states remain same) ...
  const [transferOpen, setTransferOpen] = useState(false);
  const [zeroOpen, setZeroOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [zeroSuccess, setZeroSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [salaryStartDate, setSalaryStartDate] = useState('');
  const [salaryType, setSalaryType] = useState<'monthly' | 'commission' | 'both'>('monthly');
  const [commissionRate, setCommissionRate] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [isLocked, setIsLocked] = useState(false); 
  const [isStopped, setIsStopped] = useState(false); 
  
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payType, setPayType] = useState<'salary' | 'commission' | 'stop_work'>('salary');
  const [payBank, setPayBank] = useState('');
  const [amountToPay, setAmountToPay] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);

  const [banksList, setBanksList] = useState<string[]>([]);

  const dateRef = useRef<HTMLInputElement>(null);
  const salaryAmountRef = useRef<HTMLInputElement>(null);
  const commissionRateRef = useRef<HTMLInputElement>(null);

  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title: string, message: string, type: 'success'|'error'|'warning'}>({
      isOpen: false, title: '', message: '', type: 'error'
  });
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({
      isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  const showAlert = (title: string, message: string, type: 'success'|'error'|'warning' = 'error') => {
      setAlertConfig({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setSettings(getGlobalSettings());
    setBanksList(getBankNames()); 

    const loadData = async () => {
        if (user) {
            const targetId = user.role === 'employee' && user.parentId ? user.parentId : user.id;
            
            const accData = await fetchAccountsFromCloud(targetId);
            setBalances(accData.balances);
            calculateTotals(accData.balances);

            const statement = await fetchAccountStatementFromCloud(targetId);
            setStatementData(statement);

            const [txs, exps] = await Promise.all([
                fetchTransactionsFromCloud(targetId),
                fetchExpensesFromCloud(targetId)
            ]);
            
            setTransactions(txs);
            setAllExpenses(exps);

            const allEmps = getStoredEmployees();
            const myEmps = allEmps.filter(e => e.parentId === targetId);
            setEmployees(myEmps);
            
            if (user.role === 'employee') {
                setSelectedEmpId(user.id.toString());
            }

        } else {
            const localBal = getStoredBalances();
            setBalances(localBal);
            calculateTotals(localBal);
        }
    };
    loadData();
  }, []);

  // Calculate Agents Due whenever transactions change
  useEffect(() => {
      const due = transactions.reduce((sum, tx) => {
          // Logic:
          // 1. Not cancelled
          // 2. Not paid to agent yet
          // 3. Has agent price
          if (tx.status === 'cancelled') return sum;
          if (tx.agentPaid) return sum;
          
          const price = parseFloat(tx.agentPrice) || 0;
          return sum + price;
      }, 0);
      setTotalAgentsDue(due);
  }, [transactions]);

  useEffect(() => {
      if (selectedEmpId) {
          const config = localStorage.getItem(`salary_config_${selectedEmpId}`);
          if (config) {
              const parsed = JSON.parse(config);
              setSalaryStartDate(parsed.startDate || '');
              setSalaryType(parsed.type || 'monthly');
              setCommissionRate(parsed.rate || '');
              setSalaryAmount(parsed.amount || '');
              setIsLocked(parsed.isLocked || false);
              setIsStopped(parsed.isStopped || false);
          } else {
              setSalaryStartDate('');
              setSalaryType('monthly');
              setCommissionRate('');
              setSalaryAmount('');
              setIsLocked(false);
              setIsStopped(false);
          }
      }
  }, [selectedEmpId]);

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
            calculateTotals(data.balances);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const calculateTotals = (bal: Record<string, number>) => {
    const total = Object.values(bal).reduce((sum, val) => sum + val, 0);
    setTotalTreasury(total);
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
    calculateTotals(newBalances);

    if (currentUser) {
        const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
        await updateAccountInCloud(targetId, transferFrom, newBalances[transferFrom], 0);
        await updateAccountInCloud(targetId, transferTo, newBalances[transferTo], 0);
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
    const zeroed = banksList.reduce((acc, bank) => ({ ...acc, [bank]: 0 }), {});
    
    setBalances(zeroed);
    calculateTotals(zeroed);

    if (currentUser) {
        const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
        for (const bank of banksList) {
            await updateAccountInCloud(targetId, bank, 0, 0);
        }
    } else {
        saveStoredBalances(zeroed);
    }
    
    setZeroSuccess(true);
    setTimeout(() => {
        setZeroSuccess(false);
        setZeroOpen(false);
    }, 2000);
  };

  const sortedBanks = [...banksList].sort((a, b) => {
    const totalA = (balances[a] || 0);
    const totalB = (balances[b] || 0);
    return totalB - totalA;
  });

  const getSelectedEmployee = () => employees.find(e => e.id.toString() === selectedEmpId);

  const getEmployeeTransactions = () => {
      if (!selectedEmpId) return [];
      const emp = getSelectedEmployee();
      if (!emp) return [];
      
      return transactions.filter(t => 
          ((t.createdBy && t.createdBy === emp.officeName) || 
          (!t.createdBy && t.agent === emp.officeName)) &&
          t.status === 'completed'
      );
  };

  const empTransactions = getEmployeeTransactions();
  
  const empCommissionTotal = empTransactions.reduce((sum, t) => {
      const clientPrice = parseFloat(t.clientPrice) || 0;
      const agentPrice = parseFloat(t.agentPrice) || 0;
      const profit = Math.max(0, clientPrice - agentPrice);
      const rate = parseFloat(commissionRate) || 0;
      return sum + (profit * (rate / 100));
  }, 0);

  const getEmployeeExpenses = () => {
      if (!selectedEmpId) return [];
      const emp = getSelectedEmployee();
      if (!emp) return [];
      
      return allExpenses.filter(e => 
          e.title.includes(emp.officeName) && 
          (e.title.includes('راتب') || e.title.includes('عمولة') || e.title.includes('مستحقات'))
      );
  };

  const empExpenses = getEmployeeExpenses();
  
  const empCommissionPaid = empExpenses
      .filter(e => e.title.includes('عمولة'))
      .reduce((sum, e) => sum + e.amount, 0);

  const remainingCommission = Math.max(0, empCommissionTotal - empCommissionPaid);

  const today = new Date().toISOString().split('T')[0];
  const last12Months = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const isSalaryDue = () => {
      if (!salaryStartDate) return false;
      const nextPayDate = getNextCycleDate(salaryStartDate);
      if (!nextPayDate) return false;
      
      const now = Date.now();
      return now >= nextPayDate.getTime();
  };

  const handleSaveConfig = () => {
      if (currentUser?.role === 'employee') {
          showAlert("صلاحية مرفوضة", "هذه الخاصية متاحة فقط لمدير المكتب أو المسؤول أو العضو الذي أصدر عضوية الموظف", "error");
          return;
      }

      if (!selectedEmpId) return;

      if (!salaryStartDate) {
          showAlert("تنبيه", "يرجى اختيار تاريخ بداية العمل", "warning");
          setTimeout(() => dateRef.current?.focus(), 300);
          return;
      }

      if ((salaryType === 'monthly' || salaryType === 'both') && !salaryAmount) {
          showAlert("تنبيه", "يرجى إدخال قيمة الراتب الشهري", "warning");
          setTimeout(() => salaryAmountRef.current?.focus(), 300);
          return;
      }

      if ((salaryType === 'commission' || salaryType === 'both') && !commissionRate) {
          showAlert("تنبيه", "يرجى إدخال نسبة الموظف", "warning");
          setTimeout(() => commissionRateRef.current?.focus(), 300);
          return;
      }
      
      const config = {
          startDate: salaryStartDate,
          type: salaryType,
          rate: commissionRate,
          amount: salaryAmount,
          isLocked: true,
          isStopped: false
      };
      
      localStorage.setItem(`salary_config_${selectedEmpId}`, JSON.stringify(config));
      setIsLocked(true);
      setIsStopped(false);
      showAlert("تم الحفظ", "تم حفظ البيانات وتثبيتها بنجاح", "success");
  };

  const openPayModal = (type: 'salary' | 'commission' | 'stop_work') => {
      setPayType(type);
      setPayBank('');
      setPaySuccess(false);
      
      if (type === 'salary') {
          setAmountToPay(salaryAmount);
      } else if (type === 'commission') {
          setAmountToPay(remainingCommission.toFixed(2));
      } else if (type === 'stop_work') {
          if (!salaryStartDate || (!salaryAmount && salaryType !== 'commission')) {
              setAmountToPay('0');
          } else if (salaryType === 'commission') {
              setAmountToPay('0');
          } else {
              const start = new Date(salaryStartDate).getTime();
              const now = Date.now();
              const diffDays = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
              const dailyRate = parseFloat(salaryAmount) / 30;
              const due = dailyRate * diffDays;
              setAmountToPay(due.toFixed(2));
          }
      }
      setPayModalOpen(true);
  };

  const handleProcessPayment = async () => {
      if (!payBank || !amountToPay || !selectedEmpId) return;
      const amount = parseFloat(amountToPay);
      const emp = getSelectedEmployee();
      
      if (!emp) return;

      const currentBalance = balances[payBank] || 0;
      if (currentBalance < amount) {
          showAlert("رصيد غير كافي", "رصيد البنك المختار غير كافي لإتمام العملية", "error");
          return;
      }

      const newBalances = { ...balances };
      newBalances[payBank] = currentBalance - amount;
      setBalances(newBalances);
      
      let title = '';
      const dateTag = salaryStartDate ? `|SD:${salaryStartDate}|` : '';
      
      let endDateTag = '';
      if (payType === 'salary' && salaryStartDate) {
          const endDate = getCurrentCycleEndDate(salaryStartDate);
          if (endDate) {
              const endStr = endDate.toISOString().split('T')[0];
              endDateTag = `|ED:${endStr}|`;
          }
      } else if (payType === 'stop_work') {
          const todayStr = new Date().toISOString().split('T')[0];
          endDateTag = `|ED:${todayStr}|`;
      }
      
      if (payType === 'salary') title = `راتب شهري: ${emp.officeName}${dateTag}${endDateTag}`;
      else if (payType === 'commission') title = `سداد عمولة: ${emp.officeName}`;
      else if (payType === 'stop_work') title = `تصفية مستحقات (توقف عن العمل): ${emp.officeName}${dateTag}${endDateTag}`;

      const newExp: Expense = {
          id: Date.now(),
          title: title,
          amount: amount,
          bank: payBank,
          date: Date.now(),
          createdBy: currentUser?.officeName
      };

      if (currentUser) {
          const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
          await addExpenseToCloud(newExp, targetId);
          await updateAccountInCloud(targetId, payBank, newBalances[payBank], 0);
          
          setAllExpenses(prev => [newExp, ...prev]);
      }

      setPaySuccess(true);
      setTimeout(() => {
          setPaySuccess(false);
          setPayModalOpen(false);
          
          if (payType === 'salary') {
              const nextCycleStart = getNextCycleDate(salaryStartDate);
              if (nextCycleStart) {
                  const nextStartStr = nextCycleStart.toISOString().split('T')[0];
                  setSalaryStartDate(nextStartStr);
                  const config = { startDate: nextStartStr, type: salaryType, rate: commissionRate, amount: salaryAmount, isLocked: true, isStopped: false };
                  localStorage.setItem(`salary_config_${selectedEmpId}`, JSON.stringify(config));
              }
          } else if (payType === 'stop_work') {
              const config = { startDate: salaryStartDate, type: salaryType, rate: commissionRate, amount: salaryAmount, isLocked: true, isStopped: true };
              localStorage.setItem(`salary_config_${selectedEmpId}`, JSON.stringify(config));
              setIsStopped(true);
          }
      }, 2000);
  };

  const handleArchiveEmployee = () => {
      if(!selectedEmpId) return;
      setConfirmConfig({
          isOpen: true,
          title: "أرشفة الموظف",
          message: "سيتم حذف الموظف نهائياً وقفل حسابه ونقل البيانات والرواتب إلى الأرشيف. هل أنت متأكد؟",
          onConfirm: () => {
              deleteEmployee(parseInt(selectedEmpId));
              localStorage.removeItem(`salary_config_${selectedEmpId}`);
              
              const allEmps = getStoredEmployees();
              const targetId = currentUser?.role === 'employee' && currentUser?.parentId ? currentUser.parentId : currentUser?.id;
              const myEmps = allEmps.filter(e => e.parentId === targetId);
              setEmployees(myEmps);
              
              setSelectedEmpId('');
              setSalaryStartDate('');
              setSalaryType('monthly');
              setCommissionRate('');
              setSalaryAmount('');
              setIsLocked(false);
              setIsStopped(false);
          }
      });
  };

  const displayedEmployees = currentUser?.role === 'employee' 
      ? employees.filter(e => e.id === currentUser.id)
      : employees;

  return (
    <>
    <AlertModal 
        isOpen={alertConfig.isOpen} 
        onClose={() => setAlertConfig({...alertConfig, isOpen: false})} 
        title={alertConfig.title} 
        message={alertConfig.message} 
        type={alertConfig.type} 
    />
    <ConfirmModal 
        isOpen={confirmConfig.isOpen} 
        onClose={() => setConfirmConfig({...confirmConfig, isOpen: false})} 
        onConfirm={confirmConfig.onConfirm} 
        title={confirmConfig.title} 
        message={confirmConfig.message} 
    />
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

      <div className="mb-6 relative">
        <div className="relative overflow-hidden rounded-3xl shadow-3d flex flex-col min-h-[250px] z-10 bg-white">
           
           {/* NEW SECTION: Agents Amounts (Replaces Pending Vault) */}
           <div className="flex-1 flex flex-col items-center justify-center py-6 bg-white text-gray-700 relative z-20 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-2 text-orange-600">
                    <Users className="w-5 h-5" />
                    <h3 className="font-bold text-sm">مبالغ المعقبين (المستحقة)</h3>
                </div>
                <div className="text-3xl font-black tracking-tight text-gray-800">
                    {totalAgentsDue.toLocaleString()} <span className="text-sm font-medium text-gray-400">ر.س</span>
                </div>
           </div>

           {/* Actual Treasury Section */}
           <div className="h-full bg-blue-600 text-white flex flex-col items-center justify-center text-center relative py-12">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <Wallet className="w-12 h-12 mb-2 opacity-90" />
                <h2 className="text-xl font-medium opacity-90 mb-1">جملة الخزينة الفعلية</h2>
                <div className="text-5xl sm:text-6xl font-black tracking-tight">
                    {totalTreasury.toLocaleString()} <span className="text-2xl font-medium">ر.س</span>
                </div>
           </div>
        </div>

        <div className="flex gap-4 justify-center px-4 -mt-6 relative z-20">
            <button 
            onClick={() => setTransferOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-2xl font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all bg-[#eef2f6] text-blue-600 border border-white/50"
            >
            <ArrowLeftRight className="w-5 h-5" />
            تحويل بين البنوك
            </button>
            <button 
            onClick={() => setZeroOpen(true)}
            disabled={currentUser?.role === 'employee' && currentUser.role !== 'golden'} // Add logic for disabled button
            className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-[#eef2f6] text-red-500 font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all border border-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
            <Trash2 className="w-5 h-5" />
            تصفير الخزينة
            </button>
        </div>
      </div>

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
                                            {item.status === 'cancelled' && <span className="text-red-500 font-bold">• ملغي</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={`font-black text-lg ${
                                        item.status === 'cancelled' ? 'text-gray-400 line-through' :
                                        item.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {item.type === 'deposit' ? '+' : '-'}{item.amount.toLocaleString()}
                                    </span>
                                    {item.status === 'cancelled' && <span className="text-[10px] text-red-500 font-bold">ملغي</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </TabsContent>

        {/* Salaries Tab (Unchanged) */}
        <TabsContent value="salaries">
            {/* ... (Existing Salaries Content) ... */}
            <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50 min-h-[400px]">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    نظام الرواتب والنسب
                </h3>

                {currentUser?.role !== 'golden' && currentUser?.role !== 'employee' ? (
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
                ) : displayedEmployees.length === 0 ? (
                    <div className="text-center py-12">
                        <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">لم تقم بإضافة أي موظفين بعد.</p>
                        {currentUser.role === 'golden' && (
                            <button onClick={() => navigate('/')} className="text-blue-600 font-bold mt-2 underline">الذهاب للرئيسية لإضافة موظف</button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-bold">اختر الموظف</Label>
                            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-1">
                                {displayedEmployees.map(emp => (
                                    <button
                                        key={emp.id}
                                        onClick={() => setSelectedEmpId(emp.id.toString())}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all min-w-[80px] ${
                                            selectedEmpId === emp.id.toString() 
                                            ? 'bg-white shadow-3d-inset scale-95 ring-2 ring-blue-500/20' 
                                            : 'bg-[#eef2f6] shadow-3d hover:shadow-3d-hover'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${
                                            selectedEmpId === emp.id.toString() ? 'bg-blue-600' : 'bg-gray-400'
                                        }`}>
                                            {emp.officeName.charAt(0)}
                                        </div>
                                        <span className={`text-xs font-bold truncate max-w-[80px] ${
                                            selectedEmpId === emp.id.toString() ? 'text-blue-600' : 'text-gray-600'
                                        }`}>
                                            {emp.officeName}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedEmpId && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>تاريخ بداية العمل</Label>
                                        <div className="relative">
                                            <Input 
                                                ref={dateRef}
                                                type="date" 
                                                value={salaryStartDate}
                                                onChange={(e) => setSalaryStartDate(e.target.value)}
                                                className="bg-white shadow-3d-inset border-none h-12 pl-10 disabled:opacity-70 disabled:cursor-not-allowed"
                                                min={last12Months}
                                                max={today}
                                                disabled={isLocked}
                                            />
                                            <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                        </div>
                                    </div>

                                    <div className="bg-white/50 p-4 rounded-2xl border border-white">
                                        <Label className="mb-3 block font-bold text-gray-700">نظام الراتب</Label>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => !isLocked && setSalaryType('monthly')}
                                                disabled={isLocked}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${salaryType === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'} disabled:opacity-70`}
                                            >
                                                راتب شهري
                                            </button>
                                            <button 
                                                onClick={() => !isLocked && setSalaryType('commission')}
                                                disabled={isLocked}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${salaryType === 'commission' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'} disabled:opacity-70`}
                                            >
                                                نسبة %
                                            </button>
                                            <button 
                                                onClick={() => !isLocked && setSalaryType('both')}
                                                disabled={isLocked}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${salaryType === 'both' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'} disabled:opacity-70`}
                                            >
                                                الاثنين معاً
                                            </button>
                                        </div>
                                    </div>

                                    {(salaryType === 'monthly' || salaryType === 'both') && (
                                        <div className="space-y-2">
                                            <Label>قيمة الراتب الشهري</Label>
                                            <div className="relative">
                                                <Input 
                                                    ref={salaryAmountRef}
                                                    type="number"
                                                    value={salaryAmount}
                                                    onChange={(e) => setSalaryAmount(e.target.value)}
                                                    className="bg-white shadow-3d-inset border-none h-12 pl-10 disabled:opacity-70"
                                                    placeholder="أدخل الراتب"
                                                    disabled={isLocked}
                                                />
                                                <span className="absolute left-3 top-3.5 text-gray-400 font-bold text-xs">﷼</span>
                                            </div>
                                        </div>
                                    )}

                                    {(salaryType === 'commission' || salaryType === 'both') && (
                                        <div className="space-y-2">
                                            <Label>نسبة الموظف (%)</Label>
                                            <div className="relative">
                                                <Input 
                                                    ref={commissionRateRef}
                                                    type="number" 
                                                    placeholder="مثلاً 10" 
                                                    value={commissionRate}
                                                    onChange={(e) => setCommissionRate(e.target.value)}
                                                    className="bg-white shadow-3d-inset border-none h-12 pl-10 disabled:opacity-70"
                                                    disabled={isLocked}
                                                />
                                                <Percent className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                            </div>
                                        </div>
                                    )}

                                    {!isLocked && (
                                        <button 
                                            onClick={handleSaveConfig}
                                            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Save className="w-4 h-4" />
                                            حفظ وتثبيت البيانات
                                        </button>
                                    )}

                                    {isStopped && currentUser.role === 'golden' && (
                                        <button 
                                            onClick={handleArchiveEmployee}
                                            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 mt-4 animate-in fade-in"
                                        >
                                            <Archive className="w-4 h-4" />
                                            قفل حساب الموظف ونقلة للارشيف
                                        </button>
                                    )}
                                </div>

                                {isLocked && !isStopped && (
                                    <div className="space-y-6 border-t border-gray-200 pt-6">
                                        
                                        {(salaryType === 'monthly' || salaryType === 'both') && (
                                            <div className="bg-white p-6 rounded-2xl shadow-3d-inset text-center space-y-2 border border-blue-100">
                                                <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                                                    <Clock className="w-6 h-6" />
                                                    <h4 className="font-bold text-lg">موعد الراتب القادم</h4>
                                                </div>
                                                <SalaryTimer startDate={salaryStartDate} />
                                                
                                                {currentUser.role === 'golden' && (
                                                    <div className="flex gap-3 mt-4 justify-center">
                                                        {isSalaryDue() && (
                                                            <button 
                                                                onClick={() => openPayModal('salary')}
                                                                className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                                                            >
                                                                <span className="font-bold">﷼</span>
                                                                سداد وتحويل الراتب
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => {
                                                                if (remainingCommission > 0) {
                                                                    showAlert("تنبيه", "يجب سداد العمولة المستحقة أولاً", "warning");
                                                                    return;
                                                                }
                                                                openPayModal('stop_work');
                                                            }}
                                                            className="px-6 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all flex items-center gap-2"
                                                        >
                                                            <StopCircle className="w-4 h-4" />
                                                            توقف عن العمل
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {(salaryType === 'commission' || salaryType === 'both') && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                                                    <div className="flex-1 text-center bg-green-50 rounded-xl p-2 border border-green-100">
                                                        <p className="text-xs text-green-600 font-bold mb-1">العمولة المستحقة (المتبقية)</p>
                                                        <p className="text-xl font-black text-green-700">{remainingCommission.toLocaleString()} ﷼</p>
                                                    </div>
                                                    {currentUser.role === 'golden' && (
                                                        <div className="flex flex-col gap-2 justify-center">
                                                            {remainingCommission > 0 && (
                                                                <button 
                                                                    onClick={() => openPayModal('commission')}
                                                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 text-xs"
                                                                >
                                                                    سداد العمولة
                                                                </button>
                                                            )}
                                                            
                                                            {/* Stop Work Button for Commission Only */}
                                                            {salaryType === 'commission' && (
                                                                <button 
                                                                    onClick={() => {
                                                                        if (remainingCommission > 0) {
                                                                            showAlert("تنبيه", "يجب سداد العمولة المستحقة أولاً", "warning");
                                                                            return;
                                                                        }
                                                                        openPayModal('stop_work');
                                                                    }}
                                                                    className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all flex items-center justify-center gap-2 text-xs"
                                                                >
                                                                    <StopCircle className="w-4 h-4" />
                                                                    توقف عن العمل
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="bg-white/50 rounded-2xl border border-white overflow-hidden">
                                                    <table className="w-full text-right text-sm">
                                                        <thead className="bg-gray-100 text-gray-600 font-bold">
                                                            <tr>
                                                                <th className="p-3">المعاملة</th>
                                                                <th className="p-3">التاريخ</th>
                                                                <th className="p-3">الربح</th>
                                                                <th className="p-3">حصة الموظف</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {empTransactions.length === 0 ? (
                                                                <tr><td colSpan={4} className="p-6 text-center text-gray-400">لا توجد معاملات منجزة لهذا الموظف</td></tr>
                                                            ) : (
                                                                empTransactions.map(t => {
                                                                    const clientPrice = parseFloat(t.clientPrice) || 0;
                                                                    const agentPrice = parseFloat(t.agentPrice) || 0;
                                                                    const profit = Math.max(0, clientPrice - agentPrice);
                                                                    const share = profit * ((parseFloat(commissionRate) || 0) / 100);
                                                                    return (
                                                                        <tr key={t.id} className="hover:bg-white transition-colors">
                                                                            <td className="p-3 font-bold text-gray-700">{t.type}</td>
                                                                            <td className="p-3 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString('ar-SA')}</td>
                                                                            <td className="p-3 font-bold text-blue-600">{profit}</td>
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

                                <div className="bg-[#eef2f6] p-6 rounded-3xl shadow-3d border border-white/50">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <History className="w-5 h-5 text-purple-600" />
                                        سجل الراتب والمدفوعات
                                    </h3>
                                    
                                    {empExpenses.length === 0 ? (
                                        <p className="text-center text-gray-400 py-6">لا توجد مدفوعات سابقة.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {empExpenses.map(exp => {
                                                const dateMatch = exp.title.match(/\|SD:(.*?)\|/);
                                                const storedStartDate = dateMatch ? dateMatch[1] : null;
                                                const endDateMatch = exp.title.match(/\|ED:(.*?)\|/);
                                                const storedEndDate = endDateMatch ? endDateMatch[1] : null;
                                                const cleanTitle = exp.title.replace(/\|SD:.*?\|/, '').replace(/\|ED:.*?\|/, '').trim();
                                                const isSalaryOrClearance = cleanTitle.includes('راتب') || cleanTitle.includes('تصفية') || cleanTitle.includes('مستحقات');
                                                const displayStartDate = storedStartDate || salaryStartDate;
                                                
                                                return (
                                                    <div key={exp.id} className="bg-white/60 p-3 rounded-2xl border border-white flex justify-between items-center hover:bg-white transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                                                                <Receipt className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-800 text-sm">{cleanTitle}</p>
                                                                <div className="flex gap-1 text-[10px] text-gray-500 mt-0.5">
                                                                    {isSalaryOrClearance && displayStartDate ? (
                                                                        <>
                                                                            <span className="text-red-500 font-bold">
                                                                                {new Date(displayStartDate).toLocaleDateString('ar-SA', {day: 'numeric', month: 'numeric'})}
                                                                            </span>
                                                                            <span> وحتي </span>
                                                                            <span>
                                                                                {storedEndDate 
                                                                                    ? new Date(storedEndDate).toLocaleDateString('ar-SA') 
                                                                                    : new Date(exp.date).toLocaleDateString('ar-SA')
                                                                                }
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span>{new Date(exp.date).toLocaleDateString('ar-SA')}</span>
                                                                            <span>•</span>
                                                                            <span>{exp.bank}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-black text-green-600">{exp.amount.toLocaleString()} ﷼</span>
                                                            {isSalaryOrClearance && (
                                                                <span className="text-[10px] text-gray-500 font-medium mt-0.5">{exp.bank}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </TabsContent>
      </Tabs>

      {/* ... (Modals remain unchanged) ... */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
          <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
              <DialogHeader>
                  <DialogTitle className="text-center text-xl font-bold text-gray-800">
                      {payType === 'salary' ? 'سداد الراتب الشهري' : 
                       payType === 'commission' ? 'سداد العمولة' : 'تصفية المستحقات (توقف عن العمل)'}
                  </DialogTitle>
              </DialogHeader>
              {paySuccess ? (
                  <div className="py-10 flex flex-col items-center justify-center animate-in zoom-in">
                      <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
                      <h3 className="text-xl font-bold text-green-700">تمت العملية بنجاح</h3>
                  </div>
              ) : (
                  <div className="py-4 space-y-4">
                      <div className="space-y-2">
                          <Label>المبلغ المستحق</Label>
                          <Input 
                              type="number" 
                              value={amountToPay} 
                              onChange={(e) => {
                                  if (payType === 'stop_work' || payType === 'salary') return;
                                  setAmountToPay(e.target.value)
                              }}
                              readOnly={payType === 'stop_work' || payType === 'salary'}
                              className={`bg-white shadow-3d-inset border-none text-center font-bold text-lg ${payType === 'stop_work' || payType === 'salary' ? 'opacity-80 bg-gray-50 cursor-not-allowed' : ''}`}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label>اختر البنك للخصم</Label>
                          <Select onValueChange={setPayBank} value={payBank}>
                              <SelectTrigger className="bg-white shadow-3d-inset border-none h-12 text-right flex-row-reverse">
                                  <SelectValue placeholder="اختر البنك" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                                  {banksList.map(bank => (
                                      <SelectItem key={bank} value={bank} className="text-right">
                                          <div className="flex justify-between w-full gap-4">
                                              <span>{bank}</span>
                                              <span className={`font-bold ${(balances[bank] || 0) >= parseFloat(amountToPay || '0') ? 'text-green-600' : 'text-red-500'}`}>
                                                  {(balances[bank] || 0).toLocaleString()} ﷼
                                              </span>
                                          </div>
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <button 
                          onClick={handleProcessPayment}
                          className={`w-full py-3 text-white rounded-xl font-bold shadow-lg transition-all ${payType === 'stop_work' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                      >
                          تأكيد {payType === 'stop_work' ? 'التصفية' : 'السداد'} ({amountToPay} ﷼)
                      </button>
                  </div>
              )}
          </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={(open) => {
          if(!open) {
              setSuccessMsg(false);
              setErrorMsg('');
          }
          setTransferOpen(open);
      }}>
        <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
          {/* ... (Transfer Modal Content) ... */}
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
                                الرصيد: {(balances[transferFrom] || 0).toLocaleString()} ﷼
                            </span>
                        )}
                    </div>
                    <Select onValueChange={setTransferFrom} value={transferFrom}>
                        <SelectTrigger className="bg-white shadow-3d-inset border-none h-12"><SelectValue placeholder="اختر البنك" /></SelectTrigger>
                        <SelectContent dir="rtl">
                        {banksList.map(b => (
                            <SelectItem key={b} value={b} className="text-right cursor-pointer my-1">
                                <div className="flex justify-between w-full gap-4">
                                    <span>{b}</span>
                                    <span className={`font-bold ${(balances[b] || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {(balances[b] || 0).toLocaleString()} ﷼
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
                                الرصيد: {(balances[transferTo] || 0).toLocaleString()} ﷼
                            </span>
                        )}
                    </div>
                    <Select onValueChange={setTransferTo} value={transferTo}>
                        <SelectTrigger className="bg-white shadow-3d-inset border-none h-12"><SelectValue placeholder="اختر البنك" /></SelectTrigger>
                        <SelectContent dir="rtl">
                        {banksList.map(b => (
                            <SelectItem key={b} value={b} className="text-right cursor-pointer my-1">
                                <div className="flex justify-between w-full gap-4">
                                    <span>{b}</span>
                                    <span className={`font-bold ${(balances[b] || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {(balances[b] || 0).toLocaleString()} ﷼
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
    </>
  );
}
