import { supabase } from './supabase';

// --- Constants ---
export const DEFAULT_BANKS_LIST = [
  "الراجحي", "الأهلي", "الإنماء", "البلاد", "بنك stc", 
  "الرياض", "الجزيرة", "ساب", "نقداً كاش", "بنك آخر"
];

export const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الظهران", 
  "الأحساء", "الطائف", "تبوك", "بريدة", "خميس مشيط", "أبها", "حائل", "جازان", 
  "نجران", "الجبيل", "الخرج", "عرعر", "ينبع", "عنيزة", "سكاكا", "القريات", "الباحة", "أخرى"
];

export const INITIAL_BALANCES: Record<string, number> = DEFAULT_BANKS_LIST.reduce((acc, bank) => ({ ...acc, [bank]: 0 }), {});

// --- Types ---
export interface Transaction {
  id: number;
  serialNo: string;
  type: string;
  clientPrice: string;
  agentPrice: string;
  agent: string;
  clientName?: string;
  duration: string;
  paymentMethod: string;
  createdAt: number;
  targetDate: number;
  status: 'active' | 'completed' | 'cancelled';
  agentPaid?: boolean;
  clientRefunded?: boolean;
  createdBy?: string; 
}

export interface User {
  id: number;
  officeName: string;
  phone: string;
  passwordHash: string; 
  securityQuestion: string;
  securityAnswer: string;
  createdAt: number;
  role?: 'member' | 'golden' | 'employee'; 
  parentId?: number; 
  permissions?: string[]; 
  subscriptionExpiry?: number; 
  affiliateBalance?: number;
  referredBy?: number;
  isSupervisor?: boolean; // New Supervisor Flag
}

export interface Client {
  id: number;
  name: string;
  phone?: string;     
  whatsapp?: string;  
  createdAt: number;
  createdBy?: string; 
}

export interface Agent {
  id: number;
  name: string;
  phone?: string;     
  whatsapp?: string;  
  createdAt: number;
  createdBy?: string; 
}

export interface Expense {
  id: number;
  title: string;
  amount: number;
  bank: string;
  date: number;
  createdBy?: string; 
}

export interface ExternalAgent {
  id: number;
  userId?: number;
  name: string;
  phone: string;
  whatsapp?: string;
  services?: string[];
  createdAt: number;
}

export interface Lesson {
  id: number;
  title: string;
  content: string;
  createdAt: number;
}

export interface AgentTransferRecord {
  id: number;
  agentName: string;
  amount: number;
  bank: string;
  date: number;
  transactionCount: number;
  createdBy?: string; 
}

export interface ClientRefundRecord {
  id: number;
  clientName: string;
  amount: number;
  bank: string;
  date: number;
  transactionCount: number;
  createdBy?: string;
}

export interface WithdrawalRequest {
    id: number;
    userId: number;
    userName: string;
    amount: number;
    bankAccount: string;
    status: 'pending' | 'completed';
    createdAt: number;
}

export interface OfficeListing {
    id: number;
    userId: number;
    officeName: string;
    phone: string;
    whatsapp: string;
    workType: 'online' | 'office';
    city?: string;
    services: string[];
    isGolden: boolean;
    createdAt: number;
}

export interface GoldenUserRecord {
    userId: number;
    expiry: number;
    userName: string;
}

// --- Admin & Settings Types ---
export type UserRole = 'visitor' | 'member' | 'golden' | 'employee';

export interface SubscriptionRequest {
  id: number;
  userId: number;
  userName: string;
  phone: string;
  duration: 'شهر' | 'سنة';
  status: 'pending' | 'approved';
  createdAt: number;
  bank?: string; 
  user_id?: number; 
  user_name?: string;
  senderName?: string;
}

export interface BankAccount {
    id: number;
    name: string;
    accountNumber: string;
}

export interface PackageDetails {
    price: number;
    benefits: string[];
}

export interface SeoSettings {
    title: string;
    description: string;
    keywords: string;
}

export interface GlobalSettings {
  adminPasswordHash: string;
  siteTitle: string;
  marquee: {
      text: string;
      bgColor: string;
      textColor: string;
  };
  limits: {
      visitor: { transactions: number; clients: number; agents: number; expenses: number; };
      member: { transactions: number; clients: number; agents: number; expenses: number; };
      golden: { transactions: number; clients: number; agents: number; expenses: number; };
  };
  banks: BankAccount[];
  packages: {
      monthly: PackageDetails;
      annual: PackageDetails;
  };
  pagePermissions: {
    transactions: UserRole[];
    accounts: UserRole[];
    reports: UserRole[];
    clients: UserRole[];
    agents: UserRole[];
    achievers: UserRole[];
    expenses: UserRole[];
    calculator: UserRole[];
    summary: UserRole[];
  };
  featurePermissions: {
    backup: UserRole[];         
    employeeLogin: UserRole[];  
    whatsapp: UserRole[];       
    print: UserRole[];          
    transfer: UserRole[];       
    deleteExpense: UserRole[];  
    achieversNumbers: UserRole[]; 
    lessons: UserRole[];        
    monthStats: UserRole[];     
  };
  onboardingSteps: string[];
  deletePageTexts?: {
      description: string;
      warning: string;
      footer: string;
  };
  seo: SeoSettings;
}

