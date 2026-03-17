-- ============================================================
-- STEP 1: Sign up on the website first using the Sign Up tab
-- STEP 2: Run one of these queries to promote yourself to admin
-- ============================================================

-- Promote by EMAIL (replace with your actual email)
UPDATE user_roles
SET role = 'super_admin'
WHERE email = 'your@email.com';

-- Verify it worked
SELECT id, name, email, role, created_at
FROM user_roles
ORDER BY created_at DESC;
