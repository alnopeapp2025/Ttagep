import { supabase } from './supabase';

// --- Constants ---
export const BANKS_LIST = [
  "الراجحي", "الأهلي", "الإنماء", "البلاد", "بنك stc", 
  "الرياض", "الجزيرة", "ساب", "نقداً كاش", "بنك آخر"
];

export const INITIAL_BALANCES: Record<string, number> = BANKS_LIST.reduce((acc, bank) => ({ ...acc, [bank]: 0 }), {});

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
}

export interface User {
  id: number;
  officeName: string;
  phone: string;
  passwordHash: string; // Hashed Password
  securityQuestion: string;
  securityAnswer: string;
  createdAt: number;
  role?: 'member' | 'golden' | 'employee'; // Added Roles
  parentId?: number; // For Employees linked to Golden Member
  permissions?: string[]; // Specific permissions for employees
}

export interface Client {
  id: number;
  name: string;
  phone?: string;     // Mobile Number
  whatsapp?: string;  // WhatsApp Number
  createdAt: number;
}

export interface Agent {
  id: number;
  name: string;
  phone?: string;     // Mobile Number
  whatsapp?: string;  // WhatsApp Number
  createdAt: number;
}

export interface Expense {
  id: number;
  title: string;
  amount: number;
  bank: string;
  date: number;
}

// New Types for Achievers Hub
export interface ExternalAgent {
  id: number;
  name: string;
  phone: string;
  createdAt: number;
}

export interface Lesson {
  id: number;
  title: string;
  content: string;
  createdAt: number;
}

// New Type for Agent Transfers Report
export interface AgentTransferRecord {
  id: number;
  agentName: string;
  amount: number;
  bank: string;
  date: number;
  transactionCount: number;
}

// New Type for Client Refunds Report
export interface ClientRefundRecord {
  id: number;
  clientName: string;
  amount: number;
  bank: string;
  date: number;
  transactionCount: number;
}

// --- Admin & Settings Types ---
export type UserRole = 'visitor' | 'member' | 'golden';

export interface SubscriptionRequest {
  id: number;
  userId: number;
  userName: string;
  phone: string;
  duration: 'شهر' | 'سنة';
  status: 'pending' | 'approved';
  createdAt: number;
}

export interface GlobalSettings {
  adminPasswordHash: string; // Default: 1234 hashed
  // Page Access (Who can enter the page)
  pagePermissions: {
    transactions: UserRole[];
    accounts: UserRole[];
    reports: UserRole[];
    clients: UserRole[];
    agents: UserRole[];
    achievers: UserRole[];
    expenses: UserRole[];
    calculator: UserRole[];
  };
  // Feature Access (Who can click specific buttons)
  featurePermissions: {
    backup: UserRole[];         // النسخ الاحتياطي
    employeeLogin: UserRole[];  // دخول الموظفين
    whatsapp: UserRole[];       // واتساب للعميل
    print: UserRole[];          // طباعة
    transfer: UserRole[];       // تحويل بين البنوك
    deleteExpense: UserRole[];  // حذف مصروف
    achieversNumbers: UserRole[]; // أرقام معقبين منجزين
    lessons: UserRole[];        // تعلم الخدمات العامة
    monthStats: UserRole[];     // إحصائيات الشهر (معاملات/أرباح)
  };
}