// --- Local Storage Helpers ---
const TX_KEY = 'moaqeb_transactions_v1';
const BAL_KEY = 'moaqeb_balances_v1';
const PENDING_BAL_KEY = 'moaqeb_pending_balances_v1';
const CLIENTS_KEY = 'moaqeb_clients_v1';
const AGENTS_KEY = 'moaqeb_agents_v1';
const EXPENSES_KEY = 'moaqeb_expenses_v1';
const EXT_AGENTS_KEY = 'moaqeb_ext_agents_v1';
const LESSONS_KEY = 'moaqeb_lessons_v1';
const AGENT_TRANSFERS_KEY = 'moaqeb_agent_transfers_v1';
const CLIENT_REFUNDS_KEY = 'moaqeb_client_refunds_v1';
const CURRENT_USER_KEY = 'moaqeb_current_user_v1'; 
const LAST_BACKUP_KEY = 'moaqeb_last_backup_v1';
const SETTINGS_KEY = 'moaqeb_global_settings_v7'; 
const SUB_REQUESTS_KEY = 'moaqeb_sub_requests_v1';
const GOLDEN_USERS_KEY = 'moaqeb_golden_users_v2'; 

const hashPassword = (pwd: string) => {
  return btoa(pwd).split('').reverse().join(''); 
};

const DEFAULT_SETTINGS: GlobalSettings = {
  adminPasswordHash: hashPassword('1234'),
  siteTitle: 'مان هويات لمكاتب الخدمات',
  marquee: {
      text: 'مرحباً بكم في تطبيق مان هويات لمكاتب الخدمات',
      bgColor: '#DC2626', // red-600
      textColor: '#FFFFFF' // white
  },
  limits: {
      visitor: { transactions: 5, clients: 3, agents: 2, expenses: 5 },
      member: { transactions: 20, clients: 10, agents: 5, expenses: 20 },
      golden: { transactions: 10000, clients: 10000, agents: 10000, expenses: 10000 }
  },
  banks: [
      { id: 1, name: "الراجحي", accountNumber: "1234567890123456" },
      { id: 2, name: "الأهلي", accountNumber: "9876543210987654" },
      { id: 3, name: "الإنماء", accountNumber: "4561237890123456" },
      { id: 4, name: "الرياض", accountNumber: "7894561230123456" }
  ],
  packages: {
      monthly: {
          price: 59,
          benefits: [
            "معاملات لا محدودة",
            "تقارير متكاملة",
            "عملاء بلا حدود",
            "معقبين بلا حدود",
            "نسخ احتياطي مؤمن",
            "10 أرقام معقبين منجزين",
            "10 دروس تعليمية",
            "حسابات تفصيلية للتحويلات"
          ]
      },
      annual: {
          price: 299,
          benefits: [
            "جميع مزايا الباقة الشهرية",
            "50 رقم معقب منجز",
            "50 درس تعقيب خاص",
            "أرقام مكاتب خدمات للتعاون",
            "تقارير تفصيلية"
          ]
      }
  },
  pagePermissions: {
    transactions: ['visitor', 'member', 'golden', 'employee'],
    accounts: ['visitor', 'member', 'golden', 'employee'],
    reports: ['visitor', 'member', 'golden', 'employee'],
    clients: ['visitor', 'member', 'golden', 'employee'],
    agents: ['visitor', 'member', 'golden', 'employee'],
    achievers: ['visitor', 'member', 'golden', 'employee'],
    expenses: ['visitor', 'member', 'golden', 'employee'],
    calculator: ['visitor', 'member', 'golden', 'employee'],
    summary: ['visitor', 'member', 'golden', 'employee'],
  },
  featurePermissions: {
    backup: ['visitor', 'member', 'golden', 'employee'],
    employeeLogin: ['visitor', 'member', 'golden', 'employee'],
    whatsapp: ['visitor', 'member', 'golden', 'employee'],
    print: ['visitor', 'member', 'golden', 'employee'],
    transfer: ['golden', 'employee'],
    deleteExpense: ['golden', 'employee'],
    achieversNumbers: ['golden', 'employee'],
    lessons: ['golden', 'employee'],
    monthStats: ['golden', 'employee'],
  },
  onboardingSteps: [
      "مرحبا بكم في عضوية الذهب، انت الان ضمن الباقه الذهبية حتي فترة انتهاء اشتراكك.",
      "لمعرفة وقت اشتراكك يمكنك الضغط على ملفك الشخصي،",
      "كذلك يمكنك إصدار عضوية موظفين تابعين لمكتبك ومتابعة رواتب الموظفين ومعاملاتهم.",
      "يمكنك الآن الوصول لخدمات الدعم الفني المباشر المخصصة للأعضاء الذهبيين.",
      "نتمنى لك تجربة ممتعة مع مميزاتك الجديدة.. ابدأ الآن. ودايما يمكنك مراسلتنا علي رقم الواتس اب المخصص لأعضاء الذهب عبر\n00249915144606☎️\nوالموجود ثابت أسفل الموقع علي مدار 24ساعه"
  ],
  deletePageTexts: {
      description: 'لحذف بياناتك وحسابك من تطبيق مان هويات لمكاتب الخدمات، يرجى تعبئة النموذج أدناه لتأكيد هويتك.',
      warning: 'تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم فقدان جميع سجلات المعاملات والعملاء.',
      footer: 'تطبيق مان هويات لمكاتب الخدمات\nالمطور: ELTAIB HAMED ELTAIB'
  },
  seo: {
      title: 'تطبيق مان هوبات - إدارة مكاتب الخدمات العامة والاستقدام بكل سهولة، تطبيق لكل معقب ولكل صاحب ومسؤل مكتب لادارتة باحترافية',
      description: 'معقب، تعقيب، المعقب الإلكتروني، نخبة المعقبين يجتمعون في منصة مان هوبات. الحل الأمثل لإدارة مكاتب الخدمات العامة ومكاتب الاستقدام، وتسهيل إدارة معاملات إجراءات تمديد الزيارات والمعاملات الحكومية للأفراد والشركات في المملكة العربية السعودية بكل احترافية',
      keywords: 'مان هوبات، إدارة مكاتب الخدمات والاستقدام، مكتب خدمات عامة، معقب إلكتروني، تعقيب معاملات، تمديد زيارة، منصة قوى، مساند، استقدام عمالة، إدارة مكاتب التعقيب، معقبين، تعقيب، موقع تعقيب، السعودية'
  }
};

