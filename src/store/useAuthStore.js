import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      userId: null,
      userName: null,
      userRole: null,
      isDarkMode: true,
      language: 'ka',

      resumeUrl: null,
      resumeName: null,
      searchTags: [],

      mustChangePassword: false,
      tier: 'free',
      tierExpiresAt: null,
      bgTheme: 'noir',
      setBgTheme: (id) => set({ bgTheme: id }),
      setUserId: (id) => set({ userId: id }),
      setMustChangePassword: (value) => set({ mustChangePassword: value }),
      setTier: (tier, expiresAt) => set({ tier, tierExpiresAt: expiresAt ?? null }),
      setUserName: (name) => set({ userName: name }),
      setUserRole: (role) => set({ userRole: role }),
      setIsDarkMode: (isDark) => set({ isDarkMode: isDark }),
      setLanguage: (lang) => set({ language: lang }),

      setResume: (url, name) => set({ resumeUrl: url, resumeName: name }),
      setSearchTags: (tags) => set({ searchTags: tags }),
    }),
    {
      name: 'ipove-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);