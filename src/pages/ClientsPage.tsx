import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users, Plus, Search, FileText, Phone, MessageCircle, CheckCircle2, Send, X, Contact, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { 
  getStoredClients, saveStoredClients, Client, 
  getStoredTransactions, saveStoredTransactions, Transaction,
  BANKS_LIST,
  getStoredClientRefunds, saveStoredClientRefunds, ClientRefundRecord,
  getStoredPendingBalances, saveStoredPendingBalances,
  getCurrentUser, User,
  addClientToCloud, fetchClientsFromCloud, fetchTransactionsFromCloud
} from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Form States
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientWhatsapp, setNewClientWhatsapp] = useState('');
  const [errors, setErrors] = useState({ phone: '', whatsapp: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientTxs, setClientTxs] = useState<Transaction[]>([]);
  const [open, setOpen] = useState(false);

  // Refund States
  const [refundStep, setRefundStep] = useState<'summary' | 'bank-select' | 'success'>('summary');
  const [selectedBank, setSelectedBank] = useState('');
  const [pendingBalances, setPendingBalances] = useState<Record<string, number>>({});
  const [refundError, setRefundError] = useState('');
  const [totalRefundDue, setTotalRefundDue] = useState(0);

  // All Transactions (Local or Cloud)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setPendingBalances(getStoredPendingBalances());

    const loadData = async () => {
        if (user) {
            const cloudClients = await fetchClientsFromCloud(user.id);
            setClients(cloudClients);
            const cloudTxs = await fetchTransactionsFromCloud(user.id);
            setAllTransactions(cloudTxs);
            saveStoredTransactions(cloudTxs); // Sync
        } else {
            setClients(getStoredClients());
            setAllTransactions(getStoredTransactions());
        }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('clients-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          fetchClientsFromCloud(currentUser.id).then(data => {
            setClients(data);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    if (clientTxs.length > 0) {
        const total = clientTxs
            .filter(t => t.status === 'cancelled' && !t.clientRefunded)
            .reduce((sum, t) => sum + (parseFloat(t.clientPrice) || 0), 0);
        setTotalRefundDue(total);
    } else {
        setTotalRefundDue(0);
    }
  }, [clientTxs]);

  const validateSaudiNumber = (num: string) => {
    const regex = /^5[0-9]{8}$/;
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

          rawPhone = rawPhone.replace(/\D/g, '');
          if (rawPhone.startsWith('966')) rawPhone = rawPhone.substring(3);
          if (rawPhone.startsWith('0')) rawPhone = rawPhone.substring(1);
          
          setNewClientName(rawName);
          setNewClientPhone(rawPhone);
          setNewClientWhatsapp(rawPhone);
        }
      } else {
        alert('هذه الميزة مدعومة فقط على الهواتف الذكية (Android/iOS).');
      }
    } catch (ex) {
      console.error(ex);
    }
  };

  const handleAddClient = async () => {
    let hasError = false;
    const newErrors = { phone: '', whatsapp: '' };

    if (!newClientName.trim()) return;

    if (newClientPhone && !validateSaudiNumber(newClientPhone)) {
        newErrors.phone = 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام';
        hasError = true;
    }

    if (newClientWhatsapp && !validateSaudiNumber(newClientWhatsapp)) {
        newErrors.whatsapp = 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام';
        hasError = true;
    }

    setErrors(newErrors);
    if (hasError) return;

    const newClient: Client = {
      id: Date.now(),
      name: newClientName,
      phone: newClientPhone ? `966${newClientPhone}` : '',
      whatsapp: newClientWhatsapp ? `966${newClientWhatsapp}` : '',
      createdAt: Date.now()
    };

    const updatedClients = [newClient, ...clients];
    setClients(updatedClients);

    if (currentUser) {
        await addClientToCloud(newClient, currentUser.id);
    } else {
        saveStoredClients(updatedClients);
    }

    setNewClientName('');
    setNewClientPhone('');
    setNewClientWhatsapp('');
    setErrors({ phone: '', whatsapp: '' });
    setOpen(false);
  };

  const handleClientClick = (client: Client) => {
    // Use state variable instead of direct local storage
    const filtered = allTransactions.filter(t => t.clientName === client.name);
    
    setClientTxs(filtered); 
    setSelectedClient(client);
    setRefundStep('summary');
    setRefundError('');
    setSelectedBank('');
    setPendingBalances(getStoredPendingBalances());
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

  const handleRefundProcess = () => {
    if (!selectedBank || !selectedClient) return;
    
    const currentPending = pendingBalances[selectedBank] || 0;
    
    if (currentPending < totalRefundDue) {
        setRefundError('رصيد الخزنة غير المستحقة (المعلق) غير كافي في هذا البنك');
        return;
    }

    const newPending = { ...pendingBalances };
    newPending[selectedBank] = currentPending - totalRefundDue;
    saveStoredPendingBalances(newPending);
    setPendingBalances(newPending);

    const refundedTxIds: number[] = [];
    
    const updatedTxs = allTransactions.map(t => {
        if (t.clientName === selectedClient.name && t.status === 'cancelled' && !t.clientRefunded) {
            refundedTxIds.push(t.id);
            return { ...t, clientRefunded: true };
        }
        return t;
    });
    setAllTransactions(updatedTxs);
    saveStoredTransactions(updatedTxs);

    const refundRecord: ClientRefundRecord = {
        id: Date.now(),
        clientName: selectedClient.name,
        amount: totalRefundDue,
        bank: selectedBank,
        date: Date.now(),
        transactionCount: refundedTxIds.length
    };
    const refunds = getStoredClientRefunds();
    saveStoredClientRefunds([refundRecord, ...refunds]);

    const refreshedTxs = updatedTxs.filter(t => t.clientName === selectedClient.name);
    setClientTxs(refreshedTxs);

    setRefundStep('success');
  };

  const sendRefundWhatsApp = () => {
    if (!selectedClient?.whatsapp && !selectedClient?.phone) return;
    const num = selectedClient.whatsapp || selectedClient.phone;
    const message = `مرحباً ${selectedClient.name}،\nتم استرجاع مبلغ المعاملات الملغاة.\nالمبلغ: ${totalRefundDue} ر.س\nتم التحويل من: ${selectedBank}\nنعتذر عن عدم إتمام الخدمة.`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredClients = clients.filter(c => c.name.includes(searchTerm));

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600">
          <ArrowRight className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-800 text-shadow">العملاء</h1>
          <p className="text-gray-500">إدارة قاعدة العملاء</p>
        </div>
      </header>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
            <Search className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
            <Input 
                placeholder="بحث عن عميل..." 
                className="pr-10 bg-[#eef2f6] shadow-3d-inset border-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="bg-blue-600 text-white px-6 rounded-xl font-bold shadow-3d hover:bg-blue-700 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    أضف عميل
                </button>
            </DialogTrigger>
            <DialogContent className="bg-[#eef2f6] shadow-3d border-none" dir="rtl">
                <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
                
                <button 
                    onClick={handleImportContact}
                    className="w-full py-2 bg-purple-100 text-purple-700 rounded-xl font-bold shadow-sm hover:bg-purple-200 flex items-center justify-center gap-2 mb-2"
                >
                    <Contact className="w-4 h-4" />
                    أو من الهاتف
                </button>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>اسم العميل</Label>
                        <Input 
                            value={newClientName} 
                            onChange={(e) => setNewClientName(e.target.value)} 
                            className="bg-white shadow-3d-inset border-none"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>رقم الجوال</Label>
                        <div className="relative flex items-center" dir="ltr">
                            <div className="absolute left-3 z-10 text-gray-400 font-bold text-sm pointer-events-none">+966</div>
                            <Input 
                                value={newClientPhone} 
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                                    setNewClientPhone(val);
                                    if(errors.phone) setErrors({...errors, phone: ''});
                                }} 
                                className={`bg-white shadow-3d-inset border-none pl-14 text-left ${errors.phone ? 'ring-2 ring-red-400' : ''}`}
                                placeholder="5xxxxxxxx"
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
                                value={newClientWhatsapp} 
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                                    setNewClientWhatsapp(val);
                                    if(errors.whatsapp) setErrors({...errors, whatsapp: ''});
                                }} 
                                className={`bg-white shadow-3d-inset border-none pl-14 text-left ${errors.whatsapp ? 'ring-2 ring-red-400' : ''}`}
                                placeholder="5xxxxxxxx"
                            />
                            <MessageCircle className="absolute right-3 w-4 h-4 text-green-500" />
                        </div>
                        {errors.whatsapp && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.whatsapp}</p>}
                    </div>

                    <button 
                        onClick={handleAddClient} 
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                    >
                        حفظ
                    </button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map(client => (
            <div 
                key={client.id} 
                onClick={() => handleClientClick(client)}
                className="bg-[#eef2f6] p-4 rounded-2xl shadow-3d hover:shadow-3d-hover cursor-pointer transition-all flex items-center justify-between gap-4 border border-white/50"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-sm">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-700 text-lg">{client.name}</h3>
                        <div className="flex gap-2 text-xs text-gray-400 mt-1">
                            {client.phone && <span className="flex items-center gap-1" dir="ltr">+{client.phone} <Phone className="w-3 h-3"/></span>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {client.phone && (
                        <button 
                            onClick={(e) => handlePhoneClick(e, client.phone)}
                            className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-3d hover:scale-110 transition-transform"
                        >
                            <Phone className="w-5 h-5" />
                        </button>
                    )}
                    {client.whatsapp && (
                        <button 
                            onClick={(e) => handleWhatsAppClick(e, client.whatsapp)}
                            className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-3d hover:scale-110 transition-transform"
                        >
                            <MessageCircle className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        ))}
      </div>

      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="bg-[#eef2f6] shadow-3d border-none max-w-2xl" dir="rtl">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    معاملات العميل: {selectedClient?.name}
                </DialogTitle>
            </DialogHeader>
            
            <div className="py-4 space-y-3 max-h-[50vh] overflow-y-auto">
                {clientTxs.length > 0 ? clientTxs.map(tx => (
                    <div key={tx.id} className="bg-white/50 p-3 rounded-xl flex justify-between items-center border border-white">
                        <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="font-bold text-sm text-gray-700">{tx.type}</p>
                                <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString('ar-SA')}</p>
                            </div>
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-blue-600">{tx.clientPrice} ر.س</p>
                            <div className="text-[10px] font-bold">
                                {tx.status === 'cancelled' ? (
                                    tx.clientRefunded ? <span className="text-gray-400">ملغاة (تم الاسترجاع)</span> : <span className="text-red-500">ملغاة (مستحق الاسترجاع)</span>
                                ) : tx.status === 'completed' ? (
                                    <span className="text-green-600">منجزة</span>
                                ) : (
                                    <span className="text-orange-500">قيد التنفيذ</span>
                                )}
                            </div>
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-gray-500">لا توجد معاملات مسجلة لهذا العميل.</p>
                )}
            </div>

            {clientTxs.some(t => t.status === 'cancelled' && !t.clientRefunded) && totalRefundDue > 0 && (
                <div className="mt-2 pt-4 border-t border-gray-200">
                    {refundStep === 'summary' && (
                        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-3d-inset">
                            <button 
                                onClick={() => setRefundStep('bank-select')}
                                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all"
                            >
                                <ArrowDownLeft className="w-4 h-4" />
                                تحويل للعميل (استرجاع)
                            </button>
                            <div className="text-left">
                                <p className="text-xs text-gray-500 font-bold mb-1">إجمالي المسترجع</p>
                                <p className="text-2xl font-black text-red-600">{totalRefundDue.toLocaleString()} ر.س</p>
                            </div>
                        </div>
                    )}

                    {refundStep === 'bank-select' && (
                        <div className="bg-white p-4 rounded-xl shadow-3d-inset space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-center mb-2">
                                <Label className="font-bold text-gray-700">اختر البنك للخصم (من المعلق)</Label>
                                <button onClick={() => setRefundStep('summary')} className="text-xs text-red-500 font-bold">إلغاء</button>
                            </div>
                            
                            <Select onValueChange={(val) => { setSelectedBank(val); setRefundError(''); }} value={selectedBank}>
                                <SelectTrigger className="bg-[#eef2f6] border-none h-12 text-right flex-row-reverse">
                                    <SelectValue placeholder="اختر البنك" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#eef2f6] shadow-3d border-none text-right" dir="rtl">
                                    {BANKS_LIST.map((bank) => (
                                        <SelectItem key={bank} value={bank} className="text-right cursor-pointer my-1">
                                            <div className="flex justify-between w-full gap-4">
                                                <span>{bank}</span>
                                                <span className={`font-bold ${(pendingBalances[bank] || 0) >= totalRefundDue ? 'text-green-600' : 'text-red-500'}`}>
                                                    {(pendingBalances[bank] || 0).toLocaleString()} ر.س
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {refundError && <p className="text-red-500 text-xs font-bold">{refundError}</p>}

                            <button 
                                onClick={handleRefundProcess}
                                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all mt-2"
                            >
                                تأكيد الاسترجاع ({totalRefundDue} ر.س)
                            </button>
                        </div>
                    )}

                    {refundStep === 'success' && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center space-y-4 animate-in zoom-in">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-green-800">تم ارجاع المبلغ للعميل وحذف المعامله من السجل</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={sendRefundWhatsApp}
                                    className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700"
                                >
                                    <Send className="w-4 h-4" />
                                    إرسال المبلغ للعميل
                                </button>
                                <button 
                                    onClick={() => setSelectedClient(null)}
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
  );
}

export default ClientsPage;