export const getGlobalSettings = (): GlobalSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        return { 
            ...DEFAULT_SETTINGS, 
            ...parsed,
            marquee: { ...DEFAULT_SETTINGS.marquee, ...(parsed.marquee || {}) },
            pagePermissions: { ...DEFAULT_SETTINGS.pagePermissions, ...(parsed.pagePermissions || {}) },
            featurePermissions: { ...DEFAULT_SETTINGS.featurePermissions, ...(parsed.featurePermissions || {}) },
            limits: { 
                ...DEFAULT_SETTINGS.limits, 
                ...(parsed.limits || {}),
                golden: { ...DEFAULT_SETTINGS.limits.golden, ...(parsed.limits?.golden || {}) }
            },
            banks: parsed.banks || DEFAULT_SETTINGS.banks,
            packages: {
                monthly: { ...DEFAULT_SETTINGS.packages.monthly, ...(parsed.packages?.monthly || {}) },
                annual: { ...DEFAULT_SETTINGS.packages.annual, ...(parsed.packages?.annual || {}) }
            },
            onboardingSteps: parsed.onboardingSteps || DEFAULT_SETTINGS.onboardingSteps,
            deletePageTexts: { ...DEFAULT_SETTINGS.deletePageTexts, ...(parsed.deletePageTexts || {}) },
            seo: { ...DEFAULT_SETTINGS.seo, ...(parsed.seo || {}) }
        };
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveGlobalSettings = (settings: GlobalSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getBankNames = (): string[] => {
    const settings = getGlobalSettings();
    return settings.banks.map(b => b.name);
};

export const checkLimit = (
    role: UserRole, 
    type: 'transactions' | 'clients' | 'agents' | 'expenses', 
    currentCount: number
): { allowed: boolean, reason?: 'visitor' | 'member' | 'golden' } => {
    const settings = getGlobalSettings();
    if (role === 'employee') return { allowed: true };
    const limit = settings.limits[role as 'visitor' | 'member' | 'golden']?.[type];
    if (limit !== undefined && currentCount >= limit) {
        return { allowed: false, reason: role as 'visitor' | 'member' | 'golden' };
    }
    return { allowed: true };
};

export const isEmployeeRestricted = (user: User | null): boolean => {
    if (!user || user.role !== 'employee' || !user.parentId) return false;
    const goldenUsers = getGoldenUsers();
    const parent = goldenUsers.find(u => u.userId === user.parentId);
    if (!parent || parent.expiry < Date.now()) return true;
    return false;
};

// ... (Previous LocalStorage functions) ...
export const getStoredTransactions = (): Transaction[] => {
  try {
    const stored = localStorage.getItem(TX_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveStoredTransactions = (txs: Transaction[]) => {
  localStorage.setItem(TX_KEY, JSON.stringify(txs));
};

export const getStoredBalances = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(BAL_KEY);
    return stored ? JSON.parse(stored) : INITIAL_BALANCES;
  } catch {
    return INITIAL_BALANCES;
  }
};

export const saveStoredBalances = (balances: Record<string, number>) => {
  localStorage.setItem(BAL_KEY, JSON.stringify(balances));
};

export const getStoredPendingBalances = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(PENDING_BAL_KEY);
    return stored ? JSON.parse(stored) : INITIAL_BALANCES;
  } catch {
    return INITIAL_BALANCES;
  }
};

export const saveStoredPendingBalances = (balances: Record<string, number>) => {
  localStorage.setItem(PENDING_BAL_KEY, JSON.stringify(balances));
};

