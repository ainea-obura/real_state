-- Payment Plan Templates for Real Estate Sales
-- These templates represent common payment structures used in the industry

-- Clear existing templates (if any)
DELETE FROM payment_plan_template;

-- Reset auto-increment if needed
-- ALTER TABLE payment_plan_template AUTO_INCREMENT = 1;

-- =====================================================
-- STANDARD TEMPLATES (Most Common)
-- =====================================================

-- Standard 20% Down Payment - Monthly Installments
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency, 
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(), 
    'Standard 20% Down - Monthly',
    'Classic payment plan with 20% down payment and monthly installments. Most popular for residential properties.',
    'standard', 120, 'monthly', 20.00, 'easy', true, 1,
    true, NOW(), NOW()
);

-- Standard 25% Down Payment - Monthly Installments  
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Standard 25% Down - Monthly',
    'Conservative payment plan with 25% down payment and monthly installments. Lower monthly payments.',
    'standard', 120, 'monthly', 25.00, 'easy', true, 2,
    true, NOW(), NOW()
);

-- =====================================================
-- EXTENDED TEMPLATES (Lower Down Payments)
-- =====================================================

-- Extended 10% Down Payment - Monthly Installments
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Extended 10% Down - Monthly',
    'First-time buyer friendly with only 10% down payment. Extended payment period for affordability.',
    'extended', 180, 'monthly', 10.00, 'medium', true, 3,
    true, NOW(), NOW()
);

-- Extended 15% Down Payment - Monthly Installments
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Extended 15% Down - Monthly',
    'Balanced approach with 15% down payment. Good for buyers with moderate savings.',
    'extended', 150, 'monthly', 15.00, 'medium', true, 4,
    true, NOW(), NOW()
);

-- =====================================================
-- QUARTERLY TEMPLATES (Investor Focused)
-- =====================================================

-- Quarterly 30% Down Payment
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Quarterly 30% Down',
    'Investor-friendly plan with quarterly payments. Higher down payment reduces monthly burden.',
    'quarterly', 40, 'quarterly', 30.00, 'medium', true, 5,
    true, NOW(), NOW()
);

-- Quarterly 25% Down Payment
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Quarterly 25% Down',
    'Balanced quarterly plan with 25% down payment. Suitable for both investors and end-users.',
    'quarterly', 32, 'quarterly', 25.00, 'medium', true, 6,
    true, NOW(), NOW()
);

-- =====================================================
-- SEMI-ANNUAL TEMPLATES (Luxury Properties)
-- =====================================================

-- Semi-Annual 40% Down Payment
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Semi-Annual 40% Down',
    'Premium payment plan for luxury properties. High down payment with semi-annual installments.',
    'semi_annual', 20, 'semi-annual', 40.00, 'advanced', true, 7,
    true, NOW(), NOW()
);

-- Semi-Annual 35% Down Payment
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Semi-Annual 35% Down',
    'Luxury property payment plan with 35% down payment. Semi-annual payments for convenience.',
    'semi_annual', 24, 'semi-annual', 35.00, 'advanced', true, 8,
    true, NOW(), NOW()
);

-- =====================================================
-- ANNUAL TEMPLATES (High-Value Properties)
-- =====================================================

-- Annual 50% Down Payment
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Annual 50% Down',
    'High-value property plan with 50% down payment. Annual installments for major transactions.',
    'annual', 10, 'annual', 50.00, 'advanced', true, 9,
    true, NOW(), NOW()
);

-- Annual 45% Down Payment
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Annual 45% Down',
    'Premium annual payment plan with 45% down payment. Suitable for high-end properties.',
    'annual', 12, 'annual', 45.00, 'advanced', true, 10,
    true, NOW(), NOW()
);

-- =====================================================
-- FLEXIBLE TEMPLATES (Customizable Options)
-- =====================================================

-- Flexible 20% Down - 5 Years
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Flexible 20% Down - 5 Years',
    'Flexible 5-year payment plan with 20% down payment. Good balance of affordability and duration.',
    'flexible', 60, 'monthly', 20.00, 'medium', false, 11,
    true, NOW(), NOW()
);

-- Flexible 15% Down - 7 Years
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Flexible 15% Down - 7 Years',
    'Extended 7-year payment plan with 15% down payment. Maximum affordability for buyers.',
    'flexible', 84, 'monthly', 15.00, 'medium', false, 12,
    true, NOW(), NOW()
);

-- =====================================================
-- CUSTOM TEMPLATES (Special Cases)
-- =====================================================

-- Custom 5% Down - 10 Years
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Custom 5% Down - 10 Years',
    'Special low down payment plan with extended 10-year term. Requires excellent credit and approval.',
    'custom', 120, 'monthly', 5.00, 'advanced', false, 13,
    true, NOW(), NOW()
);

-- Custom 60% Down - 3 Years
INSERT INTO payment_plan_template (
    id, name, description, category, periods, frequency,
    deposit_percentage, difficulty, is_featured, sort_order,
    is_active, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Custom 60% Down - 3 Years',
    'High down payment plan with short 3-year term. For buyers with substantial cash reserves.',
    'custom', 36, 'monthly', 60.00, 'advanced', false, 14,
    true, NOW(), NOW()
);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Check all inserted templates
SELECT 
    name,
    category,
    periods,
    frequency,
    deposit_percentage,
    difficulty,
    is_featured,
    sort_order
FROM payment_plan_template 
ORDER BY sort_order, category, name;

-- Count templates by category
SELECT 
    category,
    COUNT(*) as template_count
FROM payment_plan_template 
GROUP BY category 
ORDER BY template_count DESC;

-- Count templates by difficulty
SELECT 
    difficulty,
    COUNT(*) as template_count
FROM payment_plan_template 
GROUP BY difficulty 
ORDER BY template_count DESC;
