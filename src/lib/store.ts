import { supabase } from './supabase';

// ... (Existing Constants and Types remain unchanged) ...
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
  senderName?: string; // Added senderName
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

// --- Helper for Date Parsing ---
const parseDate = (val: any): number => {
    if (!val) return Date.now();
    if (typeof val === 'number') return val;
    return new Date(val).getTime();
};

// ... (Rest of User Management and Settings functions remain unchanged) ...
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

// ... (Existing Cloud Functions for Transactions, Clients, Agents, Expenses, Accounts) ...
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
            .order('created_at', { ascending: false }); // Updated to order by created_at which is aliased in view
        
        if (error) throw error;
        
        return data.map((item: any) => ({
            id: `${item.type}-${item.id}`,
            type: item.type,
            title: item.description, // Updated to use description from view
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

// ... (Delete All Functions) ...
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

// ... (Subscription & User Functions) ...
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
                sender_name: senderName // Added sender_name
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
            senderName: item.sender_name // Added senderName mapping
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

        // Only apply referral bonus if the subscription is Annual ('سنة')
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
          affiliate_balance: 4 // Registration Bonus: 4 SAR
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

// ... (Rest of the file remains unchanged) ...
