-- Migração 1: Adicionar 'admin' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';