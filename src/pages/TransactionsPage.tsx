import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Plus, Clock, Banknote, AlertCircle, Wallet, Printer, Send, Phone, MessageCircle, CheckCircle2, XCircle, Eye, Contact, Lock, Trash2, Pencil, Loader2, Filter, Search, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
import { 
  getStoredTransactions, saveStoredTransactions, 
  getStoredBalances, saveStoredBalances, 
  getStoredClients, saveStoredClients, Client, getStoredAgents, saveStoredAgents, Agent,
  getCurrentUser, User,
  addClientToCloud, addAgentToCloud, fetchClientsFromCloud, fetchAgentsFromCloud,
  addTransactionToCloud, fetchTransactionsFromCloud, updateTransactionStatusInCloud,
  fetchAccountsFromCloud, updateAccountInCloud,
  Transaction, getGlobalSettings, GlobalSettings, checkLimit, deleteTransactionFromCloud, updateTransactionInCloud,
  getBankNames,
  isEmployeeRestricted,
  getGoldenUsers 
} from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { LimitModals } from '@/components/LimitModals';
import { toast } from 'sonner';

const transactionTypesList = [
  "تجديد إقامة", "نقل كفالة", "خروج وعودة", "خروج نهائي", "تأشيرة زيارة", "تأمين طبي", "إصدار رخصة"
];

