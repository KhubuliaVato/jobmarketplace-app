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

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  
  // 🚀 დაზღვეულია any-ით, რათა TypeScript-ის ტიპების კონფლიქტი გამოირიცხოს 100%-ით
  const t: any = translations[language as LanguageType] || translations.ka;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  const theme = {
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#222227' : '#f2f2f7',
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t.error_alert_title || 'შეცდომა', t.fill_all_fields_error || 'გთხოვთ შეავსოთ ყველა ველი');
      return;
    }

    try {
      setLoading(true);
      
      // 1. ვეძებთ იუზერებში
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password)
        .maybeSingle();

      if (userError) throw userError;

      if (userData) {
        setUserId(userData.id);
        setUserName(userData.name || userData.username);
        Alert.alert(t.success_title || 'წარმატება 🎉', `${t.welcome_user_msg || 'მოგესალმებით, '}${userData.name}!`);
        onSuccess();
        return;
      }

      // 2. ვეძებთ კომპანიებში
      let { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password)
        .maybeSingle();

      if (companyError) throw companyError;

      if (companyData) {
        // ================= ჩაშენდა მოდერაციის ჭკვიანი ბლოკი =================
        if (!companyData.is_verified_company) {
          Alert.alert(
            t.pending_account_title || 'ანგარიში მოლოდინშია ⏳',
            t.pending_account_sub || 'თქვენი კომპანიის პროფილი ჯერ არ არის აქტიური. გთხოვთ დაელოდოთ ადმინისტრაციის დასტურს მეილზე 24 საათის განმავლობაში.'
          );
          return;
        }

        setUserId(companyData.id);
        setUserName(companyData.company_name);
        Alert.alert(t.success_title || 'წარმატება 🎉', `${t.welcome_company_msg || 'მოგესალმებით, კომპანია '}${companyData.company_name}!`);
        onSuccess();
        return;
      }

      Alert.alert(t.auth_error_title || 'ავტორიზაციის შეცდომა ❌', t.auth_error_sub || 'მომხმარებელი ან კომპანია ამ მონაცემებით არ არსებობს');
    } catch (error: any) {
      Alert.alert(t.error_alert_title || 'შეცდომა ❌', error.message || (t.system_error_fallback || 'სისტემური ხარვეზი'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t.welcome_back || 'მოგესალმებით 👋'}</Text>
      <Text style={[styles.subtitle, { color: theme.subText }]}>{t.login_subtitle || 'შედით თქვენს IPove ანგარიშზე'}</Text>

      <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.username_label || 'მომხმარებლის სახელი (Username)'}</Text>
      <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
        <Ionicons name="person-outline" size={18} color={theme.subText} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={t.username_placeholder || "ჩაწერე იუზერნეიმი..."}
          placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
          value={username}
          onChangeText={setUsername}
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