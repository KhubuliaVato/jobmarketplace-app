import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Badge, getBadgesByIds, MAX_DISPLAYED } from '../utils/badges';
import { THEME_PALETTES } from '../utils/bgThemes';

interface BadgeSelectViewProps {
  onBack: () => void;
}

export default function BadgeSelectView({ onBack }: BadgeSelectViewProps) {
  const myUserId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';

  const [earned, setEarned] = useState<Badge[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
  };

  useEffect(() => {
    if (!myUserId) { setLoading(false); return; }
    (async () => {
      try {
        await supabase.rpc('award_badges', { p_user: myUserId });
        const { data: e } = await supabase.from('user_badges').select('badge_id').eq('user_id', myUserId);
        const earnedIds: string[] = (e || []).map((b: any) => b.badge_id);
        setEarned(getBadgesByIds(earnedIds));

        const { data: p } = await supabase.from('profiles').select('displayed_badges').eq('id', myUserId).maybeSingle();
        setSelected(p?.displayed_badges || []);
      } catch (err) {
        console.log('ბეიჯების ჩატვირთვის შეცდომა:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [myUserId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_DISPLAYED) {
        setMsg(`მაქსიმუმ ${MAX_DISPLAYED} ბეიჯის არჩევა შეგიძლიათ`);
        return prev;
      }
      setMsg('');
      return [...prev, id];
    });
  };

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const { error } = await supabase.rpc('set_displayed_badges', { p_badges: selected });
      if (error) throw error;
      setMsg('შენახულია');
      setTimeout(() => onBack(), 600);
    } catch (err: any) {
      setMsg('შეცდომა: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerFlex, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color="#5B42F5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.hint, { color: theme.subText }]}>
        აირჩიე მაქსიმუმ {MAX_DISPLAYED}, რომელიც პროფილზე გამოჩნდება ({selected.length}/{MAX_DISPLAYED})
      </Text>

      {!!msg && (
        <View style={[styles.msgBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.msgText, { color: theme.text }]}>{msg}</Text>
        </View>
      )}

      {earned.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.emptyText, { color: theme.subText }]}>ჯერ ბეიჯი არ მოგიპოვებია</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {earned.map((b) => {
            const isSel = selected.includes(b.id);
            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => toggle(b.id)}
                activeOpacity={0.85}
                style={[
                  styles.card,
                  { backgroundColor: theme.cardBg, borderColor: isSel ? '#5B42F5' : theme.border },
                ]}
              >
                <Image source={b.image} style={[styles.badgeImg, !isSel && styles.badgeImgDim]} resizeMode="contain" />
                <Text style={[styles.badgeName, { color: theme.text }]} numberOfLines={1}>{b.name}</Text>
                <Text style={[styles.badgeDesc, { color: theme.subText }]} numberOfLines={2}>{b.description}</Text>
                {isSel && <Text style={styles.selectedTag}>არჩეული</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {earned.length > 0 && (
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>შენახვა</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerFlex: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 110 },
  hint: { fontSize: 13, marginBottom: 14, lineHeight: 19 },
  msgBox: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  msgText: { fontSize: 13, textAlign: 'center', fontWeight: '500' },
  emptyBox: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 13, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', borderRadius: 16, borderWidth: 1.5, padding: 14, alignItems: 'center', marginBottom: 12 },
  badgeImg: { width: 56, height: 56, marginBottom: 8 },
  badgeImgDim: { opacity: 0.4 },
  badgeName: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 3 },
  badgeDesc: { fontSize: 10.5, textAlign: 'center', lineHeight: 14 },
  selectedTag: { color: '#5B42F5', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 8, letterSpacing: 0.4 },
  saveBtn: { backgroundColor: '#5B42F5', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});