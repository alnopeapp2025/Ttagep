import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, CheckCircle, XCircle, DollarSign, Users, ArrowUpRight, ArrowDownLeft, Eye, FileText, UserCheck, ArrowRightLeft, UserPlus, Receipt, History, BarChart3, RotateCcw, TrendingDown, Wallet, Trash2 } from 'lucide-react';
import { 
    getStoredTransactions, Transaction, 
    getStoredAgentTransfers, AgentTransferRecord, 
    getCurrentUser, fetchTransactionsFromCloud, 
    getGlobalSettings, GlobalSettings, 
    getStoredEmployees, User,
    fetchClientsFromCloud, Client,
    fetchAgentsFromCloud, Agent,
    fetchExpensesFromCloud, Expense,
    deleteAllTransfers // Import delete function
} from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '@/lib/supabase';
import { AlertModal, ConfirmModal } from '@/components/CustomAlerts'; // Import Custom Alerts

export default function ReportsPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    todayCount: 0,
    todayProfit: 0,
    weekCount: 0,
    weekProfit: 0,
    monthCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    totalValue: 0,
    weekValue: 0,
    monthValue: 0,
    agentsTotal: 0,
    monthProfit: 0
  });

  const [agentTransfers, setAgentTransfers] = useState<AgentTransferRecord[]>([]);
  const [refunds, setRefunds] = useState<Transaction[]>([]);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [employeeTimeline, setEmployeeTimeline] = useState<any[]>([]);

  // Additional Data for Employee Log
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Details Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailList, setDetailList] = useState<Transaction[]>([]);

  // Alert & Confirm State
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title: string, message: string, type: 'success'|'error'|'warning'}>({
      isOpen: false, title: '', message: '', type: 'error'
  });
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({
      isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setSettings(getGlobalSettings());
    
    const loadData = async () => {
        let txs: Transaction[] = [];
        if (user) {
            const targetId = user.role === 'employee' && user.parentId ? user.parentId : user.id;
            
            // Parallel Fetching for performance
            const [fetchedTxs, fetchedClients, fetchedAgents, fetchedExpenses] = await Promise.all([
                fetchTransactionsFromCloud(targetId),
                fetchClientsFromCloud(targetId),
                fetchAgentsFromCloud(targetId),
                fetchExpensesFromCloud(targetId)
            ]);

            txs = fetchedTxs;
            setClients(fetchedClients);
            setAgents(fetchedAgents);
            setExpenses(fetchedExpenses);
            
            // Load employees for report
            const allEmps = getStoredEmployees();
            const myEmps = allEmps.filter(e => e.parentId === targetId);
            setEmployees(myEmps);

        } else {
            txs = getStoredTransactions();
        }
        
        setTransactions(txs);
        calculateStats(txs);
        setAgentTransfers(getStoredAgentTransfers());
        setRefunds(txs.filter(t => t.status === 'cancelled'));
    };
    loadData();
  }, []);

  // Real-time Subscriptions for Employee Log Updates
  useEffect(() => {
    if (!currentUser) return;

    const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;

    const channels = [
        supabase.channel('reports-clients-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `user_id=eq.${targetId}` }, () => fetchClientsFromCloud(targetId).then(setClients)).subscribe(),
        supabase.channel('reports-agents-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'agents', filter: `user_id=eq.${targetId}` }, () => fetchAgentsFromCloud(targetId).then(setAgents)).subscribe(),
        supabase.channel('reports-expenses-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${targetId}` }, () => fetchExpensesFromCloud(targetId).then(setExpenses)).subscribe(),
        supabase.channel('reports-txs-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${targetId}` }, () => fetchTransactionsFromCloud(targetId).then(data => { setTransactions(data); calculateStats(data); })).subscribe()
    ];

    return () => {
        channels.forEach(c => supabase.removeChannel(c));
    };
  }, [currentUser]);

  // Re-calculate timeline when any data changes if an employee is selected
  useEffect(() => {
      if (selectedEmployee) {
          handleEmployeeClick(selectedEmployee);
      }
  }, [transactions, clients, agents, expenses, agentTransfers]);

  const calculateStats = (txs: Transaction[]) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime(); // Start of week (Sunday)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let todayC = 0, weekC = 0, monthC = 0;
    let compC = 0, cancC = 0;
    let totalV = 0, weekV = 0, monthV = 0;
    let agentsV = 0;
    
    // Profit Calcs
    let todayRev = 0, todayCost = 0;
    let weekRev = 0, weekCost = 0;
    let monthRev = 0, monthCost = 0;

    txs.forEach(t => {
      const tDate = t.createdAt;
      
      // Always count cancellations for the counter
      if (t.status === 'cancelled') {
          cancC++;
          return; // Skip financial calculations for cancelled transactions
      }

      const clientPrice = parseFloat(t.clientPrice) || 0;
      const agentPrice = parseFloat(t.agentPrice) || 0;

      // Counts (Active or Completed)
      if (tDate >= startOfDay) todayC++;
      if (tDate >= startOfWeek) weekC++;
      if (tDate >= startOfMonth) monthC++;

      if (t.status === 'completed') compC++;

      // Values (Revenue) - Only for Active or Completed
      totalV += clientPrice;
      if (tDate >= startOfWeek) weekV += clientPrice;
      if (tDate >= startOfMonth) monthV += clientPrice;

      // Agent Totals (Cost)
      agentsV += agentPrice;

      // Profit Calculation (Revenue - Cost)
      if (tDate >= startOfDay) {
        todayRev += clientPrice;
        todayCost += agentPrice;
      }
      if (tDate >= startOfWeek) {
        weekRev += clientPrice;
        weekCost += agentPrice;
      }
      if (tDate >= startOfMonth) {
        monthRev += clientPrice;
        monthCost += agentPrice;
      }
    });

    setStats({
      todayCount: todayC,
      todayProfit: todayRev - todayCost,
      weekCount: weekC,
      weekProfit: weekRev - weekCost,
      monthCount: monthC,
      completedCount: compC,
      cancelledCount: cancC,
      totalValue: totalV,
      weekValue: weekV,
      monthValue: monthV,
      agentsTotal: agentsV,
      monthProfit: monthRev - monthCost
    });
  };

  const handleShowDetails = (type: string) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let filtered: Transaction[] = [];
    let title = '';

    switch(type) {
        case 'today':
            filtered = transactions.filter(t => t.createdAt >= startOfDay && t.status !== 'cancelled');
            title = 'معاملات اليوم';
            break;
        case 'week':
            filtered = transactions.filter(t => t.createdAt >= startOfWeek && t.status !== 'cancelled');
            title = 'معاملات الأسبوع';
            break;
        case 'month':
            filtered = transactions.filter(t => t.createdAt >= startOfMonth && t.status !== 'cancelled');
            title = 'معاملات الشهر';
            break;
        case 'completed':
            filtered = transactions.filter(t => t.status === 'completed');
            title = 'المعاملات المنجزة';
            break;
        case 'cancelled':
            filtered = transactions.filter(t => t.status === 'cancelled');
            title = 'المعاملات الملغاة';
            break;
        default:
            filtered = [];
    }

    setDetailList(filtered);
    setDetailTitle(title);
    setDetailOpen(true);
  };

  const handleDeleteAllTransfers = () => {
      setConfirmConfig({
          isOpen: true,
          title: "حذف سجل التحويلات",
          message: "هل أنت متأكد من حذف سجل تحويلات المعقبين بالكامل؟ لا يمكن التراجع عن هذا الإجراء.",
          onConfirm: async () => {
              if (!currentUser) return;
              const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
              const success = await deleteAllTransfers(targetId);
              if (success) {
                  setAgentTransfers([]);
                  setAlertConfig({ isOpen: true, title: "تم الحذف", message: "تم حذف السجل بنجاح", type: "success" });
              } else {
                  setAlertConfig({ isOpen: true, title: "خطأ", message: "حدث خطأ أثناء الحذف", type: "error" });
              }
          }
      });
  };

  const handleEmployeeClick = (emp: User) => {
      // 1. Transactions
      const empTxs = transactions.filter(t => 
          (t.createdBy && t.createdBy === emp.officeName) || 
          (!t.createdBy && t.agent === emp.officeName)
      ).map(t => ({ ...t, kind: 'transaction', displayType: 'إضافة معاملة' }));

      // 2. Transfers
      const empTransfers = agentTransfers.filter(tr => 
          tr.createdBy === emp.officeName
      ).map(tr => ({ ...tr, kind: 'transfer', displayType: 'تحويل رصيد' }));

      // 3. Clients Added
      const empClients = clients.filter(c => 
          c.createdBy === emp.officeName
      ).map(c => ({ ...c, kind: 'client', displayType: 'إضافة عميل' }));

      // 4. Agents Added
      const empAgents = agents.filter(a => 
          a.createdBy === emp.officeName
      ).map(a => ({ ...a, kind: 'agent', displayType: 'إضافة معقب' }));

      // 5. Expenses Added
      const empExpenses = expenses.filter(e => 
          e.createdBy === emp.officeName
      ).map(e => ({ ...e, kind: 'expense', displayType: 'تسجيل مصروف' }));

      // Combine and sort by date descending
      const combined = [...empTxs, ...empTransfers, ...empClients, ...empAgents, ...empExpenses].sort((a, b) => {
          const dateA = (a as any).date || (a as any).createdAt;
          const dateB = (b as any).date || (b as any).createdAt;
          return dateB - dateA;
      });

      setEmployeeTimeline(combined);
      setSelectedEmployee(emp);
  };

  // Filter Salary/Commission Expenses for Salary Log
  const getSalaryLog = () => {
      let filteredExpenses = expenses.filter(e => 
          e.title.includes('راتب') || e.title.includes('عمولة') || e.title.includes('مستحقات')
      );

      if (currentUser?.role === 'employee') {
          // Employee sees only their own salary logs
          filteredExpenses = filteredExpenses.filter(e => e.title.includes(currentUser.officeName));
      }
      
      return filteredExpenses.sort((a, b) => b.date - a.date);
  };

  const salaryLog = getSalaryLog();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const StatCard = ({ title, value, icon: Icon, colorClass, valueColorClass, subText, detailType, restricted }: any) => (
    <div className={`bg-[#eef2f6] rounded-2xl shadow-3d p-3 flex items-center gap-2 border border-white/50 relative group ${restricted ? 'opacity-70' : ''}`}>
      <div className={`w-8 h-8 rounded-xl shadow-3d-inset flex items-center justify-center ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-gray-500 text-[9px] font-bold mb-0.5">{title}</p>
        <h3 className={`text-base font-black ${valueColorClass || 'text-gray-800'}`}>
            {restricted ? '---' : value}
        </h3>
        {subText && <p className="text-[8px] text-gray-400">{subText}</p>}
      </div>

      {/* Eye Icon Overlay */}
      {detailType && !restricted && (
          <button 
            onClick={() => handleShowDetails(detailType)}
            className="absolute inset-0 bg-white/80 backdrop-blur-[1px] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 cursor-pointer"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-md border border-blue-200">
                <Eye className="w-5 h-5" />
            </div>
          </button>
      )}
    </div>
  );

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
      <header className="mb-4 flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600 transition-all"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-800 text-shadow">التقارير والإحصائيات</h1>
          <p className="text-gray-500 text-sm">نظرة شاملة على أداء المكتب</p>
        </div>
      </header>

      <Tabs defaultValue="general" className="w-full" dir="rtl">
        {/* New Grid Layout for Tabs */}
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-3 bg-transparent h-auto p-0 mb-8">
            <TabsTrigger 
                value="general" 
                className="flex flex-col items-center justify-center h-24 rounded-2xl bg-white border-2 border-transparent shadow-sm data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 text-gray-500 hover:bg-gray-50 transition-all gap-2"
            >
                <BarChart3 className="w-6 h-6" />
                <span className="font-bold text-sm">عام</span>
            </TabsTrigger>

            <TabsTrigger 
                value="agent-transfers" 
                className="flex flex-col items-center justify-center h-24 rounded-2xl bg-white border-2 border-transparent shadow-sm data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 text-gray-500 hover:bg-gray-50 transition-all gap-2"
            >
                <ArrowRightLeft className="w-6 h-6" />
                <span className="font-bold text-sm">تحويلات المعقبين</span>
            </TabsTrigger>

            <TabsTrigger 
                value="refunds" 
                className="flex flex-col items-center justify-center h-24 rounded-2xl bg-white border-2 border-transparent shadow-sm data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 text-gray-500 hover:bg-gray-50 transition-all gap-2"
            >
                <RotateCcw className="w-6 h-6" />
                <span className="font-bold text-sm">مرتجع العملاء</span>
            </TabsTrigger>

            <TabsTrigger 
                value="employees" 
                className="flex flex-col items-center justify-center h-24 rounded-2xl bg-white border-2 border-transparent shadow-sm data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 text-gray-500 hover:bg-gray-50 transition-all gap-2"
            >
                <Users className="w-6 h-6" />
                <span className="font-bold text-sm">تقارير الموظفين</span>
            </TabsTrigger>

            <TabsTrigger 
                value="salary-log" 
                className="flex flex-col items-center justify-center h-24 rounded-2xl bg-white border-2 border-transparent shadow-sm data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 text-gray-500 hover:bg-gray-50 transition-all gap-2"
            >
                <History className="w-6 h-6" />
                <span className="font-bold text-sm">سجل الرواتب</span>
            </TabsTrigger>

            <TabsTrigger 
                value="expenses" 
                className="flex flex-col items-center justify-center h-24 rounded-2xl bg-white border-2 border-transparent shadow-sm data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 text-gray-500 hover:bg-gray-50 transition-all gap-2"
            >
                <TrendingDown className="w-6 h-6" />
                <span className="font-bold text-sm">المصروفات</span>
            </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
            {/* Row 1: Today & Week (Transactions + Profits) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                {/* Today Pair */}
                <StatCard 
                    title="معاملات اليوم" 
                    value={stats.todayCount} 
                    icon={Calendar} 
                    colorClass="text-blue-500" 
                    detailType="today"
                />
                <StatCard 
                    title="أرباح اليوم" 
                    value={`${stats.todayProfit.toLocaleString()} ر.س`} 
                    icon={DollarSign} 
                    colorClass="text-green-600" 
                    valueColorClass="text-blue-600"
                    detailType="today"
                />

                {/* Week Pair */}
                <StatCard 
                    title="معاملات الأسبوع" 
                    value={stats.weekCount} 
                    icon={Calendar} 
                    colorClass="text-indigo-500" 
                    detailType="week"
                />
                <StatCard 
                    title="أرباح الأسبوع" 
                    value={`${stats.weekProfit.toLocaleString()} ر.س`} 
                    icon={DollarSign} 
                    colorClass="text-green-600" 
                    valueColorClass="text-blue-600"
                    detailType="week"
                />
            </div>

            {/* Row 2: Month & Others */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                <StatCard 
                    title="معاملات الشهر" 
                    value={stats.monthCount} 
                    icon={Calendar} 
                    colorClass="text-purple-500" 
                    detailType="month"
                />
                <StatCard 
                    title="أرباح الشهر الصافية" 
                    value={`${stats.monthProfit.toLocaleString()} ر.س`} 
                    icon={DollarSign} 
                    colorClass="text-green-600" 
                    valueColorClass="text-blue-600"
                    detailType="month"
                />
                 <StatCard 
                    title="تم الإنجاز" 
                    value={stats.completedCount} 
                    icon={CheckCircle} 
                    colorClass="text-green-500" 
                    subText="إجمالي المعاملات المكتملة"
                    detailType="completed"
                />
                 <StatCard 
                    title="تم الإلغاء" 
                    value={stats.cancelledCount} 
                    icon={XCircle} 
                    colorClass="text-red-500" 
                    subText="إجمالي المعاملات الملغاة"
                    detailType="cancelled"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <StatCard 
                    title="مجموع حساب المعقبين" 
                    value={`${stats.agentsTotal.toLocaleString()} ر.س`} 
                    icon={Users} 
                    colorClass="text-orange-500" 
                    subText="المبالغ المستحقة للمعقبين"
                />
            </div>

            <h3 className="text-lg font-bold text-gray-700 mb-3 mt-4">القيم المالية (النشطة والمنجزة)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-blue-600 text-white rounded-2xl shadow-3d p-4 text-center">
                    <p className="opacity-80 mb-1 font-medium text-[10px]">قيمة معاملات الأسبوع</p>
                    <h2 className="text-xl font-black">{stats.weekValue.toLocaleString()} ر.س</h2>
                </div>
                <div className="bg-indigo-600 text-white rounded-2xl shadow-3d p-4 text-center relative overflow-hidden">
                    <p className="opacity-80 mb-1 font-medium text-[10px]">قيمة معاملات الشهر</p>
                    <h2 className="text-xl font-black">{stats.monthValue.toLocaleString()} ر.س</h2>
                </div>
                <div className="bg-gray-800 text-white rounded-2xl shadow-3d p-4 text-center">
                    <p className="opacity-80 mb-1 font-medium text-[10px]">قيمة كل المعاملات</p>
                    <h2 className="text-xl font-black">{stats.totalValue.toLocaleString()} ر.س</h2>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="agent-transfers">
            {agentTransfers.length > 0 && (
                <div className="flex justify-end mb-4 px-2">
                    <button 
                        onClick={handleDeleteAllTransfers}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all shadow-sm border border-red-100"
                    >
                        <Trash2 className="w-4 h-4" />
                        حذف السجل بالكامل
                    </button>
                </div>
            )}
            <div className="space-y-3">
                {agentTransfers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-[#eef2f6] rounded-2xl shadow-3d-inset text-sm">
                        لا توجد تحويلات مسجلة للمعقبين بعد.
                    </div>
                ) : (
                    agentTransfers.map(record => (
                        <div key={record.id} className="bg-[#eef2f6] p-3 rounded-2xl shadow-3d flex justify-between items-center border border-white/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-sm">
                                    <ArrowUpRight className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">{record.agentName}</h3>
                                    <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5">
                                        <span>{new Date(record.date).toLocaleDateString('ar-SA')}</span>
                                        <span>•</span>
                                        <span>{record.transactionCount} معاملة</span>
                                        <span>•</span>
                                        <span>{record.bank}</span>
                                    </div>
                                    {record.createdBy && <p className="text-[9px] text-gray-400 mt-1">بواسطة: {record.createdBy}</p>}
                                </div>
                            </div>
                            <span className="font-bold text-blue-600 text-base">{record.amount.toLocaleString()} ر.س</span>
                        </div>
                    ))
                )}
            </div>
        </TabsContent>

        <TabsContent value="refunds">
            <div className="space-y-3">
                {refunds.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-[#eef2f6] rounded-2xl shadow-3d-inset text-sm">
                        لا توجد مسترجعات (معاملات ملغاة) حالياً.
                    </div>
                ) : (
                    refunds.map(tx => (
                        <div key={tx.id} className="bg-[#eef2f6] p-3 rounded-2xl shadow-3d flex justify-between items-center border border-white/50 opacity-75">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 shadow-sm">
                                    <ArrowDownLeft className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">{tx.clientName || 'عميل عام'}</h3>
                                    <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5">
                                        <span>{new Date(tx.createdAt).toLocaleDateString('ar-SA')}</span>
                                        <span>•</span>
                                        <span>{tx.type}</span>
                                        <span>•</span>
                                        <span className="text-red-500">ملغاة</span>
                                    </div>
                                </div>
                            </div>
                            <span className="font-bold text-red-600 text-base">{tx.clientPrice} ر.س</span>
                        </div>
                    ))
                )}
            </div>
        </TabsContent>

        <TabsContent value="employees">
            {employees.length === 0 ? (
                <div className="text-center py-12 bg-[#eef2f6] rounded-2xl shadow-3d-inset border border-white/50">
                    <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-700">لا يوجد موظفين</h3>
                    <p className="text-sm text-gray-500 mt-2">اضغط على ملفك الشخصي وأضف موظف</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Employee List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {employees.map(emp => (
                            <div 
                                key={emp.id} 
                                onClick={() => handleEmployeeClick(emp)}
                                className={`p-4 rounded-2xl shadow-3d border border-white/50 cursor-pointer transition-all ${selectedEmployee?.id === emp.id ? 'bg-blue-50 border-blue-200' : 'bg-[#eef2f6] hover:bg-white'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                        {emp.officeName.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{emp.officeName}</h3>
                                        <p className="text-xs text-gray-500 font-mono">{emp.phone}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Employee Detailed Report */}
                    {selectedEmployee && (
                        <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                سجل حركات الموظف: {selectedEmployee.officeName}
                            </h3>
                            
                            {employeeTimeline.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">لا توجد حركات مسجلة لهذا الموظف.</p>
                            ) : (
                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                    {/* Header */}
                                    <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 px-3 pb-2 border-b border-gray-200">
                                        <div className="col-span-3">النوع</div>
                                        <div className="col-span-4">التفاصيل</div>
                                        <div className="col-span-3">التاريخ</div>
                                        <div className="col-span-2 text-left">المبلغ/الرقم</div>
                                    </div>
                                    
                                    {/* Rows */}
                                    {employeeTimeline.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white/50 p-3 rounded-xl border border-white hover:bg-white transition-colors text-sm">
                                            <div className="col-span-3">
                                                {item.kind === 'transaction' ? (
                                                    <span className="flex items-center gap-1 text-blue-600 font-bold text-[10px]"><FileText className="w-3 h-3" /> معاملة</span>
                                                ) : item.kind === 'transfer' ? (
                                                    <span className="flex items-center gap-1 text-orange-600 font-bold text-[10px]"><ArrowRightLeft className="w-3 h-3" /> تحويل</span>
                                                ) : item.kind === 'client' ? (
                                                    <span className="flex items-center gap-1 text-green-600 font-bold text-[10px]"><UserPlus className="w-3 h-3" /> عميل</span>
                                                ) : item.kind === 'agent' ? (
                                                    <span className="flex items-center gap-1 text-purple-600 font-bold text-[10px]"><UserCheck className="w-3 h-3" /> معقب</span>
                                                ) : item.kind === 'expense' ? (
                                                    <span className="flex items-center gap-1 text-red-600 font-bold text-[10px]"><Receipt className="w-3 h-3" /> مصروف</span>
                                                ) : null}
                                            </div>
                                            <div className="col-span-4 font-bold text-gray-800 truncate text-[10px]">
                                                {item.kind === 'transaction' ? (
                                                    <span>{item.type} - {item.clientName}</span>
                                                ) : item.kind === 'transfer' ? (
                                                    <span>للمعقب: {item.agentName}</span>
                                                ) : item.kind === 'client' ? (
                                                    <span>{item.name}</span>
                                                ) : item.kind === 'agent' ? (
                                                    <span>{item.name}</span>
                                                ) : item.kind === 'expense' ? (
                                                    <span>{item.title.replace(/\|SD:.*?\|/, '').replace(/\|ED:.*?\|/, '').trim()}</span>
                                                ) : null}
                                            </div>
                                            <div className="col-span-3 text-[9px] text-gray-500 flex flex-col">
                                                <span>{new Date(item.date || item.createdAt).toLocaleDateString('ar-SA')}</span>
                                                <span>{new Date(item.date || item.createdAt).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className="col-span-2 text-left font-bold text-gray-700 text-[10px]">
                                                {item.kind === 'transaction' ? item.clientPrice : 
                                                 item.kind === 'transfer' ? item.amount : 
                                                 item.kind === 'expense' ? item.amount : '-'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </TabsContent>

        <TabsContent value="salary-log">
            <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50 min-h-[400px]">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <History className="w-5 h-5 text-green-700" />
                    سجل الرواتب والعمولات
                </h3>
                
                {salaryLog.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-[#eef2f6] rounded-2xl shadow-3d-inset text-sm">
                        لا توجد سجلات رواتب أو عمولات حالياً.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {salaryLog.map(exp => {
                            // Extract stored date
                            const dateMatch = exp.title.match(/\|SD:(.*?)\|/);
                            const storedStartDate = dateMatch ? dateMatch[1] : null;
                            
                            // Extract stored End Date
                            const endDateMatch = exp.title.match(/\|ED:(.*?)\|/);
                            const storedEndDate = endDateMatch ? endDateMatch[1] : null;

                            const cleanTitle = exp.title.replace(/\|SD:.*?\|/, '').replace(/\|ED:.*?\|/, '').trim();

                            const isSalaryOrClearance = cleanTitle.includes('راتب') || cleanTitle.includes('تصفية') || cleanTitle.includes('مستحقات');
                            
                            // Use stored date if available, else fallback to current config (for legacy/display)
                            const displayStartDate = storedStartDate;

                            return (
                                <div key={exp.id} className="bg-white/60 p-4 rounded-2xl border border-white flex justify-between items-center hover:bg-white transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm">
                                            <Receipt className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">{cleanTitle}</h4>
                                            <div className="flex gap-2 text-[10px] text-gray-500 mt-1">
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
                                                        <span className="text-blue-500 font-medium">{exp.bank}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="font-black text-lg text-green-600">
                                        {exp.amount.toLocaleString()} ﷼
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </TabsContent>

        <TabsContent value="expenses">
            <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-6 border border-white/50 min-h-[400px]">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    سجل المصروفات العامة
                </h3>
                
                {expenses.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-[#eef2f6] rounded-2xl shadow-3d-inset text-sm">
                        لا توجد مصروفات مسجلة حالياً.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {expenses.map(exp => (
                            <div key={exp.id} className="bg-white/60 p-4 rounded-2xl border border-white flex justify-between items-center hover:bg-white transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 shadow-sm">
                                        <Receipt className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">{exp.title.replace(/\|SD:.*?\|/, '').replace(/\|ED:.*?\|/, '').trim()}</h4>
                                        <div className="flex gap-2 text-[10px] text-gray-500 mt-1">
                                            <span>{new Date(exp.date).toLocaleDateString('ar-SA')}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1"><Wallet className="w-3 h-3"/> {exp.bank || 'غير محدد'}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="font-black text-lg text-red-600">
                                    -{exp.amount.toLocaleString()} ﷼
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </TabsContent>

      </Tabs>

      {/* Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-[#eef2f6] border-none shadow-3d max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
                <DialogTitle className="text-center font-bold text-gray-800">{detailTitle}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
                {detailList.length === 0 ? (
                    <p className="text-center text-gray-500">لا توجد بيانات.</p>
                ) : (
                    detailList.map(tx => (
                        <div key={tx.id} className="bg-white/50 p-3 rounded-xl flex justify-between items-center border border-white">
                            <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <div>
                                    <p className="font-bold text-sm text-gray-700">{tx.type}</p>
                                    <div className="flex gap-2 text-[10px] text-gray-500">
                                        <span>{tx.clientName}</span>
                                        <span>•</span>
                                        <span>{new Date(tx.createdAt).toLocaleDateString('ar-SA')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-left">
                                <span className={`font-bold ${tx.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'}`}>
                                    {tx.clientPrice} ر.س
                                </span>
                                <div className="text-[10px] font-bold">
                                    {tx.status === 'completed' ? <span className="text-green-600">منجزة</span> : 
                                     tx.status === 'cancelled' ? <span className="text-red-500">ملغاة</span> : 
                                     <span className="text-orange-500">نشطة</span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </DialogContent>
      </Dialog>

    </div>
    </>
  );
}
