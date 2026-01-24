import { supabase } from './supabase';

// ... (Existing imports and constants)
export const DEFAULT_BANKS_LIST = [
  "الراجحي", "الأهلي", "الإنماء", "البلاد", "بنك stc", 
  "الرياض", "الجزيرة", "ساب", "نقداً كاش", "بنك آخر"
];

export const INITIAL_BALANCES: Record<string, number> = DEFAULT_BANKS_LIST.reduce((acc, bank) => ({ ...acc, [bank]: 0 }), {});

// --- Types ---
// ... (Existing types: Transaction, etc.)

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
  // Affiliate Fields
  affiliateBalance?: number;
  referredBy?: number;
}

// ... (Existing types: Client, Agent, Expense, etc.)

// New Type for Withdrawal
export interface WithdrawalRequest {
    id: number;
    userId: number;
    userName: string;
    amount: number;
    bankAccount: string;
    status: 'pending' | 'completed';
    createdAt: number;
}

// ... (Existing types: GlobalSettings, etc.)

// ... (Existing Local Storage Helpers)
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
const SETTINGS_KEY = 'moaqeb_global_settings_v6'; 
const SUB_REQUESTS_KEY = 'moaqeb_sub_requests_v1';
const GOLDEN_USERS_KEY = 'moaqeb_golden_users_v2'; 

// ... (Existing Helpers: parseDate, hashPassword, DEFAULT_SETTINGS, getGlobalSettings, saveGlobalSettings, getBankNames, checkLimit)

// --- Subscription Requests & Affiliate Logic ---

export const createSubscriptionRequest = async (userId: number, userName: string, phone: string, duration: 'شهر' | 'سنة', bank: string) => {
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
                status: 'pending'
            }]);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error('Create sub request error:', err);
        return { success: false, message: err.message || 'فشل إرسال الطلب' };
    }
};

// ... (Existing fetchSubscriptionRequestsFromCloud, getSubscriptionRequests, rejectSubscriptionRequest, getGoldenUsers)

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

        // 1. Activate Golden Membership
        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                role: 'golden',
                subscription_expiry: new Date(expiryDate).toISOString() 
            }) 
            .eq('id', req.user_id);
        
        if (updateError) throw updateError;

        // 2. Affiliate Logic: Check if referred and add commission
        const { data: user } = await supabase
            .from('users')
            .select('referred_by')
            .eq('id', req.user_id)
            .single();

        if (user && user.referred_by) {
            // Fetch referrer's current balance
            const { data: referrer } = await supabase
                .from('users')
                .select('affiliate_balance')
                .eq('id', user.referred_by)
                .single();
            
            if (referrer) {
                const newBalance = (Number(referrer.affiliate_balance) || 0) + 50;
                // Update referrer balance
                await supabase
                    .from('users')
                    .update({ affiliate_balance: newBalance })
                    .eq('id', user.referred_by);
            }
        }

        // 3. Mark request as approved
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

// ... (Existing cancelSubscription, updateUserProfile)

// Updated registerUser to handle referral code
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
    
    // Parse referral code (assuming it's the User ID)
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
          affiliate_balance: 0
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

// ... (Existing createEmployee, getStoredEmployees, deleteEmployee)

export const loginUser = async (phone: string, password: string) => {
  try {
    const passwordHash = hashPassword(password);

    const employees = getStoredEmployees();
    const emp = employees.find(e => e.officeName === phone && e.passwordHash === passwordHash);
    if (emp) {
         const goldenUsers = getGoldenUsers();
         const parentGolden = goldenUsers.find(u => u.userId === emp.parentId);
         if (parentGolden && parentGolden.expiry > Date.now()) {
             emp.subscriptionExpiry = parentGolden.expiry;
             emp.role = 'employee'; 
         }

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

    let expiry = null;
    let role = data.role || 'member';

    if (data.subscription_expiry) {
        expiry = new Date(data.subscription_expiry).getTime();
        // Check if expired
        if (role === 'golden' && expiry < Date.now()) {
            role = 'member';
        }
    }

    const user: User = {
        id: data.id,
        officeName: data.office_name,
        phone: data.phone,
        passwordHash: data.password_hash,
        securityQuestion: data.security_question,
        securityAnswer: data.security_answer,
        createdAt: new Date(data.created_at).getTime(),
        role: role as any,
        subscriptionExpiry: expiry || undefined,
        affiliateBalance: Number(data.affiliate_balance) || 0
    };
    
    if (role === 'golden' && expiry) {
        const goldenUsers = getGoldenUsers();
        if (!goldenUsers.find(u => u.userId === user.id)) {
            goldenUsers.push({ userId: user.id, expiry: expiry, userName: user.officeName });
            localStorage.setItem(GOLDEN_USERS_KEY, JSON.stringify(goldenUsers));
        }
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, message: 'حدث خطأ أثناء تسجيل الدخول' };
  }
};

// ... (Existing changePassword, verifySecurityInfo, resetPassword, getCurrentUser, logoutUser)

// --- Withdrawal Functions ---

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
    } catch (err: any) {
        console.error('Withdrawal error:', err);
        return { success: false, message: err.message };
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
            amount: Number(item.amount),
            bankAccount: item.bank_account,
            status: item.status,
            createdAt: new Date(item.created_at).getTime()
        }));
    } catch (err) {
        console.error('Fetch withdrawals error:', err);
        return [];
    }
};

export const completeWithdrawal = async (requestId: number, userId: number) => {
    try {
        // 1. Reset User Balance
        const { error: userError } = await supabase
            .from('users')
            .update({ affiliate_balance: 0 })
            .eq('id', userId);
        
        if (userError) throw userError;

        // 2. Mark request as completed
        const { error: reqError } = await supabase
            .from('withdrawal_requests')
            .update({ status: 'completed' })
            .eq('id', requestId);
            
        if (reqError) throw reqError;

        return { success: true };
    } catch (err) {
        console.error('Complete withdrawal error:', err);
        return { success: false };
    }
};

// ... (Existing Transaction, Expense, Agent, Client, Account functions)