export interface AppData {
  transactions: Transaction[];
  balances: Record<string, number>;
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
const CURRENT_USER_KEY = 'moaqeb_current_user_v1'; // Session Storage
const LAST_BACKUP_KEY = 'moaqeb_last_backup_v1';
const SETTINGS_KEY = 'moaqeb_global_settings_v2'; // Updated key
const SUB_REQUESTS_KEY = 'moaqeb_sub_requests_v1';

// --- User Management (Supabase Auth) ---

// Simple Hash Function
const hashPassword = (pwd: string) => {
  return btoa(pwd).split('').reverse().join(''); 
};

// Default Settings
const DEFAULT_SETTINGS: GlobalSettings = {
  adminPasswordHash: hashPassword('1234'),
  pagePermissions: {
    transactions: ['visitor', 'member', 'golden'],
    accounts: ['visitor', 'member', 'golden'],
    reports: ['visitor', 'member', 'golden'],
    clients: ['visitor', 'member', 'golden'],
    agents: ['visitor', 'member', 'golden'],
    achievers: ['visitor', 'member', 'golden'],
    expenses: ['visitor', 'member', 'golden'],
    calculator: ['visitor', 'member', 'golden'],
  },
  featurePermissions: {
    backup: ['golden'],
    employeeLogin: ['golden'],
    whatsapp: ['member', 'golden'],
    print: ['member', 'golden'],
    transfer: ['golden'],
    deleteExpense: ['golden'],
    achieversNumbers: ['golden'],
    lessons: ['golden'],
    monthStats: ['golden'],
  }
};

export const getGlobalSettings = (): GlobalSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with default to ensure new keys exist
        return { 
            ...DEFAULT_SETTINGS, 
            ...parsed,
            featurePermissions: { ...DEFAULT_SETTINGS.featurePermissions, ...(parsed.featurePermissions || {}) }
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

// --- Subscription Requests ---

export const createSubscriptionRequest = (userId: number, userName: string, phone: string, duration: 'شهر' | 'سنة') => {
    const requests: SubscriptionRequest[] = getSubscriptionRequests();
    // Check if pending request exists
    if (requests.find(r => r.userId === userId && r.status === 'pending')) {
        return { success: false, message: 'لديك طلب قيد المراجعة بالفعل' };
    }

    const newReq: SubscriptionRequest = {
        id: Date.now(),
        userId,
        userName,
        phone,
        duration,
        status: 'pending',
        createdAt: Date.now()
    };
    
    requests.push(newReq);
    localStorage.setItem(SUB_REQUESTS_KEY, JSON.stringify(requests));
    return { success: true };
};

export const getSubscriptionRequests = (): SubscriptionRequest[] => {
    try {
        const stored = localStorage.getItem(SUB_REQUESTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const approveSubscription = async (requestId: number) => {
    const requests = getSubscriptionRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);
    
    if (reqIndex === -1) return { success: false };

    const req = requests[reqIndex];
    
    // 1. Update User Role in DB (Supabase)
    try {
        const { error } = await supabase
            .from('users')
            .update({ role: 'golden' }) // Assuming 'role' column exists or we handle logic locally
            .eq('id', req.userId);
        
        // Note: Since we are using a custom auth table, we might need to ensure the column exists.
        // If not, we can simulate by storing "Golden Users IDs" in local storage settings as a fallback.
        if (error) {
            // Fallback: Store in Local Settings
            const currentSettings = getGlobalSettings();
            // We'll use a separate list for golden users if DB fails or column missing
            const goldenUsers = JSON.parse(localStorage.getItem('moaqeb_golden_users_v1') || '[]');
            if (!goldenUsers.includes(req.userId)) {
                goldenUsers.push(req.userId);
                localStorage.setItem('moaqeb_golden_users_v1', JSON.stringify(goldenUsers));
            }
        }
    } catch (e) {
        console.error(e);
    }

    // 2. Update Request Status
    requests[reqIndex].status = 'approved';
    localStorage.setItem(SUB_REQUESTS_KEY, JSON.stringify(requests));
    
    return { success: true };
};

// ... [Rest of existing functions: registerUser, loginUser, etc. remain unchanged] ...

export const registerUser = async (user: Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string }) => {
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

    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          office_name: user.officeName,
          phone: user.phone,
          password_hash: passwordHash,
          security_question: user.securityQuestion,
          security_answer: user.securityAnswer,
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

export const createEmployee = async (employeeData: { name: string, password: string, permissions: string[] }, parentUser: User) => {
    const fakePhone = `EMP-${parentUser.id}-${Math.floor(Math.random() * 1000)}`;
    
    const newUser: User = {
        id: Date.now(),
        officeName: employeeData.name,
        phone: fakePhone, // Internal ID
        passwordHash: hashPassword(employeeData.password),
        securityQuestion: 'Employee',
        securityAnswer: 'Employee',
        createdAt: Date.now(),
        role: 'employee',
        parentId: parentUser.id,
        permissions: employeeData.permissions
    };

    const employees = getStoredEmployees();
    employees.push(newUser);
    localStorage.setItem('moaqeb_employees_v1', JSON.stringify(employees));
    
    return { success: true, username: fakePhone };
};

export const getStoredEmployees = (): User[] => {
    try {
        const stored = localStorage.getItem('moaqeb_employees_v1');
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const loginUser = async (phone: string, password: string) => {
  try {
    const passwordHash = hashPassword(password);

    const employees = getStoredEmployees();
    const emp = employees.find(e => e.officeName === phone && e.passwordHash === passwordHash);
    if (emp) {
         localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(emp));
         return { success: true, user: emp };
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .eq('password_hash', passwordHash)
      .single();

    if (error || !data) {
      return { success: false, message: 'بيانات الدخول غير صحيحة' };
    }

    const user: User = {
        id: data.id,
        officeName: data.office_name,
        phone: data.phone,
        passwordHash: data.password_hash,
        securityQuestion: data.security_question,
        securityAnswer: data.security_answer,
        createdAt: new Date(data.created_at).getTime(),
        role: 'member' 
    };
    
    // Check Local Golden Status Override
    const goldenUsers = JSON.parse(localStorage.getItem('moaqeb_golden_users_v1') || '[]');
    if (goldenUsers.includes(user.id)) {
        user.role = 'golden';
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, message: 'حدث خطأ أثناء تسجيل الدخول' };
  }
};

export const changePassword = async (phone: string, oldPass: string, newPass: string) => {
  try {
    const oldHash = hashPassword(oldPass);
    
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .eq('password_hash', oldHash)
      .single();

    if (error || !data) {
      return { success: false, message: 'كلمة المرور الحالية غير صحيحة' };
    }

    const newHash = hashPassword(newPass);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', data.id);

    if (updateError) {
      return { success: false, message: 'فشل تحديث كلمة المرور' };
    }

    return { success: true };
  } catch (err) {
    console.error('Change password error:', err);
    return { success: false, message: 'حدث خطأ غير متوقع' };
  }
};

export const verifySecurityInfo = async (phone: string, question: string, answer: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .eq('security_question', question)
      .eq('security_answer', answer)
      .single();

    if (error || !data) {
      return { success: false, message: 'البيانات غير متطابقة' };
    }

    return { success: true };
  } catch (err) {
    console.error('Verification error:', err);
    return { success: false, message: 'حدث خطأ أثناء التحقق' };
  }
};

export const resetPassword = async (phone: string, newPassword: string) => {
  try {
    const passwordHash = hashPassword(newPassword);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('phone', phone);

    if (error) {
      return { success: false, message: 'فشل تحديث كلمة المرور' };
    }

    return { success: true };
  } catch (err) {
    console.error('Reset password error:', err);
    return { success: false, message: 'حدث خطأ أثناء التحديث' };
  }
};

export const getCurrentUser = (): User | null => {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// --- Transaction Management (Cloud) ---

export const addTransactionToCloud = async (tx: Transaction, userId: number) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: userId,
          serial_no: tx.serialNo,
          type: tx.type,
          client_price: tx.clientPrice,
          agent_price: tx.agentPrice,
          agent: tx.agent,
          client_name: tx.clientName,
          duration: tx.duration,
          payment_method: tx.paymentMethod,
          created_at: tx.createdAt,
          target_date: tx.targetDate,
          status: tx.status,
          agent_paid: tx.agentPaid || false,
          client_refunded: tx.clientRefunded || false
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Insert Error (Transactions):', JSON.stringify(error, null, 2));
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error syncing transaction (Exception):', err);
    return false;
  }
};

export const fetchTransactionsFromCloud = async (userId: number): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      serialNo: item.serial_no,
      type: item.type,
      clientPrice: item.client_price,
      agentPrice: item.agent_price,
      agent: item.agent,
      clientName: item.client_name,
      duration: item.duration,
      paymentMethod: item.payment_method,
      createdAt: Number(item.created_at),
      targetDate: Number(item.target_date),
      status: item.status,
      agentPaid: item.agent_paid,
      clientRefunded: item.client_refunded
    }));
  } catch (err) {
    console.error('Fetch transactions exception:', err);
    return [];
  }
};

