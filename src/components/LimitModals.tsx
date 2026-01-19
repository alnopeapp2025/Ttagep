import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Crown, Lock, AlertCircle } from 'lucide-react';

interface LimitModalProps {
    type: 'none' | 'visitor' | 'member' | 'golden';
    isOpen: boolean;
    onClose: () => void;
}

export const LimitModals = ({ type, isOpen, onClose }: LimitModalProps) => {
    const navigate = useNavigate();

    if (type === 'visitor') {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl max-w-sm" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl font-black text-gray-800 flex items-center justify-center gap-2">
                            <Lock className="w-6 h-6 text-red-500" />
                            تنبيه للزوار
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 text-center space-y-4">
                        <p className="text-gray-600 font-medium">
                            عفواً، لقد تجاوزت الحد المسموح للزوار.
                            <br/>
                            يرجى التسجيل لحفظ بياناتك والاستفادة من مزايا التطبيق.
                        </p>
                        <button 
                            onClick={() => { onClose(); navigate('/register'); }}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-5 h-5" />
                            تسجيل عضوية
                        </button>
                        <button 
                            onClick={onClose}
                            className="text-sm text-gray-400 hover:text-gray-600"
                        >
                            إغلاق
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (type === 'member') {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-400 shadow-3d rounded-3xl max-w-sm" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl font-black text-yellow-800 flex items-center justify-center gap-2">
                            <Crown className="w-8 h-8 text-yellow-600" />
                            ترقية العضوية
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 text-center space-y-6">
                        <div className="bg-white/50 p-4 rounded-xl border border-yellow-200">
                            <p className="text-gray-700 font-bold mb-2">
                                لقد وصلت للحد الأقصى المسموح به لعضويتك الحالية.
                            </p>
                            <p className="text-sm text-gray-600">
                                اشترك الآن في الباقة الذهبية (PRO) واحصل على حدود لا نهائية وتقارير متكاملة.
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => { onClose(); navigate('/?openPro=true'); }}
                            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                        >
                            <Crown className="w-5 h-5" />
                            اشترك الآن (PRO)
                        </button>
                        
                        <button 
                            onClick={onClose}
                            className="text-sm text-yellow-700 hover:text-yellow-900 font-bold"
                        >
                            إلغاء
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (type === 'golden') {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl max-w-sm" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl font-black text-gray-800 flex items-center justify-center gap-2">
                            <AlertCircle className="w-6 h-6 text-orange-500" />
                            تنبيه
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 text-center space-y-4">
                        <p className="text-gray-600 font-medium">
                            عفواً، لقد تجاوزت الحد المسموح به للعضوية الذهبية.
                            <br/>
                            يرجى التواصل مع الإدارة لزيادة الحد.
                        </p>
                        <button 
                            onClick={onClose}
                            className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300"
                        >
                            إغلاق
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return null;
};