export const getStoredClients = (): Client[] => {
  try {
    const stored = localStorage.getItem(CLIENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveStoredClients = (clients: Client[]) => {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
};

export const getStoredAgents = (): Agent[] => {
  try {
    const stored = localStorage.getItem(AGENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveStoredAgents = (agents: Agent[]) => {
  localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
};

export const getStoredExpenses = (): Expense[] => {
  try {
    const stored = localStorage.getItem(EXPENSES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveStoredExpenses = (expenses: Expense[]) => {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
};

export const getStoredExtAgents = (): ExternalAgent[] => {
    try {
        const stored = localStorage.getItem(EXT_AGENTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const saveStoredExtAgents = (agents: ExternalAgent[]) => {
    localStorage.setItem(EXT_AGENTS_KEY, JSON.stringify(agents));
};

export const getStoredLessons = (): Lesson[] => {
    try {
        const stored = localStorage.getItem(LESSONS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const saveStoredLessons = (lessons: Lesson[]) => {
    localStorage.setItem(LESSONS_KEY, JSON.stringify(lessons));
};

export const getStoredAgentTransfers = (): AgentTransferRecord[] => {
    try {
        const stored = localStorage.getItem(AGENT_TRANSFERS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const saveStoredAgentTransfers = (records: AgentTransferRecord[]) => {
    localStorage.setItem(AGENT_TRANSFERS_KEY, JSON.stringify(records));
};

export const getStoredClientRefunds = (): ClientRefundRecord[] => {
    try {
        const stored = localStorage.getItem(CLIENT_REFUNDS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const saveStoredClientRefunds = (records: ClientRefundRecord[]) => {
    localStorage.setItem(CLIENT_REFUNDS_KEY, JSON.stringify(records));
};

export const calculateAchievers = (transactions: Transaction[]) => {
  const achieversMap: Record<string, { count: number; total: number }> = {};
  
  transactions.forEach(tx => {
    if (tx.status === 'completed' && tx.agent && tx.agent !== 'إنجاز بنفسي') {
      if (!achieversMap[tx.agent]) {
        achieversMap[tx.agent] = { count: 0, total: 0 };
      }
      achieversMap[tx.agent].count += 1;
      achieversMap[tx.agent].total += parseFloat(tx.agentPrice) || 0;
    }
  });

  return Object.entries(achieversMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);
};

export const createBackup = () => {
  const data = {
    transactions: getStoredTransactions(),
    clients: getStoredClients(),
    agents: getStoredAgents(),
    expenses: getStoredExpenses(),
    balances: getStoredBalances(),
    pendingBalances: getStoredPendingBalances(),
    settings: getGlobalSettings(),
    timestamp: Date.now()
  };
  return JSON.stringify(data);
};

export const restoreBackup = (json: string) => {
  try {
    const data = JSON.parse(json);
    if (data.transactions) saveStoredTransactions(data.transactions);
    if (data.clients) saveStoredClients(data.clients);
    if (data.agents) saveStoredAgents(data.agents);
    if (data.expenses) saveStoredExpenses(data.expenses);
    if (data.balances) saveStoredBalances(data.balances);
    if (data.pendingBalances) saveStoredPendingBalances(data.pendingBalances);
    if (data.settings) saveGlobalSettings(data.settings);
    localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
    return true;
  } catch (e) {
    console.error("Restore failed", e);
    return false;
  }
};

export const getLastBackupTime = () => {
    return localStorage.getItem(LAST_BACKUP_KEY);
};

export const clearAgents = () => {
    localStorage.removeItem(AGENTS_KEY);
};

export const clearClients = () => {
    localStorage.removeItem(CLIENTS_KEY);
};

export const clearTransactions = () => {
    localStorage.removeItem(TX_KEY);
};

export const clearAllData = () => {
    localStorage.clear();
    window.location.reload();
};

// --- Cloud Functions ---

export const addAgentTransferToCloud = async (record: AgentTransferRecord, userId: number) => {
    try {
        const { error } = await supabase
            .from('agent_transfers')
            .insert([{
                user_id: userId,
                agent_name: record.agentName,
                amount: record.amount,
                bank: record.bank,
                date: record.date,
                transaction_count: record.transactionCount,
                created_by: record.createdBy
            }]);
        
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error('Add agent transfer error:', err);
        return { success: false, message: err.message };
    }
};

export const addClientRefundToCloud = async (record: ClientRefundRecord, userId: number) => {
    try {
        const { error } = await supabase
            .from('client_refunds')
            .insert([{
                user_id: userId,
                client_name: record.clientName,
                amount: record.amount,
                bank: record.bank,
                date: record.date,
                transaction_count: record.transactionCount,
                created_by: record.createdBy
            }]);
        
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error('Add client refund error:', err);
        return { success: false, message: err.message };
    }
};

export const fetchAccountStatementFromCloud = async (userId: number) => {
    try {
        const { data, error } = await supabase
            .from('full_account_statement')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data.map((item: any) => ({
            id: `${item.type}-${item.id}`,
            type: item.type,
            title: item.description,
            amount: Number(item.amount),
            date: new Date(item.created_at).getTime(),
            status: item.status
        }));
    } catch (err) {
        console.error('Fetch statement error:', err);
        return [];
    }
};

export const markTransactionsAsAgentPaid = async (ids: number[]) => {
    if (!ids || ids.length === 0) return true;
    try {
        const { error } = await supabase
            .from('transactions')
            .update({ agent_paid: true })
            .in('id', ids);
        
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Mark agent paid error:', err);
        return false;
    }
};

export const markTransactionsAsClientRefunded = async (ids: number[]) => {
    if (!ids || ids.length === 0) return true;
    try {
        const { error } = await supabase
            .from('transactions')
            .update({ client_refunded: true })
            .in('id', ids);
        
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Mark client refunded error:', err);
        return false;
    }
};

export const deleteAllAgents = async (userId: number) => {
    try {
        const { error } = await supabase.from('agents').delete().eq('user_id', userId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('Delete all agents error:', e);
        return false;
    }
};

export const deleteAllClients = async (userId: number) => {
    try {
        const { error } = await supabase.from('clients').delete().eq('user_id', userId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('Delete all clients error:', e);
        return false;
    }
};

export const deleteAllTransactions = async (userId: number) => {
    try {
        const { error } = await supabase.from('transactions').delete().eq('user_id', userId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('Delete all transactions error:', e);
        return false;
    }
};

export const deleteAllExpenses = async (userId: number) => {
    try {
        const { error } = await supabase.from('expenses').delete().eq('user_id', userId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('Delete all expenses error:', e);
        return false;
    }
};

export const deleteAllTransfers = async (userId: number) => {
    try {
        const { error } = await supabase.from('agent_transfers').delete().eq('user_id', userId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('Delete all transfers error:', e);
        return false;
    }
};

export const deleteAllRefunds = async (userId: number) => {
    try {
        const { error } = await supabase.from('client_refunds').delete().eq('user_id', userId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('Delete all refunds error:', e);
        return false;
    }
};

export const createSubscriptionRequest = async (userId: number, userName: string, phone: string, duration: 'شهر' | 'سنة', bank: string, senderName?: string) => {
    try {
        const { data: existing } = await supabase
            .from('subscription_requests')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .maybeSingle();

        if (existing) {
            return { success: false, message: 'لديك طلب قيد المراجعة بالفعل' };
        }

        const { error } = await supabase
            .from('subscription_requests')
            .insert([{
                user_id: userId,
                user_name: userName,
                phone: phone,
                duration: duration,
                bank: bank,
                status: 'pending',
                sender_name: senderName
            }]);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error('Create sub request error:', err);
        return { success: false, message: err.message || 'فشل إرسال الطلب' };
    }
};

export const fetchSubscriptionRequestsFromCloud = async (): Promise<SubscriptionRequest[]> => {
    try {
        const { data, error } = await supabase
            .from('subscription_requests')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        return data.map((item: any) => ({
            id: item.id,
            userId: item.user_id,
            userName: item.user_name,
            phone: item.phone,
            duration: item.duration,
            bank: item.bank,
            status: item.status,
            createdAt: new Date(item.created_at).getTime(),
            senderName: item.sender_name
        }));
    } catch (err) {
        console.error('Fetch requests error:', err);
        return [];
    }
};

export const getSubscriptionRequests = (): SubscriptionRequest[] => {
    try {
        const stored = localStorage.getItem(SUB_REQUESTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const rejectSubscriptionRequest = async (requestId: number) => {
    try {
        await supabase.from('subscription_requests').delete().eq('id', requestId);
    } catch (e) {
        console.error(e);
    }
};

export const getGoldenUsers = (): GoldenUserRecord[] => {
    try {
        const stored = localStorage.getItem(GOLDEN_USERS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const approveSubscription = async (requestId: number) => {
    try {
        const { data: req, error: fetchError } = await supabase
            .from('subscription_requests')
            .select('*')
            .eq('id', requestId)
            .single();
        
        if (fetchError || !req) return { success: false };

        const durationMs = req.duration === 'سنة' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        const expiryDate = Date.now() + durationMs;

        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                role: 'golden',
                subscription_expiry: new Date(expiryDate).toISOString() 
            }) 
            .eq('id', req.user_id);
        
        if (updateError) throw updateError;

        const { data: user } = await supabase
            .from('users')
            .select('referred_by')
            .eq('id', req.user_id)
            .single();

        if (user && user.referred_by && req.duration === 'سنة') {
            const { data: referrer } = await supabase
                .from('users')
                .select('affiliate_balance')
                .eq('id', user.referred_by)
                .single();
            
            if (referrer) {
                const newBalance = (Number(referrer.affiliate_balance) || 0) + 50;
                await supabase
                    .from('users')
                    .update({ affiliate_balance: newBalance })
                    .eq('id', user.referred_by);
            }
        }

        await supabase
            .from('subscription_requests')
            .update({ status: 'approved' })
            .eq('id', requestId);

        const goldenUsers = getGoldenUsers();
        const filtered = goldenUsers.filter(u => u.userId !== req.user_id);
        filtered.push({ userId: req.user_id, expiry: expiryDate, userName: req.user_name });
        localStorage.setItem(GOLDEN_USERS_KEY, JSON.stringify(filtered));
        
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false };
    }
};

// --- Supervisor Function ---
export const assignSupervisor = async (userId: number) => {
    try {
        const { error } = await supabase
            .from('users')
            .update({ is_supervisor: true })
            .eq('id', userId);
        
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error("Error assigning supervisor:", e);
        return { success: false, message: e.message };
    }
};

export const cancelSubscription = async (userId: number) => {
    const goldenUsers = getGoldenUsers();
    const updatedGolden = goldenUsers.filter(u => u.userId !== userId);
    localStorage.setItem(GOLDEN_USERS_KEY, JSON.stringify(updatedGolden));
    try {
        await supabase
            .from('users')
            .update({ 
                role: 'member',
                subscription_expiry: null 
            })
            .eq('id', userId);
    } catch (e) {
        console.error(e);
    }
    return { success: true };
};

export const registerUser = async (user: Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string, referralCode?: string }) => {
  try {
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('phone')
      .eq('phone', user.phone);

    if (checkError) {
        console.error('Check error:', checkError);
        return { success: false, message: 'حدث خطأ أثناء التحقق من البيانات' };
    }

    if (existingUsers && existingUsers.length > 0) {
      return { success: false, message: 'رقم الهاتف مسجل مسبقاً' };
    }

    const passwordHash = hashPassword(user.password);
    const role = user.role || 'member'; 
    
    let referredBy = null;
    if (user.referralCode) {
        const refId = parseInt(user.referralCode);
        if (!isNaN(refId)) referredBy = refId;
    }

    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          office_name: user.officeName,
          phone: user.phone,
          password_hash: passwordHash,
          security_question: user.securityQuestion,
          security_answer: user.securityAnswer,
          role: role,
          subscription_expiry: null,
          referred_by: referredBy,
          affiliate_balance: 4
        }
      ]);

    if (insertError) {
      console.error('Insert error:', insertError);
      return { success: false, message: 'فشل إنشاء الحساب، يرجى المحاولة لاحقاً' };
    }

    return { success: true };
  } catch (err) {
    console.error('Registration error:', err);
    return { success: false, message: 'حدث خطأ غير متوقع' };
  }
};

export const loginUser = async (phone: string, pass: string) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone);

        if (error) {
            console.error('Login error:', error);
            return { success: false, message: 'خطأ في الاتصال' };
        }

        if (!users || users.length === 0) {
            // Check if it's an employee
            const { data: emps, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('username', phone); // Employee uses username as login
            
            if (empError || !emps || emps.length === 0) {
                return { success: false, message: 'بيانات الدخول غير صحيحة' };
            }

            const emp = emps[0];
            if (emp.password_hash !== pass) { // Employee pass is stored plain for simplicity in this context, or hashed if implemented
                 return { success: false, message: 'كلمة المرور غير صحيحة' };
            }

            // Construct User object for Employee
            const userObj: User = {
                id: emp.id,
                officeName: emp.name,
                phone: emp.username,
                passwordHash: emp.password_hash,
                securityQuestion: '',
                securityAnswer: '',
                createdAt: new Date(emp.created_at).getTime(),
                role: 'employee',
                parentId: emp.parent_id,
                permissions: emp.permissions || []
            };
            
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));
            return { success: true, user: userObj };
        }

        const user = users[0];
        const hash = hashPassword(pass);

        if (user.password_hash === hash) {
            const userObj: User = {
                id: user.id,
                officeName: user.office_name,
                phone: user.phone,
                passwordHash: user.password_hash,
                securityQuestion: user.security_question,
                securityAnswer: user.security_answer,
                createdAt: new Date(user.created_at).getTime(),
                role: user.role,
                subscriptionExpiry: user.subscription_expiry ? new Date(user.subscription_expiry).getTime() : undefined,
                affiliateBalance: user.affiliate_balance,
                referredBy: user.referred_by,
                isSupervisor: user.is_supervisor // Map from DB
            };
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));
            return { success: true, user: userObj };
        } else {
            return { success: false, message: 'كلمة المرور غير صحيحة' };
        }
    } catch (err) {
        console.error('Login exception:', err);
        return { success: false, message: 'حدث خطأ غير متوقع' };
    }
};

export const getCurrentUser = (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
};

export const logoutUser = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
};

export const verifySecurityInfo = async (phone: string, question: string, answer: string) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone);

        if (error || !users || users.length === 0) {
            return { success: false, message: 'رقم الهاتف غير مسجل' };
        }

        const user = users[0];
        if (user.security_question === question && user.security_answer === answer) {
            return { success: true };
        } else {
            return { success: false, message: 'سؤال الأمان أو الإجابة غير صحيحة' };
        }
    } catch (e) {
        return { success: false, message: 'خطأ في التحقق' };
    }
};

export const resetPassword = async (phone: string, newPass: string) => {
    try {
        const hash = hashPassword(newPass);
        const { error } = await supabase
            .from('users')
            .update({ password_hash: hash })
            .eq('phone', phone);

        if (error) throw error;
        return { success: true };
    } catch (e) {
        return { success: false, message: 'فشل تحديث كلمة المرور' };
    }
};

export const changePassword = async (phone: string, oldPass: string, newPass: string) => {
    try {
        const oldHash = hashPassword(oldPass);
        const { data: users } = await supabase
            .from('users')
            .select('password_hash')
            .eq('phone', phone)
            .single();
        
        if (!users || users.password_hash !== oldHash) {
            return { success: false, message: 'كلمة المرور الحالية غير صحيحة' };
        }

        const newHash = hashPassword(newPass);
        const { error } = await supabase
            .from('users')
            .update({ password_hash: newHash })
            .eq('phone', phone);

        if (error) throw error;
        return { success: true };
    } catch (e) {
        return { success: false, message: 'فشل تغيير كلمة المرور' };
    }
};

export const updateUserProfile = async (id: number, oldPass: string, officeName: string, question: string, answer: string) => {
    try {
        const oldHash = hashPassword(oldPass);
        const { data: user } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', id)
            .single();
        
        if (!user || user.password_hash !== oldHash) {
            return { success: false, message: 'كلمة المرور غير صحيحة' };
        }

        const { error } = await supabase
            .from('users')
            .update({ 
                office_name: officeName,
                security_question: question,
                security_answer: answer
            })
            .eq('id', id);

        if (error) throw error;
        
        // Update local storage
        const current = getCurrentUser();
        if (current) {
            const updated = { ...current, officeName, securityQuestion: question, securityAnswer: answer };
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
        }

        return { success: true };
    } catch (e) {
        return { success: false, message: 'فشل تحديث البيانات' };
    }
};

// --- Employee Functions ---
export const createEmployee = async (empData: any, parentUser: User) => {
    try {
        const { data: existing } = await supabase
            .from('employees')
            .select('username')
            .eq('username', empData.name); // Simple check, ideally unique
        
        if (existing && existing.length > 0) {
            // Generate unique username
            empData.name = `${empData.name}_${Math.floor(Math.random() * 1000)}`;
        }

        const { data, error } = await supabase
            .from('employees')
            .insert([{
                parent_id: parentUser.id,
                name: empData.name,
                username: empData.name, // Using name as username for simplicity
                password_hash: empData.password, // Plain text as per requirement/simplicity
                permissions: empData.permissions || []
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, username: data.username };
    } catch (e: any) {
        console.error(e);
        return { success: false, message: e.message };
    }
};

export const getStoredEmployees = (): User[] => {
    // This function is a bit tricky since we don't store ALL employees in local storage for security
    // But for the UI to list them, we need to fetch them.
    // We will fetch from cloud and return.
    // For synchronous usage in UI, we might need a state.
    // Here we return empty array and rely on components to fetch.
    return []; 
};

// We need an async fetch function for employees
export const fetchEmployeesFromCloud = async (parentId: number): Promise<User[]> => {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('parent_id', parentId);
        
        if (error) throw error;
        
        return data.map((e: any) => ({
            id: e.id,
            officeName: e.name,
            phone: e.username,
            passwordHash: '',
            securityQuestion: '',
            securityAnswer: '',
            createdAt: new Date(e.created_at).getTime(),
            role: 'employee',
            parentId: e.parent_id,
            permissions: e.permissions
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const deleteEmployee = async (empId: number) => {
    try {
        await supabase.from('employees').delete().eq('id', empId);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

// --- Withdrawal Requests ---
export const createWithdrawalRequest = async (userId: number, userName: string, amount: number, bankAccount: string) => {
    try {
        const { error } = await supabase
            .from('withdrawal_requests')
            .insert([{
                user_id: userId,
                user_name: userName,
                amount: amount,
                bank_account: bankAccount,
                status: 'pending'
            }]);
        
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const fetchWithdrawalRequests = async (): Promise<WithdrawalRequest[]> => {
    try {
        const { data, error } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data.map((item: any) => ({
            id: item.id,
            userId: item.user_id,
            userName: item.user_name,
            amount: item.amount,
            bankAccount: item.bank_account,
            status: item.status,
            createdAt: new Date(item.created_at).getTime()
        }));
    } catch (e) {
        return [];
    }
};

export const completeWithdrawal = async (reqId: number, userId: number) => {
    try {
        await supabase
            .from('withdrawal_requests')
            .update({ status: 'completed' })
            .eq('id', reqId);
        
        // Reset user balance
        await supabase
            .from('users')
            .update({ affiliate_balance: 0 })
            .eq('id', userId);
            
        return { success: true };
    } catch (e) {
        return { success: false };
    }
};

// --- Office Listings ---
export const addOfficeListingToCloud = async (listing: OfficeListing) => {
    try {
        const { data, error } = await supabase
            .from('public_offices')
            .insert([{
                user_id: listing.userId,
                office_name: listing.officeName,
                phone: listing.phone,
                whatsapp: listing.whatsapp,
                work_type: listing.workType,
                city: listing.city,
                services: listing.services,
                is_golden: listing.isGolden
            }]);
        
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const updateOfficeListingInCloud = async (listing: OfficeListing) => {
    try {
        const { error } = await supabase
            .from('public_offices')
            .update({
                office_name: listing.officeName,
                phone: listing.phone,
                whatsapp: listing.whatsapp,
                work_type: listing.workType,
                city: listing.city,
                services: listing.services,
                is_golden: listing.isGolden
            })
            .eq('id', listing.id);
        
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const fetchOfficeListingsFromCloud = async (): Promise<OfficeListing[]> => {
    try {
        const { data, error } = await supabase
            .from('public_offices')
            .select('*')
            .order('is_golden', { ascending: false }) // Golden first
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data.map((item: any) => ({
            id: item.id,
            userId: item.user_id,
            officeName: item.office_name,
            phone: item.phone,
            whatsapp: item.whatsapp,
            workType: item.work_type,
            city: item.city,
            services: item.services || [],
            isGolden: item.is_golden,
            createdAt: new Date(item.created_at).getTime()
        }));
    } catch (e) {
        return [];
    }
};

// --- External Agents (Achievers) ---
export const addExternalAgentToCloud = async (agent: ExternalAgent) => {
    try {
        if (!agent.userId) throw new Error("User ID is required");
        
        const { data, error } = await supabase
            .from('external_agents')
            .insert([{
                user_id: agent.userId,
                name: agent.name,
                phone: agent.phone,
                whatsapp: agent.whatsapp,
                services: agent.services || []
            }])
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const updateExternalAgentInCloud = async (agent: ExternalAgent) => {
    try {
        const { error } = await supabase
            .from('external_agents')
            .update({
                name: agent.name,
                phone: agent.phone,
                whatsapp: agent.whatsapp,
                services: agent.services || []
            })
            .eq('id', agent.id);
        
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const fetchExternalAgentsFromCloud = async (): Promise<ExternalAgent[]> => {
    try {
        const { data, error } = await supabase
            .from('external_agents')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data.map((item: any) => ({
            id: item.id,
            userId: item.user_id,
            name: item.name,
            phone: item.phone,
            whatsapp: item.whatsapp,
            services: item.services || [],
            createdAt: new Date(item.created_at).getTime()
        }));
    } catch (e) {
        return [];
    }
};

// --- Cloud Sync Functions (Transactions, Clients, Agents, Expenses, Accounts) ---
// These functions were partially in the context, ensuring they are complete here.

export const fetchTransactionsFromCloud = async (userId: number): Promise<Transaction[]> => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data.map((t: any) => ({
            id: t.id,
            serialNo: t.serial_no,
            type: t.type,
            clientPrice: t.client_price,
            agentPrice: t.agent_price,
            agent: t.agent,
            clientName: t.client_name,
            duration: t.duration,
            paymentMethod: t.payment_method,
            createdAt: new Date(t.created_at).getTime(),
            targetDate: new Date(t.target_date).getTime(),
            status: t.status,
            agentPaid: t.agent_paid,
            clientRefunded: t.client_refunded,
            createdBy: t.created_by
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const addTransactionToCloud = async (tx: Transaction, userId: number) => {
    try {
        const { error } = await supabase.from('transactions').insert([{
            user_id: userId,
            serial_no: tx.serialNo,
            type: tx.type,
            client_price: tx.clientPrice,
            agent_price: tx.agentPrice,
            agent: tx.agent,
            client_name: tx.clientName,
            duration: tx.duration,
            payment_method: tx.paymentMethod,
            target_date: new Date(tx.targetDate).toISOString(),
            status: tx.status,
            agent_paid: tx.agentPaid,
            client_refunded: tx.clientRefunded,
            created_by: tx.createdBy
        }]);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const updateTransactionStatusInCloud = async (id: number, updates: any) => {
    try {
        const { error } = await supabase.from('transactions').update(updates).eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const updateTransactionInCloud = async (tx: Transaction) => {
    try {
        const { error } = await supabase.from('transactions').update({
            type: tx.type,
            client_price: tx.clientPrice,
            agent_price: tx.agentPrice,
            agent: tx.agent,
            client_name: tx.clientName,
            duration: tx.duration,
            payment_method: tx.paymentMethod,
            target_date: new Date(tx.targetDate).toISOString(),
            status: tx.status
        }).eq('id', tx.id);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const deleteTransactionFromCloud = async (id: number) => {
    try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const fetchClientsFromCloud = async (userId: number): Promise<Client[]> => {
    try {
        const { data, error } = await supabase.from('clients').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) throw error;
        return data.map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            whatsapp: c.whatsapp,
            createdAt: new Date(c.created_at).getTime(),
            createdBy: c.created_by
        }));
    } catch (e) {
        return [];
    }
};

export const addClientToCloud = async (client: Client, userId: number) => {
    try {
        const { error } = await supabase.from('clients').insert([{
            user_id: userId,
            name: client.name,
            phone: client.phone,
            whatsapp: client.whatsapp,
            created_by: client.createdBy
        }]);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const updateClientInCloud = async (client: Client) => {
    try {
        const { error } = await supabase.from('clients').update({
            name: client.name,
            phone: client.phone,
            whatsapp: client.whatsapp
        }).eq('id', client.id);
        if (error) throw error;
        return true;
    } catch (e) {
        return false;
    }
};

export const deleteClientFromCloud = async (id: number) => {
    try {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        return false;
    }
};

export const fetchAgentsFromCloud = async (userId: number): Promise<Agent[]> => {
    try {
        const { data, error } = await supabase.from('agents').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) throw error;
        return data.map((a: any) => ({
            id: a.id,
            name: a.name,
            phone: a.phone,
            whatsapp: a.whatsapp,
            createdAt: new Date(a.created_at).getTime(),
            createdBy: a.created_by
        }));
    } catch (e) {
        return [];
    }
};

export const addAgentToCloud = async (agent: Agent, userId: number) => {
    try {
        const { error } = await supabase.from('agents').insert([{
            user_id: userId,
            name: agent.name,
            phone: agent.phone,
            whatsapp: agent.whatsapp,
            created_by: agent.createdBy
        }]);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const updateAgentInCloud = async (agent: Agent) => {
    try {
        const { error } = await supabase.from('agents').update({
            name: agent.name,
            phone: agent.phone,
            whatsapp: agent.whatsapp
        }).eq('id', agent.id);
        if (error) throw error;
        return true;
    } catch (e) {
        return false;
    }
};

export const deleteAgentFromCloud = async (id: number) => {
    try {
        const { error } = await supabase.from('agents').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        return false;
    }
};

export const fetchExpensesFromCloud = async (userId: number): Promise<Expense[]> => {
    try {
        const { data, error } = await supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false });
        if (error) throw error;
        return data.map((e: any) => ({
            id: e.id,
            title: e.description, // Mapped from description column
            amount: e.amount,
            bank: e.bank,
            date: new Date(e.date).getTime(),
            createdBy: e.created_by
        }));
    } catch (e) {
        return [];
    }
};

export const addExpenseToCloud = async (exp: Expense, userId: number) => {
    try {
        const { error } = await supabase.from('expenses').insert([{
            user_id: userId,
            description: exp.title,
            amount: exp.amount,
            bank: exp.bank,
            date: new Date(exp.date).toISOString(),
            created_by: exp.createdBy
        }]);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const deleteExpenseFromCloud = async (id: number) => {
    try {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        return false;
    }
};

export const fetchAccountsFromCloud = async (userId: number) => {
    try {
        const { data, error } = await supabase.from('accounts').select('*').eq('user_id', userId);
        if (error) throw error;
        
        const balances: Record<string, number> = {};
        const pending: Record<string, number> = {};
        
        data.forEach((acc: any) => {
            balances[acc.bank_name] = Number(acc.balance);
            pending[acc.bank_name] = Number(acc.pending_balance);
        });
        
        // Ensure all default banks exist in the map
        DEFAULT_BANKS_LIST.forEach(bank => {
            if (balances[bank] === undefined) balances[bank] = 0;
            if (pending[bank] === undefined) pending[bank] = 0;
        });

        return { balances, pending };
    } catch (e) {
        return { balances: INITIAL_BALANCES, pending: INITIAL_BALANCES };
    }
};

export const updateAccountInCloud = async (userId: number, bankName: string, balance: number, pending: number) => {
    try {
        // Check if exists
        const { data } = await supabase.from('accounts').select('id').eq('user_id', userId).eq('bank_name', bankName);
        
        if (data && data.length > 0) {
            await supabase.from('accounts').update({ balance, pending_balance: pending }).eq('id', data[0].id);
        } else {
            await supabase.from('accounts').insert([{ user_id: userId, bank_name: bankName, balance, pending_balance: pending }]);
        }
    } catch (e) {
        console.error(e);
    }
};
