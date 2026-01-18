-- إصلاح الأعمدة المفقودة (created_by) لضمان عمل تقارير الموظفين
-- Fix missing 'created_by' columns for Employee Reports

-- 1. جدول العملاء (Clients)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS created_by text;

-- 2. جدول المعقبين (Agents)
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS created_by text;

-- 3. جدول المصروفات (Expenses)
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS created_by text;

-- 4. جدول المعاملات (Transactions)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS created_by text;

-- 5. تحديث كاش المخطط (Refresh Schema Cache)
NOTIFY pgrst, 'reload config';

-- ملاحظة: قم بتشغيل هذا الكود في Supabase SQL Editor
