-- تحديث كشف الحساب ليشمل جميع المعاملات (نشطة، مكتملة، ملغاة) فور إنشائها
CREATE OR REPLACE VIEW full_account_statement AS
SELECT 
    id, 
    'transaction' as record_type, 
    type as details, 
    client_price as amount, 
    created_at as date, 
    payment_method as bank, 
    user_id, 
    'deposit' as type
FROM transactions
UNION ALL
SELECT 
    id, 
    'expense' as record_type, 
    title as details, 
    amount, 
    date, 
    bank, 
    user_id, 
    'withdrawal' as type
FROM expenses
UNION ALL
SELECT 
    id, 
    'agent_transfer' as record_type, 
    'تحويل للمعقب: ' || agent_name as details, 
    amount, 
    date, 
    bank, 
    user_id, 
    'withdrawal' as type
FROM agent_transfers
UNION ALL
SELECT 
    id, 
    'client_refund' as record_type, 
    'استرجاع للعميل: ' || client_name as details, 
    amount, 
    date, 
    bank, 
    user_id, 
    'withdrawal' as type
FROM client_refunds;
