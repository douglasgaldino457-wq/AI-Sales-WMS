
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserRole, Page, SystemUser } from '../types';

interface AppState {
  // Auth State
  userRole: UserRole | null;
  currentUser: SystemUser | null;
  login: (user: SystemUser) => void;
  logout: () => void;

  // Navigation State
  currentPage: Page;
  targetDemandId: string | undefined;
  navigate: (page: Page, targetId?: string) => void;

  // UI State
  bgImage: string | null;
  isGeneratingBg: boolean;
  setBgImage: (url: string) => void;
  setGeneratingBg: (isGenerating: boolean) => void;

  // Connectivity State
  isOffline: boolean;
  setOffline: (status: boolean) => void;

  // AI Assistant Global State
  isAiOpen: boolean;
  toggleAi: () => void;
  setAiOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial Auth State
      userRole: null,
      currentUser: null,
      
      // Initial Navigation State
      currentPage: Page.DASHBOARD,
      targetDemandId: undefined,

      // Initial UI State
      bgImage: null, 
      isGeneratingBg: false,
      
      // Initial Connectivity State
      isOffline: !navigator.onLine,

      // AI State
      isAiOpen: false,

      // Actions
      login: (user: SystemUser) => {
        let startPage = Page.DASHBOARD;
        
        switch (user.role) {
          case UserRole.INSIDE_SALES:
          case UserRole.FIELD_SALES:
          case UserRole.ADMIN:
            startPage = Page.DASHBOARD;
            break;
          case UserRole.PRICING_MANAGER:
            startPage = Page.PRICING_DASHBOARD;
            break;
          case UserRole.LOGISTICA:
            startPage = Page.LOGISTICA_DASHBOARD;
            break;
          default:
            startPage = Page.DASHBOARD_GERAL;
        }

        set({ userRole: user.role, currentUser: user, currentPage: startPage });
      },

      logout: () => {
        set({ userRole: null, currentUser: null, currentPage: Page.DASHBOARD, targetDemandId: undefined, isAiOpen: false });
      },

      navigate: (page: Page, targetId?: string) => {
        set({ currentPage: page, targetDemandId: targetId });
      },

      setBgImage: (url: string) => {
        set({ bgImage: url });
      },

      setGeneratingBg: (isGenerating: boolean) => {
        set({ isGeneratingBg: isGenerating });
      },

      setOffline: (status: boolean) => {
        set({ isOffline: status });
      },

      toggleAi: () => set((state) => ({ isAiOpen: !state.isAiOpen })),
      setAiOpen: (open: boolean) => set({ isAiOpen: open }),
    }),
    {
      name: 'car10-app-storage',
      storage: createJSONStorage(() => localStorage),
      // We do NOT persist isOffline because it should be checked fresh on reload
      partialize: (state) => ({ 
        userRole: state.userRole, 
        currentUser: state.currentUser,
        bgImage: state.bgImage 
      }), 
    }
  )
);
