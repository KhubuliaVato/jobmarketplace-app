import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create(
  persist(
    (set) => ({
      userId: '0b4cea04-364f-44c8-9ed0-e51171e15b0f', 
      userName: 'ვაკთენგ ხუბულია',
      userRole: 'worker',
      isDarkMode: true, // გლობალური თემა (დეფოლტად მუქი)

      setUserId: (id) => set({ userId: id }),
      setUserName: (name) => set({ userName: name }),
      setUserRole: (role) => set({ userRole: role }),
      setIsDarkMode: (isDark) => set({ isDarkMode: isDark }), // ფუნქცია თემის შესაცვლელად
    }),
    {
      name: 'ipove-app-storage', // უნიკალური სახელი მეხსიერებისთვის
      storage: createJSONStorage(() => AsyncStorage), // მობილურის შიდა მეხსიერების მიბმა
    }
  )
);