export const updateTransactionStatusInCloud = async (id: number, updates: Partial<Transaction>) => {
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.agentPaid !== undefined) dbUpdates.agent_paid = updates.agentPaid;
    if (updates.clientRefunded !== undefined) dbUpdates.client_refunded = updates.clientRefunded;

    try {
        const { error } = await supabase
            .from('transactions')
            .update(dbUpdates)
            .eq('id', id);
        
        if (error) {
            console.error('Update transaction error:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Update transaction exception:', err);
        return false;
    }
}

// --- Expense Management (Cloud) ---

export const addExpenseToCloud = async (expense: Expense, userId: number) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          user_id: userId,
          title: expense.title,
          amount: expense.amount,
          bank: expense.bank,
          date: expense.date 
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Insert Error:', JSON.stringify(error, null, 2));
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error syncing expense (Exception):', err);
    return false;
  }
};

export const fetchExpensesFromCloud = async (userId: number): Promise<Expense[]> => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      amount: Number(item.amount),
      bank: item.bank,
      date: Number(item.date)
    }));
  } catch (err) {
    console.error('Fetch exception:', err);
    return [];
  }
};

export const deleteExpenseFromCloud = async (id: number) => {
    try {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) {
            console.error('Delete error', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Delete exception', err);
        return false;
    }
}

// --- Agent Management (Cloud) ---

export const addAgentToCloud = async (agent: Agent, userId: number) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .insert([
        {
          user_id: userId,
          name: agent.name,
          phone: agent.phone,
          whatsapp: agent.whatsapp
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Insert Error (Agents):', JSON.stringify(error, null, 2));
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error syncing agent (Exception):', err);
    return false;
  }
};

export const fetchAgentsFromCloud = async (userId: number): Promise<Agent[]> => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      phone: item.phone,
      whatsapp: item.whatsapp,
      createdAt: new Date(item.created_at).getTime()
    }));
  } catch (err) {
    console.error('Fetch agents exception:', err);
    return [];
  }
};

