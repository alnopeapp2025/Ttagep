import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Info, Trash2, X } from "lucide-react";

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
}

export const AlertModal = ({ isOpen, onClose, title, message, type = 'info' }: AlertModalProps) => {
    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle2 className="w-12 h-12 text-green-500" />;
            case 'error': return <AlertCircle className="w-12 h-12 text-red-500" />;
            case 'warning': return <AlertCircle className="w-12 h-12 text-yellow-500" />;
            default: return <Info className="w-12 h-12 text-blue-500" />;
        }
    };

    const getColor = () => {
        switch (type) {
            case 'success': return 'text-green-700';
            case 'error': return 'text-red-600';
            case 'warning': return 'text-yellow-700';
            default: return 'text-blue-700';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl max-w-sm text-center" dir="rtl">
                <div className="flex flex-col items-center justify-center py-4">
                    <div className="mb-4 bg-white p-3 rounded-full shadow-3d-inset">
                        {getIcon()}
                    </div>
                    <DialogHeader>
                        <DialogTitle className={`text-xl font-black ${getColor()} mb-2 text-center`}>
                            {title}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-gray-600 font-medium text-sm leading-relaxed px-2">
                        {message}
                    </p>
                </div>
                <DialogFooter className="sm:justify-center">
                    <button 
                        onClick={onClose}
                        className="w-full py-3 bg-white text-gray-700 rounded-xl font-bold shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all"
                    >
                        موافق
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
}

export const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = "نعم، تأكيد", 
    cancelText = "إلغاء",
    variant = 'danger'
}: ConfirmModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#eef2f6] border-none shadow-3d rounded-3xl max-w-sm text-center" dir="rtl">
                <div className="flex flex-col items-center justify-center py-4">
                    <div className="mb-4 bg-white p-3 rounded-full shadow-3d-inset">
                        {variant === 'danger' ? (
                            <Trash2 className="w-10 h-10 text-red-500" />
                        ) : (
                            <Info className="w-10 h-10 text-blue-500" />
                        )}
                    </div>
                    <DialogHeader>
                        <DialogTitle className={`text-xl font-black ${variant === 'danger' ? 'text-red-600' : 'text-blue-700'} mb-2 text-center`}>
                            {title}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-gray-600 font-medium text-sm leading-relaxed px-2">
                        {message}
                    </p>
                </div>
                <div className="flex gap-3 mt-2">
                    <button 
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition-all ${
                            variant === 'danger' 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {confirmText}
                    </button>
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
                    >
                        {cancelText}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
