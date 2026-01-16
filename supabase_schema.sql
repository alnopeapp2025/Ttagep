-- هذا الملف يحتوي على أوامر SQL لتحديث قاعدة البيانات في Supabase
-- يرجى نسخ هذا الكود وتشغيله في "SQL Editor" في لوحة تحكم Supabase

-- 1. إضافة حقل الصلاحية (Role) لجدول المستخدمين
-- القيم المحتملة: 'member' (عضو), 'golden' (ذهبي), 'employee' (موظف)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'member';

-- 2. إضافة حقل تاريخ انتهاء الاشتراك
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_expiry timestamptz;

-- 3. تحديث سياسات الأمان (RLS) - اختياري حسب إعدادات مشروعك
-- تمكين RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بالقراءة (لأن نظام الدخول مخصص)
-- ملاحظة: في بيئة الإنتاج الحقيقية يفضل استخدام Supabase Auth لتقييد الوصول بشكل أدق
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.users FOR UPDATE USING (true);
