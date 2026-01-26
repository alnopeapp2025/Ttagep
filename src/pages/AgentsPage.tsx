import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, UserCheck, Plus, Search, FileText, Phone, MessageCircle, Wallet, CheckCircle2, Send, X, Contact, AlertCircle, Pencil, Trash2, Loader2 } from 'lucide-react';
import { 
  getStoredAgents, saveStoredAgents, Agent, 
  getStoredTransactions, saveStoredTransactions, Transaction,
  getStoredBalances, saveStoredBalances,
  getStoredAgentTransfers, saveStoredAgentTransfers, AgentTransferRecord,
  getStoredPendingBalances, saveStoredPendingBalances,
  getCurrentUser, User,
  addAgentToCloud, fetchAgentsFromCloud, fetchTransactionsFromCloud, checkLimit, updateAgentInCloud, deleteAgentFromCloud,
  getBankNames
} from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LimitModals } from '@/components/LimitModals';

function AgentsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentWhatsapp, setNewAgentWhatsapp] = useState('');
  const [errors, setErrors] = useState({ phone: '', whatsapp: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentTxs, setAgentTxs] = useState<Transaction[]>([]);
  const [open, setOpen] = useState(false);
  const [transferStep, setTransferStep] = useState<'summary' | 'bank-select' | 'success'>('summary');
  const [selectedBank, setSelectedBank] = useState('');
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [transferError, setTransferError] = useState('');
  const [totalDue, setTotalDue] = useState(0);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [banksList, setBanksList] = useState<string[]>([]);
  
  // Edit Mode
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Limit Modal State
  const [limitModalType, setLimitModalType] = useState<'none' | 'visitor' | 'member' | 'golden'>('none');

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setBalances(getStoredBalances());
    setBanksList(getBankNames());
    const loadData = async () => {
        if (user) {
            const targetId = user.role === 'employee' && user.parentId ? user.parentId : user.id;
            const cloudAgents = await fetchAgentsFromCloud(targetId);
            setAgents(cloudAgents);
            const cloudTxs = await fetchTransactionsFromCloud(targetId);
            setAllTransactions(cloudTxs);
            saveStoredTransactions(cloudTxs); 
        } else {
            setAgents(getStoredAgents());
            setAllTransactions(getStoredTransactions());
        }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
    const channel = supabase
      .channel('agents-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents',
          filter: `user_id=eq.${targetId}`
        },
        (payload) => {
          fetchAgentsFromCloud(targetId).then(data => {
            setAgents(data);
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    if (agentTxs.length > 0) {
        const total = agentTxs
            .filter(t => t.status === 'completed' && !t.agentPaid)
            .reduce((sum, t) => sum + (parseFloat(t.agentPrice) || 0), 0);
        setTotalDue(total);
    } else {
        setTotalDue(0);
    }
  }, [agentTxs]);

  const validateSaudiNumber = (num: string) => {
    const regex = /^05\d{8}$/; // Starts with 05, exactly 10 digits
    return regex.test(num);
  };

  const handleImportContact = async () => {
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
            // Normalize to 05 format if possible
            if (rawPhone.startsWith('966')) rawPhone = '0' + rawPhone.substring(3);
            if (rawPhone.startsWith('5')) rawPhone = '0' + rawPhone;
            
            setNewAgentName(rawName);
            setNewAgentPhone(rawPhone);
            setNewAgentWhatsapp(rawPhone);
          }
        }
      } else {
        alert('هذه الميزة غير مدعومة في هذا المتصفح أو التطبيق، يرجى إدخال البيانات يدوياً.');
      }
    } catch (ex) {
      console.error(ex);
      alert('تعذر الوصول لجهات الاتصال. يرجى التأكد من منح التطبيق صلاحية الوصول لجهات الاتصال من إعدادات الهاتف، أو قم بإدخال البيانات يدوياً.');
    }
  };

  const checkAddPermission = () => {
      const role = currentUser?.role || 'visitor';
      const check = checkLimit(role, 'agents', agents.length);
      if (!check.allowed) {
          if (check.reason === 'visitor') setLimitModalType('visitor');
          else if (check.reason === 'member') setLimitModalType('member');
          else if (check.reason === 'golden') setLimitModalType('golden');
          return false;
      }
      return true;
  };

  const handleAddAgent = async () => {
    let hasError = false;
    const newErrors = { phone: '', whatsapp: '' };
    if (!newAgentName.trim()) return;
    if (newAgentPhone && !validateSaudiNumber(newAgentPhone)) {
        newErrors.phone = 'يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
        hasError = true;
    }
    if (newAgentWhatsapp && !validateSaudiNumber(newAgentWhatsapp)) {
        newErrors.whatsapp = 'يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
        hasError = true;
    }
    setErrors(newErrors);
    if (hasError) return;

    setLoading(true);

    if (editingAgent) {
        // Update
        const updatedAgent: Agent = {
            ...editingAgent,
            name: newAgentName,
            phone: newAgentPhone ? `966${newAgentPhone.substring(1)}` : '',
            whatsapp: newAgentWhatsapp ? `966${newAgentWhatsapp.substring(1)}` : ''
        };
        
        if (currentUser) {
            const success = await updateAgentInCloud(updatedAgent);
            if (!success) {
                alert("فشل تحديث المعقب في قاعدة البيانات.");
                setLoading(false);
                return;
            }
            const updatedAgents = agents.map(a => a.id === editingAgent.id ? updatedAgent : a);
            setAgents(updatedAgents);
        } else {
            const updatedAgents = agents.map(a => a.id === editingAgent.id ? updatedAgent : a);
            setAgents(updatedAgents);
            saveStoredAgents(updatedAgents);
        }
    } else {
        // Create
        const newAgent: Agent = {
            id: Date.now(),
            name: newAgentName,
            phone: newAgentPhone ? `966${newAgentPhone.substring(1)}` : '',
            whatsapp: newAgentWhatsapp ? `966${newAgentWhatsapp.substring(1)}` : '',
            createdAt: Date.now(),
            createdBy: currentUser?.officeName
        };
        
        if (currentUser) {
            const targetId = currentUser.role === 'employee' && currentUser.parentId ? currentUser.parentId : currentUser.id;
            const result = await addAgentToCloud(newAgent, targetId);
            if (!result.success) {
                alert(`فشل إضافة المعقب: ${result.error}`);
                setLoading(false);
                return;
            }
            const updatedAgents = [newAgent, ...agents];
            setAgents(updatedAgents);
        } else {
            const updatedAgents = [newAgent, ...agents];
            setAgents(updatedAgents);
            saveStoredAgents(updatedAgents);
        }
    }

    setLoading(false);
    setNewAgentName('');
    setNewAgentPhone('');
    setNewAgentWhatsapp('');
    setErrors({ phone: '', whatsapp: '' });
    setOpen(false);
    setEditingAgent(null);
  };

  const handleAgentClick = (agent: Agent) => {
    const filtered = allTransactions.filter(t => t.agent === agent.name);
    setAgentTxs(filtered); 
    setSelectedAgent(agent);
    setTransferStep('summary');
    setTransferError('');
    setSelectedBank('');
    setBalances(getStoredBalances());
  };

  const handleEditAgent = (e: React.MouseEvent, agent: Agent) => {
      e.stopPropagation();
      setEditingAgent(agent);
      setNewAgentName(agent.name);
      
      let phone = agent.phone || '';
      if(phone.startsWith('966')) phone = '0' + phone.substring(3);
      setNewAgentPhone(phone);

      let wa = agent.whatsapp || '';
      if(wa.startsWith('966')) wa = '0' + wa.substring(3);
      setNewAgentWhatsapp(wa);

      setOpen(true);
  };

  const handleDeleteAgent = async (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      if(confirm('هل أنت متأكد من حذف هذا المعقب؟')) {
          if(currentUser) {
              const success = await deleteAgentFromCloud(id);
              if (!success) {
                  alert("فشل حذف المعقب من قاعدة البيانات.");
                  return;
              }
          }
          const updatedAgents = agents.filter(a => a.id !== id);
          setAgents(updatedAgents);
          if(!currentUser) {
              saveStoredAgents(updatedAgents);
          }
          setOpen(false);
          setEditingAgent(null);
      }
  };

  const handleWhatsAppClick = (e: React.MouseEvent, number?: string) => {
    e.stopPropagation();
    if (!number) return;
    window.open(`https://wa.me/${number}`, '_blank');
  };

  const handlePhoneClick = (e: React.MouseEvent, number?: string) => {
    e.stopPropagation();
    if (!number) return;
    window.location.href = `tel:+${number}`;
  };

  const handleTransferProcess = () => {
    if (!selectedBank || !selectedAgent) return;
    const currentBalance = balances[selectedBank] || 0;
    if (currentBalance < totalDue) {
        setTransferError('رصيد البنك المختار غير كافي');
        return;
    }
    const newBalances = { ...balances };
    newBalances[selectedBank] = currentBalance - totalDue;
    saveStoredBalances(newBalances);
    setBalances(newBalances);
    const pendingBalances = getStoredPendingBalances();
    const currentPending = pendingBalances[selectedBank] || 0;
    const newPending = { ...pendingBalances };
    newPending[selectedBank] = Math.max(0, currentPending - totalDue);
    saveStoredPendingBalances(newPending);
    const paidTxIds: number[] = [];
    const updatedTxs = allTransactions.map(t => {
        if (t.agent === selectedAgent.name && t.status === 'completed' && !t.agentPaid) {
            paidTxIds.push(t.id);
            return { ...t, agentPaid: true };
        }
        return t;
    });
    setAllTransactions(updatedTxs);
    saveStoredTransactions(updatedTxs);
    const transferRecord: AgentTransferRecord = {
        id: Date.now(),
        agentName: selectedAgent.name,
        amount: totalDue,
        bank: selectedBank,
        date: Date.now(),
        transactionCount: paidTxIds.length,
        createdBy: currentUser?.officeName
    };
    const transfers = getStoredAgentTransfers();
    saveStoredAgentTransfers([transferRecord, ...transfers]);
    const refreshedTxs = updatedTxs.filter(t => t.agent === selectedAgent.name);
    setAgentTxs(refreshedTxs);
    setTransferStep('success');
  };

  const sendTransferWhatsApp = () => {
    if (!selectedAgent?.whatsapp) return;
    const message = `مرحباً ${selectedAgent.name}،\nتم تحويل مبلغ مستحقات المعاملات المنجزة.\nالمبلغ: ${totalDue} ر.س\nتم الخصم من: ${selectedBank}\nشكراً لجهودك.`;
    window.open(`https://wa.me/${selectedAgent.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredAgents = agents.filter(a => a.name.includes(searchTerm));

  return (
    <>
    <LimitModals 
        type={limitModalType} 
        isOpen={limitModalType !== 'none'} 
        onClose={() => setLimitModalType('none')} 
    />
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600">
          <ArrowRight className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-800 text-shadow">المعقبين</h1>
          <p className="text-gray-500">إدارة قائمة المعقبين</p>
        </div>
      </header>
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
            <Search className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
            <Input 
                placeholder="بحث عن معقب..." 
                className="pr-10 bg-[#eef2f6] shadow-3d-inset border-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <Dialog open={open} onOpenChange={(val) => {
            if(val && !checkAddPermission() && !editingAgent) return;
            setOpen(val);
            if(!val) {
                setEditingAgent(null);
                setNewAgentName('');
                setNewAgentPhone('');
                setNewAgentWhatsapp('');
            }
        }}>
            <DialogTrigger asChild>
                <button className="bg-blue-600 text-white px-6 rounded-xl font-bold shadow-3d hover:bg-blue-700 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    أضف معقب
                </button>
            </DialogTrigger>
            <DialogContent className="bg-[#eef2f6] shadow-3d border-none" dir="rtl">
                <DialogHeader><DialogTitle>{editingAgent ? 'تعديل بيانات المعقب' : 'إضافة معقب جديد'}</DialogTitle></DialogHeader>
                {!editingAgent && (
                    <button 
                        onClick={handleImportContact}
                        className="w-full py-2 bg-purple-100 text-purple-700 rounded-xl font-bold shadow-sm hover:bg-purple-200 flex items-center justify-center gap-2 mb-2"
                    >
                        <Contact className="w-4 h-4" />
                        أو من الهاتف
                    </button>
                )}
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>اسم المعقب (20 حرف كحد أقصى)</Label>
                        <Input 
                            value={newAgentName} 
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.length <= 20 && /^[\u0600-\u06FFa-zA-Z\s]*$/.test(val)) setNewAgentName(val);
                            }}
                            className="bg-white shadow-3d-inset border-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>رقم الجوال</Label>
                        <div className="relative flex items-center" dir="ltr">
                            <div className="absolute left-3 z-10 text-gray-400 font-bold text-sm pointer-events-none">+966</div>
                            <Input 
                                value={newAgentPhone} 
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setNewAgentPhone(val);
                                    if(errors.phone) setErrors({...errors, phone: ''});
                                }} 
                                className={`bg-white shadow-3d-inset border-none pl-14 text-left ${errors.phone ? 'ring-2 ring-red-400' : ''}`}
                                placeholder="05xxxxxxxx"
                            />
                            <Phone className="absolute right-3 w-4 h-4 text-gray-400" />
                        </div>
                        {errors.phone && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.phone}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>رقم الواتساب</Label>
                        <div className="relative flex items-center" dir="ltr">
                            <div className="absolute left-3 z-10 text-green-600 font-bold text-sm pointer-events-none">+966</div>
                            <Input 
                                value={newAgentWhatsapp} 
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setNewAgentWhatsapp(val);
                                    if(errors.whatsapp) setErrors({...errors, whatsapp: ''});
                                }} 
                                className={`bg-white shadow-3d-inset border-none pl-14 text-left ${errors.whatsapp ? 'ring-2 ring-red-400' : ''}`}
                                placeholder="05xxxxxxxx"
                            />
                            <MessageCircle className="absolute right-3 w-4 h-4 text-green-500" />
                        </div>
                        {errors.whatsapp && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.whatsapp}</p>}
                    </div>
                    <button 
                        onClick={handleAddAgent} 
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingAgent ? 'تحديث' : 'حفظ')}
                    </button>

                    {editingAgent && (
                        <button 
                            onClick={(e) => handleDeleteAgent(e, editingAgent.id)}
                            className="w-full py-3 bg-red-100 text-red-600 rounded-xl font-bold shadow-sm hover:bg-red-200 flex items-center justify-center gap-2 mt-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            حذف المعقب
                        </button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAgents.map(agent => (
            <div 
                key={agent.id} 
                onClick={() => handleAgentClick(agent)}
                className="bg-[#eef2f6] p-4 rounded-2xl shadow-3d hover:shadow-3d-hover cursor-pointer transition-all flex items-center justify-between gap-4 border border-white/50 relative group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shadow-sm">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-700 text-lg">{agent.name}</h3>
                        <div className="flex gap-2 text-xs text-gray-400 mt-1">
                            {agent.phone && <span className="flex items-center gap-1" dir="ltr">+{agent.phone} <Phone className="w-3 h-3"/></span>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={(e) => handleEditAgent(e, agent)}
                        className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm hover:bg-blue-100"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    {agent.phone && (
                        <button 
                            onClick={(e) => handlePhoneClick(e, agent.phone)}
                            className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-3d hover:scale-110 transition-transform"
                        >
                            <Phone className="w-4 h-4" />
                        </button>
                    )}
                    {agent.whatsapp && (
                        <button 
                            onClick={(e) => handleWhatsAppClick(e, agent.whatsapp)}
                            className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-3d hover:scale-110 transition-transform"
                        >
                            <MessageCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        ))}
      </div>
      {/* ... (Rest of the component remains unchanged) ... */}
      <Dialog open={!!selectedAgent} onOpenChange={(open) => !open && setSelectedAgent(null)}>
        <DialogContent className="bg-[#eef2f6] shadow-3d border-none max-w-2xl" dir="rtl">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-orange-600" />
                    معاملات المعقب: {selectedAgent?.name}
                </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3 max-h-[50vh] overflow-y-auto">
                {agentTxs.length > 0 ? agentTxs.map(tx => (
                    <div key={tx.id} className="bg-white/50 p-3 rounded-xl flex justify-between items-center border border-white">
                        <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="font-bold text-sm text-gray-700">{tx.type}</p>
                                <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString('ar-SA')}</p>
                            </div>
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-orange-600">{tx.agentPrice} ر.س</p>
                            <div className="text-[10px] font-bold">
                                {tx.status === 'cancelled' ? (
                                    <span className="text-red-500">ملغاة</span>
                                ) : tx.status === 'completed' ? (
                                    tx.agentPaid ? <span className="text-gray-400">مدفوعة</span> : <span className="text-green-600">مكتملة (للدفع)</span>
                                ) : (
                                    <span className="text-orange-500">قيد التنفيذ</span>
                                )}
                            </div>
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-gray-500">لا توجد معاملات مسجلة لهذا المعقب.</p>
                )}
            </div>
            {agentTxs.some(t => t.status === 'completed' && !t.agentPaid) && totalDue > 0 && (
                <div className="mt-2 pt-4 border-t border-gray-200">
                    {transferStep === 'summary' && (
                        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-3d-inset">
                            <button 
                                onClick={() => setTransferStep('bank-select')}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all"
                            >
                                <Wallet className="w-4 h-4" />
                                تحويل للمعقب
                            </button>
                            <div className="text-left">
                                <p className="text-xs text-gray-500 font-bold mb-1">إجمالي المستحق (مكتمل)</p>
                                <p className="text-2xl font-black text-blue-600">{totalDue.toLocaleString()} ر.س</p>
                            </div>
                        </div>
                    )}
                    {transferStep === 'bank-select' && (
                        <div className="bg-white p-4 rounded-xl shadow-3d-inset space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-center mb-2">
                                <Label className="font-bold text-gray-700">اختر البنك للخصم</Label>
                                <button onClick={() => setTransferStep('summary')} className="text-xs text-red-500 font-bold">إلغاء</button>
                            </div>
                            <Select onValueChange={(val) => { setSelectedBank(val); setTransferError(''); }} value={selectedBank}>
                                <SelectTrigger className="bg-[#eef2f6] border-none h-12 text-right flex-row-reverse">
                                    <SelectValue placeholder="اختر البنك" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                                    {banksList.map((bank) => (
                                        <SelectItem key={bank} value={bank} className="text-right cursor-pointer my-1">
                                            <div className="flex justify-between w-full gap-4">
                                                <span>{bank}</span>
                                                <span className={`font-bold ${(balances[bank] || 0) >= totalDue ? 'text-green-600' : 'text-red-500'}`}>
                                                    {(balances[bank] || 0).toLocaleString()} ر.س
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {transferError && <p className="text-red-500 text-xs font-bold">{transferError}</p>}
                            <button 
                                onClick={handleTransferProcess}
                                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all mt-2"
                            >
                                تأكيد الخصم ({totalDue} ر.س)
                            </button>
                        </div>
                    )}
                    {transferStep === 'success' && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center space-y-4 animate-in zoom-in">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-green-800">تم التحويل للمعقب بنجاح</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={sendTransferWhatsApp}
                                    className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700"
                                >
                                    <Send className="w-4 h-4" />
                                    إشعار المعقب (تم التحويل)
                                </button>
                                <button 
                                    onClick={() => setSelectedAgent(null)}
                                    className="flex items-center justify-center gap-2 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300"
                                >
                                    <X className="w-4 h-4" />
                                    خروج
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
export default AgentsPage;