const CountdownTimer = ({ targetDate, status }: { targetDate: number, status: string }) => {
  const [timeLeft, setTimeLeft] = useState("جاري الحساب...");

  useEffect(() => {
    // Calculate immediately
    const calculate = () => {
        const now = Date.now();
        const diff = targetDate - now;

        if (diff <= 0) {
            setTimeLeft("انتهت المدة");
            return false; // Stop timer
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft(`تبقي علي الإنجاز: ${days}يوم ${hours}ساعات ${minutes}دقيقة ${seconds}ثانية`);
        return true; // Continue timer
    };

    if (status !== 'active') return;

    const shouldContinue = calculate();
    if (!shouldContinue) return;

    const timer = setInterval(() => {
        if (!calculate()) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, status]);

  if (status === 'completed') return <span className="text-green-600 font-bold text-sm">تم الإنجاز بنجاح</span>;
  if (status === 'cancelled') return <span className="text-red-600 font-bold text-sm">تم إلغاء المعاملة</span>;

  return <span className={cn("font-mono font-bold text-xs sm:text-sm", timeLeft === "انتهت المدة" ? "text-gray-500" : "text-blue-600")} dir="rtl">{timeLeft}</span>;
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  
  const [officeBalance, setOfficeBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(false);

  // Financial State
  const [balances, setBalances] = useState<Record<string, number>>({});

  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientWhatsapp, setNewClientWhatsapp] = useState('');
  const [clientErrors, setClientErrors] = useState({ phone: '', whatsapp: '' });

  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentWhatsapp, setNewAgentWhatsapp] = useState('');
  const [agentErrors, setAgentErrors] = useState({ phone: '', whatsapp: '' });

  const [inputTypeMode, setInputTypeMode] = useState<'manual' | 'select'>('manual');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Edit Mode State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Limit Modal State
  const [limitModalType, setLimitModalType] = useState<'none' | 'visitor' | 'member' | 'golden'>('none');

  // Dynamic Bank List
  const [banksList, setBanksList] = useState<string[]>([]);

  // Filter & Search State
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [formData, setFormData] = useState({
    manualType: '',
    selectedType: '',
    agentPrice: '',
    clientPrice: '',
    agent: '',
    clientName: '',
    duration: '',
    paymentMethod: ''
  });

  const manualTypeRef = useRef<HTMLInputElement>(null);
  const agentPriceRef = useRef<HTMLInputElement>(null);
  const clientPriceRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const clientSelectRef = useRef<HTMLButtonElement>(null);
  const agentSelectRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setSettings(getGlobalSettings());
    setBanksList(getBankNames());

    if (user) {
        const targetId = user.role === 'employee' && user.parentId ? user.parentId : user.id;
        fetchTransactionsFromCloud(targetId).then(data => setTransactions(data));
        fetchClientsFromCloud(targetId).then(data => setClients(data));
        fetchAgentsFromCloud(targetId).then(data => setAgents(data));
        fetchAccountsFromCloud(targetId).then(data => {
            setBalances(data.balances);
            updateBalancesDisplay(data.balances);
        });
    } else {
        setTransactions(getStoredTransactions());
        setClients(getStoredClients());
        setAgents(getStoredAgents());
        const localBal = getStoredBalances();
        setBalances(localBal);
        updateBalancesDisplay(localBal);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;

    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${targetId}`
        },
        (payload) => {
          fetchTransactionsFromCloud(targetId).then(data => {
            setTransactions(data);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const updateBalancesDisplay = (currentBals: Record<string, number>) => {
    const total = Object.values(currentBals).reduce((a, b) => a + b, 0);
    setOfficeBalance(total);
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLInputElement | null>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  const checkAddPermission = () => {
      const role = currentUser?.role || 'visitor';
      const check = checkLimit(role, 'transactions', transactions.length);
      if (!check.allowed) {
          if (check.reason === 'visitor') setLimitModalType('visitor');
          else if (check.reason === 'member') setLimitModalType('member');
          else if (check.reason === 'golden') setLimitModalType('golden');
          return false;
      }
      return true;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let firstErrorField = null;
    
    if (inputTypeMode === 'manual' && !formData.manualType) {
        newErrors.type = "يرجى كتابة نوع المعاملة";
        if(!firstErrorField) firstErrorField = manualTypeRef;
    }
    if (inputTypeMode === 'select' && !formData.selectedType) {
        newErrors.type = "يرجى اختيار نوع المعاملة";
    }
    
    if (formData.agent !== 'إنجاز بنفسي' && !formData.agentPrice) {
        newErrors.agentPrice = "مطلوب";
        if(!firstErrorField) firstErrorField = agentPriceRef;
    }

    if (!formData.clientPrice) {
        newErrors.clientPrice = "مطلوب";
        if(!firstErrorField) firstErrorField = clientPriceRef;
    }
    if (!formData.agent) {
        newErrors.agent = "يرجى اختيار المعقب";
    }
    if (!formData.duration) {
        newErrors.duration = "مطلوب";
        if(!firstErrorField) firstErrorField = durationRef;
    }
    if (!formData.paymentMethod) {
        newErrors.paymentMethod = "يرجى اختيار طريقة الدفع";
    }

    setErrors(newErrors);

    if (firstErrorField && firstErrorField.current) {
        firstErrorField.current.focus();
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleManualTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val.length <= 20 && /^[\u0600-\u06FFa-zA-Z0-9\s]*$/.test(val)) {
          setFormData({...formData, manualType: val});
          if(errors.type) setErrors({...errors, type: ''});
      }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    const finalType = inputTypeMode === 'manual' ? formData.manualType : formData.selectedType;
    const durationDays = parseInt(formData.duration) || 0;
    const clientP = parseFloat(formData.clientPrice) || 0;
    const agentP = formData.agent === 'إنجاز بنفسي' ? 0 : (parseFloat(formData.agentPrice) || 0);
    
    if (editingTx) {
        const oldAmount = parseFloat(editingTx.clientPrice) || 0;
        const newAmount = clientP;
        const oldBank = editingTx.paymentMethod;
        const newBank = formData.paymentMethod;

        const newBalances = { ...balances };
        newBalances[oldBank] = (newBalances[oldBank] || 0) - oldAmount;
        newBalances[newBank] = (newBalances[newBank] || 0) + newAmount;

        setBalances(newBalances);
        updateBalancesDisplay(newBalances);

        const updatedTx: Transaction = {
            ...editingTx,
            type: finalType,
            clientPrice: formData.clientPrice,
            agentPrice: formData.agent === 'إنجاز بنفسي' ? '0' : formData.agentPrice,
            agent: formData.agent,
            clientName: formData.clientName || 'عميل عام',
            duration: formData.duration,
            paymentMethod: formData.paymentMethod,
            targetDate: editingTx.createdAt + (durationDays * 24 * 60 * 60 * 1000),
        };

        if (currentUser) {
            const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
            
            const success = await updateTransactionInCloud(updatedTx);
            if (!success) {
                toast.error("فشل تحديث المعاملة في قاعدة البيانات. يرجى التحقق من الاتصال.");
                setLoading(false);
                return;
            }

            if (oldBank === newBank) {
                 await updateAccountInCloud(targetId, oldBank, newBalances[oldBank], 0);
            } else {
                 await updateAccountInCloud(targetId, oldBank, newBalances[oldBank], 0);
                 await updateAccountInCloud(targetId, newBank, newBalances[newBank], 0);
            }

            const updatedTxs = transactions.map(t => t.id === editingTx.id ? updatedTx : t);
            setTransactions(updatedTxs);
        } else {
            const updatedTxs = transactions.map(t => t.id === editingTx.id ? updatedTx : t);
            setTransactions(updatedTxs);
            saveStoredTransactions(updatedTxs);
            saveStoredBalances(newBalances);
        }

    } else {
        const newTx: Transaction = {
            id: Date.now(),
            serialNo: String(transactions.length + 1).padStart(4, '0'),
            type: finalType,
            clientPrice: formData.clientPrice,
            agentPrice: formData.agent === 'إنجاز بنفسي' ? '0' : formData.agentPrice,
            agent: formData.agent,
            clientName: formData.clientName || 'عميل عام',
            duration: formData.duration,
            paymentMethod: formData.paymentMethod,
            createdAt: Date.now(),
            targetDate: Date.now() + (durationDays * 24 * 60 * 60 * 1000),
            status: 'active',
            agentPaid: false,
            clientRefunded: false,
            createdBy: currentUser?.officeName
        };

        const bank = formData.paymentMethod;
        const newBalances = { ...balances };
        newBalances[bank] = (newBalances[bank] || 0) + clientP;
        
        if (currentUser) {
            const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
            const result = await addTransactionToCloud(newTx, targetId);
            
            if (!result.success) {
                toast.error(`فشل حفظ المعاملة في قاعدة البيانات: ${result.error || 'خطأ غير معروف'}`);
                setLoading(false);
                return;
            }

            setBalances(newBalances);
            const updatedTxs = [newTx, ...transactions];
            setTransactions(updatedTxs);
            
            await updateAccountInCloud(targetId, bank, newBalances[bank], 0);
        } else {
            const updatedTxs = [newTx, ...transactions];
            setTransactions(updatedTxs);
            setBalances(newBalances);
            saveStoredTransactions(updatedTxs);
            saveStoredBalances(newBalances);
        }
    }

    setLoading(false);
    setOpen(false);
    setEditingTx(null);
    
    setFormData({
      manualType: '',
      selectedType: '',
      agentPrice: '',
      clientPrice: '',
      agent: '',
      clientName: '',
      duration: '',
      paymentMethod: ''
    });
    setErrors({});
    toast.success(editingTx ? 'تم تحديث المعاملة' : 'تم حفظ المعاملة بنجاح');
  };

  const handleEditTransaction = (tx: Transaction) => {
      setEditingTx(tx);
      const isStandardType = transactionTypesList.includes(tx.type);
      setInputTypeMode(isStandardType ? 'select' : 'manual');
      
      setFormData({
          manualType: isStandardType ? '' : tx.type,
          selectedType: isStandardType ? tx.type : '',
          agentPrice: tx.agentPrice,
          clientPrice: tx.clientPrice,
          agent: tx.agent,
          clientName: tx.clientName || '',
          duration: tx.duration,
          paymentMethod: tx.paymentMethod
      });
      setOpen(true);
  };

  const handleDeleteTransaction = async (id: number) => {
      if(confirm('هل أنت متأكد من حذف هذه المعاملة نهائياً؟')) {
          if(currentUser) {
              const success = await deleteTransactionFromCloud(id);
              if (!success) {
                  toast.error("فشل حذف المعاملة من قاعدة البيانات.");
                  return;
              }
          }
          
          const updatedTxs = transactions.filter(t => t.id !== id);
          setTransactions(updatedTxs);
          
          if(!currentUser) {
              saveStoredTransactions(updatedTxs);
          }
          toast.success('تم حذف المعاملة بنجاح');
      }
  };

  const validateSaudiNumber = (num: string) => {
    const regex = /^05\d{8}$/;
    return regex.test(num);
  };

  const handleImportContact = async (type: 'client' | 'agent') => {
    try {
      // @ts-ignore
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        // @ts-ignore
        const contacts = await navigator.contacts.select(props, opts);
        if (contacts.length) {
          const contact = contacts[0];
          const rawName = contact.name[0];
          let rawPhone = contact.tel[0];
          if (rawPhone) {
            rawPhone = rawPhone.replace(/\D/g, '');
            if (rawPhone.startsWith('966')) rawPhone = '0' + rawPhone.substring(3);
            else if (rawPhone.startsWith('5')) rawPhone = '0' + rawPhone;
            else if (rawPhone.startsWith('00966')) rawPhone = '0' + rawPhone.substring(5);
            
            if (rawPhone.length > 10) rawPhone = rawPhone.slice(0, 10);

            if (type === 'client') {
                setNewClientName(rawName);
                setNewClientPhone(rawPhone);
                setNewClientWhatsapp(rawPhone);
            } else {
                setNewAgentName(rawName);
                setNewAgentPhone(rawPhone);
                setNewAgentWhatsapp(rawPhone);
            }
          }
        }
      } else {
        toast.error('عذراً، ميزة استيراد جهات الاتصال غير مدعومة في هذا المتصفح. يرجى إدخال البيانات يدوياً.');
      }
    } catch (ex) {
      console.error(ex);
      toast.error('تعذر الوصول لجهات الاتصال. يرجى التأكد من منح التطبيق صلاحية الوصول لجهات الاتصال من إعدادات الهاتف.');
    }
  };

  const handleAddClientQuick = async () => {
    const role = currentUser?.role || 'visitor';
    const check = checkLimit(role, 'clients', clients.length);
    if (!check.allowed) {
        if (check.reason === 'visitor') setLimitModalType('visitor');
        else if (check.reason === 'member') setLimitModalType('member');
        else if (check.reason === 'golden') setLimitModalType('golden');
        return;
    }
    let hasError = false;
    const newErrors = { phone: '', whatsapp: '' };
    if(!newClientName.trim()) return;
    if (newClientPhone && !validateSaudiNumber(newClientPhone)) {
        newErrors.phone = 'يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
        hasError = true;
    }
    if (newClientWhatsapp && !validateSaudiNumber(newClientWhatsapp)) {
        newErrors.whatsapp = 'يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
        hasError = true;
    }
    setClientErrors(newErrors);
    if (hasError) return;
    const newClient: Client = {
      id: Date.now(),
      name: newClientName,
      phone: newClientPhone ? `966${newClientPhone.substring(1)}` : '',
      whatsapp: newClientWhatsapp ? `966${newClientWhatsapp.substring(1)}` : '',
      createdAt: Date.now()
    };
    if (currentUser) {
        const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
        const result = await addClientToCloud(newClient, targetId);
        if (!result.success) {
            toast.error(`فشل إضافة العميل: ${result.error}`);
            return;
        }
    }
    const updated = [newClient, ...clients];
    setClients(updated);
    if (!currentUser) saveStoredClients(updated);
    setFormData(prev => ({ ...prev, clientName: newClientName }));
    setNewClientName('');
    setNewClientPhone('');
    setNewClientWhatsapp('');
    setClientErrors({ phone: '', whatsapp: '' });
    setAddClientOpen(false);
    setTimeout(() => durationRef.current?.focus(), 100);
    toast.success('تم إضافة العميل بنجاح');
  };

  const handleAddAgentQuick = async () => {
    const role = currentUser?.role || 'visitor';
    const check = checkLimit(role, 'agents', agents.length);
    if (!check.allowed) {
        if (check.reason === 'visitor') setLimitModalType('visitor');
        else if (check.reason === 'member') setLimitModalType('member');
        else if (check.reason === 'golden') setLimitModalType('golden');
        return;
    }
    let hasError = false;
    const newErrors = { phone: '', whatsapp: '' };
    if(!newAgentName.trim()) return;
    if (newAgentPhone && !validateSaudiNumber(newAgentPhone)) {
        newErrors.phone = 'يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
        hasError = true;
    }
    if (newAgentWhatsapp && !validateSaudiNumber(newAgentWhatsapp)) {
        newErrors.whatsapp = 'يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
        hasError = true;
    }
    setAgentErrors(newErrors);
    if (hasError) return;
    const newAgent: Agent = {
      id: Date.now(),
      name: newAgentName,
      phone: newAgentPhone ? `966${newAgentPhone.substring(1)}` : '',
      whatsapp: newAgentWhatsapp ? `966${newAgentWhatsapp.substring(1)}` : '',
      createdAt: Date.now()
    };
    if (currentUser) {
        const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
        const result = await addAgentToCloud(newAgent, targetId);
        if (!result.success) {
            toast.error(`فشل إضافة المعقب: ${result.error}`);
            return;
        }
    }
    const updatedAgents = [newAgent, ...agents];
    setAgents(updatedAgents);
    if (!currentUser) saveStoredAgents(updatedAgents);
    setFormData(prev => ({ ...prev, agent: newAgentName }));
    setNewAgentName('');
    setNewAgentPhone('');
    setNewAgentWhatsapp('');
    setAgentErrors({ phone: '', whatsapp: '' });
    setAddAgentOpen(false);
    toast.success('تم إضافة المعقب بنجاح');
  };

  const updateStatus = async (id: number, newStatus: 'completed' | 'cancelled') => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    const bank = tx.paymentMethod;
    const newBalances = { ...balances };

    if (newStatus === 'completed' && tx.status === 'active') {
        setFeedbackMsg({ type: 'success', text: 'تم إنجاز المعاملة بنجاح' });
    }
    
    if (newStatus === 'cancelled') {
         setFeedbackMsg({ type: 'error', text: 'تم الغاء المعامله بنجاح' });
    }

    if (currentUser) {
        const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
        const success = await updateTransactionStatusInCloud(id, { status: newStatus });
        if (!success) {
            toast.error("فشل تحديث الحالة في قاعدة البيانات.");
            return;
        }
        await updateAccountInCloud(targetId, bank, newBalances[bank] || 0, 0);
    }

    setBalances(newBalances);
    updateBalancesDisplay(newBalances);
    setTimeout(() => setFeedbackMsg(null), 2000);
    
    const updatedTxs = transactions.map(t => 
      t.id === id ? { ...t, status: newStatus } : t
    );
    setTransactions(updatedTxs);
    
    if (!currentUser) {
        saveStoredTransactions(updatedTxs);
        saveStoredBalances(newBalances);
    }
  };

  const [printTx, setPrintTx] = useState<Transaction | null>(null);
  const handlePrint = (tx: Transaction) => {
    setPrintTx(tx);
    setTimeout(() => {
        try {
            window.focus();
            window.print();
        } catch (e) {
            console.error("Print error:", e);
            toast.error("حدث خطأ أثناء محاولة الطباعة. يرجى التأكد من إعدادات الطابعة في جهازك.");
        }
    }, 500);
  };

  const handleWhatsApp = (tx: Transaction) => {
    const client = clients.find(c => c.name === tx.clientName);
    const phoneNumber = client?.whatsapp || client?.phone;
    const text = `تفاصيل المعاملة:\nنوع: ${tx.type}\nالسعر: ${tx.clientPrice} ر.س\nرقم: ${tx.serialNo}\nالحالة: ${tx.status === 'completed' ? 'تم الإنجاز' : 'قيد التنفيذ'}`;
    if (phoneNumber) {
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // Helper to get the correct office name for printing
  const getPrintOfficeName = () => {
      // If employee, try to find parent's name from Golden Users cache
      if (currentUser?.role === 'employee' && currentUser.parentId) {
          const goldenUsers = getGoldenUsers();
          const parent = goldenUsers.find(u => u.userId === currentUser.parentId);
          if (parent && parent.userName) return parent.userName;
      }
      // Default to current user's office name (which is the office name for members/golden)
      return currentUser?.officeName || 'مكتب الخدمات العامة';
  };

  // Filter Logic
  const filteredTransactions = transactions.filter(tx => {
      const now = Date.now();
      const isExpired = tx.status === 'active' && now > tx.targetDate;
      
      // Status Filter
      if (filterStatus === 'active' && (tx.status !== 'active' || isExpired)) return false;
      if (filterStatus === 'completed' && tx.status !== 'completed') return false;
      if (filterStatus === 'cancelled' && tx.status !== 'cancelled') return false;
      if (filterStatus === 'expired' && !isExpired) return false;

      // Search Filter
      if (searchQuery && !tx.serialNo.includes(searchQuery)) return false;

      return true;
  });

  return (
    <>
    <LimitModals 
        type={limitModalType} 
        isOpen={limitModalType !== 'none'} 
        onClose={() => setLimitModalType('none')} 
    />
    {feedbackMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className={cn("bg-white px-8 py-6 rounded-3xl shadow-3d border-2 flex flex-col items-center gap-3 animate-in zoom-in fade-in duration-300", feedbackMsg.type === 'success' ? "border-green-100" : "border-red-100")}>
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center shadow-md", feedbackMsg.type === 'success' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                    {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-8 h-8" strokeWidth={3} /> : <XCircle className="w-8 h-8" strokeWidth={3} />}
                </div>
                <h3 className={cn("text-xl font-black", feedbackMsg.type === 'success' ? "text-green-700" : "text-red-600")}>{feedbackMsg.text}</h3>
            </div>
        </div>
    )}
    <div className="max-w-5xl mx-auto pb-20 print:hidden">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600 transition-all"><ArrowRight className="w-6 h-6" /></button>
                <div><h1 className="text-2xl sm:text-3xl font-black text-gray-800 text-shadow">المعاملات</h1><p className="text-gray-500 text-sm">إدارة ومتابعة المعاملات المالية</p></div>
            </div>
            <div className="hidden sm:flex gap-4"><div className="bg-[#eef2f6] shadow-3d-inset px-4 py-2 rounded-xl flex items-center gap-2"><Wallet className="w-4 h-4 text-blue-600" /><div className="text-xs text-gray-500">جملة الخزينة</div><div className="font-bold text-blue-700">{officeBalance.toLocaleString()} ر.س</div></div></div>
        </div>
      </header>
      
      <div className="flex flex-col gap-4 mb-6">
        {/* Add Button */}
        <div className="flex justify-start">
            <Dialog open={open} onOpenChange={(val) => { if(val && !checkAddPermission() && !editingTx) return; setOpen(val); if(!val) { setEditingTx(null); setFormData({ manualType: '', selectedType: '', agentPrice: '', clientPrice: '', agent: '', clientName: '', duration: '', paymentMethod: '' }); } }}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#eef2f6] text-blue-600 font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all w-fit">
                    <div className="p-1 bg-blue-100 rounded-full"><Plus className="w-5 h-5" /></div>
                    <span>أضف معاملة جديدة</span>
                </button>
            </DialogTrigger>
            <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl max-w-lg" dir="rtl">
                <DialogHeader><DialogTitle className="text-xl font-bold text-gray-800 text-center mb-1">{editingTx ? 'تعديل المعاملة' : 'بيانات المعاملة'}</DialogTitle><DialogDescription className="hidden">Form</DialogDescription></DialogHeader>
                <div className="grid gap-3 py-2">
                <div className="relative border-2 border-red-400/30 rounded-xl p-3 bg-white/30">
                    <Label className="text-gray-700 font-bold text-xs mb-2 block">نوع المعاملة</Label>
                    <div className="flex bg-[#eef2f6] p-1 rounded-lg shadow-3d-inset mb-3"><button onClick={() => setInputTypeMode('manual')} className={cn("flex-1 py-1 text-xs font-bold rounded-md transition-all", inputTypeMode === 'manual' ? "bg-white shadow-sm text-blue-600" : "text-gray-400")}>كتابة يدوية</button><button onClick={() => setInputTypeMode('select')} className={cn("flex-1 py-1 text-xs font-bold rounded-md transition-all", inputTypeMode === 'select' ? "bg-white shadow-sm text-blue-600" : "text-gray-400")}>اختر من قائمة</button></div>
                    {inputTypeMode === 'manual' ? (
                        <div className="relative"><Input ref={manualTypeRef} placeholder="اكتب المعاملة هنا.." value={formData.manualType} onChange={handleManualTypeChange} onKeyDown={(e) => handleKeyDown(e, agentPriceRef)} className="bg-[#eef2f6] shadow-3d-inset border-none h-10 text-sm animate-pulse" /></div>
                    ) : (
                        <Select value={formData.selectedType} onValueChange={(val) => { setFormData({...formData, selectedType: val}); if(errors.type) setErrors({...errors, type: ''}); }}><SelectTrigger className="h-10 rounded-xl bg-[#eef2f6] border-none shadow-3d-inset text-right flex-row-reverse text-sm [&>svg]:text-red-500 [&>svg]:animate-pulse"><SelectValue placeholder="اختر معاملة..." /></SelectTrigger><SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">{transactionTypesList.map((type) => (<SelectItem key={type} value={type} className="text-right cursor-pointer focus:bg-white/50 my-1">{type}</SelectItem>))}</SelectContent></Select>
                    )}
                    {errors.type && <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.type}</p>}
                </div>
                <div className="space-y-1">
                    <Label className="text-gray-700 font-bold text-xs">اختر المعقب</Label>
                    <div className="flex gap-2">
                        <div className="flex-1"><Select value={formData.agent} onValueChange={(val) => { setFormData({...formData, agent: val}); if(errors.agent) setErrors({...errors, agent: ''}); }}><SelectTrigger ref={agentSelectRef} className={cn("h-10 rounded-xl bg-[#eef2f6] shadow-3d-inset text-right flex-row-reverse text-sm", errors.agent ? "border border-red-400" : "border-none")}><SelectValue placeholder="اختر المعقب..." /></SelectTrigger><SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl"><SelectItem value="إنجاز بنفسي" className="text-right font-bold text-blue-600">إنجاز بنفسي</SelectItem>{agents.map((agent) => (<SelectItem key={agent.id} value={agent.name} className="text-right cursor-pointer focus:bg-white/50 my-1">{agent.name}</SelectItem>))}</SelectContent></Select></div>
                        <Dialog open={addAgentOpen} onOpenChange={setAddAgentOpen}><DialogTrigger asChild><button className="w-10 h-10 rounded-xl bg-orange-500 text-white shadow-3d flex items-center justify-center hover:bg-orange-600"><Plus className="w-5 h-5" /></button></DialogTrigger><DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl"><DialogHeader><DialogTitle>إضافة معقب سريع</DialogTitle></DialogHeader><button onClick={() => handleImportContact('agent')} className="w-full py-2 bg-purple-100 text-purple-700 rounded-xl font-bold shadow-sm hover:bg-purple-200 flex items-center justify-center gap-2 mb-2"><Contact className="w-4 h-4" /> أو من الهاتف</button><div className="py-4 space-y-3"><Input placeholder="اسم المعقب" value={newAgentName} onChange={(e) => { const val = e.target.value; if (val.length <= 20 && /^[\u0600-\u06FFa-zA-Z0-9\s]*$/.test(val)) setNewAgentName(val); }} className="bg-white shadow-3d-inset border-none" /><div className="space-y-1"><div className="relative flex items-center" dir="ltr"><div className="absolute left-3 z-10 text-gray-400 font-bold text-sm pointer-events-none">+966</div><Input value={newAgentPhone} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setNewAgentPhone(val); if(agentErrors.phone) setAgentErrors({...agentErrors, phone: ''}); }} className={`bg-white shadow-3d-inset border-none pl-14 text-left ${agentErrors.phone ? 'ring-2 ring-red-400' : ''}`} placeholder="05xxxxxxxx" /><Phone className="absolute right-3 w-4 h-4 text-gray-400" /></div>{agentErrors.phone && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {agentErrors.phone}</p>}</div><div className="space-y-1"><div className="relative flex items-center" dir="ltr"><div className="absolute left-3 z-10 text-green-600 font-bold text-sm pointer-events-none">+966</div><Input value={newAgentWhatsapp} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setNewAgentWhatsapp(val); if(agentErrors.whatsapp) setAgentErrors({...agentErrors, whatsapp: ''}); }} className={`bg-white shadow-3d-inset border-none pl-14 text-left ${agentErrors.whatsapp ? 'ring-2 ring-red-400' : ''}`} placeholder="05xxxxxxxx" /><MessageCircle className="absolute right-3 w-4 h-4 text-green-500" /></div>{agentErrors.whatsapp && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {agentErrors.whatsapp}</p>}</div><button onClick={handleAddAgentQuick} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold">حفظ وإكمال</button></div></DialogContent></Dialog>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {formData.agent !== 'إنجاز بنفسي' && (
                        <div className="space-y-1"><Label className="text-gray-700 font-bold text-xs">سعر المعقب</Label><div className="relative"><Input ref={agentPriceRef} type="number" placeholder="0" value={formData.agentPrice} onChange={(e) => { setFormData({...formData, agentPrice: e.target.value}); if(errors.agentPrice) setErrors({...errors, agentPrice: ''}); }} onKeyDown={(e) => handleKeyDown(e, clientPriceRef)} className={cn("pl-10 text-left font-bold text-gray-600 h-10 text-sm", errors.agentPrice ? "border border-red-400" : "border-none")} /><span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">ر.س</span></div></div>
                    )}
                    <div className="space-y-1"><Label className="text-gray-700 font-bold text-xs">السعر للعميل</Label><div className="relative"><Input ref={clientPriceRef} type="number" placeholder="0" value={formData.clientPrice} onChange={(e) => { setFormData({...formData, clientPrice: e.target.value}); if(errors.clientPrice) setErrors({...errors, clientPrice: ''}); }} onKeyDown={(e) => handleKeyDown(e, durationRef)} className={cn("pl-10 text-left font-bold text-blue-600 h-10 text-sm", errors.clientPrice ? "border border-red-400" : "border-none")} /><span className="absolute left-3 top-2.5 text-xs font-bold text-blue-400">ر.س</span></div></div>
                </div>
                <div className="space-y-1">
                    <Label className="text-gray-700 font-bold text-xs">العميل</Label>
                    <div className="flex gap-2">
                        <div className="flex-1"><Select value={formData.clientName} onValueChange={(val) => setFormData({...formData, clientName: val})}><SelectTrigger ref={clientSelectRef} className="h-10 rounded-xl bg-[#eef2f6] shadow-3d-inset text-right flex-row-reverse text-sm border-none"><SelectValue placeholder="اختر عميل..." /></SelectTrigger><SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">{clients.map((client) => (<SelectItem key={client.id} value={client.name} className="text-right">{client.name}</SelectItem>))}</SelectContent></Select></div>
                        <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}><DialogTrigger asChild><button className="w-10 h-10 rounded-xl bg-blue-600 text-white shadow-3d flex items-center justify-center hover:bg-blue-700"><Plus className="w-5 h-5" /></button></DialogTrigger><DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl"><DialogHeader><DialogTitle>إضافة عميل سريع</DialogTitle></DialogHeader><button onClick={() => handleImportContact('client')} className="w-full py-2 bg-purple-100 text-purple-700 rounded-xl font-bold shadow-sm hover:bg-purple-200 flex items-center justify-center gap-2 mb-2"><Contact className="w-4 h-4" /> أو من الهاتف</button><div className="py-4 space-y-3"><Input placeholder="اسم العميل" value={newClientName} onChange={(e) => { const val = e.target.value; if (val.length <= 20 && /^[\u0600-\u06FFa-zA-Z0-9\s]*$/.test(val)) setNewClientName(val); }} className="bg-white shadow-3d-inset border-none" /><div className="space-y-1"><div className="relative flex items-center" dir="ltr"><div className="absolute left-3 z-10 text-gray-400 font-bold text-sm pointer-events-none">+966</div><Input value={newClientPhone} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setNewClientPhone(val); if(clientErrors.phone) setClientErrors({...clientErrors, phone: ''}); }} className={`bg-white shadow-3d-inset border-none pl-14 text-left ${clientErrors.phone ? 'ring-2 ring-red-400' : ''}`} placeholder="05xxxxxxxx" /><Phone className="absolute right-3 w-4 h-4 text-gray-400" /></div>{clientErrors.phone && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {clientErrors.phone}</p>}</div><div className="space-y-1"><div className="relative flex items-center" dir="ltr"><div className="absolute left-3 z-10 text-green-600 font-bold text-sm pointer-events-none">+966</div><Input value={newClientWhatsapp} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setNewClientWhatsapp(val); if(clientErrors.whatsapp) setClientErrors({...clientErrors, whatsapp: ''}); }} className={`bg-white shadow-3d-inset border-none pl-14 text-left ${clientErrors.whatsapp ? 'ring-2 ring-red-400' : ''}`} placeholder="05xxxxxxxx" /><MessageCircle className="absolute right-3 w-4 h-4 text-green-500" /></div>{clientErrors.whatsapp && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {clientErrors.whatsapp}</p>}</div><button onClick={handleAddClientQuick} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">حفظ وإكمال</button></div></DialogContent></Dialog>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-gray-700 font-bold text-xs">مدة الإنجاز (أيام)</Label><div className="relative"><Input ref={durationRef} type="number" placeholder="3" value={formData.duration} onChange={(e) => { setFormData({...formData, duration: e.target.value}); if(errors.duration) setErrors({...errors, duration: ''}); }} className={cn("pl-8 text-left h-10 text-sm", errors.duration ? "border border-red-400" : "border-none")} /><Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /></div></div>
                    <div className="space-y-1"><Label className="text-gray-700 font-bold text-xs">طريقة الدفع</Label><Select value={formData.paymentMethod} onValueChange={(val) => { setFormData({...formData, paymentMethod: val}); if(errors.paymentMethod) setErrors({...errors, paymentMethod: ''}); }}><SelectTrigger className={cn("h-10 rounded-xl bg-[#eef2f6] shadow-3d-inset text-right flex-row-reverse text-sm", errors.paymentMethod ? "border border-red-400" : "border-none")}><SelectValue placeholder="اختر البنك..." /></SelectTrigger><SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">{banksList.map((bank) => (<SelectItem key={bank} value={bank} className="text-right cursor-pointer focus:bg-white/50 my-1">{bank}</SelectItem>))}</SelectContent></Select></div>
                </div>
                </div>
                {/* DISABLED SAVE BUTTON FOR RESTRICTED EMPLOYEES */}
                <DialogFooter className="flex justify-center mt-4">
                    <button 
                        onClick={handleSave} 
                        disabled={loading || isEmployeeRestricted(currentUser)} 
                        className="w-full max-w-[200px] py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingTx ? 'تحديث' : 'حفظ المعاملة')}
                    </button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between">
            {/* Filter (Right in RTL) */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px] bg-[#eef2f6] shadow-3d-inset border-none h-12 rounded-xl text-gray-700 font-bold">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        <SelectValue placeholder="تصفية الحالات" />
                    </div>
                </SelectTrigger>
                <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                    <SelectItem value="all">كل المعاملات</SelectItem>
                    <SelectItem value="active">نشطة الآن</SelectItem>
                    <SelectItem value="completed">المنجزة</SelectItem>
                    <SelectItem value="cancelled">الملغاة</SelectItem>
                    <SelectItem value="expired">انتهت مدتها</SelectItem>
                </SelectContent>
            </Select>

            {/* Search (Left in RTL) */}
            <div className="flex items-center gap-2">
                {isSearchOpen ? (
                    <div className="relative animate-in fade-in slide-in-from-left-4">
                        <Input 
                            placeholder="بحث عن معاملة..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-48 bg-[#eef2f6] shadow-3d-inset border-none h-12 rounded-xl pr-10"
                            autoFocus
                        />
                        <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="absolute left-2 top-3 text-gray-400 hover:text-red-500">
                            <XCircle className="w-5 h-5" />
                        </button>
                        <Search className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                    </div>
                ) : (
                    <button onClick={() => setIsSearchOpen(true)} className="w-12 h-12 bg-[#eef2f6] shadow-3d rounded-xl flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors">
                        <Search className="w-6 h-6" />
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-8 min-h-[300px] flex flex-col items-center justify-center text-center border border-white/20"><div className="w-20 h-20 bg-[#eef2f6] rounded-full shadow-3d flex items-center justify-center mb-6 text-gray-400"><Banknote className="w-10 h-10" /></div><h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد معاملات</h3><p className="text-gray-500 max-w-xs mx-auto">قم بإضافة معاملة جديدة أو تغيير خيارات البحث.</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTransactions.map((tx) => {
                const isExpired = tx.status === 'active' && Date.now() > tx.targetDate;
                
                let cardHeaderClass = "bg-yellow-200 border-yellow-300";
                let dotClass = "bg-blue-500 animate-pulse";
                let cardContainerClass = "border-none shadow-3d bg-[#eef2f6] overflow-hidden transition-all cursor-pointer hover:scale-[1.01] group relative";

                if (tx.status === 'completed') {
                    cardHeaderClass = "bg-green-100 border-green-200";
                    dotClass = "bg-green-500";
                    cardContainerClass += " opacity-90";
                } else if (tx.status === 'cancelled') {
                    cardHeaderClass = "bg-red-100 border-red-200";
                    dotClass = "bg-red-500";
                    cardContainerClass += " opacity-90";
                } else if (isExpired) {
                    cardHeaderClass = "bg-gray-200 border-gray-300";
                    dotClass = "bg-gray-500";
                    cardContainerClass += " opacity-60 grayscale";
                } else {
                    // Active
                    cardHeaderClass = "bg-yellow-200 border-yellow-300";
                    dotClass = "bg-blue-500 animate-pulse";
                }

                return (
                  <Dialog key={tx.id}>
                    <DialogTrigger asChild>
                        <Card className={cardContainerClass}>
                            <CardContent className="p-0">
                            <div className="flex flex-col">
                                <div className={cn("flex items-center justify-between p-4 border-b", cardHeaderClass)}>
                                    <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
                                        <span className={cn("font-mono font-bold text-sm", tx.status === 'completed' ? "text-green-800" : tx.status === 'cancelled' ? "text-red-800" : isExpired ? "text-gray-700" : "text-yellow-800")}>
                                            #{tx.serialNo}
                                        </span>
                                        <span className={cn("h-4 w-[1px]", tx.status === 'completed' ? "bg-green-300" : tx.status === 'cancelled' ? "bg-red-300" : isExpired ? "bg-gray-400" : "bg-yellow-400")}></span>
                                        <span className="font-bold text-gray-800 text-sm truncate">{tx.type}</span>
                                        <span className={cn("h-4 w-[1px]", tx.status === 'completed' ? "bg-green-300" : tx.status === 'cancelled' ? "bg-red-300" : isExpired ? "bg-gray-400" : "bg-yellow-400")}></span>
                                        <span className="font-bold text-blue-700 text-sm whitespace-nowrap">{tx.clientPrice} ر.س</span>
                                    </div>
                                    <div className={cn("w-2 h-2 rounded-full", dotClass)} />
                                </div>
                                <div className="p-4 flex items-center justify-between gap-4"><div className="w-full bg-[#eef2f6] shadow-3d-inset rounded-xl p-3 text-center flex-1"><CountdownTimer targetDate={tx.targetDate} status={tx.status} /></div></div>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"><div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-blue-600 border-2 border-blue-100 animate-in zoom-in"><Eye className="w-8 h-8" /></div></div>
                            </div>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                        <DialogHeader>
                            <div className="flex justify-between items-center mb-2">
                                <DialogTitle className="text-center font-bold text-gray-800 flex-1">تفاصيل المعاملة #{tx.serialNo}</DialogTitle>
                                <div className="flex gap-2">
                                    {/* Hide Edit/Delete if Completed OR Cancelled */}
                                    {tx.status !== 'completed' && tx.status !== 'cancelled' && (
                                        <>
                                            <button onClick={() => handleEditTransaction(tx)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteTransaction(tx.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm"><div className="bg-white/50 p-3 rounded-xl"><span className="text-gray-500 block text-xs">النوع</span><span className="font-bold">{tx.type}</span></div><div className="bg-white/50 p-3 rounded-xl"><span className="text-gray-500 block text-xs">العميل</span><span className="font-bold">{tx.clientName || '-'}</span></div><div className="bg-white/50 p-3 rounded-xl"><span className="text-gray-500 block text-xs">السعر</span><span className="font-bold text-blue-600">{tx.clientPrice} ر.س</span></div><div className="bg-white/50 p-3 rounded-xl"><span className="text-gray-500 block text-xs">المعقب</span><span className="font-bold">{tx.agent}</span></div>{tx.createdBy && (<div className="bg-white/50 p-3 rounded-xl col-span-2"><span className="text-gray-500 block text-xs">تم الإنشاء بواسطة</span><span className="font-bold text-purple-600">{tx.createdBy}</span></div>)}</div>
                            <div className="grid grid-cols-2 gap-3"><button onClick={() => handlePrint(tx)} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all relative overflow-hidden bg-gray-200 text-gray-700 hover:bg-gray-300`}><Printer className="w-4 h-4" /> طباعة</button><button onClick={() => handleWhatsApp(tx)} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all relative overflow-hidden bg-green-100 text-green-700 hover:bg-green-200`}><Send className="w-4 h-4" /> واتساب للعميل</button></div>
                            {tx.status === 'active' && (<div className="flex gap-3 pt-2 border-t border-gray-200"><button onClick={() => { updateStatus(tx.id, 'completed'); }} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700">إنجاز</button><button onClick={() => { updateStatus(tx.id, 'cancelled'); }} className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200">إلغاء</button></div>)}
                        </div>
                    </DialogContent>
                  </Dialog>
                );
            })}
          </div>
        )}
      </div>
    </div>
    {printTx && (
        <div className="hidden print:flex fixed inset-0 bg-white z-[9999] flex-col font-sans" dir="rtl">
            <div className="px-8 py-6 flex justify-between items-start">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-slate-800 mb-1">{getPrintOfficeName()}</h1>
                    <p className="text-slate-500 text-xs font-medium">خدمات عامة - تعقيب - استشارات</p>
                </div>
                <div>
                    <Building2 className="w-14 h-14 text-slate-800" strokeWidth={1.5} />
                </div>
            </div>
            
            {/* Separator Line */}
            <div className="h-0.5 bg-slate-800 w-full my-2"></div>
            
            {/* Invoice Title */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-800">فاتورة</h2>
            </div>

            <div className="px-8 py-2 grid grid-cols-2 gap-6">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">بيانات العميل (Bill To)</p>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{printTx.clientName}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">رقم الفاتورة</p>
                        <p className="text-base font-bold text-slate-700">#{printTx.serialNo}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">التاريخ</p>
                        <p className="text-base font-bold text-slate-700">{new Date(printTx.createdAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                </div>
            </div>

            <div className="px-8 py-4">
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="py-3 px-4 font-bold text-xs">الوصف / نوع المعاملة</th>
                                <th className="py-3 px-4 font-bold text-xs text-center">الحالة</th>
                                <th className="py-3 px-4 font-bold text-xs text-left">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="py-4 px-4 font-bold text-slate-800 text-sm">{printTx.type}</td>
                                <td className="py-4 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${printTx.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : printTx.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                        {printTx.status === 'completed' ? 'تم الإنجاز' : printTx.status === 'cancelled' ? 'ملغاة' : 'قيد التنفيذ'}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-left font-black text-lg text-slate-800">{printTx.clientPrice} <span className="text-[10px] text-slate-400 font-medium">ر.س</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="px-8 flex justify-end mt-2">
                <div className="w-1/2">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 font-medium text-sm">المجموع الفرعي</span>
                        <span className="font-bold text-slate-700 text-right">{printTx.clientPrice} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                        <span className="text-blue-600 font-bold text-base">الإجمالي المستحق</span>
                        <span className="font-black text-xl text-blue-600 text-right">{printTx.clientPrice} <span className="text-xs">ر.س</span></span>
                    </div>
                </div>
            </div>

            <div className="mt-auto bg-slate-50 p-6 border-t border-slate-200 print:bg-slate-50">
                <div className="flex flex-col items-center gap-2 text-center">
                    <p className="font-bold text-slate-700 text-sm">شكراً لتعاملكم معنا</p>
                    <p className="text-[10px] text-slate-500">نسعد بخدمتكم دائماً</p>
                    <div className="flex items-center gap-2 text-slate-600 mt-1">
                        <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                            <Phone className="w-3 h-3" />
                        </div>
                        <span className="font-mono font-bold text-xs" dir="ltr">{currentUser?.phone}</span>
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
}
