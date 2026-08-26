import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';

// იუზერის online/offline სტატუსს ბაზაში ანახლებს აპის მდგომარეობის მიხედვით
export function usePresence() {
  const userId = useAuthStore((state) => state.userId);

  useEffect(() => {
    if (!userId) return;

    const setStatus = async (status: 'online' | 'offline') => {
      try {
        await supabase
          .from('users')
          .update({ user_status: status, last_seen: new Date().toISOString() })
          .eq('id', userId);
      } catch (err) {
        // ჩუმად — სტატუსის ჩავარდნა აპს არ უნდა აფერხებდეს
      }
    };

    // აპის გახსნისთანავე — online
    // აპის გახსნისთანავე — online
    setStatus('online');

    // 🔧 „გულისცემა" — ყოველ 60 წამში last_seen ცოცხლდება, სანამ აპი აქტიურია
    const heartbeat = setInterval(() => {
      if (AppState.currentState === 'active') {
        setStatus('online');
      }
    }, 60 * 1000);

    // AppState-ის ცვლილებაზე რეაგირება
    const handleChange = (next: AppStateStatus) => {
      setStatus(next === 'active' ? 'online' : 'offline');
    };

    const sub = AppState.addEventListener('change', handleChange);

    return () => {
      clearInterval(heartbeat); // 🔧 ინტერვალის გაწმენდა
      sub.remove();
      setStatus('offline'); // კომპონენტის დახურვისას (მაგ. logout)
    };
  }, [userId]);
}