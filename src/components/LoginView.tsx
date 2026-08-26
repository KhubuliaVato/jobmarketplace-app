import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა
interface LoginViewProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginView({ onSuccess, onSwitchToRegister }: LoginViewProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const setUserId = useAuthStore((state) => state.setUserId);
  const setUserName = useAuthStore((state) => state.setUserName);
  const setMustChangePassword = useAuthStore((state) => state.setMustChangePassword);
  const setUserRole = useAuthStore((state) => state.setUserRole);   // ✅ შიგნით
  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  
  // 🚀 დაზღვეულია any-ით, რათა TypeScript-ის ტიპების კონფლიქტი გამოირიცხოს 100%-ით
  const t: any = translations[language as LanguageType] || translations.ka;

  const [email, setEmail] = useState(''); // 🔧 username → email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  // პაროლის აღდგენა
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetStep, setResetStep] = useState<'phone' | 'code'>('phone');
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetSending, setResetSending] = useState(false);

  const sendResetOtp = async () => {
    if (!resetPhone.trim()) {
      Alert.alert(t.error_alert_title || 'შეცდომა', 'ჩაწერე ნომერი');
      return;
    }
    setResetSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone: resetPhone.trim(), purpose: 'reset' },
      });
      let msg = '';
      if (error) {
        try { const ctx = await error.context?.json(); msg = ctx?.error || 'კოდი ვერ გაიგზავნა'; } catch { msg = 'კოდი ვერ გაიგზავნა'; }
      } else if (data?.error) msg = data.error;
      if (msg) { Alert.alert(t.error_alert_title || 'შეცდომა', msg); return; }
      setResetStep('code');
    } finally {
      setResetSending(false);
    }
  };

  const confirmReset = async () => {
    if (!/^\d{6}$/.test(resetCode)) {
      Alert.alert(t.error_alert_title || 'შეცდომა', 'კოდი 6 ციფრისგან უნდა შედგებოდეს');
      return;
    }
    if (resetNewPass.length < 6) {
      Alert.alert(t.error_alert_title || 'შეცდომა', 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს');
      return;
    }
    setResetSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { phone: resetPhone.trim(), code: resetCode, newPassword: resetNewPass },
      });
      let msg = '';
      if (error) {
        try { const ctx = await error.context?.json(); msg = ctx?.error || 'ვერ განახლდა'; } catch { msg = 'ვერ განახლდა'; }
      } else if (data?.error) msg = data.error;
      if (msg) { Alert.alert(t.error_alert_title || 'შეცდომა', msg); return; }

      Alert.alert('მზადაა ✅', 'პაროლი განახლდა, ახლა შედი ახალი პაროლით');
      setMode('login');
      setResetStep('phone');
      setResetPhone(''); setResetCode(''); setResetNewPass('');
    } finally {
      setResetSending(false);
    }
  };

  const theme = {
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#222227' : '#f2f2f7',
  };
  const handleLogin = async () => {
    
    
    if (!email.trim() || !password.trim()) {
      Alert.alert(t.error_alert_title || 'შეცდომა', t.fill_all_fields_error || 'გთხოვთ შეავსოთ ყველა ველი');
      return;
    }
    

    try {
      setLoading(true);

      // Supabase Auth login — პაროლს ადარებს auth.users-ში (bcrypt)
            const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        const msg = /invalid login credentials/i.test(error.message)
          ? (t.auth_error_sub || 'ელ-ფოსტა ან პაროლი არასწორია')
          : error.message;
        Alert.alert(t.auth_error_title || 'ავტორიზაციის შეცდომა ❌', msg);
        return;
      }

      const authUserId = data.user?.id;
      if (!authUserId) {
        Alert.alert(t.auth_error_title || 'ავტორიზაციის შეცდომა ❌', t.auth_error_sub || 'შესვლა ვერ მოხერხდა');
        return;
      }

      // ბანის შემოწმება
      const { data: ban } = await supabase.rpc('check_ban_status', { p_user_id: authUserId });
      const banInfo = Array.isArray(ban) ? ban[0] : ban;
      if (banInfo?.banned) {
        await supabase.auth.signOut();
        const until = banInfo.until
          ? `\n\nვადა: ${new Date(banInfo.until).toLocaleDateString()}-მდე`
          : '\n\nბანი: სამუდამო';
        const by = banInfo.banned_by ? `\nდაბლოკა: ${banInfo.banned_by}` : '';
        Alert.alert(
          'თქვენი ანგარიში დაბლოკილია 🚫',
          `მიზეზი: ${banInfo.reason || 'წესების დარღვევა'}${by}${until}`
        );
        return;
      }


      // პროფილის სახელი public.users-იდან
      // ჯერ users-ში ვეძებთ (worker)
      const { data: profile } = await supabase
        .from('users')
        .select('name, username')
        .eq('id', authUserId)
        .maybeSingle();


      if (profile) {
        setUserId(authUserId);
        setUserName(profile.name || profile.username || '');
        setUserRole('worker');
        onSuccess();
        return;
      }

      // თუ არ არის — კომპანიაა
      const { data: company } = await supabase
        .from('companies')
        .select('company_name, must_change_password')
        .eq('id', authUserId)
        .maybeSingle();
    

      if (company) {
        setUserId(authUserId);
        setUserName(company.company_name || '');
        setUserRole('company');
        setMustChangePassword(company.must_change_password === true);
        onSuccess();
        return;
      }

      Alert.alert(t.auth_error_title || 'შეცდომა', 'პროფილი ვერ მოიძებნა');

    } catch (error: any) {
      Alert.alert(t.error_alert_title || 'შეცდომა ❌', error.message || (t.system_error_fallback || 'სისტემური ხარვეზი'));
    } finally {
      setLoading(false);
    }
  };

  // პაროლის აღდგენის ეკრანი
  if (mode === 'reset') {
    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>პაროლის აღდგენა 🔑</Text>

        {resetStep === 'phone' ? (
          <>
            <Text style={[styles.subtitle, { color: theme.subText }]}>ჩაწერე ნომერი, გამოგიგზავნით კოდს</Text>

            <Text style={[styles.inputLabel, { color: theme.subText }]}>მობილურის ნომერი</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <Ionicons name="call-outline" size={18} color={theme.subText} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="599XXXXXX"
                placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
                value={resetPhone}
                onChangeText={setResetPhone}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={sendResetOtp} disabled={resetSending}>
              {resetSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>კოდის გაგზავნა</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: theme.subText }]}>კოდი გაიგზავნა: {resetPhone}</Text>

            <Text style={[styles.inputLabel, { color: theme.subText }]}>SMS კოდი</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <Ionicons name="keypad-outline" size={18} color={theme.subText} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="6-ნიშნა კოდი"
                placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
                value={resetCode}
                onChangeText={setResetCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <Text style={[styles.inputLabel, { color: theme.subText }]}>ახალი პაროლი</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.subText} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="••••••••"
                placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
                value={resetNewPass}
                onChangeText={setResetNewPass}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={confirmReset} disabled={resetSending}>
              {resetSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>პაროლის განახლება</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchModeButton} onPress={sendResetOtp} disabled={resetSending}>
              <Text style={styles.switchModeAccent}>კოდის ხელახლა გაგზავნა</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.switchModeButton} onPress={() => { setMode('login'); setResetStep('phone'); }}>
          <Text style={[styles.switchModeText, { color: theme.subText }]}>უკან შესვლაზე</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t.welcome_back || 'მოგესალმებით 👋'}</Text>
      <Text style={[styles.subtitle, { color: theme.subText }]}>{t.login_subtitle || 'შედით თქვენს IPove ანგარიშზე'}</Text>

      <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.email_label || 'ელ-ფოსტა'}</Text>
      <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
        <Ionicons name="mail-outline" size={18} color={theme.subText} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={t.email_placeholder_ex || "example@gmail.com"}
          placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.password_label || 'პაროლი'}</Text>
      <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
        <Ionicons name="lock-closed-outline" size={18} color={theme.subText} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="••••••••"
          placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secureText}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setSecureText(!secureText)}>
          <Ionicons name={secureText ? "eye-off-outline" : "eye-outline"} size={18} color={theme.subText} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>{t.login_btn_text || 'სისტემაში შესვლა'}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.switchModeButton} onPress={() => setMode('reset')}>
        <Text style={styles.switchModeAccent}>{t.forgot_password || 'პაროლი დამავიწყდა?'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.switchModeButton} onPress={onSwitchToRegister}>
        <Text style={styles.switchModeText}>
          {t.no_account_text || 'არ გაქვთ ანგარიში? '}
          <Text style={styles.switchModeAccent}>{t.register_link_text || 'დარეგისტრირდით'}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, marginBottom: 24, textAlign: 'center' },
  inputLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginLeft: 4, letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, marginBottom: 16 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  loginButton: { backgroundColor: '#5B42F5', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  switchModeButton: { alignItems: 'center', marginTop: 16, paddingVertical: 4 },
  switchModeText: { fontSize: 13, fontWeight: '500' },
  switchModeAccent: { color: '#5B42F5', fontWeight: '700' }
});