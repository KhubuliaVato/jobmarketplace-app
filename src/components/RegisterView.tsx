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
  const TEST_OTP = '1234';
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = () => {
    if (regType === 'user') {
      if (!name.trim() || !username.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
        Alert.alert(t.error_alert_title || 'შეცდომა', t.fill_all_fields_req_error || 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert(t.error_alert_title || 'შეცდომა', t.pwd_mismatch_error || 'პაროლები არ ემთხვევა ერთმანეთს');
        return;
      }
      setRegStep('otp'); 
    } else {
      if (!name.trim() || !address.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        Alert.alert(t.error_alert_title || 'შეცდომა', t.fill_all_fields_req_error || 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert(t.error_alert_title || 'შეცდომა', t.pwd_mismatch_error || 'პაროლები არ ემთხვევა ერთმანეთს');
        return;
      }
      executeRegistration(); 
    }
  };

  const executeRegistration = async () => {
    try {
      setLoading(true);

      if (regType === 'user') {
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

        const { data, error } = await supabase
          .from('users')
          .insert([{
            name: name.trim(),
            username: username.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            password: password,
            rating: 5.0,
            total_earned: 0
          }])
          .select().single();

        if (error) throw error;
        
        // მომხმარებელი პირდაპირ შედის სისტემაში
        setUserId(data.id);
        setUserName(data.name || data.username);
        Alert.alert(t.register_success_title || 'გილოცავთ 🎉', t.register_success_msg || 'რეგისტრაცია წარმატებით დასრულდა!');
        onSuccess();

      } else {
        // ---------------- კომპანიის რეგისტრაცია ----------------
        const generatedUsername = name.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(1000 + Math.random() * 9000);

        const { error } = await supabase
          .from('companies')
          .insert([{
            company_name: name.trim(),
            address: address.trim(),
            username: generatedUsername,
            email: email.trim(),
            phone: phone.trim() || null,
            password: password,
            rating: 5.0,
            total_spent: 0,
            is_verified_company: false // რეგისტრირდება დადასტურების გარეშე (false)
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
  if (regStep === 'otp') {
    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t.confirm_number_title || 'დაადასტურეთ ნომერი 📱'}</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>{t.otp_sent_msg || 'კოდი გაიგზავნა მობილურზე: '}{phone}</Text>

        <View style={styles.testOtpBadge}>
          <Text style={styles.testOtpBadgeText}>{t.test_code_label || 'ტესტ კოდი: 1234'}</Text>
        </View>

        <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.sms_code_label || 'SMS კოდი'}</Text>
        <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Ionicons name="keypad-outline" size={18} color={theme.subText} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder={t.type_code_placeholder || "ჩაწერე კოდი..."}
            placeholderTextColor="#555"
            keyboardType="number-pad"
            maxLength={4}
            value={otpCode}
            onChangeText={setOtpCode}
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => otpCode === TEST_OTP ? executeRegistration() : Alert.alert(t.error_alert_title || 'შეცდომა', t.invalid_code_error || 'არასწორი კოდი')} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t.confirm_code_btn || 'კოდის დადასტურება'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => setRegStep('form')}>
          <Text style={[styles.cancelButtonText, { color: theme.subText }]}>{t.go_back_btn || 'უკან დაბრუნება'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ნაბიჯი 2: კომპანიის წარმატებული რეგისტრაციის საინფორმაციო ფანჯარა
  if (regStep === 'company_success') {
    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border, alignItems: 'center', paddingVertical: 32 }]}>
        <View style={styles.successIconCircle}>
          <Ionicons name="time-outline" size={36} color="#ff9500" />
        </View>
        
        <Text style={[styles.title, { color: theme.text, marginTop: 16 }]}>{t.request_sent_title || 'მოთხოვნა გაგზავნილია ⏳'}</Text>
        
        <View style={[styles.infoBox, { backgroundColor: theme.infoBg, borderColor: theme.infoBorder, marginTop: 16, marginHorizontal: 8 }]}>
          <Text style={[styles.infoText, { color: theme.infoText, textAlign: 'center', fontSize: 13, lineHeight: 20 }]}>
            {t.company_pending_info || 'ჩვენი ადმინისტრაცია გამოგიგზავნით დამატებით ინფორმაციას რაც გვჭირდება თქვენი აქაუნთის დასარეგისტრირებლად მეილზე 24 საათის განმავლობაში გთხოვთ იყავით ყურადღებით.'}
          </Text>
        </View>

        <TouchableOpacity style={[styles.primaryButton, { width: '100%', marginTop: 20 }]} onPress={onSwitchToLogin}>
          <Text style={styles.buttonText}>{t.back_to_auth_btn || 'ავტორიზაციაზე დაბრუნება'}</Text>
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
          <Text style={[styles.tabItemText, { color: theme.subText }, regType === 'user' && styles.tabItemTextActive]}>{t.user_tab || 'Mომხმარებელი'}</Text>
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

            <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.phone_optional_label || 'მობილური'}</Text>
            <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={t.phone_placeholder_mask || "599XXXXXX"} placeholderTextColor="#555" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          </>
        )}

        <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.password_required_label || 'პაროლი *'}</Text>
        <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry={true} value={password} onChangeText={setPassword} autoCapitalize="none" />

        <Text style={[styles.inputLabel, { color: theme.subText }]}>{t.confirm_password_required_label || 'გაიმეორეთ პაროლი *'}</Text>
        <TextInput style={[styles.regInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry={true} value={confirmPassword} onChangeText={setConfirmPassword} autoCapitalize="none" />

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