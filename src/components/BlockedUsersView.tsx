import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { THEME_PALETTES } from '../utils/bgThemes';

interface BlockedUsersViewProps {
  onBack: () => void;
}

export default function BlockedUsersView({ onBack }: BlockedUsersViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';

  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
    iconBg: isDarkMode ? '#1f1f24' : '#f2f2f7',
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data: ids } = await supabase.rpc('my_blocked_ids');
      if (!ids || ids.length === 0) {
        setBlocked([]);
        return;
      }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url')
        .in('id', ids);
      setBlocked(profiles || []);
    } catch (err) {
      console.log('დაბლოკილების ჩატვირთვის შეცდომა:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const unblock = async (targetId: string) => {
    setUnblockingId(targetId);
    try {
      await supabase.rpc('toggle_block', { p_blocked_id: targetId });
      setBlocked((prev) => prev.filter((p) => p.id !== targetId));
    } catch (err) {
      console.log('განბლოკვის შეცდომა:', err);
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.group, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#5B42F5" />
          </View>
        ) : blocked.length === 0 ? (
          <View style={styles.centerState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.iconBg }]}>
              <Ionicons name="person-remove-outline" size={22} color={theme.subText} />
            </View>
            <Text style={[styles.emptyText, { color: theme.subText }]}>დაბლოკილი მომხმარებლები არ გყავთ</Text>
          </View>
        ) : (
          blocked.map((p, idx) => (
            <View
              key={p.id}
              style={[
                styles.row,
                { borderColor: theme.border, borderBottomWidth: idx === blocked.length - 1 ? 0 : 1 },
              ]}
            >
              <View style={styles.rowLeft}>
                {p.avatar_url ? (
                  <Image source={{ uri: p.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>
                      {(p.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.nameBlock}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{p.name}</Text>
                  {!!p.username && (
                    <Text style={[styles.username, { color: theme.subText }]} numberOfLines={1}>@{p.username}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => unblock(p.id)}
                disabled={unblockingId === p.id}
                style={styles.unblockBtn}
              >
                <Text style={styles.unblockText}>
                  {unblockingId === p.id ? '...' : 'განბლოკვა'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  group: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  centerState: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  emptyIconCircle: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyText: { fontSize: 13, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  avatar: { width: 40, height: 40, borderRadius: 12, marginRight: 12 },
  avatarFallback: { width: 40, height: 40, borderRadius: 12, marginRight: 12, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  nameBlock: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' },
  username: { fontSize: 12, marginTop: 2 },
  unblockBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  unblockText: { color: '#5B42F5', fontSize: 12, fontWeight: '700' },
});