INSERT INTO public.user_roles (user_id, role)
VALUES ('af216e25-4c99-4741-bbf3-71e8ccc245ab', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;