// --- Client Management (Cloud) ---

export const addClientToCloud = async (client: Client, userId: number) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([
        {
          user_id: userId, 
          name: client.name,
          phone: client.phone,
          whatsapp: client.whatsapp
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Insert Error (Clients):', JSON.stringify(error, null, 2));
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error syncing client (Exception):', err);
    return false;
  }
};

export const fetchClientsFromCloud = async (userId: number): Promise<Client[]> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId) 
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      phone: item.phone,
      whatsapp: item.whatsapp,
      createdAt: new Date(item.created_at).getTime()
    }));
  } catch (err) {
    console.error('Fetch clients exception:', err);
    return [];
  }
};

// --- Accounts Management (Cloud) ---

export const fetchAccountsFromCloud = async (userId: number) => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching accounts:', error);
      return { balances: INITIAL_BALANCES, pending: INITIAL_BALANCES };
    }

    const balances: Record<string, number> = { ...INITIAL_BALANCES };
    const pending: Record<string, number> = { ...INITIAL_BALANCES };

    data.forEach((row: any) => {
        if (row.bank_name) {
            balances[row.bank_name] = Number(row.balance);
            pending[row.bank_name] = Number(row.pending_balance);
        }
    });

    return { balances, pending };
  } catch (err) {
    console.error('Fetch accounts exception:', err);
    return { balances: INITIAL_BALANCES, pending: INITIAL_BALANCES };
  }
};

