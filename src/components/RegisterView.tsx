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
import { LanguageType, translations } from '../utils/translations';

interface RegisterViewProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterView({ onSuccess, onSwitchToLogin }: RegisterViewProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const setUserId = useAuthStore((state) => state.setUserId);
  const setUserName = useAuthStore((state) => state.setUserName);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  
  // 🚀 გასწორდა: დაზღვეულია any-ით, რათა მკაცრმა TypeScript-მა აღარ იწუწუნოს სერჩის ფრაზებზე
  const t: any = translations[language as LanguageType] || translations.ka;

  const [regType, setRegType] = useState<'user' | 'company'>('user');
  
  // დაემატა 'company_success' ნაბიჯი საინფორმაციო ველისთვის
  const [regStep, setRegStep] = useState<'form' | 'otp' | 'company_success'>('form');

  // ფომის სთეითები
  const [name, setName] = useState(''); 
  const [username, setUsername] = useState(''); 
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  // OTP გაგზავნა Edge Function-ით
  const sendOtp = async () => {
    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone: phone.trim(), purpose: 'register' },
      });
      if (error) {
        // Edge Function-ის შეცდომის ტექსტის ამოღება
        let msg = 'კოდის გაგზავნა ვერ მოხერხდა';
        try {
          const ctx = await error.context?.json();
          if (ctx?.error) msg = ctx.error;
        } catch {}
        Alert.alert(t.error_alert_title || 'შეცდომა', msg);
        return false;
      }
      if (data?.error) {
        Alert.alert(t.error_alert_title || 'შეცდომა', data.error);
        return false;
      }
      return true;
    } catch (e: any) {
      Alert.alert(t.error_alert_title || 'შეცდომა', e.message);
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  const theme = {
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#222227' : '#f2f2f7',
    infoBg: isDarkMode ? '#251b18' : '#fff9f5',
    infoBorder: isDarkMode ? '#442a1e' : '#ffe1cc',
    infoText: isDarkMode ? '#ff9500' : '#b25e00'
  };

  const handleSubmit = async () => {
    if (regType === 'user') {
      if (!name.trim() || !username.trim() || !phone.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        Alert.alert(t.error_alert_title || 'შეცდომა', t.fill_all_fields_req_error || 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი');
        return;
      }
      // 🔧 email-ის ფორმატი (auth login-ისთვის სავალდებულოა)
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        Alert.alert(t.error_alert_title || 'შეცდომა', t.invalid_email_error || 'ელ-ფოსტა არასწორ ფორმატშია');
        return;
      }
      // 🔧 Supabase-ის მინიმალური პაროლი — 6 სიმბოლო
      if (password.length < 6) {
        Alert.alert(t.error_alert_title || 'შეცდომა', t.weak_password_error || 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert(t.error_alert_title || 'შეცდომა', t.pwd_mismatch_error || 'პაროლები არ ემთხვევა ერთმანეთს');
        return;
      }
      const sent = await sendOtp();
      if (sent) setRegStep('otp');
    } else {
      // 🔧 company: 4 ველი, პაროლის გარეშე
      if (!name.trim() || !address.trim() || !email.trim() || !phone.trim()) {
        Alert.alert(t.error_alert_title || 'შეცდომა', t.fill_all_fields_req_error || 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        Alert.alert(t.error_alert_title || 'შეცდომა', t.invalid_email_error || 'ელ-ფოსტა არასწორ ფორმატშია');
        return;
      }
      executeRegistration(); 
    }
  };

  // OTP-ის დადასტურება და შემდეგ რეგისტრაცია
  const verifyAndRegister = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      Alert.alert(t.error_alert_title || 'შეცდომა', t.invalid_code_error || 'კოდი 6 ციფრისგან უნდა შედგებოდეს');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone: phone.trim(), code: otpCode, purpose: 'register' },
      });

      let errMsg = '';
      if (error) {
        try {
          const ctx = await error.context?.json();
          errMsg = ctx?.error || 'კოდის შემოწმება ვერ მოხერხდა';
        } catch {
          errMsg = 'კოდის შემოწმება ვერ მოხერხდა';
        }
      } else if (data?.error) {
        errMsg = data.error;
      }

      if (errMsg) {
        Alert.alert(t.error_alert_title || 'შეცდომა', errMsg);
        setLoading(false);
        return;
      }

      // კოდი სწორია — ვქმნით ანგარიშს
      await executeRegistration();
    } catch (e: any) {
      Alert.alert(t.error_alert_title || 'შეცდომა', e.message);
      setLoading(false);
    }
  };
  
  const executeRegistration = async () => {
    try {
      setLoading(true);

      if (regType === 'user') {
        // 1. username-ის უნიკალურობა (email-ს თვითონ auth ამოწმებს)
        const { data: existingUser } = await supabase
          .from('users')
          .select('username')
          .eq('username', username.trim())
          .maybeSingle();

        if (existingUser) {
          Alert.alert(t.register_error_title || 'რეგისტრაციის შეცდომა ❌', t.username_taken_error || 'ეს მომხმარებლის სახელი (Username) უკვე დაკავებულია');
          setRegStep('form');
          return;
        }

        // 2. Supabase Auth რეგისტრაცია — პაროლი bcrypt-ით ინახება auth.users-ში.
        //    trigger ავტომატურად ქმნის public.users პროფილს metadata-დან.
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              name: name.trim(),
              username: username.trim(),
              role: 'worker',
              phone: (() => {
                const d = phone.trim().replace(/\D/g, '');
                return d.length === 9 ? '995' + d : d;
              })(),
            },
          },
        });

        if (error) {
          const msg = /already registered|already exists/i.test(error.message)
            ? (t.email_taken_error || 'ეს ელ-ფოსტა უკვე რეგისტრირებულია')
            : error.message;
          Alert.alert(t.register_error_title || 'რეგისტრაციის შეცდომა ❌', msg);
          setRegStep('form');
          return;
        }

        const newUserId = data.user?.id;
        if (!newUserId) {
          Alert.alert(t.register_error_title || 'რეგისტრაცია ❌', t.email_confirm_needed || 'სესია ვერ შეიქმნა — შეამოწმეთ Supabase-ის email-დადასტურების პარამეტრი.');
          return;
        }

        

        // 4. აპში შესვლა
        setUserId(newUserId);
        setUserName(name.trim());
        Alert.alert(t.register_success_title || 'გილოცავთ 🎉', t.register_success_msg || 'რეგისტრაცია წარმატებით დასრულდა!');
        onSuccess();

      } else {
        // ---------------- კომპანიის რეგისტრაცია = მოთხოვნა (ანგარიში ჯერ არ იქმნება) ----------------
        const { error } = await supabase
          .from('company_requests')
          .insert([{
            company_name: name.trim(),
            email: email.trim(),
            hr_phone: phone.trim(),
            address: address.trim(),
            status: 'pending'
          }]);

        if (error) throw error;
        
        // აქაუნთი იქმნება, მაგრამ სისტემაში შესვლის ნაცვლად ვუშვებთ საინფორმაციო სქრინზე
        setRegStep('company_success');
      }
    } catch (error: any) {
      Alert.alert(t.register_error_title || 'რეგისტრაციის შეცდომა ❌', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ნაბიჯი 1: მომხმარებლის OTP კოდის გვერდი
  // ნაბიჯი 1: მომხმარებლის OTP კოდის გვერდი
  if (regStep === 'otp') {
    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t.confirm_number_title || 'დაადასტურეთ ნომერი 📱'}</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>{t.otp_sent_msg || 'კოდი გაიგზავნა მობილურზე: '}{phone}</Text>

        <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.sms_code_label || 'SMS კოდი'}</Text>
        <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Ionicons name="keypad-outline" size={18} color={theme.subText} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder={t.type_code_placeholder || "ჩაწერე კოდი..."}
            placeholderTextColor="#555"
            keyboardType="number-pad"
            maxLength={6}
            value={otpCode}
            onChangeText={setOtpCode}
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={verifyAndRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t.confirm_code_btn || 'კოდის დადასტურება'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={sendOtp} disabled={otpSending}>
          <Text style={[styles.cancelButtonText, { color: '#5B42F5' }]}>
            {otpSending ? '...' : (t.resend_code_btn || 'კოდის ხელახლა გაგზავნა')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => setRegStep('form')}>
          <Text style={[styles.cancelButtonText, { color: theme.subText }]}>{t.go_back_btn || 'უკან დაბრუნება'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t.register_title || 'რეგისტრაცია ✨'}</Text>
      <Text style={[styles.subtitle, { color: theme.subText }]}>{t.register_subtitle || 'შექმენით ახალი ანგარიში აპლიკაციაში'}</Text>

      <View style={[styles.tabSelectorRow, { backgroundColor: theme.inputBg }]}>
        <TouchableOpacity style={[styles.tabItem, regType === 'user' && styles.tabItemActive]} onPress={() => setRegType('user')}>
          <Text style={[styles.tabItemText, { color: theme.subText }, regType === 'user' && styles.tabItemTextActive]}>{t.user_tab || 'მომხმარებელი'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, regType === 'company' && styles.tabItemActive]} onPress={() => setRegType('company')}>
          <Text style={[styles.tabItemText, { color: theme.subText }, regType === 'company' && styles.tabItemTextActive]}>{t.company_tab || 'კომპანია'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        {regType === 'user' ? (
          <>
            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.fullname_label || 'სახელი და გვარი *'}</Text>
            <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.fullname_placeholder || "ვახტანგ ხუბულია"} placeholderTextColor="#555" value={name} onChangeText={setName} />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.username_required_label || 'მომხმარებლის სახელი (Username) *'}</Text>
            <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.username_reg_placeholder || "vaho123"} placeholderTextColor="#555" value={username} onChangeText={setUsername} autoCapitalize="none" />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.phone_required_label || 'მობილურის ნომერი *'}</Text>
            <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.phone_placeholder_mask || "599XXXXXX"} placeholderTextColor="#555" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.email_optional_label || 'ელ-ფოსტა'}</Text>
            <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.email_placeholder_ex || "example@gmail.com"} placeholderTextColor="#555" keyboardType="email-address" value={email} onChangeText={setEmail} autoCapitalize="none" />
          </>
        ) : (
          <>
            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.company_name_label || 'კომპანიის სახელი *'}</Text>
            <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.company_name_placeholder || "შპს აიპოვე"} placeholderTextColor="#555" value={name} onChangeText={setName} />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.company_address_label || 'კომპანიის მისამართი *'}</Text>
            <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.company_address_placeholder || "თბილისი, ჭავჭავაძის გამზ. 15"} placeholderTextColor="#555" value={address} onChangeText={setAddress} />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.email_required_label || 'ელ-ფოსტა *'}</Text>
            <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.company_email_placeholder || "company@ipove.ge"} placeholderTextColor="#555" keyboardType="email-address" value={email} onChangeText={setEmail} autoCapitalize="none" />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.hr_phone_label || 'HR-ის ნომერი *'}</Text>
            <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.phone_placeholder_mask || "599XXXXXX"} placeholderTextColor="#555" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          </>
        )}

        {regType === 'user' && (
          <>
            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.password_required_label || 'პაროლი *'}</Text>
            <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry={true} value={password} onChangeText={setPassword} autoCapitalize="none" />

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.confirm_password_required_label || 'გაიმეორეთ პაროლი *'}</Text>
            <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry={true} value={confirmPassword} onChangeText={setConfirmPassword} autoCapitalize="none" />
          </>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{regType === 'user' ? (t.continue_btn || 'გაგრძელება') : (t.register_action_btn || 'რეგისტრაცია')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchModeButton} onPress={onSwitchToLogin}>
          <Text style={styles.switchModeText}>
            {t.already_have_account || 'უკვე გაქვთ აქაუნთი? '}
            <Text style={styles.switchModeAccent}>{t.login_link_text || 'შესვლა'}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 22, borderRadius: 24, borderWidth: 1 }, 
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 13, marginBottom: 20, textAlign: 'center' },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginLeft: 4, letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, marginBottom: 16 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, height: '100%' },
  regInput: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, marginBottom: 14 },
  primaryButton: { backgroundColor: '#5B42F5', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelButton: { alignItems: 'center', marginTop: 14, paddingVertical: 4 },
  cancelButtonText: { fontSize: 13, fontWeight: '500' },
  switchModeButton: { alignItems: 'center', marginTop: 16, paddingVertical: 4 },
  switchModeText: { fontSize: 13, fontWeight: '500' },
  switchModeAccent: { color: '#5B42F5', fontWeight: '700' },
  tabSelectorRow: { flexDirection: 'row', padding: 4, borderRadius: 12, marginBottom: 18 },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  tabItemActive: { backgroundColor: '#5B42F5' },
  tabItemText: { fontSize: 13, fontWeight: '600' },
  tabItemTextActive: { color: '#fff' },
  formContainer: { width: '100%' }, 
  infoBox: { flexDirection: 'row', borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 16, alignItems: 'flex-start' },
  infoIcon: { marginRight: 8, marginTop: 2 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  testOtpBadge: { backgroundColor: '#e6f7ed', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#b7ebc6' },
  testOtpBadgeText: { color: '#257942', fontSize: 13, fontWeight: '700' },
  successIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff9f5', borderWidth: 2, borderColor: '#ffe1cc', justifyContent: 'center', alignItems: 'center' }
});