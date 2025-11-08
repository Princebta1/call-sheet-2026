import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  roleId: number | null;
  roleInfo: {
    id: number;
    name: string;
    description: string | null;
    isSystemRole: boolean;
  } | null;
  permissions: string[];
  companyId: number;
  companyName: string;
  companyEmail?: string;
  subscriptionTier?: string;
  phone?: string;
  profileImage?: string;
  statusMessage?: string;
  receiveEmailNotifications?: boolean;
  receiveSmsNotifications?: boolean;
  lastActiveAt?: Date | null;
}

interface AuthStore {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token: string, user: User) => set({ token, user }),
      setUser: (user: User) => set({ user }),
      clearAuth: () => set({ token: null, user: null }),
      isAuthenticated: () => {
        const state = get();
        return state.token !== null && state.user !== null;
      },
    }),
    {
      name: "call-sheet-auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
