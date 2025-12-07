import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface RoleState {
  role: AppRole | null;
  isAdmin: boolean;
  isManager: boolean;
  isSeller: boolean;
  isWorker: boolean;
  loading: boolean;
  isActive: boolean;
}

export function useRole() {
  const [state, setState] = useState<RoleState>({
    role: null,
    isAdmin: false,
    isManager: false,
    isSeller: false,
    isWorker: false,
    loading: true,
    isActive: true,
  });

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      // Fetch profile status
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('status')
        .eq('id', user.id)
        .single();

      const role = roleData?.role || null;
      const isActive = profileData?.status === 'active';

      setState({
        role,
        isAdmin: role === 'admin',
        isManager: role === 'manager',
        isSeller: role === 'seller',
        isWorker: role === 'worker',
        loading: false,
        isActive,
      });
    }

    fetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const canManageUsers = state.isAdmin;
  const canCreateOrders = state.isAdmin || state.isManager || state.isSeller;
  const canEditOrders = state.isAdmin || state.isManager;
  const canViewAllOrders = state.isAdmin || state.isManager || state.isWorker;
  const canUpdateManufacturing = state.isAdmin || state.isManager || state.isWorker;
  const canUpdateOrdering = state.isAdmin || state.isManager || state.isSeller;

  return {
    ...state,
    canManageUsers,
    canCreateOrders,
    canEditOrders,
    canViewAllOrders,
    canUpdateManufacturing,
    canUpdateOrdering,
  };
}
