import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { THEME_PALETTES } from '../utils/bgThemes';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა

interface SecuritySettingsViewProps {
  onBack: () => void;
}

export default function SecuritySettingsView({ onBack }: SecuritySettingsViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const setUserId = useAuthStore((state) => state.setUserId);
  const setUserName = useAuthStore((state) => state.setUserName);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
const t: any = translations[language as LanguageType] || translations.ka;
  // 1. პაროლის შეცვლის სთეითები
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 2. ბიომეტრიის სთეითი
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // 2FA სთეითები
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaMsg, setMfaMsg] = useState('');

  // 3. აქტიური სესიების მართვა
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessMsg, setSessMsg] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // 4. ექაუნთის წაშლის სთეითები
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [loadingDelete, setLoadingDelete] = useState(false);

  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
    inputBg: isDarkMode ? 'rgba(0,0,0,0.22)' : '#f2f2f7',
    dangerBg: isDarkMode ? '#180408' : '#fff5f5',
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({ type: 'error', text: t.fill_all_pwd_fields || 'გთხოვთ შეავსოთ ყველა ველი' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: t.pwd_not_match || 'ახალი პაროლები არ ემთხვევა ერთმანეთს' });
      return;
    }

    // 🔧 პაროლის სიძლიერის შემოწმება — web-ის იდენტური წესები
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordStatus({ type: 'error', text: 'პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს, ერთ დიდ ასოს და ერთ ციფრს' });
      return;
    }

    try {
      setLoadingPassword(true);
      setPasswordStatus(null);

      // 🔧 1. ჯერ დავადასტუროთ ძველი პაროლი — მიმდინარე იუზერის email-ით ხელახლა შესვლა
      const { data: sessionData } = await supabase.auth.getUser();
      const email = sessionData.user?.email;

      if (!email) {
        setPasswordStatus({ type: 'error', text: t.pwd_session_error || 'სესია ვერ მოიძებნა, თავიდan შედით' });
        return;
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (verifyError) {
        setPasswordStatus({ type: 'error', text: t.curr_pwd_wrong || 'მიმდინარე პაროლი არასწორია' });
        return;
      }

      // 🔧 2. ძველი დადასტურდა — ვცვლით ახლით
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordStatus({ type: 'success', text: t.pwd_success || 'პაროლი წარმატებით განახლდა!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordStatus({ type: 'error', text: error.message || 'ოპერაცია ვერ შესრულდა' });
    } finally {
      setLoadingPassword(false);
    }
  };

  const loadMfaFactors = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setMfaFactors(data?.totp || []);
    } catch (e) {
      console.error('mfa listFactors error:', e);
    } finally {
      setMfaLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadMfaFactors();
  }, [userId]);

  const startMfaEnroll = async () => {
    setMfaMsg('');
    setMfaBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setMfaFactorId(data.id);
      setMfaSecret(data.totp.secret);
      setMfaEnrolling(true);
    } catch (e: any) {
      setMfaMsg('❌ ' + e.message);
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmMfaEnroll = async () => {
    if (!mfaFactorId) return;
    setMfaBusy(true);
    setMfaMsg('');
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (chErr) throw chErr;
      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (verErr) throw verErr;
      setMfaMsg('✅ ჩართულია');
      setMfaEnrolling(false);
      setMfaSecret(''); setMfaFactorId(''); setMfaCode('');
      loadMfaFactors();
    } catch (e: any) {
      setMfaMsg('❌ ' + e.message);
    } finally {
      setMfaBusy(false);
    }
  };

  const cancelMfaEnroll = async () => {
    if (mfaFactorId) {
      try { await supabase.auth.mfa.unenroll({ factorId: mfaFactorId }); } catch {}
    }
    setMfaEnrolling(false);
    setMfaSecret(''); setMfaFactorId(''); setMfaCode(''); setMfaMsg('');
  };

  const unenrollMfa = async (factorId: string) => {
    setMfaBusy(true);
    setMfaMsg('');
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setMfaMsg('გამორთულია');
      loadMfaFactors();
    } catch (e: any) {
      setMfaMsg('❌ ' + e.message);
    } finally {
      setMfaBusy(false);
    }
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase.rpc('get_my_sessions');
      if (error) throw error;
      setSessions(data || []);
    } catch (e) {
      console.error('sessions load error:', e);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadSessions();
  }, [userId]);

  const parseDevice = (ua: string) => {
    if (!ua) return { label: 'უცნობი მოწყობილობა', isMobile: false };
    const isMobile = /Mobile|Android|iPhone|okhttp|Expo/i.test(ua);
    let label = isMobile ? 'მობილური აპლიკაცია' : 'ბრაუზერი';
    if (/iPhone|iOS/i.test(ua)) label = 'iOS აპლიკაცია';
    else if (/Android/i.test(ua)) label = 'Android აპლიკაცია';
    return { label, isMobile };
  };

  const revokeSession = async (sessionId: string, isCurrent: boolean) => {
    setRevokingId(sessionId);
    setSessMsg('');
    try {
      const { error } = await supabase.rpc('revoke_my_session', { target_session_id: sessionId });
      if (error) throw error;
      if (isCurrent) {
        await supabase.auth.signOut();
        setUserId(null);
        setUserName(null);
        return;
      }
      setSessMsg('✅ სესია გაუქმებულია');
      loadSessions();
    } catch (e: any) {
      setSessMsg('❌ ' + e.message);
    } finally {
      setRevokingId(null);
    }
  };

  const handleSignOutAllDevices = async () => {
    try {
      setLoadingSessions(true);
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      alert(t.session_signout_success || 'სესიები წარმატებით დაიხურა');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleDeleteAccount = async () => {
  const targetWord = 'DELETE'; // 🔧 ორივე ენაზე ლათინური (კლავიატურის პრობლემის თავიდან ასაცილებლად)    if (deleteConfirmationText !== targetWord) return;

    try {
      setLoadingDelete(true);
      
      // 🔧 RPC — auth.users-იდანაც შლის (cascade-ით public.users-საც)
      const { error: rpcError } = await supabase.rpc('delete_own_account');
      if (rpcError) throw rpcError;

      await supabase.auth.signOut();

      setIsDeleteModalVisible(false);
      setUserId(null);
      setUserName(null);

    } catch (error: any) {
      alert(error.message || 'ანგარიშის წაშლა ვერ მოხერხდა');
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* უკან დაბრუნების პანელი */}
        <TouchableOpacity style={styles.backButtonRow} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#5B42F5" />
          <Text style={styles.backButtonText}>{t.back_to_profile || 'პროფილზე დაბრუნება'}</Text>
        </TouchableOpacity>

        {/* 1. პაროლის განახლების ბლოკი */}
        <Text style={[styles.sectionHeader, { color: theme.subText, marginTop: 0 }]}>{t.change_pwd_title || 'პაროლის შეცვლა'}</Text>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          
          <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.curr_pwd_label || 'მიმდინარე პაროლი'}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#666"
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />

          <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.new_pwd_label || 'ახალი პაროლი'}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#666"
            value={newPassword}
            onChangeText={setNewPassword}
          />

          {newPassword.length > 0 && (
            <View style={[styles.pwdChecklist, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
              {[
                { ok: newPassword.length >= 8, label: 'მინიმუმ 8 სიმბოლო' },
                { ok: /[A-Z]/.test(newPassword), label: 'ერთი დიდი ასო (A-Z)' },
                { ok: /[0-9]/.test(newPassword), label: 'ერთი ციფრი' },
              ].map((rule, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View style={[styles.pwdDot, { backgroundColor: rule.ok ? '#34c759' : theme.border }]}>
                    {rule.ok && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>
                  <Text style={{ color: rule.ok ? theme.text : theme.subText, fontSize: 12, marginLeft: 8 }}>{rule.label}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.confirm_pwd_label || 'გაიმეორეთ ახალი პაროლი'}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#666"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {passwordStatus && (
            <Text style={[styles.statusText, { color: passwordStatus.type === 'success' ? '#34c759' : '#ff3b30' }]}>
              {passwordStatus.text}
            </Text>
          )}

          <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword} disabled={loadingPassword}>
            {loadingPassword ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>{t.update_pwd_btn || 'პაროლის განახლება'}</Text>}
          </TouchableOpacity>
        </View>

        {/* 2FA სექცია */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeader, { color: theme.subText, marginTop: 0 }]}>ორეტაპიანი ავთენტიფიკაცია</Text>
          {mfaFactors.some((f: any) => f.status === 'verified') && (
            <View style={styles.enabledBadge}>
              <Text style={styles.enabledBadgeText}>ჩართულია</Text>
            </View>
          )}
        </View>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ color: theme.subText, fontSize: 12, lineHeight: 17, marginBottom: 14 }}>
            დაიცავი შენი ანგარიში authenticator აპლიკაციით (Google Authenticator, Authy და სხვ.) გენერირებული კოდით.
          </Text>

          {mfaMsg ? (
            <Text style={{ color: theme.text, fontSize: 12, textAlign: 'center', marginBottom: 12 }}>{mfaMsg}</Text>
          ) : null}

          {mfaLoading ? (
            <ActivityIndicator color="#5B42F5" size="small" />
          ) : mfaEnrolling ? (
            <View>
              {mfaSecret ? (
                <View style={{ marginBottom: 14, padding: 12, borderRadius: 10, backgroundColor: theme.inputBg }}>
                  <Text style={{ color: theme.subText, fontSize: 11, marginBottom: 4 }}>ხელით შეყვანისთვის კოდი:</Text>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700', letterSpacing: 1 }} selectable>{mfaSecret}</Text>
                </View>
              ) : null}
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, textAlign: 'center', letterSpacing: 4 }]}
                placeholder="000000"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                maxLength={6}
                value={mfaCode}
                onChangeText={(v) => setMfaCode(v.replace(/\D/g, ''))}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.modalButton, { borderColor: theme.border, borderWidth: 1, flex: 1 }]} onPress={cancelMfaEnroll} disabled={mfaBusy}>
                  <Text style={{ color: theme.subText, fontWeight: '600' }}>გაუქმება</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { flex: 1 }]} onPress={confirmMfaEnroll} disabled={mfaBusy || mfaCode.length !== 6}>
                  {mfaBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>დადასტურება</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : mfaFactors.some((f: any) => f.status === 'verified') ? (
            mfaFactors.filter((f: any) => f.status === 'verified').map((f: any) => (
              <View key={f.id} style={[styles.sessionRow, { justifyContent: 'space-between' }]}>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '500' }}>Authenticator App</Text>
                <TouchableOpacity onPress={() => unenrollMfa(f.id)} disabled={mfaBusy}>
                  <Text style={{ color: '#ff3b30', fontSize: 12, fontWeight: '600' }}>გამორთვა</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <TouchableOpacity style={styles.actionButton} onPress={startMfaEnroll} disabled={mfaBusy}>
              {mfaBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>ჩართე</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* 2. ბიომეტრიის ბლოკი */}
        <Text style={[styles.sectionHeader, { color: theme.subText }]}>ბიომეტრია</Text>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border, paddingVertical: 12 }]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t.biometrics_title || 'ბიომეტრიული ავტორიზაცია'}</Text>
              <Text style={{ color: theme.subText, fontSize: 11, marginTop: 2 }}>{t.biometrics_sub || 'სისტემაში სწრაფი შესვლა Face ID / Touch ID-ით'}</Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: '#c5befb' }}
              thumbColor={isBiometricEnabled ? '#5B42F5' : '#f4f3f4'}
              onValueChange={setIsBiometricEnabled}
              value={isBiometricEnabled}
            />
          </View>
        </View>

        {/* 3. აქტიური სესიების ბლოკი */}
        <Text style={[styles.sectionHeader, { color: theme.subText }]}>{t.active_sessions || 'აქტიური სესიები'}</Text>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {sessMsg ? (
            <Text style={{ color: theme.text, fontSize: 12, textAlign: 'center', marginBottom: 10 }}>{sessMsg}</Text>
          ) : null}

          {loadingSessions ? (
            <ActivityIndicator color="#5B42F5" size="small" />
          ) : sessions.length === 0 ? (
            <Text style={{ color: theme.subText, fontSize: 13 }}>სესიები ვერ მოიძებნა</Text>
          ) : (
            sessions.map((s: any, i: number) => {
              const device = parseDevice(s.user_agent);
              return (
                <View key={s.id}>
                  <View style={styles.sessionRow}>
                    <Ionicons name={device.isMobile ? 'phone-portrait-outline' : 'laptop-outline'} size={20} color={theme.subText} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.sessionDevice, { color: theme.text }]}>{device.label}</Text>
                        {s.is_current && (
                          <View style={[styles.enabledBadge, { marginLeft: 8 }]}>
                            <Text style={styles.enabledBadgeText}>მიმდინარე</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: theme.subText, fontSize: 11, marginTop: 2 }}>
                        ბოლო აქტივობა: {new Date(s.updated_at).toLocaleString('ka-GE')}{s.ip ? ` · ${s.ip}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => revokeSession(s.id, s.is_current)} disabled={revokingId === s.id}>
                      <Text style={{ color: '#ff3b30', fontSize: 12, fontWeight: '600' }}>
                        {revokingId === s.id ? '...' : (s.is_current ? 'გასვლა' : 'გაუქმება')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {i < sessions.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 12 }]} />}
                </View>
              );
            })
          )}

          <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 14 }]} />

          <TouchableOpacity style={[styles.outlineButton, { borderColor: theme.border }]} onPress={handleSignOutAllDevices} disabled={loadingSessions}>
            {loadingSessions ? <ActivityIndicator color="#5B42F5" size="small" /> : <Text style={styles.outlineButtonText}>{t.sign_out_all_btn || 'ყველა მოწყობილობიდან გამოსვლა'}</Text>}
          </TouchableOpacity>
        </View>

        {/* 4. ანგარიშის წაშლის საფრთხის ზონა */}
        <Text style={[styles.sectionHeader, { color: '#ff3b30' }]}>{t.delete_acc_title || 'საფრთხის ზონა'}</Text>
        <View style={[styles.card, { backgroundColor: theme.dangerBg, borderColor: '#ffb3b3', borderWidth: isDarkMode ? 0 : 1 }]}>
          <TouchableOpacity style={styles.deleteButton} onPress={() => setIsDeleteModalVisible(true)}>
            <Ionicons name="trash-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.deleteButtonText}>{t.delete_acc_btn || 'ანგარიშის სრული წაშლა'}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ანგარიშის წაშლის მოდალი */}
      <Modal animationType="fade" transparent={true} visible={isDeleteModalVisible} onRequestClose={() => setIsDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.warningIconCircle}>
              <Ionicons name="warning" size={26} color="#ff3b30" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.delete_acc_modal_title || 'ნამდვილად გსურთ ანგარიშის წაშლა?'}</Text>
            <Text style={[styles.modalSubtitle, { color: theme.subText }]}>
              {t.delete_acc_modal_sub || 'ეს პროცესი შეუქცევადია. თქვენი ყველა განცხადება, მიმოწერა და მონაცემი წაიშლება სამუდამოდ.'}
            </Text>

            <TextInput
              style={[styles.input, { width: '100%', textAlign: 'center', backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, marginTop: 10 }]}
              placeholder={t.delete_confirm_ph || "დასადასტურებლად ჩაწერეთ: DELETE"}              placeholderTextColor="#666"
              value={deleteConfirmationText}
              onChangeText={setDeleteConfirmationText}
              autoCapitalize="none"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, width: '100%' }}>
              <TouchableOpacity style={[styles.modalButton, { borderColor: theme.border, borderWidth: 1, flex: 1, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }]} onPress={() => { setIsDeleteModalVisible(false); setDeleteConfirmationText(''); }}>
                <Text style={{ color: theme.subText, fontWeight: '600' }}>{t.cancel || 'გაუქმება'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#ff3b30', flex: 1, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, (deleteConfirmationText !== (language === 'ka' ? 'წაშლა' : 'DELETE')) && { opacity: 0.4 }]} 
                onPress={handleDeleteAccount}
                disabled={loadingDelete || (deleteConfirmationText !== 'DELETE')}
              >
                {loadingDelete ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.delete_final_btn || 'წაშლა'}</Text>}
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
  backButtonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingVertical: 4 },
  backButtonText: { color: '#5B42F5', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 160 },

  sectionHeader: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 22, marginBottom: 10, marginLeft: 4 },

  card: {
    padding: 18, borderRadius: 22, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 3,
  },

  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 7, marginLeft: 2 },
  input: {
    height: 50, borderRadius: 13, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 15, fontSize: 14, marginBottom: 16, letterSpacing: 0.2,
  },
  statusText: { fontSize: 12.5, fontWeight: '600', textAlign: 'center', marginBottom: 12, lineHeight: 17 },

  actionButton: {
    backgroundColor: '#5B42F5', height: 48, borderRadius: 13, justifyContent: 'center', alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 14.5, fontWeight: '700' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 14.5, fontWeight: '700' },

  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  sessionIconCircle: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(91,66,245,0.12)',
    borderWidth: 1, borderColor: 'rgba(91,66,245,0.22)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  sessionDevice: { fontSize: 13.5, fontWeight: '700' },

  outlineButton: { height: 46, borderRadius: 13, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  outlineButtonText: { color: '#5B42F5', fontSize: 13, fontWeight: '700' },

  deleteButton: {
    backgroundColor: '#ff3b30', height: 48, borderRadius: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  deleteButtonText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  divider: { height: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: {
    width: '100%', padding: 22, borderRadius: 24, borderWidth: 1, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 10,
  },
  modalButton: { flex: 1, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  warningIconCircle: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: 'rgba(255,59,48,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 16.5, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  modalSubtitle: { fontSize: 12.5, textAlign: 'center', lineHeight: 18, marginBottom: 14, paddingHorizontal: 6 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  enabledBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(52,199,89,0.15)' },
  enabledBadgeText: { color: '#34c759', fontSize: 10.5, fontWeight: '700' },
  pwdChecklist: { padding: 13, borderRadius: 13, borderWidth: 1, marginBottom: 14 },
  pwdDot: { width: 17, height: 17, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
});