export const updateAccountInCloud = async (userId: number, bankName: string, balance: number, pendingBalance: number) => {
    try {
        const { data } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', userId)
            .eq('bank_name', bankName)
            .maybeSingle();

        if (data) {
            await supabase
                .from('accounts')
                .update({ 
                    balance: balance, 
                    pending_balance: pendingBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', data.id);
        } else {
            await supabase
                .from('accounts')
                .insert([{ 
                    user_id: userId, 
                    bank_name: bankName, 
                    balance: balance, 
                    pending_balance: pendingBalance 
                }]);
        }
        return true;
    } catch (err) {
        console.error('Update account exception:', err);
        return false;
    }
};

// Transactions
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

// Balances (Actual Treasury)
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

// Pending Balances (Unearned Treasury)
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

// Clients
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

// Agents
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

// Expenses
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

// External Agents (Achievers Hub)
export const getStoredExtAgents = (): ExternalAgent[] => {
  try {
    const stored = localStorage.getItem(EXT_AGENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveStoredExtAgents = (agents: ExternalAgent[]) => {
  localStorage.setItem(EXT_AGENTS_KEY, JSON.stringify(agents));
};

// Lessons (Achievers Hub)
export const getStoredLessons = (): Lesson[] => {
  try {
    const stored = localStorage.getItem(LESSONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveStoredLessons = (lessons: Lesson[]) => {
  localStorage.setItem(LESSONS_KEY, JSON.stringify(lessons));
};

// Agent Transfers Records
export const getStoredAgentTransfers = (): AgentTransferRecord[] => {
  try {
    const stored = localStorage.getItem(AGENT_TRANSFERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveStoredAgentTransfers = (records: AgentTransferRecord[]) => {
  localStorage.setItem(AGENT_TRANSFERS_KEY, JSON.stringify(records));
};

// Client Refunds Records
export const getStoredClientRefunds = (): ClientRefundRecord[] => {
  try {
    const stored = localStorage.getItem(CLIENT_REFUNDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveStoredClientRefunds = (records: ClientRefundRecord[]) => {
  localStorage.setItem(CLIENT_REFUNDS_KEY, JSON.stringify(records));
};

// --- Logic Helpers ---
export const calculateAchievers = (transactions: Transaction[]) => {
  const achievers: Record<string, { count: number; total: number }> = {};

  transactions.filter(t => t.status === 'completed').forEach(t => {
    if (!achievers[t.agent]) {
      achievers[t.agent] = { count: 0, total: 0 };
    }
    achievers[t.agent].count += 1;
    achievers[t.agent].total += parseFloat(String(t.clientPrice)) || 0;
  });

  return Object.entries(achievers)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total); // Sort by revenue
};

// --- Backup & Restore & Delete ---

export const getLastBackupTime = () => {
  return localStorage.getItem(LAST_BACKUP_KEY);
};

export const createBackup = () => {
  const data = {
    transactions: getStoredTransactions(),
    balances: getStoredBalances(),
    pendingBalances: getStoredPendingBalances(),
    clients: getStoredClients(),
    agents: getStoredAgents(),
    expenses: getStoredExpenses(),
    extAgents: getStoredExtAgents(),
    lessons: getStoredLessons(),
    agentTransfers: getStoredAgentTransfers(),
    clientRefunds: getStoredClientRefunds(),
    timestamp: Date.now()
  };
  
  localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
  
  return JSON.stringify(data);
};

export const restoreBackup = (jsonData: string) => {
  try {
    const data = JSON.parse(jsonData);
    if (data.transactions) saveStoredTransactions(data.transactions);
    if (data.balances) saveStoredBalances(data.balances);
    if (data.pendingBalances) saveStoredPendingBalances(data.pendingBalances);
    if (data.clients) saveStoredClients(data.clients);
    if (data.agents) saveStoredAgents(data.agents);
    if (data.expenses) saveStoredExpenses(data.expenses);
    if (data.extAgents) saveStoredExtAgents(data.extAgents);
    if (data.lessons) saveStoredLessons(data.lessons);
    if (data.agentTransfers) saveStoredAgentTransfers(data.agentTransfers);
    if (data.clientRefunds) saveStoredClientRefunds(data.clientRefunds);
    return true;
  } catch (e) {
    console.error("Restore failed", e);
    return false;
  }
};

export const clearAgents = () => localStorage.removeItem(AGENTS_KEY);
export const clearClients = () => localStorage.removeItem(CLIENTS_KEY);
export const clearTransactions = () => localStorage.removeItem(TX_KEY);
export const clearAllData = () => {
  localStorage.clear();
};
