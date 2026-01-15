import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Plus, Clock, Banknote, AlertCircle, Wallet, Printer, Send, Phone, MessageCircle, CheckCircle2, XCircle, Eye, Contact, Lock } from 'lucide-react';
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
  getStoredPendingBalances, saveStoredPendingBalances,
  BANKS_LIST, getStoredClients, saveStoredClients, Client, getStoredAgents, saveStoredAgents, Agent,
  getCurrentUser, User,
  addClientToCloud, addAgentToCloud, fetchClientsFromCloud, fetchAgentsFromCloud,
  addTransactionToCloud, fetchTransactionsFromCloud, updateTransactionStatusInCloud,
  fetchAccountsFromCloud, updateAccountInCloud,
  Transaction, getGlobalSettings, GlobalSettings
} from '@/lib/store';
import { supabase } from '@/lib/supabase';

const transactionTypesList = [
  "تجديد إقامة", "نقل كفالة", "خروج وعودة", "خروج نهائي", "تأشيرة زيارة", "تأمين طبي", "إصدار رخصة"
];

const CountdownTimer = ({ targetDate, status }: { targetDate: number, status: string }) => {
  const [timeLeft, setTimeLeft] = useState("جاري الحساب...");

  useEffect(() => {
    if (status !== 'active') return;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft("انتهت المدة");
        clearInterval(timer);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`تبقي علي الإنجاز: ${days}يوم ${hours}ساعات ${minutes}دقيقة ${seconds}ثانية`);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, status]);

  if (status === 'completed') return <span className="text-green-600 font-bold text-sm">تم الإنجاز بنجاح</span>;
  if (status === 'cancelled') return <span className="text-red-600 font-bold text-sm">تم إلغاء المعاملة</span>;

  return <span className="font-mono font-bold text-blue-600 text-xs sm:text-sm" dir="rtl">{timeLeft}</span>;
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

  // Financial State
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [pendingBalances, setPendingBalances] = useState<Record<string, number>>({});

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

    if (user) {
        fetchTransactionsFromCloud(user.id).then(data => setTransactions(data));
        fetchClientsFromCloud(user.id).then(data => setClients(data));
        fetchAgentsFromCloud(user.id).then(data => setAgents(data));
        // Fetch Accounts for integrated logic
        fetchAccountsFromCloud(user.id).then(data => {
            setBalances(data.balances);
            setPendingBalances(data.pending);
            updateBalancesDisplay(data.balances);
        });
    } else {
        setTransactions(getStoredTransactions());
        setClients(getStoredClients());
        setAgents(getStoredAgents());
        const localBal = getStoredBalances();
        const localPending = getStoredPendingBalances();
        setBalances(localBal);
        setPendingBalances(localPending);
        updateBalancesDisplay(localBal);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          fetchTransactionsFromCloud(currentUser.id).then(data => {
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

  const handleSave = async () => {
    if (!validateForm()) return;

    const finalType = inputTypeMode === 'manual' ? formData.manualType : formData.selectedType;
    const durationDays = parseInt(formData.duration) || 0;
    const clientP = parseFloat(formData.clientPrice) || 0;
    const agentP = formData.agent === 'إنجاز بنفسي' ? 0 : (parseFloat(formData.agentPrice) || 0);
    
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
      clientRefunded: false
    };

    // Financial Update: Add Client Price to Pending
    const bank = formData.paymentMethod;
    const newPending = { ...pendingBalances };
    newPending[bank] = (newPending[bank] || 0) + clientP;
    setPendingBalances(newPending);

    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);
    
    if (currentUser) {
        await addTransactionToCloud(newTx, currentUser.id);
        // Update Account in Cloud
        await updateAccountInCloud(currentUser.id, bank, balances[bank] || 0, newPending[bank]);
    } else {
        saveStoredTransactions(updatedTxs);
        saveStoredPendingBalances(newPending);
    }

    setOpen(false);
    
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
  };

  const validateSaudiNumber = (num: string) => {
    const regex = /^5[0-9]{8}$/;
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

          rawPhone = rawPhone.replace(/\D/g, '');
          
          if (rawPhone.startsWith('966')) {
            rawPhone = rawPhone.substring(3);
          }
          if (rawPhone.startsWith('0')) {
            rawPhone = rawPhone.substring(1);
          }
          
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
      } else {
        alert('هذه الميزة مدعومة فقط على الهواتف الذكية (Android/iOS).');
      }
    } catch (ex) {
      console.error(ex);
    }
  };

  const handleAddClientQuick = async () => {
    let hasError = false;
    const newErrors = { phone: '', whatsapp: '' };

    if(!newClientName.trim()) return;

    if (newClientPhone && !validateSaudiNumber(newClientPhone)) {
        newErrors.phone = 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام';
        hasError = true;
    }

    if (newClientWhatsapp && !validateSaudiNumber(newClientWhatsapp)) {
        newErrors.whatsapp = 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام';
        hasError = true;
    }

    setClientErrors(newErrors);
    if (hasError) return;

    const newClient: Client = {
      id: Date.now(),
      name: newClientName,
      phone: newClientPhone ? `966${newClientPhone}` : '',
      whatsapp: newClientWhatsapp ? `966${newClientWhatsapp}` : '',
      createdAt: Date.now()
    };
    
    const updated = [newClient, ...clients];
    setClients(updated);
    
    if (currentUser) {
        await addClientToCloud(newClient, currentUser.id);
    } else {
        saveStoredClients(updated);
    }
    
    setFormData(prev => ({ ...prev, clientName: newClientName }));
    setNewClientName('');
    setNewClientPhone('');
    setNewClientWhatsapp('');
    setClientErrors({ phone: '', whatsapp: '' });
    setAddClientOpen(false);
    setTimeout(() => durationRef.current?.focus(), 100);
  };

  const handleAddAgentQuick = async () => {
    let hasError = false;
    const newErrors = { phone: '', whatsapp: '' };

    if(!newAgentName.trim()) return;

    if (newAgentPhone && !validateSaudiNumber(newAgentPhone)) {
        newErrors.phone = 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام';
        hasError = true;
    }

    if (newAgentWhatsapp && !validateSaudiNumber(newAgentWhatsapp)) {
        newErrors.whatsapp = 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام';
        hasError = true;
    }

    setAgentErrors(newErrors);
    if (hasError) return;

    const newAgent: Agent = {
      id: Date.now(),
      name: newAgentName,
      phone: newAgentPhone ? `966${newAgentPhone}` : '',
      whatsapp: newAgentWhatsapp ? `966${newAgentWhatsapp}` : '',
      createdAt: Date.now()
    };

    const updatedAgents = [newAgent, ...agents];
    setAgents(updatedAgents);
    setFormData(prev => ({ ...prev, agent: newAgentName }));

    if (currentUser) {
        await addAgentToCloud(newAgent, currentUser.id);
    } else {
        saveStoredAgents(updatedAgents);
    }

    setNewAgentName('');
    setNewAgentPhone('');
    setNewAgentWhatsapp('');
    setAgentErrors({ phone: '', whatsapp: '' });
    setAddAgentOpen(false);
  };

  const updateStatus = async (id: number, newStatus: 'completed' | 'cancelled') => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const clientP = parseFloat(tx.clientPrice) || 0;
    const agentP = parseFloat(tx.agentPrice) || 0;
    const bank = tx.paymentMethod;
    
    const newPending = { ...pendingBalances };
    const newBalances = { ...balances };

    // Financial Logic
    if (newStatus === 'completed' && tx.status === 'active') {
        // 1. Remove Client Price from Pending
        newPending[bank] = Math.max(0, (newPending[bank] || 0) - clientP);
        
        // 2. Add Agent Price to Pending (Liability)
        newPending[bank] = (newPending[bank] || 0) + agentP;

        // 3. Add Client Price to Actual Balance (Revenue)
        newBalances[bank] = (newBalances[bank] || 0) + clientP;
        
        setFeedbackMsg({ type: 'success', text: 'تم إنجاز المعاملة بنجاح' });
    }

    if (newStatus === 'cancelled' && tx.status === 'active') {
         // Remove Client Price from Pending (Will be refunded or lost)
         newPending[bank] = Math.max(0, (newPending[bank] || 0) - clientP);
         
         setFeedbackMsg({ type: 'error', text: 'تم الغاء المعامله بنجاح' });
    }

    setPendingBalances(newPending);
    setBalances(newBalances);
    updateBalancesDisplay(newBalances);
    setTimeout(() => setFeedbackMsg(null), 2000);

    const updatedTxs = transactions.map(t => 
      t.id === id ? { ...t, status: newStatus } : t
    );
    setTransactions(updatedTxs);

    if (currentUser) {
        await updateTransactionStatusInCloud(id, { status: newStatus });
        await updateAccountInCloud(currentUser.id, bank, newBalances[bank] || 0, newPending[bank] || 0);
    } else {
        saveStoredTransactions(updatedTxs);
        saveStoredPendingBalances(newPending);
        saveStoredBalances(newBalances);
    }
  };

  const [printTx, setPrintTx] = useState<Transaction | null>(null);

  const canAccessFeature = (feature: keyof GlobalSettings['featurePermissions']) => {
    if (!settings) return true;
    const userRole = currentUser?.role || 'visitor';
    // @ts-ignore
    return settings.featurePermissions[feature].includes(userRole);
  };

  const handlePrint = (tx: Transaction) => {
    if (!canAccessFeature('print')) {
        alert('هذه الميزة متاحة للأعضاء الذهبيين فقط');
        return;
    }
    setPrintTx(tx);
    setTimeout(() => {
        window.print();
        setPrintTx(null);
    }, 100);
  };

  const handleWhatsApp = (tx: Transaction) => {
    if (!canAccessFeature('whatsapp')) {
        alert('هذه الميزة متاحة للأعضاء الذهبيين فقط');
        return;
    }
    const client = clients.find(c => c.name === tx.clientName);
    const phoneNumber = client?.whatsapp || client?.phone;

    const text = `تفاصيل المعاملة:\nنوع: ${tx.type}\nالسعر: ${tx.clientPrice} ر.س\nرقم: ${tx.serialNo}\nالحالة: ${tx.status === 'completed' ? 'تم الإنجاز' : 'قيد التنفيذ'}`;
    
    if (phoneNumber) {
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <>
    {feedbackMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className={cn(
                "bg-white px-8 py-6 rounded-3xl shadow-3d border-2 flex flex-col items-center gap-3 animate-in zoom-in fade-in duration-300",
                feedbackMsg.type === 'success' ? "border-green-100" : "border-red-100"
            )}>
                <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center shadow-md",
                    feedbackMsg.type === 'success' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                )}>
                    {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-8 h-8" strokeWidth={3} /> : <XCircle className="w-8 h-8" strokeWidth={3} />}
                </div>
                <h3 className={cn(
                    "text-xl font-black",
                    feedbackMsg.type === 'success' ? "text-green-700" : "text-red-600"
                )}>
                    {feedbackMsg.text}
                </h3>
            </div>
        </div>
    )}

    <div className="max-w-5xl mx-auto pb-20 print:hidden">
      
      <header className="mb-6">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <button 
                onClick={() => navigate('/')}
                className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600 transition-all"
                >
                <ArrowRight className="w-6 h-6" />
                </button>
                <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-800 text-shadow">المعاملات</h1>
                <p className="text-gray-500 text-sm">إدارة ومتابعة المعاملات المالية</p>
                </div>
            </div>
            
            <div className="hidden sm:flex gap-4">
                <div className="bg-[#eef2f6] shadow-3d-inset px-4 py-2 rounded-xl flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    <div className="text-xs text-gray-500">جملة الخزينة</div>
                    <div className="font-bold text-blue-700">{officeBalance.toLocaleString()} ر.س</div>
                </div>
            </div>
        </div>
      </header>

      <div className="mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#eef2f6] text-blue-600 font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all w-full sm:w-auto justify-center">
              <div className="p-1 bg-blue-100 rounded-full">
                <Plus className="w-5 h-5" />
              </div>
              <span>أضف معاملة جديدة</span>
            </button>
          </DialogTrigger>
          
          <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 text-center mb-1">بيانات المعاملة</DialogTitle>
              <DialogDescription className="hidden">Form</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2">
              
              <div className="relative border-2 border-red-400/30 rounded-xl p-3 bg-white/30">
                 <Label className="text-gray-700 font-bold text-xs mb-2 block">نوع المعاملة</Label>
                 
                 <div className="flex bg-[#eef2f6] p-1 rounded-lg shadow-3d-inset mb-3">
                    <button 
                        onClick={() => setInputTypeMode('manual')}
                        className={cn(
                            "flex-1 py-1 text-xs font-bold rounded-md transition-all",
                            inputTypeMode === 'manual' ? "bg-white shadow-sm text-blue-600" : "text-gray-400"
                        )}
                    >
                        كتابة يدوية
                    </button>
                    <button 
                        onClick={() => setInputTypeMode('select')}
                        className={cn(
                            "flex-1 py-1 text-xs font-bold rounded-md transition-all",
                            inputTypeMode === 'select' ? "bg-white shadow-sm text-blue-600" : "text-gray-400"
                        )}
                    >
                        اختر من قائمة
                    </button>
                 </div>

                 {inputTypeMode === 'manual' ? (
                    <div className="relative">
                        <Input 
                            ref={manualTypeRef}
                            placeholder="اكتب المعاملة هنا.. مثلاً" 
                            value={formData.manualType}
                            onChange={(e) => {
                                setFormData({...formData, manualType: e.target.value});
                                if(errors.type) setErrors({...errors, type: ''});
                            }}
                            onKeyDown={(e) => handleKeyDown(e, agentPriceRef)}
                            className="bg-[#eef2f6] shadow-3d-inset border-none h-10 text-sm animate-pulse"
                        />
                    </div>
                 ) : (
                    <Select 
                        onValueChange={(val) => {
                            setFormData({...formData, selectedType: val});
                            if(errors.type) setErrors({...errors, type: ''});
                        }}
                    >
                        <SelectTrigger className="h-10 rounded-xl bg-[#eef2f6] border-none shadow-3d-inset text-right flex-row-reverse text-sm [&>svg]:text-red-500 [&>svg]:animate-pulse">
                        <SelectValue placeholder="اختر معاملة..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                        {transactionTypesList.map((type) => (
                            <SelectItem key={type} value={type} className="text-right cursor-pointer focus:bg-white/50 my-1">{type}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                 )}
                 {errors.type && <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.type}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 font-bold text-xs">اختر المعقب</Label>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Select 
                            value={formData.agent}
                            onValueChange={(val) => {
                                setFormData({...formData, agent: val});
                                if(errors.agent) setErrors({...errors, agent: ''});
                            }}
                        >
                        <SelectTrigger ref={agentSelectRef} className={cn(
                            "h-10 rounded-xl bg-[#eef2f6] shadow-3d-inset text-right flex-row-reverse text-sm",
                            errors.agent ? "border border-red-400" : "border-none"
                        )}>
                            <SelectValue placeholder="اختر المعقب..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                            <SelectItem value="إنجاز بنفسي" className="text-right font-bold text-blue-600">إنجاز بنفسي</SelectItem>
                            {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.name} className="text-right cursor-pointer focus:bg-white/50 my-1">{agent.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <Dialog open={addAgentOpen} onOpenChange={setAddAgentOpen}>
                        <DialogTrigger asChild>
                            <button className="w-10 h-10 rounded-xl bg-orange-500 text-white shadow-3d flex items-center justify-center hover:bg-orange-600">
                                <Plus className="w-5 h-5" />
                            </button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                            <DialogHeader><DialogTitle>إضافة معقب سريع</DialogTitle></DialogHeader>
                            
                            <button 
                                onClick={() => handleImportContact('agent')}
                                className="w-full py-2 bg-purple-100 text-purple-700 rounded-xl font-bold shadow-sm hover:bg-purple-200 flex items-center justify-center gap-2 mb-2"
                            >
                                <Contact className="w-4 h-4" />
                                أو من الهاتف
                            </button>

                            <div className="py-4 space-y-3">
                                <Input 
                                    placeholder="اسم المعقب" 
                                    value={newAgentName}
                                    onChange={(e) => setNewAgentName(e.target.value)}
                                    className="bg-white shadow-3d-inset border-none"
                                />
                                <div className="space-y-1">
                                    <div className="relative flex items-center" dir="ltr">
                                        <div className="absolute left-3 z-10 text-gray-400 font-bold text-sm pointer-events-none">+966</div>
                                        <Input 
                                            value={newAgentPhone} 
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                                                setNewAgentPhone(val);
                                                if(agentErrors.phone) setAgentErrors({...agentErrors, phone: ''});
                                            }} 
                                            className={`bg-white shadow-3d-inset border-none pl-14 text-left ${agentErrors.phone ? 'ring-2 ring-red-400' : ''}`}
                                            placeholder="5xxxxxxxx"
                                        />
                                        <Phone className="absolute right-3 w-4 h-4 text-gray-400" />
                                    </div>
                                    {agentErrors.phone && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {agentErrors.phone}</p>}
                                </div>
                                <div className="space-y-1">
                                    <div className="relative flex items-center" dir="ltr">
                                        <div className="absolute left-3 z-10 text-green-600 font-bold text-sm pointer-events-none">+966</div>
                                        <Input 
                                            value={newAgentWhatsapp} 
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                                                setNewAgentWhatsapp(val);
                                                if(agentErrors.whatsapp) setAgentErrors({...agentErrors, whatsapp: ''});
                                            }} 
                                            className={`bg-white shadow-3d-inset border-none pl-14 text-left ${agentErrors.whatsapp ? 'ring-2 ring-red-400' : ''}`}
                                            placeholder="5xxxxxxxx"
                                        />
                                        <MessageCircle className="absolute right-3 w-4 h-4 text-green-500" />
                                    </div>
                                    {agentErrors.whatsapp && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {agentErrors.whatsapp}</p>}
                                </div>
                                <button onClick={handleAddAgentQuick} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold">حفظ وإكمال</button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 {formData.agent !== 'إنجاز بنفسي' && (
                    <div className="space-y-1">
                      <Label className="text-gray-700 font-bold text-xs">سعر المعقب</Label>
                      <div className="relative">
                        <Input 
                          ref={agentPriceRef}
                          type="number" 
                          placeholder="0" 
                          value={formData.agentPrice}
                          onChange={(e) => {
                              setFormData({...formData, agentPrice: e.target.value});
                              if(errors.agentPrice) setErrors({...errors, agentPrice: ''});
                          }}
                          onKeyDown={(e) => handleKeyDown(e, clientPriceRef)}
                          className={cn(
                              "pl-10 text-left font-bold text-gray-600 h-10 text-sm",
                              errors.agentPrice ? "border border-red-400" : "border-none"
                          )}
                        />
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">ر.س</span>
                      </div>
                    </div>
                 )}
                
                <div className={cn("space-y-1", formData.agent === 'إنجاز بنفسي' ? "col-span-2" : "")}>
                  <Label className="text-gray-700 font-bold text-xs">السعر للعميل</Label>
                  <div className="relative">
                    <Input 
                      ref={clientPriceRef}
                      type="number" 
                      placeholder="0" 
                      value={formData.clientPrice}
                      onChange={(e) => {
                          setFormData({...formData, clientPrice: e.target.value});
                          if(errors.clientPrice) setErrors({...errors, clientPrice: ''});
                      }}
                      onKeyDown={(e) => handleKeyDown(e, durationRef)}
                      className={cn(
                        "pl-10 text-left font-bold text-blue-600 h-10 text-sm",
                        errors.clientPrice ? "border border-red-400" : "border-none"
                      )}
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-blue-400">ر.س</span>
                  </div>
                </div>
              </div>

               <div className="space-y-1">
                <Label className="text-gray-700 font-bold text-xs">العميل</Label>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Select 
                            value={formData.clientName}
                            onValueChange={(val) => setFormData({...formData, clientName: val})}
                        >
                            <SelectTrigger ref={clientSelectRef} className="h-10 rounded-xl bg-[#eef2f6] shadow-3d-inset text-right flex-row-reverse text-sm border-none">
                                <SelectValue placeholder="اختر عميل..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                                {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.name} className="text-right">{client.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
                        <DialogTrigger asChild>
                            <button className="w-10 h-10 rounded-xl bg-blue-600 text-white shadow-3d flex items-center justify-center hover:bg-blue-700">
                                <Plus className="w-5 h-5" />
                            </button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                            <DialogHeader><DialogTitle>إضافة عميل سريع</DialogTitle></DialogHeader>
                            
                            <button 
                                onClick={() => handleImportContact('client')}
                                className="w-full py-2 bg-purple-100 text-purple-700 rounded-xl font-bold shadow-sm hover:bg-purple-200 flex items-center justify-center gap-2 mb-2"
                            >
                                <Contact className="w-4 h-4" />
                                أو من الهاتف
                            </button>

                            <div className="py-4 space-y-3">
                                <Input 
                                    placeholder="اسم العميل" 
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="bg-white shadow-3d-inset border-none"
                                />
                                <div className="space-y-1">
                                    <div className="relative flex items-center" dir="ltr">
                                        <div className="absolute left-3 z-10 text-gray-400 font-bold text-sm pointer-events-none">+966</div>
                                        <Input 
                                            value={newClientPhone} 
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                                                setNewClientPhone(val);
                                                if(clientErrors.phone) setClientErrors({...clientErrors, phone: ''});
                                            }} 
                                            className={`bg-white shadow-3d-inset border-none pl-14 text-left ${clientErrors.phone ? 'ring-2 ring-red-400' : ''}`}
                                            placeholder="5xxxxxxxx"
                                        />
                                        <Phone className="absolute right-3 w-4 h-4 text-gray-400" />
                                    </div>
                                    {clientErrors.phone && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {clientErrors.phone}</p>}
                                </div>
                                <div className="space-y-1">
                                    <div className="relative flex items-center" dir="ltr">
                                        <div className="absolute left-3 z-10 text-green-600 font-bold text-sm pointer-events-none">+966</div>
                                        <Input 
                                            value={newClientWhatsapp} 
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                                                setNewClientWhatsapp(val);
                                                if(clientErrors.whatsapp) setClientErrors({...clientErrors, whatsapp: ''});
                                            }} 
                                            className={`bg-white shadow-3d-inset border-none pl-14 text-left ${clientErrors.whatsapp ? 'ring-2 ring-red-400' : ''}`}
                                            placeholder="5xxxxxxxx"
                                        />
                                        <MessageCircle className="absolute right-3 w-4 h-4 text-green-500" />
                                    </div>
                                    {clientErrors.whatsapp && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {clientErrors.whatsapp}</p>}
                                </div>
                                <button onClick={handleAddClientQuick} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">حفظ وإكمال</button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-700 font-bold text-xs">مدة الإنجاز (أيام)</Label>
                  <div className="relative">
                    <Input 
                      ref={durationRef}
                      type="number" 
                      placeholder="3" 
                      value={formData.duration}
                      onChange={(e) => {
                          setFormData({...formData, duration: e.target.value});
                          if(errors.duration) setErrors({...errors, duration: ''});
                      }}
                      className={cn(
                        "pl-8 text-left h-10 text-sm",
                        errors.duration ? "border border-red-400" : "border-none"
                      )}
                    />
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-700 font-bold text-xs">طريقة الدفع</Label>
                  <Select 
                    onValueChange={(val) => {
                        setFormData({...formData, paymentMethod: val});
                        if(errors.paymentMethod) setErrors({...errors, paymentMethod: ''});
                    }}
                  >
                    <SelectTrigger className={cn(
                        "h-10 rounded-xl bg-[#eef2f6] shadow-3d-inset text-right flex-row-reverse text-sm",
                        errors.paymentMethod ? "border border-red-400" : "border-none"
                    )}>
                      <SelectValue placeholder="اختر البنك..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                      {BANKS_LIST.map((bank) => (
                        <SelectItem key={bank} value={bank} className="text-right cursor-pointer focus:bg-white/50 my-1">{bank}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </div>

            <DialogFooter className="flex justify-center mt-4">
              <button 
                onClick={handleSave}
                className="w-full max-w-[200px] py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all text-sm"
              >
                حفظ المعاملة
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {transactions.length === 0 ? (
          <div className="bg-[#eef2f6] rounded-3xl shadow-3d p-8 min-h-[300px] flex flex-col items-center justify-center text-center border border-white/20">
            <div className="w-20 h-20 bg-[#eef2f6] rounded-full shadow-3d flex items-center justify-center mb-6 text-gray-400">
                <Banknote className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد معاملات حالياً</h3>
            <p className="text-gray-500 max-w-xs mx-auto">
                قم بإضافة معاملة جديدة للبدء.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {transactions.map((tx) => (
              <Dialog key={tx.id}>
                <DialogTrigger asChild>
                    <Card className={cn(
                        "border-none shadow-3d bg-[#eef2f6] overflow-hidden transition-all cursor-pointer hover:scale-[1.01] group relative",
                        tx.status === 'completed' ? "opacity-75" : "",
                        tx.status === 'cancelled' ? "opacity-60 grayscale" : ""
                    )}>
                        <CardContent className="p-0">
                        <div className="flex flex-col">
                            
                            <div className="flex items-center justify-between p-4 bg-yellow-200 border-b border-yellow-300">
                                <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
                                    <span className="font-mono font-bold text-yellow-800 text-sm">#{tx.serialNo}</span>
                                    <span className="h-4 w-[1px] bg-yellow-400"></span>
                                    <span className="font-bold text-gray-800 text-sm truncate">
                                        {tx.type}
                                    </span>
                                    <span className="h-4 w-[1px] bg-yellow-400"></span>
                                    <span className="font-bold text-blue-700 text-sm whitespace-nowrap">{tx.clientPrice} ر.س</span>
                                </div>
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    tx.status === 'active' ? "bg-blue-500 animate-pulse" : 
                                    tx.status === 'completed' ? "bg-green-500" : "bg-red-500"
                                )} />
                            </div>

                            <div className="p-4 flex items-center justify-between gap-4">
                                <div className="w-full bg-[#eef2f6] shadow-3d-inset rounded-xl p-3 text-center flex-1">
                                    <CountdownTimer targetDate={tx.targetDate} status={tx.status} />
                                </div>
                            </div>

                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-blue-600 border-2 border-blue-100 animate-in zoom-in">
                                    <Eye className="w-8 h-8" />
                                </div>
                            </div>

                        </div>
                        </CardContent>
                    </Card>
                </DialogTrigger>
                
                <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-center font-bold text-gray-800">تفاصيل المعاملة #{tx.serialNo}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-white/50 p-3 rounded-xl"><span className="text-gray-500 block text-xs">النوع</span><span className="font-bold">{tx.type}</span></div>
                            <div className="bg-white/50 p-3 rounded-xl"><span className="text-gray-500 block text-xs">العميل</span><span className="font-bold">{tx.clientName || '-'}</span></div>
                            <div className="bg-white/50 p-3 rounded-xl"><span className="text-gray-500 block text-xs">السعر</span><span className="font-bold text-blue-600">{tx.clientPrice} ر.س</span></div>
                            <div className="bg-white/50 p-3 rounded-xl"><span className="text-gray-500 block text-xs">المعقب</span><span className="font-bold">{tx.agent}</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => handlePrint(tx)} 
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all relative overflow-hidden ${
                                    canAccessFeature('print') 
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                <Printer className="w-4 h-4" /> طباعة
                                {!canAccessFeature('print') && <span className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[8px] px-1 font-black">PRO</span>}
                            </button>
                            <button 
                                onClick={() => handleWhatsApp(tx)} 
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all relative overflow-hidden ${
                                    canAccessFeature('whatsapp') 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                <Send className="w-4 h-4" /> واتساب للعميل
                                {!canAccessFeature('whatsapp') && <span className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[8px] px-1 font-black">PRO</span>}
                            </button>
                        </div>

                        {tx.status === 'active' && (
                            <div className="flex gap-3 pt-2 border-t border-gray-200">
                                <button 
                                onClick={() => { updateStatus(tx.id, 'completed'); }}
                                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700"
                                >
                                إنجاز
                                </button>
                                <button 
                                onClick={() => { updateStatus(tx.id, 'cancelled'); }}
                                className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200"
                                >
                                إلغاء
                                </button>
                            </div>
                        )}
                    </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </div>
    </div>

    {printTx && (
        <div className="hidden print:flex fixed inset-0 bg-white z-[9999] flex-col font-sans" dir="rtl">
            {/* Header with Color Strip */}
            <div className="h-4 bg-blue-600 w-full print:h-4"></div>
            
            <div className="px-12 py-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 mb-2">{currentUser?.officeName || 'مكتب الخدمات العامة'}</h1>
                    <p className="text-slate-500 text-sm font-medium">خدمات عامة - تعقيب - استشارات</p>
                </div>
                <div className="text-left">
                    <h2 className="text-5xl font-black text-slate-100 tracking-tighter uppercase">INVOICE</h2>
                    <p className="text-blue-600 font-bold text-lg -mt-2">فاتورة ضريبية</p>
                </div>
            </div>

            <div className="px-12 my-4">
                <div className="h-px bg-slate-200 w-full"></div>
            </div>

            {/* Info Grid */}
            <div className="px-12 py-4 grid grid-cols-2 gap-12">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">بيانات العميل (Bill To)</p>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">{printTx.clientName}</h3>
                    {/* Optional: Add client phone if available in a real app, looking up from clients list */}
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">رقم الفاتورة</p>
                        <p className="text-lg font-bold text-slate-700">#{printTx.serialNo}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">التاريخ</p>
                        <p className="text-lg font-bold text-slate-700">{new Date(printTx.createdAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="px-12 py-8">
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="py-4 px-6 font-bold text-sm">الوصف / نوع المعاملة</th>
                                <th className="py-4 px-6 font-bold text-sm text-center">الحالة</th>
                                <th className="py-4 px-6 font-bold text-sm text-left">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="py-6 px-6 font-bold text-slate-800">{printTx.type}</td>
                                <td className="py-6 px-6 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                        printTx.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                        printTx.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                        'bg-orange-50 text-orange-700 border-orange-200'
                                    }`}>
                                        {printTx.status === 'completed' ? 'تم الإنجاز' :
                                         printTx.status === 'cancelled' ? 'ملغاة' : 'قيد التنفيذ'}
                                    </span>
                                </td>
                                <td className="py-6 px-6 text-left font-black text-xl text-slate-800">
                                    {printTx.clientPrice} <span className="text-xs text-slate-400 font-medium">ر.س</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Totals */}
            <div className="px-12 flex justify-end">
                <div className="w-64">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">المجموع الفرعي</span>
                        <span className="font-bold text-slate-700">{printTx.clientPrice} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-4">
                        <span className="text-blue-600 font-bold text-lg">الإجمالي المستحق</span>
                        <span className="font-black text-2xl text-blue-600">{printTx.clientPrice} <span className="text-sm">ر.س</span></span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto bg-slate-50 p-10 border-t border-slate-200 print:bg-slate-50">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-center md:text-right">
                        <p className="font-bold text-slate-700 mb-1">شكراً لتعاملكم معنا</p>
                        <p className="text-xs text-slate-500">نسعد بخدمتكم دائماً</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-slate-600">
                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                                <Phone className="w-4 h-4" />
                            </div>
                            <span className="font-mono font-bold" dir="ltr">{currentUser?.phone}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Bottom Strip */}
            <div className="h-2 bg-slate-800 w-full"></div>
        </div>
    )}
    </>
  );
}
