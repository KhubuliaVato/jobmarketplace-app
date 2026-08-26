import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';

type Section = 'reports' | 'bans' | 'jobs';

const REASON_LABEL: Record<string, string> = {
  spam: 'სპამი', scam: 'თაღლითობა', inappropriate: 'უხამსი',
  harassment: 'შეურაცხყოფა', other: 'სხვა',
};

interface Props {
  showToast: (type: any, title: string, message?: string) => void;
  onOpenProfile?: (userId: string) => void;
  onOpenJob?: (jobId: string) => void;

}

export default function AdminModerationTab({ showToast, onOpenProfile, onOpenJob }: Props) {
  const isDarkMode = useAuthStore((s) => s.isDarkMode);
  const [section, setSection] = useState<Section>('reports');

  const [reports, setReports] = useState<any[]>([]);
  const [banned, setBanned] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // ბანის ფორმა
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('');

  const theme = {
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#888' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    rowBg: isDarkMode ? '#1c1c22' : '#f7f7fa',
    inputBg: isDarkMode ? '#1c1c22' : '#f2f2f7',
  };

  const load = async () => {
    setLoading(true);
    try {
      if (section === 'reports') {
        const { data } = await supabase.rpc('admin_list_reports');
        setReports(data || []);
      } else if (section === 'bans') {
        const { data } = await supabase.rpc('admin_list_banned');
        setBanned(data || []);
      } else {
        const { data } = await supabase.rpc('admin_list_flagged_jobs');
        setJobs(data || []);
      }
    } catch (e: any) {
      showToast('error', 'შეცდომა', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [section]);

  const resolveReport = async (reportId: string, status: string) => {
    setBusy(reportId);
    try {
      const { error } = await supabase.rpc('admin_resolve_report', { p_report_id: reportId, p_status: status });
      if (error) throw error;
      showToast('success', 'საჩივარი დაიხურა');
      load();
    } catch (e: any) {
      showToast('error', 'შეცდომა', e.message);
    } finally {
      setBusy(null);
    }
  };

  const setJobStatus = async (jobId: string, status: string) => {
    setBusy(jobId);
    try {
      const { error } = await supabase.rpc('admin_set_job_status', { p_job_id: jobId, p_status: status });
      if (error) throw error;
      showToast('success', status === 'active' ? 'აღდგენილია' : status === 'deleted' ? 'წაშლილია' : 'დამალულია');
      load();
    } catch (e: any) {
      showToast('error', 'შეცდომა', e.message);
    } finally {
      setBusy(null);
    }
  };

  const doBan = async () => {
    if (!banTarget) return;
    if (!banReason.trim()) { showToast('error', 'შეავსე მიზეზი'); return; }
    setBusy(banTarget.id);
    try {
      const days = banDays.trim() ? parseInt(banDays.trim(), 10) : null;
      const { error } = await supabase.rpc('admin_ban_user', {
        p_user_id: banTarget.id, p_reason: banReason.trim(), p_days: days,
      });
      if (error) throw error;
      showToast('success', 'დაბანილია');
      setBanTarget(null); setBanReason(''); setBanDays('');
      if (section === 'bans') load();
    } catch (e: any) {
      showToast('error', 'შეცდომა', e.message);
    } finally {
      setBusy(null);
    }
  };

  const unban = async (userId: string) => {
    setBusy(userId);
    try {
      const { error } = await supabase.rpc('admin_unban_user', { p_user_id: userId });
      if (error) throw error;
      showToast('success', 'ბანი მოიხსნა');
      load();
    } catch (e: any) {
      showToast('error', 'შეცდომა', e.message);
    } finally {
      setBusy(null);
    }
  };

  const SectionBtn = ({ id, label, icon }: { id: Section; label: string; icon: string }) => (
    <TouchableOpacity
      style={[styles.segBtn, section === id && { backgroundColor: '#5B42F5' }]}
      onPress={() => setSection(id)}
    >
      <Ionicons name={icon as any} size={15} color={section === id ? '#fff' : theme.subText} />
      <Text style={[styles.segText, { color: section === id ? '#fff' : theme.subText }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.segRow, { backgroundColor: theme.rowBg }]}>
        <SectionBtn id="reports" label="საჩივრები" icon="flag" />
        <SectionBtn id="jobs" label="განცხადებები" icon="briefcase" />
        <SectionBtn id="bans" label="ბანები" icon="ban" />
      </View>

      {loading ? (
        <ActivityIndicator color="#5B42F5" style={{ marginTop: 30 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ===== საჩივრები ===== */}
          {section === 'reports' && (
            reports.length === 0 ? (
              <Text style={[styles.empty, { color: theme.subText }]}>ახალი საჩივრები არ არის 🎉</Text>
            ) : reports.map((r) => (
              <View key={r.report_id} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.tag, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
                    <Text style={[styles.tagText, { color: '#ff3b30' }]}>{REASON_LABEL[r.reason] || r.reason}</Text>
                  </View>
                  <Text style={[styles.metaSmall, { color: theme.subText }]}>
                    {r.target_type === 'job' ? 'განცხადება' : r.target_type === 'user' ? 'პროფილი' : 'მესიჯი'} · {r.total_reports}x საჩივარი
                  </Text>
                </View>

                {r.comment ? <Text style={[styles.comment, { color: theme.text }]}>„{r.comment}"</Text> : null}

                {/* რეპორტის ავტორი — პროფილზე გადასვლა */}
                <TouchableOpacity
                  style={styles.reporterRow}
                  onPress={() => r.reporter_id && onOpenProfile?.(r.reporter_id)}                >
                  <Ionicons name="person-circle-outline" size={16} color={theme.subText} />
                  <Text style={[styles.metaSmall, { color: theme.subText }]}>ავტორი: </Text>
                  <Text style={[styles.linkText]}>{r.reporter_name}</Text>
                </TouchableOpacity>

                {/* დარეპორტებულ ობიექტზე გადასვლა */}
                {r.target_type === 'user' && (
                  <TouchableOpacity style={styles.linkRow} onPress={() => onOpenProfile?.(r.target_id)}>
                    <Ionicons name="open-outline" size={15} color="#5B42F5" />
                    <Text style={styles.linkText}>დარეპორტებული პროფილის ნახვა</Text>
                  </TouchableOpacity>
                )}
                {r.target_type === 'job' && (
                  <TouchableOpacity style={styles.linkRow} onPress={() => onOpenJob?.(r.target_id)}>
                    <Ionicons name="open-outline" size={15} color="#5B42F5" />
                    <Text style={styles.linkText}>განცხადების ნახვა</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.divider} />

                {/* ქმედებები */}
                <View style={styles.actionRow}>
                  {r.target_type === 'job' && (
                    <TouchableOpacity
                      style={[styles.actBtn, { backgroundColor: '#ff9500' }]}
                      onPress={() => setJobStatus(r.target_id, 'hidden')}
                      disabled={busy === r.report_id}
                    >
                      <Ionicons name="eye-off" size={14} color="#fff" />
                      <Text style={styles.actText}>დამალვა</Text>
                    </TouchableOpacity>
                  )}
                  {r.target_type === 'user' && (
                    <TouchableOpacity
                      style={[styles.actBtn, { backgroundColor: '#ff3b30' }]}
                      onPress={() => setBanTarget({ id: r.target_id, name: 'მომხმარებელი' })}
                      disabled={busy === r.report_id}
                    >
                      <Ionicons name="ban" size={14} color="#fff" />
                      <Text style={styles.actText}>დაბანვა</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actBtn, { backgroundColor: theme.rowBg }]}
                    onPress={() => resolveReport(r.report_id, 'dismissed')}
                    disabled={busy === r.report_id}
                  >
                    <Text style={[styles.actText, { color: theme.subText }]}>დახურვა</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* ===== დამალული/წაშლილი განცხადებები ===== */}
          {section === 'jobs' && (
            jobs.length === 0 ? (
              <Text style={[styles.empty, { color: theme.subText }]}>დამალული განცხადება არ არის</Text>
            ) : jobs.map((j) => (
              <View key={j.id} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Text style={[styles.jobTitle, { color: theme.text }]} numberOfLines={1}>{j.title}</Text>
                <TouchableOpacity onPress={() => j.author_id && onOpenProfile?.(j.author_id)}>
                  <Text style={[styles.linkText, { marginTop: 2 }]}>{j.author_name}</Text>
                </TouchableOpacity>
                <Text style={[styles.metaSmall, { color: theme.subText, marginTop: 4 }]}>
                  სტატუსი: {j.status} · {j.report_count} საჩივარი
                  {j.hidden_reason === 'auto_reports' ? ' · ავტომატურად დამალული' : ''}
                </Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actBtn, { backgroundColor: 'rgba(52,199,89,0.15)' }]}
                    onPress={() => setJobStatus(j.id, 'active')}
                    disabled={busy === j.id}
                  >
                    <Ionicons name="refresh" size={14} color="#34c759" />
                    <Text style={[styles.actText, { color: '#34c759' }]}>აღდგენა</Text>
                  </TouchableOpacity>
                  {j.status !== 'deleted' && (
                    <TouchableOpacity
                      style={[styles.actBtn, { backgroundColor: '#ff3b30' }]}
                      onPress={() => setJobStatus(j.id, 'deleted')}
                      disabled={busy === j.id}
                    >
                      <Ionicons name="trash" size={14} color="#fff" />
                      <Text style={styles.actText}>წაშლა</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}

          {/* ===== ბანები ===== */}
          {section === 'bans' && (
            banned.length === 0 ? (
              <Text style={[styles.empty, { color: theme.subText }]}>დაბანილი მომხმარებელი არ არის</Text>
            ) : banned.map((b) => (
              <View key={b.id} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <TouchableOpacity onPress={() => onOpenProfile?.(b.id)}>
                  <Text style={[styles.jobTitle, { color: '#5B42F5' }]}>{b.name || b.username}</Text>
                </TouchableOpacity>
                <Text style={[styles.metaSmall, { color: theme.subText, marginTop: 4 }]}>მიზეზი: {b.ban_reason || '—'}</Text>
                <Text style={[styles.metaSmall, { color: theme.subText }]}>
                  ბანი დადო: {b.banned_by || '—'} · {b.banned_until ? `${new Date(b.banned_until).toLocaleDateString()}-მდე` : 'სამუდამოდ'}
                </Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actBtn, { backgroundColor: 'rgba(52,199,89,0.15)' }]}
                    onPress={() => unban(b.id)}
                    disabled={busy === b.id}
                  >
                    <Ionicons name="lock-open" size={14} color="#34c759" />
                    <Text style={[styles.actText, { color: '#34c759' }]}>ბანის მოხსნა</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ბანის ფორმა */}
      {banTarget && (
        <View style={styles.banOverlay}>
          <View style={[styles.banForm, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[styles.banTitle, { color: theme.text }]}>მომხმარებლის დაბანვა</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="ბანის მიზეზი (დაინახავს მომხმარებელი)" placeholderTextColor={theme.subText}
              value={banReason} onChangeText={setBanReason} multiline
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, height: 44 }]}
              placeholder="დღეების რაოდენობა (ცარიელი = სამუდამოდ)" placeholderTextColor={theme.subText}
              value={banDays} onChangeText={setBanDays} keyboardType="number-pad"
            />
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actBtn, { backgroundColor: theme.rowBg, flex: 1, justifyContent: 'center' }]} onPress={() => { setBanTarget(null); setBanReason(''); setBanDays(''); }}>
                <Text style={[styles.actText, { color: theme.subText }]}>გაუქმება</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#ff3b30', flex: 1, justifyContent: 'center' }]} onPress={doBan} disabled={busy === banTarget.id}>
                {busy === banTarget.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actText}>დაბანვა</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  segRow: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4, marginBottom: 14 },
  segBtn: { flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  segText: { fontSize: 12.5, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, fontWeight: '500' },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: '700' },
  metaSmall: { fontSize: 11.5, fontWeight: '500' },
  comment: { fontSize: 13.5, marginTop: 8, lineHeight: 19, fontStyle: 'italic' },
  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  linkText: { fontSize: 12.5, fontWeight: '700', color: '#5B42F5' },
  divider: { height: 1, backgroundColor: 'rgba(127,127,127,0.15)', marginTop: 12 },
  jobTitle: { fontSize: 15, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 },
  actText: { fontSize: 12.5, fontWeight: '700', color: '#fff' },
  banOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 8 },
  banForm: { borderRadius: 18, borderWidth: 1, padding: 18 },
  banTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
  input: { minHeight: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingTop: 12, fontSize: 14, marginBottom: 10, textAlignVertical: 'top' },
});