import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { Badge, getBadge, getBadgesByIds, MAX_DISPLAYED } from '../utils/badges';
import { THEME_PALETTES } from '../utils/bgThemes';
import { COVERS, getCover } from '../utils/covers';
import Toast, { ToastType } from './Toast';

interface CoverPickerViewProps {
  onBack: () => void;
}

export default function CoverPickerView({ onBack }: CoverPickerViewProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const userId = useAuthStore((state) => state.userId);
  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';

  const [selected, setSelected] = useState('default');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCompany, setIsCompany] = useState(false);

  // ბეიჯები
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [savingBadges, setSavingBadges] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; type: ToastType; title: string; message?: string }>({
    visible: false, type: 'success', title: '',
  });
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToast({ visible: true, type, title, message });
  };

  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
    accent: '#5B42F5',
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    if (!userId) { setLoading(false); return; }
    try {
      // 1. პროფილი (users ან companies)
      let profile: any = null;
      const { data: u } = await supabase
        .from('users')
        .select('cover_id, displayed_badges')
        .eq('id', userId)
        .maybeSingle();

      if (u) {
        profile = u;
      } else {
        const { data: c } = await supabase
          .from('companies')
          .select('cover_id, displayed_badges')
          .eq('id', userId)
          .maybeSingle();
        if (c) { profile = c; setIsCompany(true); }
      }

      if (profile) {
        setSelected(profile.cover_id || 'default');
        setDisplayed(profile.displayed_badges || []);
      }

      // 2. ბეიჯების გადათვლა + წამოღება
      await supabase.rpc('award_badges', { p_user: userId });

      const { data: earned } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: true });

      const badges = (earned || [])
        .map((e: any) => getBadge(e.badge_id))
        .filter(Boolean) as Badge[];

      setEarnedBadges(badges);
    } catch {
      // ჩუმად
    } finally {
      setLoading(false);
    }
  };

  // ---------- ფონი ----------
  const handleSelectCover = async (coverId: string) => {
    if (!userId || saving) return;

    const prev = selected;
    setSelected(coverId);
    setSaving(true);

    try {
      const table = isCompany ? 'companies' : 'users';
      const { error } = await supabase
        .from(table)
        .update({ cover_id: coverId })
        .eq('id', userId);

      if (error) throw error;
      showToast('success', 'ფონი შეიცვალა', getCover(coverId).name);
    } catch (err: any) {
      setSelected(prev);
      showToast('error', 'ვერ შეინახა', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------- ბეიჯები ----------
  const toggleBadge = (badgeId: string) => {
    setDisplayed(prev => {
      if (prev.includes(badgeId)) {
        return prev.filter(id => id !== badgeId);
      }
      if (prev.length >= MAX_DISPLAYED) {
        showToast('info', 'ლიმიტი შევსებულია', `მაქსიმუმ ${MAX_DISPLAYED} ბეიჯი`);
        return prev;
      }
      return [...prev, badgeId];
    });
  };

  const moveBadge = (index: number, dir: -1 | 1) => {
    setDisplayed(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveBadges = async () => {
    if (savingBadges) return;
    try {
      setSavingBadges(true);
      const { error } = await supabase.rpc('set_displayed_badges', { p_badges: displayed });
      if (error) throw error;
      showToast('success', 'ბეიჯები შენახულია', 'ჩანს პროფილის ფონზე');
    } catch (err: any) {
      showToast('error', 'ვერ შეინახა', err.message);
    } finally {
      setSavingBadges(false);
    }
  };

  const current = getCover(selected);
  const shown = getBadgesByIds(displayed);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      <View style={[styles.header, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>უკან</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>პროფილის ფონი</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ---------- ფონები ---------- */}
          <Text style={[styles.sectionLabel, { color: theme.subText, marginTop: 24 }]}>აირჩიე ფონი</Text>
          <View style={styles.grid}>
            {COVERS.map((cover) => {
              const isActive = selected === cover.id;
              return (
                <TouchableOpacity
                  key={cover.id}
                  style={[styles.coverTile, { borderColor: isActive ? theme.accent : 'transparent' }]}
                  onPress={() => handleSelectCover(cover.id)}
                  activeOpacity={0.85}
                  disabled={saving}
                >
                  <LinearGradient
                    colors={cover.colors as any}
                    start={cover.start}
                    end={cover.end}
                    style={styles.coverGradient}
                  >
                    {isActive && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={15} color="#fff" />
                      </View>
                    )}
                  </LinearGradient>
                  <Text style={[styles.coverName, { color: isActive ? theme.accent : theme.subText }]} numberOfLines={1}>
                    {cover.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ---------- ბეიჯების რიგითობა ---------- */}
          {shown.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.subText, marginTop: 26 }]}>
                რიგითობა ({shown.length}/{MAX_DISPLAYED})
              </Text>
              <View style={[styles.orderCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                {shown.map((b, i) => (
                  <View key={b.id} style={[styles.orderRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <Text style={[styles.orderNum, { color: theme.subText }]}>{i + 1}</Text>
                    <Image source={b.image} style={styles.orderImg} resizeMode="contain" />
                    <Text style={[styles.orderName, { color: theme.text }]} numberOfLines={1}>{b.name}</Text>

                    <TouchableOpacity
                      style={[styles.arrowBtn, i === 0 && { opacity: 0.25 }]}
                      onPress={() => moveBadge(i, -1)}
                      disabled={i === 0}
                    >
                      <Ionicons name="chevron-up" size={18} color={theme.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.arrowBtn, i === shown.length - 1 && { opacity: 0.25 }]}
                      onPress={() => moveBadge(i, 1)}
                      disabled={i === shown.length - 1}
                    >
                      <Ionicons name="chevron-down" size={18} color={theme.accent} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ---------- მოპოვებული ბეიჯები ---------- */}
          <Text style={[styles.sectionLabel, { color: theme.subText, marginTop: 26 }]}>
            მოპოვებული ბეიჯები ({earnedBadges.length})
          </Text>

          {earnedBadges.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: theme.border }]}>
              <Ionicons name="trophy-outline" size={22} color={theme.subText} />
              <Text style={[styles.emptyText, { color: theme.subText }]}>
                ჯერ ბეიჯები არ გაქვს — შეასრულე საქმეები და მიიღებ
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.badgeGrid}>
                {earnedBadges.map((b) => {
                  const isOn = displayed.includes(b.id);
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.badgeTile,
                        { backgroundColor: theme.cardBg, borderColor: isOn ? theme.accent : theme.border }
                      ]}
                      onPress={() => toggleBadge(b.id)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={b.image}
                        style={[styles.badgeImg, !isOn && { opacity: 0.45 }]}
                        resizeMode="contain"
                      />
                      <Text
                        style={[styles.badgeName, { color: isOn ? theme.text : theme.subText }]}
                        numberOfLines={2}
                      >
                        {b.name}
                      </Text>

                      {isOn && (
                        <View style={styles.badgeCheck}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.accent }]}
                onPress={saveBadges}
                disabled={savingBadges}
              >
                {savingBadges
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveText}>ბეიჯების შენახვა</Text>}
              </TouchableOpacity>
            </>
          )}

          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={16} color={theme.subText} />
            <Text style={[styles.hintText, { color: theme.subText }]}>
              ფონზე მაქსიმუმ {MAX_DISPLAYED} ბეიჯი ჩანს. რიგითობა ისრებით იცვლება.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, borderBottomWidth: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backText: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  title: { fontSize: 20, fontWeight: '700' },

  scrollContent: { padding: 16, paddingBottom: 120 },
  sectionLabel: { fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  previewCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  previewCover: { height: 96, justifyContent: 'flex-end', paddingLeft: 16 },
previewBadges: { position: 'absolute', bottom: 4, right: 12, flexDirection: 'row', gap: 6, alignItems: 'center' },  previewBadgeImg: { width: 40, height: 40 },
  previewAvatar: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: '#5B42F5',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: -22,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
  },
  previewBody: { paddingTop: 30, paddingBottom: 16, paddingHorizontal: 16 },
  previewName: { fontSize: 16, fontWeight: '800' },
  previewSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  coverTile: { width: '31.5%', marginBottom: 14, borderRadius: 16, borderWidth: 2, padding: 2 },
  coverGradient: { width: '100%', height: 68, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  checkBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
  },
  coverName: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 6 },

  // რიგითობა
  orderCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 10 },
  orderNum: { fontSize: 13, fontWeight: '800', width: 16 },
  orderImg: { width: 34, height: 34 },
  orderName: { flex: 1, fontSize: 13, fontWeight: '600' },
  arrowBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  // ბეიჯების ბადე
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  badgeTile: {
    width: '31.5%', marginBottom: 12,
    borderRadius: 16, borderWidth: 1.5,
    paddingVertical: 12, paddingHorizontal: 6,
    alignItems: 'center', position: 'relative',
  },
  badgeImg: { width: 52, height: 52, marginBottom: 6 },
  badgeName: { fontSize: 10.5, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  badgeCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#5B42F5',
    justifyContent: 'center', alignItems: 'center',
  },

  emptyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 18, paddingHorizontal: 16,
    borderRadius: 14, borderWidth: 1, borderStyle: 'dashed',
  },
  emptyText: { fontSize: 12.5, fontWeight: '500', flex: 1, lineHeight: 18 },

  saveBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  hintBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 4 },
  hintText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 17 },
});