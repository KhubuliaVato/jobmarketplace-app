import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import EmptyState from './EmptyState';
import Toast, { ToastType } from './Toast';


interface Props {
  onBack?: () => void;
  onOpenChat?: (chatId: string) => void;
}

export default function ApplicationsInboxView({ onBack, onOpenChat }: Props) {
  const userId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  const [loading, setLoading] = useState(true);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [openedJob, setOpenedJob] = useState<any>(null);

  const [apps, setApps] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);   // applicant_id-ები

  const [existingChat, setExistingChat] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [openingCv, setOpeningCv] = useState<string | null>(null);

  const [toast, setToast] = useState<{ visible: boolean; type: ToastType; title: string; message?: string }>({
    visible: false, type: 'success', title: '',
  });
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToast({ visible: true, type, title, message });
  };

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    chipBg: isDarkMode ? '#1c1c22' : '#f2f2f7',
    accent: '#5B42F5',
    green: '#30d158',
    red: '#ff453a',
  };

  useEffect(() => {
    loadVacancies();
  }, [userId]);

  // ---------- ვაკანსიები + განაცხადების რაოდენობა ----------
  const loadVacancies = async () => {
    if (!userId) { setLoading(false); return; }
    try {
      setLoading(true);

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, position_title, image_url, created_at')
        .eq('author_id', userId)
        .eq('type', 'company')
        .order('created_at', { ascending: false });

      const { data: allApps } = await supabase
        .from('job_applications')
        .select('job_id')
        .eq('company_id', userId);

      const counts: any = {};
      (allApps || []).forEach((a: any) => {
        counts[a.job_id] = (counts[a.job_id] || 0) + 1;
      });

      setVacancies((jobs || []).map((j: any) => ({ ...j, appCount: counts[j.id] || 0 })));
    } catch (err: any) {
      showToast('error', 'ჩატვირთვა ვერ მოხერხდა', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------- კონკრეტული ვაკანსიის CV-ები ----------
  const openVacancy = async (job: any) => {
    setOpenedJob(job);
    setPicked([]);
    setLoadingApps(true);

    try {
      const { data } = await supabase
        .from('job_applications')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false });

      setApps(data || []);

      // არსებობს უკვე ჩატი?
      const { data: chat } = await supabase
        .from('vacancy_chats')
        .select('id, status')
        .eq('job_id', job.id)
        .maybeSingle();

      setExistingChat(chat || null);

      // უკვე ჩატში მყოფები მონიშნული იყოს
      if (chat) {
        const { data: members } = await supabase
          .from('vacancy_chat_members')
          .select('user_id')
          .eq('chat_id', chat.id);
        setPicked((members || []).map((m: any) => m.user_id));
      }
    } catch (err: any) {
      showToast('error', 'ვერ ჩაიტვირთა', err.message);
    } finally {
      setLoadingApps(false);
    }
  };

  const toggle = (applicantId: string) => {
    setPicked(prev =>
      prev.includes(applicantId)
        ? prev.filter(id => id !== applicantId)
        : [...prev, applicantId]
    );
  };

  // ---------- CV-ის გახსნა ----------
  const openCv = async (app: any) => {
    if (!app.resume_url) {
      showToast('error', 'CV არ არის', '');
      return;
    }
    try {
      setOpeningCv(app.id);
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(app.resume_url, 60 * 60);

      if (error || !data?.signedUrl) throw error || new Error('ბმული ვერ შეიქმნა');
      await Linking.openURL(data.signedUrl);

      if (app.status === 'pending') {
        await supabase.from('job_applications').update({ status: 'viewed' }).eq('id', app.id);
        setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'viewed' } : a));
      }
    } catch (err: any) {
      showToast('error', 'CV ვერ გაიხსნა', err.message);
    } finally {
      setOpeningCv(null);
    }
  };

  // ---------- ჩატის შექმნა / განახლება ----------
  const createChat = async () => {
    if (picked.length === 0) {
      showToast('error', 'არავინ არჩეული', 'მონიშნე მინიმუმ ერთი კანდიდატი');
      return;
    }

    try {
      setCreating(true);

      const { data: sess } = await supabase.auth.getSession();
      const authUid = sess?.session?.user?.id;
      if (!authUid) throw new Error('სესია არ არის აქტიური — გაიარე ხელახლა ავტორიზაცია');


      let chatId = existingChat?.id;
      


      // ჩატი არ არსებობს — შევქმნათ
      if (!chatId) {
        const { data, error } = await supabase
          .rpc('create_vacancy_chat', { p_job_id: openedJob.id });
        if (error) throw error;
        chatId = data;
      }
      // მონაწილეების დამატება
      const rows = picked.map(uid => ({ chat_id: chatId, user_id: uid }));
      const { error: mErr } = await supabase
        .from('vacancy_chat_members')
        .upsert(rows, { onConflict: 'chat_id,user_id', ignoreDuplicates: true });
      if (mErr) throw mErr;

      // სტატუსი — accepted
      await supabase
        .from('job_applications')
        .update({ status: 'accepted' })
        .eq('job_id', openedJob.id)
        .in('applicant_id', picked);

      setApps(prev => prev.map(a =>
        picked.includes(a.applicant_id) ? { ...a, status: 'accepted' } : a
      ));

      showToast('success', 'ჩატი გახსნილია', `${picked.length} კანდიდატი დაემატა`);

      if (onOpenChat && chatId) {
        setTimeout(() => onOpenChat(chatId), 700);
      }
    } catch (err: any) {
      showToast('error', 'ვერ მოხერხდა', err.message);
    } finally {
      setCreating(false);
    }
  };

  const statusInfo = (s: string) => {
    switch (s) {
      case 'accepted': return { label: 'არჩეული', color: theme.green };
      case 'rejected': return { label: 'უარყოფილი', color: theme.red };
      case 'viewed':   return { label: 'ნანახი', color: theme.accent };
      default:         return { label: 'ახალი', color: '#ff9500' };
    }
  };

  // ================= რენდერი =================
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      {/* ---------- ვაკანსიების სია ---------- */}
      {!openedJob ? (
        loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 50 }} />
        ) : vacancies.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title="ვაკანსია არ გაქვს"
            subtitle="გამოაქვეყნე ვაკანსია, რომ კანდიდატებმა CV გამოგიგზავნონ"
          />
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {onBack && (
              <TouchableOpacity style={styles.topBack} onPress={onBack}>
                <Ionicons name="arrow-back" size={22} color={theme.accent} />
                <Text style={[styles.backText, { color: theme.accent }]}>უკან</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.pageTitle, { color: theme.text }]}>შემოსული CV-ები</Text>

            {vacancies.map(v => (
              <TouchableOpacity
                key={v.id}
                style={[styles.vacRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                onPress={() => openVacancy(v)}
                activeOpacity={0.85}
              >
                <View style={[styles.vacIcon, { backgroundColor: 'rgba(91,66,245,0.12)' }]}>
                  <Ionicons name="briefcase" size={19} color={theme.accent} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.vacTitle, { color: theme.text }]} numberOfLines={1}>
                    {v.position_title || v.title}
                  </Text>
                  <Text style={[styles.vacSub, { color: theme.subText }]}>
                    {v.appCount} განაცხადი
                  </Text>
                </View>

                {v.appCount > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.countText}>{v.appCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={theme.subText} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )
      ) : (
        /* ---------- კონკრეტული ვაკანსიის CV-ები ---------- */
        <>
          <View style={[styles.header, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => { setOpenedJob(null); setApps([]); setPicked([]); setExistingChat(null); }}
            >
              <Ionicons name="arrow-back" size={22} color={theme.accent} />
              <Text style={[styles.backText, { color: theme.accent }]}>უკან</Text>
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {openedJob.position_title || openedJob.title}
            </Text>
            <Text style={[styles.headerSub, { color: theme.subText }]}>
              {apps.length} განაცხადი
              {existingChat ? ' • ჩატი გახსნილია' : ''}
            </Text>
          </View>

          {loadingApps ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
          ) : apps.length === 0 ? (
            <EmptyState
              icon="mail-outline"
              title="ჯერ CV არ მოსულა"
              subtitle="ამ ვაკანსიაზე გამოგზავნილი რეზიუმეები აქ გამოჩნდება"
            />
          ) : (
            <>
              <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.hint, { color: theme.subText }]}>
                  მონიშნე ვისთანაც გინდა ჩატის გახსნა
                </Text>

                {apps.map(app => {
                  const isPicked = picked.includes(app.applicant_id);
                  const st = statusInfo(app.status);

                  return (
                    <TouchableOpacity
                      key={app.id}
                      style={[
                        styles.appCard,
                        { backgroundColor: theme.cardBg, borderColor: isPicked ? theme.accent : theme.border }
                      ]}
                      onPress={() => toggle(app.applicant_id)}
                      activeOpacity={0.85}
                    >
                      {/* ჩექბოქსი */}
                      <View style={[
                        styles.checkbox,
                        {
                          backgroundColor: isPicked ? theme.accent : 'transparent',
                          borderColor: isPicked ? theme.accent : theme.border
                        }
                      ]}>
                        {isPicked && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.appName, { color: theme.text }]} numberOfLines={1}>
                          {app.applicant_name || 'უცნობი'}
                        </Text>
                        <View style={styles.appMeta}>
                          <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                          <Text style={[styles.appStatus, { color: st.color }]}>{st.label}</Text>
                          {app.resume_name ? (
                            <Text style={[styles.appFile, { color: theme.subText }]} numberOfLines={1}>
                              • {app.resume_name}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {/* CV */}
                      <TouchableOpacity
                        style={[styles.cvBtn, { backgroundColor: theme.chipBg }]}
                        onPress={() => openCv(app)}
                        disabled={openingCv === app.id}
                      >
                        {openingCv === app.id
                          ? <ActivityIndicator size="small" color={theme.accent} />
                          : <Ionicons name="document-text" size={17} color={theme.accent} />}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* ქვედა ღილაკი */}
              <View style={[styles.bottomBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={[
                    styles.chatBtn,
                    { backgroundColor: picked.length > 0 ? theme.accent : theme.chipBg }
                  ]}
                  onPress={createChat}
                  disabled={creating || picked.length === 0}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="chatbubbles"
                        size={18}
                        color={picked.length > 0 ? '#fff' : theme.subText}
                      />
                      <Text style={[
                        styles.chatBtnText,
                        { color: picked.length > 0 ? '#fff' : theme.subText }
                      ]}>
                        {existingChat ? 'ჩატის განახლება' : 'ჩატის გახსნა'}
                        {picked.length > 0 ? ` (${picked.length})` : ''}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 50, paddingBottom: 40 },
  topBack: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  pageTitle: { fontSize: 21, fontWeight: '800', marginBottom: 16 },
  hint: { fontSize: 12.5, fontWeight: '600', marginBottom: 12 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  emptyText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  // ვაკანსიის რიგი
  vacRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  vacIcon: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  vacTitle: { fontSize: 15, fontWeight: '700' },
  vacSub: { fontSize: 12.5, fontWeight: '500', marginTop: 2 },
  countBadge: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, justifyContent: 'center', alignItems: 'center' },
  countText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // ჰედერი
  header: { paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  backText: { fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 12.5, fontWeight: '500', marginTop: 3 },

  // განაცხადი
  appCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  appName: { fontSize: 14.5, fontWeight: '700' },
  appMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  appStatus: { fontSize: 11.5, fontWeight: '700' },
  appFile: { fontSize: 11.5, fontWeight: '500', flex: 1 },
  cvBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

bottomBar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 90, borderTopWidth: 1 },  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14 },
  chatBtnText: { fontSize: 15, fontWeight: '700' },
});