import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, CheckCircle, XCircle, DollarSign, Users, ArrowUpRight, ArrowDownLeft, Eye, FileText, Lock } from 'lucide-react';
import { getStoredTransactions, Transaction, getStoredAgentTransfers, AgentTransferRecord, getCurrentUser, fetchTransactionsFromCloud, getGlobalSettings, GlobalSettings } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  // Details Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailList, setDetailList] = useState<Transaction[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setSettings(getGlobalSettings());
    
    const loadData = async () => {
        let txs: Transaction[] = [];
        if (user) {
            txs = await fetchTransactionsFromCloud(user.id);
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

  const canAccessFeature = (feature: keyof GlobalSettings['featurePermissions']) => {
    if (!settings) return true;
    const userRole = currentUser?.role || 'visitor';
    // @ts-ignore
    return settings.featurePermissions[feature].includes(userRole);
  };

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
      const clientPrice = parseFloat(t.clientPrice) || 0;
      const agentPrice = parseFloat(t.agentPrice) || 0;

      // Counts
      if (tDate >= startOfDay) todayC++;
      if (tDate >= startOfWeek) weekC++;
      if (tDate >= startOfMonth) monthC++;

      if (t.status === 'completed') compC++;
      if (t.status === 'cancelled') cancC++;

      // Values (Revenue)
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
            filtered = transactions.filter(t => t.createdAt >= startOfDay);
            title = 'معاملات اليوم';
            break;
        case 'week':
            filtered = transactions.filter(t => t.createdAt >= startOfWeek);
            title = 'معاملات الأسبوع';
            break;
        case 'month':
            filtered = transactions.filter(t => t.createdAt >= startOfMonth);
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

      {restricted && (
          <div className="absolute top-2 left-2">
              <Lock className="w-3 h-3 text-yellow-500" />
          </div>
      )}

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
        <TabsList className="grid w-full grid-cols-3 mb-4 bg-[#eef2f6] shadow-3d-inset rounded-xl p-1">
            <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">عام</TabsTrigger>
            <TabsTrigger value="agent-transfers" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">تحويلات المعقبين</TabsTrigger>
            <TabsTrigger value="refunds" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">مسترجعات العملاء</TabsTrigger>
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
                    restricted={!canAccessFeature('monthStats')}
                />
                <StatCard 
                    title="أرباح الشهر الصافية" 
                    value={`${stats.monthProfit.toLocaleString()} ر.س`} 
                    icon={DollarSign} 
                    colorClass="text-green-600" 
                    valueColorClass="text-blue-600"
                    detailType="month"
                    restricted={!canAccessFeature('monthStats')}
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

            <h3 className="text-lg font-bold text-gray-700 mb-3 mt-4">القيم المالية</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-blue-600 text-white rounded-2xl shadow-3d p-4 text-center">
                    <p className="opacity-80 mb-1 font-medium text-[10px]">قيمة معاملات الأسبوع</p>
                    <h2 className="text-xl font-black">{stats.weekValue.toLocaleString()} ر.س</h2>
                </div>
                <div className="bg-indigo-600 text-white rounded-2xl shadow-3d p-4 text-center relative overflow-hidden">
                    <p className="opacity-80 mb-1 font-medium text-[10px]">قيمة معاملات الشهر</p>
                    <h2 className="text-xl font-black">{canAccessFeature('monthStats') ? `${stats.monthValue.toLocaleString()} ر.س` : '---'}</h2>
                    {!canAccessFeature('monthStats') && <Lock className="absolute top-2 right-2 w-4 h-4 text-white/50" />}
                </div>
                <div className="bg-gray-800 text-white rounded-2xl shadow-3d p-4 text-center">
                    <p className="opacity-80 mb-1 font-medium text-[10px]">قيمة كل المعاملات</p>
                    <h2 className="text-xl font-black">{stats.totalValue.toLocaleString()} ر.س</h2>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="agent-transfers">
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
  );
}
