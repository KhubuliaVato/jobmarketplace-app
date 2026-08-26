import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { THEME_PALETTES } from '../utils/bgThemes';

interface MyJobsViewProps {
  onBack: () => void;
  onEdit?: (jobId: string) => void;
  onOpenApplications?: () => void;
}

export default function MyJobsView({ onBack, onEdit, onOpenApplications }: MyJobsViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [views, setViews] = useState<Record<string, number>>({});
  const [tier, setTier] = useState<string | null>(null);
  const [promoModalId, setPromoModalId] = useState<string | null>(null);
  const [promoUsed, setPromoUsed] = useState(0);

  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    card: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
  };

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    supabase.rpc('my_tier').then(({ data }: any) => {
      setTier(typeof data === 'string' ? data : (data?.tier ?? null));
    });
    supabase.from('job_promotions').select('id', { count: 'exact', head: true })
      .gt('promoted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .then(({ count }: any) => setPromoUsed(count || 0));

    setLoading(true);
    try {
      const { data } = await supabase
        .from('jobs')
        .select('id, position_title, title, budget, location, created_at, is_urgent, report_count, type, status, image_url, hidden_reason, has_promotion')
        .eq('author_id', userId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });
      setJobs(data || []);

      const { data: vc } = await supabase.rpc('my_job_view_counts');
      const map: Record<string, number> = {};
      (vc || []).forEach((r: any) => { map[r.job_id] = Number(r.views); });
      setViews(map);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const remove = (id: string) => {
    Alert.alert('წაშლა', 'ნამდვილად გსურთ ამ განცხადების წაშლა?', [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა', style: 'destructive', onPress: async () => {
          setBusy(id);
          try {
            const { error } = await supabase.rpc('delete_my_job', { p_job_id: id });
            if (error) throw error;
            setJobs((prev) => prev.filter((j) => j.id !== id));
            setMsg('✅ განცხადება წაიშალა');
          } catch (e: any) {
            setMsg('❌ ' + e.message);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const bump = async (id: string) => {
    setBusy(id + '_bump');
    try {
      const { data, error } = await supabase.rpc('bump_job', { p_job_id: id });
      if (error) throw error;
      if (!data.ok) {
        setMsg(`❌ ლიმიტი ამოწურულია — ${data.limit} bump / 7 დღეში`);
        return;
      }
      setMsg(`✅ ვაკანსია აიწია! დარჩა: ${data.remaining}`);
      load();
    } catch (e: any) {
      setMsg('❌ ' + e.message);
    } finally {
      setBusy(null);
    }
  };

  const togglePromoteOff = async (id: string) => {
    setBusy(id + '_promo');
    try {
      await supabase.from('jobs').update({ has_promotion: false }).eq('id', id);
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, has_promotion: false } : j)));
      setMsg('✅ გამორჩეული სტატუსი მოხსნილია');
    } catch (e: any) {
      setMsg('❌ ' + e.message);
    } finally {
      setBusy(null);
    }
  };

  const doPromote = async (id: string) => {
    setPromoModalId(null);
    setBusy(id + '_promo');
    try {
      const { data, error } = await supabase.rpc('promote_job', { p_job_id: id });
      if (error) throw error;
      if (!data.ok) {
        setMsg(`❌ ლიმიტი ამოწურულია — ${data.limit}x / 7 დღეში`);
        return;
      }
      setPromoUsed((p) => p + 1);
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, has_promotion: true } : j)));
      setMsg(`✅ გამორჩეულია! დარჩა: ${data.remaining}`);
    } catch (e: any) {
      setMsg('❌ ' + e.message);
    } finally {
      setBusy(null);
    }
  };

  const promoteLimit = tier === 'pro' ? 3 : tier === 'premium' ? 2 : 1;
  const bumpLimit = tier === 'pro' ? 10 : tier === 'premium' ? 3 : 1;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color="#5B42F5" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.backButtonRow} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#5B42F5" />
          <Text style={styles.backButtonText}>პარამეტრებში დაბრუნება</Text>
        </TouchableOpacity>

        <Text style={[styles.pageTitle, { color: theme.text }]}>ჩემი განცხადებები</Text>

        {msg ? (
          <View style={[styles.msgBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{msg}</Text>
          </View>
        ) : null}

        {jobs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.card }]}>
              <Ionicons name="document-text-outline" size={30} color={theme.subText} />
            </View>
            <Text style={{ color: theme.subText, fontSize: 13.5 }}>ჯერ არცერთი განცხადება არ დაგიმატებია</Text>
          </View>
        ) : (
          jobs.map((j) => {
            const hidden = j.status === 'hidden';
            return (
              <View key={j.id} style={[styles.jobCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.jobTopRow}>
                  {j.image_url ? (
                    <Image source={{ uri: j.image_url }} style={styles.jobThumb} />
                  ) : (
                    <View style={[styles.jobThumb, { backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name={j.type === 'company' ? 'briefcase' : 'construct'} size={22} color="#fff" />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.jobTitle, { color: theme.text }]} numberOfLines={1}>{j.position_title || j.title}</Text>
                    <View style={styles.jobMetaRow}>
                      {j.budget ? <Text style={{ color: theme.subText, fontSize: 11.5 }}>{j.budget}</Text> : null}
                      {j.location ? <Text style={{ color: theme.subText, fontSize: 11.5 }}>📍 {j.location}</Text> : null}
                      <Text style={{ color: theme.subText, fontSize: 11.5 }}>
                        {j.created_at ? new Date(j.created_at).toLocaleDateString('ka-GE') : ''}
                      </Text>
                    </View>
                    <View style={styles.jobBadgeRow}>
                      <View style={styles.viewsPill}>
                        <Ionicons name="eye-outline" size={11} color={theme.subText} />
                        <Text style={{ color: theme.subText, fontSize: 11, marginLeft: 3 }}>{views[j.id] || 0}</Text>
                      </View>
                      {j.is_urgent && (
                        <View style={[styles.badgePill, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
                          <Text style={{ color: '#ff3b30', fontSize: 9.5, fontWeight: '800' }}>სასწრაფო</Text>
                        </View>
                      )}
                      {hidden && (
                        <View style={[styles.badgePill, { backgroundColor: 'rgba(245,166,35,0.12)' }]}>
                          <Text style={{ color: '#f5a623', fontSize: 9.5, fontWeight: '800' }}>დამალული</Text>
                        </View>
                      )}
                      {j.report_count > 0 && (
                        <View style={[styles.badgePill, { backgroundColor: theme.bg }]}>
                          <Text style={{ color: theme.subText, fontSize: 9.5, fontWeight: '700' }}>{j.report_count} საჩივარი</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                                <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
                  <TouchableOpacity style={styles.actionCol} onPress={() => onEdit?.(j.id)}>
                    <View style={[styles.actionIconCircle, { backgroundColor: theme.bg }]}>
                      <Ionicons name="create-outline" size={20} color={theme.text} />
                    </View>
                    <Text style={[styles.actionColLabel, { color: theme.subText }]}>რედაქტ.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionCol} onPress={() => remove(j.id)} disabled={busy === j.id}>
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                      {busy === j.id ? <ActivityIndicator size="small" color="#ff453a" /> : <Ionicons name="trash-outline" size={20} color="#ff453a" />}
                    </View>
                    <Text style={[styles.actionColLabel, { color: '#ff453a' }]}>წაშლა</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionCol}
                    onPress={() => (j.has_promotion ? togglePromoteOff(j.id) : setPromoModalId(j.id))}
                    disabled={busy === j.id + '_promo'}
                  >
                    <View style={[styles.actionIconCircle, { backgroundColor: j.has_promotion ? 'rgba(245,166,35,0.15)' : theme.bg }]}>
                      {busy === j.id + '_promo' ? (
                        <ActivityIndicator size="small" color="#f5a623" />
                      ) : (
                        <Ionicons name={j.has_promotion ? 'star' : 'star-outline'} size={20} color={j.has_promotion ? '#f5a623' : theme.subText} />
                      )}
                    </View>
                    <Text style={[styles.actionColLabel, { color: j.has_promotion ? '#f5a623' : theme.subText }]}>გამორჩ.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionCol} onPress={() => bump(j.id)} disabled={busy === j.id + '_bump'}>
                    <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(91,66,245,0.12)' }]}>
                      {busy === j.id + '_bump' ? <ActivityIndicator size="small" color="#5B42F5" /> : <Ionicons name="arrow-up" size={20} color="#5B42F5" />}
                    </View>
                    <Text style={[styles.actionColLabel, { color: '#5B42F5' }]}>ზემოთ</Text>
                  </TouchableOpacity>

                  {j.type === 'company' && onOpenApplications && (
                    <TouchableOpacity style={styles.actionCol} onPress={onOpenApplications}>
                      <View style={[styles.actionIconCircle, { backgroundColor: theme.bg }]}>
                        <Ionicons name="mail-outline" size={20} color={theme.text} />
                      </View>
                      <Text style={[styles.actionColLabel, { color: theme.subText }]}>CV-ები</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* გამორჩეულობის დადასტურების მოდალი */}
      <Modal visible={!!promoModalId} transparent animationType="fade" onRequestClose={() => setPromoModalId(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="star" size={26} color="#f5a623" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>გამორჩეულად დაყენება</Text>
            <Text style={{ color: theme.subText, fontSize: 12.5, textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
              განცხადება ყოველ მე-3 პოზიციაზე გამოჩნდება ფიდში ოქროსფერი ჩარჩოთი.
            </Text>

            <View style={[styles.modalStatsBox, { backgroundColor: theme.bg }]}>
              <View style={styles.modalStatRow}>
                <Text style={{ color: theme.subText, fontSize: 12.5 }}>კვირის ლიმიტი</Text>
                <Text style={{ color: theme.text, fontSize: 12.5, fontWeight: '700' }}>{promoteLimit}x</Text>
              </View>
              <View style={styles.modalStatRow}>
                <Text style={{ color: theme.subText, fontSize: 12.5 }}>გამოყენებული</Text>
                <Text style={{ color: theme.text, fontSize: 12.5, fontWeight: '700' }}>{promoUsed}x</Text>
              </View>
              <View style={[styles.modalStatRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginTop: 4 }]}>
                <Text style={{ color: theme.subText, fontSize: 12.5 }}>დარჩენილი</Text>
                <Text style={{ color: '#f5a623', fontSize: 12.5, fontWeight: '700' }}>{Math.max(0, promoteLimit - promoUsed)}x</Text>
              </View>
              <View style={styles.modalStatRow}>
                <Text style={{ color: theme.subText, fontSize: 12.5 }}>ხანგრძლივობა</Text>
                <Text style={{ color: theme.text, fontSize: 12.5, fontWeight: '700' }}>7 დღე</Text>
              </View>
            </View>

            <Text style={{ color: theme.subText, fontSize: 11, textAlign: 'center', marginBottom: 16 }}>
              გამოყენების შემდეგ გაუქმება შეუძლებელია
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1 }]} onPress={() => setPromoModalId(null)}>
                <Text style={{ color: theme.subText, fontWeight: '700', fontSize: 13 }}>გაუქმება</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#f5a623', opacity: promoUsed >= promoteLimit ? 0.5 : 1 }]}
                onPress={() => promoModalId && doPromote(promoModalId)}
                disabled={promoUsed >= promoteLimit}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                  {promoUsed >= promoteLimit ? 'ლიმიტი ამოწურულია' : 'დაყენება ✨'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 130 },
  backButtonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingVertical: 4 },
  backButtonText: { color: '#5B42F5', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800', marginBottom: 16 },

  msgBox: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14 },

  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },

  jobCard: { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 14 },
  jobTopRow: { flexDirection: 'row', gap: 13 },
  jobThumb: { width: 64, height: 64, borderRadius: 15 },
  jobTitle: { fontSize: 15.5, fontWeight: '800', marginBottom: 4 },
  jobMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 7 },
  jobBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' },
  viewsPill: { flexDirection: 'row', alignItems: 'center' },
  badgePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },

  actionsRow: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  actionCol: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  actionIconCircle: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionColLabel: { fontSize: 11.5, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: { width: '100%', padding: 22, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
  modalIconCircle: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(245,166,35,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16.5, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  modalStatsBox: { width: '100%', borderRadius: 14, padding: 14, marginBottom: 8 },
  modalStatRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  modalBtn: { flex: 1, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
});