
-- Add system_settings for Group 2 protection pricing
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g2_basic_rate', '52.99', 'Group 2 Basic Protection daily rate')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g2_basic_deductible', 'Up to $800.00', 'Group 2 Basic Protection deductible')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g2_smart_rate', '57.99', 'Group 2 Smart Protection daily rate')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g2_smart_original_rate', '', 'Group 2 Smart original rate for strikethrough')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g2_smart_discount', '', 'Group 2 Smart discount label')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g2_smart_deductible', 'No deductible', 'Group 2 Smart deductible')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g2_premium_rate', '69.99', 'Group 2 All Inclusive daily rate')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g2_premium_original_rate', '', 'Group 2 All Inclusive original rate')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g2_premium_discount', '', 'Group 2 All Inclusive discount label')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g2_premium_deductible', 'No deductible', 'Group 2 All Inclusive deductible')
ON CONFLICT (key) DO NOTHING;

-- Add system_settings for Group 3 protection pricing
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g3_basic_rate', '64.99', 'Group 3 Basic Protection daily rate')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g3_basic_deductible', 'Up to $800.00', 'Group 3 Basic Protection deductible')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g3_smart_rate', '69.99', 'Group 3 Smart Protection daily rate')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g3_smart_original_rate', '', 'Group 3 Smart original rate')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g3_smart_discount', '', 'Group 3 Smart discount label')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g3_smart_deductible', 'No deductible', 'Group 3 Smart deductible')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g3_premium_rate', '82.99', 'Group 3 All Inclusive daily rate')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g3_premium_original_rate', '', 'Group 3 All Inclusive original rate')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g3_premium_discount', '', 'Group 3 All Inclusive discount label')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('protection_g3_premium_deductible', 'No deductible', 'Group 3 All Inclusive deductible')
ON CONFLICT (key) DO NOTHING;

-- Add system_settings for additional driver and young driver fees
INSERT INTO system_settings (key, value, description) VALUES
  ('additional_driver_daily_rate', '15.99', 'Additional driver daily fee (CAD)')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value, description) VALUES
  ('young_additional_driver_daily_rate', '15.00', 'Young additional driver (20-24) daily surcharge (CAD)')
ON CONFLICT (key) DO NOTHING;
