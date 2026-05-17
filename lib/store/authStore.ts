import { create } from 'zustand';
import type { Profile, Couple } from '@/types';

interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  couple: Couple | null;
  partner: Profile | null;
  isLoading: boolean;
  setUser: (user: { id: string; email: string } | null) => void;
  setProfile: (profile: Profile | null) => void;
  setCouple: (couple: Couple | null) => void;
  setPartner: (partner: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  couple: null,
  partner: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setCouple: (couple) => set({ couple }),
  setPartner: (partner) => set({ partner }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, profile: null, couple: null, partner: null, isLoading: false }),
}));
