-- إصلاح صلاحيات جدول المصروفات
-- المشكلة: الموقع يستخدم نظام دخول مخصص، لذا يجب السماح بالإضافة والقراءة بناءً على مفتاح API فقط

-- 1. تفعيل الأمان على مستوى الصف (للتأكد)
ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;

-- 2. حذف السياسات القديمة التي قد تسبب التعارض
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."expenses";
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."expenses";
DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."expenses";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."expenses";
DROP POLICY IF EXISTS "Allow individual select" ON "public"."expenses";

-- 3. إنشاء سياسة تسمح بالإضافة (INSERT) للجميع (يتم التحقق من user_id في الكود)
CREATE POLICY "Enable insert for app" ON "public"."expenses"
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- 4. إنشاء سياسة تسمح بالقراءة (SELECT) للجميع (الكود يقوم بفلترة البيانات حسب user_id)
CREATE POLICY "Enable select for app" ON "public"."expenses"
FOR SELECT 
TO anon, authenticated
USING (true);

-- 5. إنشاء سياسة تسمح بالحذف (DELETE)
CREATE POLICY "Enable delete for app" ON "public"."expenses"
FOR DELETE 
TO anon, authenticated
USING (true);
