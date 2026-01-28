import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet, Trash2, Landmark, ArrowLeftRight, Check, AlertCircle, CheckCircle2, FileText, Users, Calendar, Clock, Percent, Crown, User as UserIcon, ArrowUpRight, ArrowDownLeft, Send, X, StopCircle, Save, Receipt, History, Archive } from 'lucide-react';
import { 
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
  Expense,
  getBankNames,
  deleteEmployee
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

// --- Helper Functions for Salary Logic ---

const getNextCycleDate = (startDateStr: string) => {
    if (!startDateStr) return null;
    
    // Parse as UTC to avoid timezone offsets affecting the day
    const parts = startDateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // 0-indexed
    const day = parseInt(parts[2]);
    
    // Create UTC date for the start
    const date = new Date(Date.UTC(year, month, day));

    if (day === 1) {
        // Case 1: Starts on 1st -> Cycle ends at end of month (Next cycle starts 1st of next month)
        // e.g., 2025-01-01 -> 2025-02-01
        return new Date(Date.UTC(year, month + 1, 1));
    } else {
        // Case 2: Other days -> Fixed 30 days cycle
        return new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
};

// NEW: Helper to get the END date of the current cycle
const getCurrentCycleEndDate = (startDateStr: string) => {
    if (!startDateStr) return null;
    const nextCycleStart = getNextCycleDate(startDateStr);
    if (!nextCycleStart) return null;
    
    // End date is 1 day before next cycle start
    return new Date(nextCycleStart.getTime() - 24 * 60 * 60 * 1000);
};

// Helper for Countdown
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

            // Generate Period Text (e.g., 12/1 to 2025/12/31)
            const startObj = new Date(startDate);
            const formattedStart = `${startObj.getMonth() + 1}/${startObj.getDate()}`;
            const formattedEnd = cycleEndDate.toLocaleDateString('en-GB'); // YYYY/MM/DD or DD/MM/YYYY depending on locale, let's force format
            // Force YYYY/MM/DD for clarity or standard date string
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
            {/* Period Date Display */}
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
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

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
  const [isLocked, setIsLocked] = useState(false); 
  const [isStopped, setIsStopped] = useState(false); // New state for stopped employees
  
  // Pay Salary/Commission State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payType, setPayType] = useState<'salary' | 'commission' | 'stop_work'>('salary');
  const [payBank, setPayBank] = useState('');
  const [amountToPay, setAmountToPay] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);

  // Dynamic Bank List
  const [banksList, setBanksList] = useState<string[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setSettings(getGlobalSettings());
    setBanksList(getBankNames()); // Load dynamic bank names

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
            setAllExpenses(exps);

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
                    title: `صرف: ${e.title.replace(/\|SD:.*?\|/, '').replace(/\|ED:.*?\|/, '').trim()}`, 
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
            
            // If logged in as employee, auto-select self
            if (user.role === 'employee') {
                setSelectedEmpId(user.id.toString());
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
              setIsLocked(parsed.isLocked || false);
              setIsStopped(parsed.isStopped || false);
          } else {
              // Reset if no config
              setSalaryStartDate('');
              setSalaryType('monthly');
              setCommissionRate('');
              setSalaryAmount('');
              setIsLocked(false);
              setIsStopped(false);
          }
      }
  }, [selectedEmpId]);

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
    const zeroed = banksList.reduce((acc, bank) => ({ ...acc, [bank]: 0 }), {});
    
    setBalances(zeroed);
    setPendingBalances(zeroed);
    calculateTotals(zeroed, zeroed);

    if (currentUser) {
        const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
        for (const bank of banksList) {
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
  const sortedBanks = [...banksList].sort((a, b) => {
    const totalA = (balances[a] || 0) + (pendingBalances[a] || 0);
    const totalB = (balances[b] || 0) + (pendingBalances[b] || 0);
    return totalB - totalA;
  });

  // --- Salary & Commission Logic ---

  const getSelectedEmployee = () => employees.find(e => e.id.toString() === selectedEmpId);

  // 1. Calculate Commission (Only Completed Transactions)
  const getEmployeeTransactions = () => {
      if (!selectedEmpId) return [];
      const emp = getSelectedEmployee();
      if (!emp) return [];
      
      // Filter: Created by Employee OR Agent is Employee
      // AND Status is COMPLETED (Requirement)
      return transactions.filter(t => 
          ((t.createdBy && t.createdBy === emp.officeName) || 
          (!t.createdBy && t.agent === emp.officeName)) &&
          t.status === 'completed' // Only completed count for commission
      );
  };

  const empTransactions = getEmployeeTransactions();
  
  // Total Commission Generated (UPDATED LOGIC: Client Price - Agent Price)
  const empCommissionTotal = empTransactions.reduce((sum, t) => {
      const clientPrice = parseFloat(t.clientPrice) || 0;
      const agentPrice = parseFloat(t.agentPrice) || 0;
      const profit = Math.max(0, clientPrice - agentPrice); // Ensure no negative commission
      const rate = parseFloat(commissionRate) || 0;
      return sum + (profit * (rate / 100));
  }, 0);

  // 2. Calculate Paid Salary/Commission (From Expenses)
  const getEmployeeExpenses = () => {
      if (!selectedEmpId) return [];
      const emp = getSelectedEmployee();
      if (!emp) return [];
      
      // Filter expenses related to this employee (Salary or Commission)
      return allExpenses.filter(e => 
          e.title.includes(emp.officeName) && 
          (e.title.includes('راتب') || e.title.includes('عمولة') || e.title.includes('مستحقات'))
      );
  };

  const empExpenses = getEmployeeExpenses();
  
  // Calculate how much commission has been paid already
  const empCommissionPaid = empExpenses
      .filter(e => e.title.includes('عمولة'))
      .reduce((sum, e) => sum + e.amount, 0);

  const remainingCommission = Math.max(0, empCommissionTotal - empCommissionPaid);

  // Date Constraints - Updated to 12 Months
  const today = new Date().toISOString().split('T')[0];
  const last12Months = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Check if salary is due (Using new logic)
  const isSalaryDue = () => {
      if (!salaryStartDate) return false;
      const nextPayDate = getNextCycleDate(salaryStartDate);
      if (!nextPayDate) return false;
      
      const now = Date.now();
      return now >= nextPayDate.getTime();
  };

  const handleSaveConfig = () => {
      // Check Permission: Only Admin/Golden can save config
      if (currentUser?.role === 'employee') {
          alert("هذه الخاصية متاحة فقط لمدير المكتب أو المسؤول أو العضو الذي أصدر عضوية الموظف");
          return;
      }

      if (!selectedEmpId || !salaryStartDate) return;
      
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
      alert('تم حفظ البيانات وتثبيتها بنجاح');
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
          // Calculate Pro-rated Salary
          if (!salaryStartDate || !salaryAmount) {
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
      let title = '';
      // Store start date in title for historical accuracy
      const dateTag = salaryStartDate ? `|SD:${salaryStartDate}|` : '';
      
      // Calculate End Date for Salary
      let endDateTag = '';
      if (payType === 'salary' && salaryStartDate) {
          const endDate = getCurrentCycleEndDate(salaryStartDate);
          if (endDate) {
              const endStr = endDate.toISOString().split('T')[0];
              endDateTag = `|ED:${endStr}|`;
          }
      } else if (payType === 'stop_work') {
          // For stop work, end date is today
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
          await updateAccountInCloud(targetId, payBank, newBalances[payBank], pendingBalances[payBank] || 0);
          
          // Refresh Expenses locally to update log immediately
          setAllExpenses(prev => [newExp, ...prev]);
      }

      setPaySuccess(true);
      setTimeout(() => {
          setPaySuccess(false);
          setPayModalOpen(false);
          
          // Post-Payment Actions
          if (payType === 'salary') {
              // Update Start Date to Next Cycle (Start of next month/cycle)
              const nextCycleStart = getNextCycleDate(salaryStartDate);
              if (nextCycleStart) {
                  const nextStartStr = nextCycleStart.toISOString().split('T')[0];
                  setSalaryStartDate(nextStartStr);
                  const config = { startDate: nextStartStr, type: salaryType, rate: commissionRate, amount: salaryAmount, isLocked: true, isStopped: false };
                  localStorage.setItem(`salary_config_${selectedEmpId}`, JSON.stringify(config));
              }
          } else if (payType === 'stop_work') {
              // Mark as Stopped instead of clearing
              const config = { startDate: salaryStartDate, type: salaryType, rate: commissionRate, amount: salaryAmount, isLocked: true, isStopped: true };
              localStorage.setItem(`salary_config_${selectedEmpId}`, JSON.stringify(config));
              setIsStopped(true);
          }
      }, 2000);
  };

  const handleArchiveEmployee = () => {
      if(!selectedEmpId) return;
      if(confirm('سيتم حذف الموظف نهائياً وقفل حسابه ونقل البيانات والرواتب إلى الأرشيف. هل أنت متأكد؟')) {
          deleteEmployee(parseInt(selectedEmpId));
          localStorage.removeItem(`salary_config_${selectedEmpId}`);
          
          // Refresh Employees List
          const allEmps = getStoredEmployees();
          const targetId = currentUser?.role === 'employee' && currentUser?.parentId ? currentUser.parentId : currentUser?.id;
          const myEmps = allEmps.filter(e => e.parentId === targetId);
          setEmployees(myEmps);
          
          // Reset Selection
          setSelectedEmpId('');
          setSalaryStartDate('');
          setSalaryType('monthly');
          setCommissionRate('');
          setSalaryAmount('');
          setIsLocked(false);
          setIsStopped(false);
      }
  };

  // Filter employees for display
  const displayedEmployees = currentUser?.role === 'employee' 
      ? employees.filter(e => e.id === currentUser.id)
      : employees;

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

                {/* Check if Golden & Has Employees (or is Employee) */}
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
                        {/* Employee Icons Selection */}
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
                                
                                {/* Configuration Form */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>تاريخ بداية العمل</Label>
                                        <div className="relative">
                                            <Input 
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

                                    {/* Salary Type Selection */}
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

                                    {/* Salary Amount Input */}
                                    {(salaryType === 'monthly' || salaryType === 'both') && (
                                        <div className="space-y-2">
                                            <Label>قيمة الراتب الشهري</Label>
                                            <div className="relative">
                                                <Input 
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

                                    {/* Commission Rate Input */}
                                    {(salaryType === 'commission' || salaryType === 'both') && (
                                        <div className="space-y-2">
                                            <Label>نسبة الموظف (%)</Label>
                                            <div className="relative">
                                                <Input 
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

                                    {/* Save Button (Only if not locked) */}
                                    {!isLocked && (
                                        <button 
                                            onClick={handleSaveConfig}
                                            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Save className="w-4 h-4" />
                                            حفظ وتثبيت البيانات
                                        </button>
                                    )}

                                    {/* Archive Button (Only if Stopped) */}
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

                                {/* Active Salary Dashboard (Only if Locked AND Not Stopped) */}
                                {isLocked && !isStopped && (
                                    <div className="space-y-6 border-t border-gray-200 pt-6">
                                        
                                        {/* Timer Section */}
                                        {(salaryType === 'monthly' || salaryType === 'both') && (
                                            <div className="bg-white p-6 rounded-2xl shadow-3d-inset text-center space-y-2 border border-blue-100">
                                                <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                                                    <Clock className="w-6 h-6" />
                                                    <h4 className="font-bold text-lg">موعد الراتب القادم</h4>
                                                </div>
                                                <SalaryTimer startDate={salaryStartDate} />
                                                
                                                {/* Action Buttons for Golden Member */}
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
                                                                    alert("يجب سداد العمولة المستحقة أولاً");
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

                                        {/* Commission Table */}
                                        {(salaryType === 'commission' || salaryType === 'both') && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                                                    <div className="flex-1 text-center bg-green-50 rounded-xl p-2 border border-green-100">
                                                        <p className="text-xs text-green-600 font-bold mb-1">العمولة المستحقة (المتبقية)</p>
                                                        <p className="text-xl font-black text-green-700">{remainingCommission.toLocaleString()} ﷼</p>
                                                    </div>
                                                    {currentUser.role === 'golden' && remainingCommission > 0 && (
                                                        <button 
                                                            onClick={() => openPayModal('commission')}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 text-xs"
                                                        >
                                                            سداد العمولة
                                                        </button>
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

                                {/* Salary Log (Always Visible for Selected Employee) */}
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
                                                // Extract stored date
                                                const dateMatch = exp.title.match(/\|SD:(.*?)\|/);
                                                const storedStartDate = dateMatch ? dateMatch[1] : null;
                                                
                                                // Extract stored End Date
                                                const endDateMatch = exp.title.match(/\|ED:(.*?)\|/);
                                                const storedEndDate = endDateMatch ? endDateMatch[1] : null;

                                                const cleanTitle = exp.title.replace(/\|SD:.*?\|/, '').replace(/\|ED:.*?\|/, '').trim();

                                                const isSalaryOrClearance = cleanTitle.includes('راتب') || cleanTitle.includes('تصفية') || cleanTitle.includes('مستحقات');
                                                
                                                // Use stored date if available, else fallback to current config (for legacy/display)
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
                                                                                    : new Date(exp.date).toLocaleDateString('ar-SA') // Fallback
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

      {/* Pay Modal (Salary / Commission / Stop Work) */}
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
                                  // If stop_work OR salary, prevent changing the amount (must pay full due)
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
  );
}
