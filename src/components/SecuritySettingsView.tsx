import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა

interface SecuritySettingsViewProps {
  onBack: () => void;
}

export default function SecuritySettingsView({ onBack }: SecuritySettingsViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const setUserId = useAuthStore((state) => state.setUserId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t = translations[language as LanguageType] || translations.ka;

  // 1. პაროლის შეცვლის სთეითები
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 2. ბიომეტრიის სთეითი
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // 3. აქტიური სესიების მართვა
  const [loadingSessions, setLoadingSessions] = useState(false);

  // 4. ექაუნთის წაშლის სთეითები
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [loadingDelete, setLoadingDelete] = useState(false);

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#222227' : '#f2f2f7',
    dangerBg: isDarkMode ? '#2c1616' : '#fff5f5',
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

    try {
      setLoadingPassword(true);
      setPasswordStatus(null);

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
    const targetWord = language === 'ka' ? 'წაშლა' : 'DELETE';
    if (deleteConfirmationText !== targetWord) return;

    try {
      setLoadingDelete(true);
      
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (dbError) throw dbError;

      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;

      setIsDeleteModalVisible(false);
      setUserId(null);
    } catch (error: any) {
      alert(error.message || 'ანგარიშის წაშლა ვერ მოხერხდა');
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* ჰედერი */}
      <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#5B42F5" />
          <Text style={styles.backButtonText}>{t.back_to_profile || 'უკან'}</Text>
        </TouchableOpacity>
        <Text style={[styles.mainTitle, { color: theme.text }]}>{t.security_header || 'უსაფრთხოება და პაროლი'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. პაროლის განახლების ბლოკი */}
        <Text style={[styles.sectionHeader, { color: theme.subText }]}>{t.change_pwd_title || 'პაროლის შეცვლა'}</Text>
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

        {/* 2. ბიომეტრიის ბლოკი */}
        <Text style={[styles.sectionHeader, { color: theme.subText }]}>Biometrics</Text>
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
          <View style={styles.sessionRow}>
            <Ionicons name="phone-portrait-outline" size={24} color="#5B42F5" style={styles.sessionIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sessionDevice, { color: theme.text }]}>iPhone 15 Pro (Mobile App)</Text>
              <Text style={{ color: '#34c759', fontSize: 11, fontWeight: '600' }}>• {t.current_device || 'ეს მოწყობილობა'}</Text>
            </View>
          </View>

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
              placeholder={language === 'ka' ? "დასადასტურებლად ჩაწერეთ: წაშლა" : "Type DELETE to confirm"}
              placeholderTextColor="#666"
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
                disabled={loadingDelete || (deleteConfirmationText !== (language === 'ka' ? 'წაშლა' : 'DELETE'))}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 14, borderBottomWidth: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', position: 'absolute', left: 16, paddingTop: 50, zIndex: 10 },
  backButtonText: { color: '#5B42F5', fontSize: 14, fontWeight: '600', marginLeft: 4 },
  mainTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 60 },
  sectionHeader: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 22, marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 2 },
  input: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, marginBottom: 16 },
  statusText: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  actionButton: { backgroundColor: '#5B42F5', height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  sessionRow: { flexDirection: 'row', alignItems: 'center' },
  sessionIcon: { marginRight: 12 },
  sessionDevice: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  outlineButton: { height: 40, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  outlineButtonText: { color: '#5B42F5', fontSize: 13, fontWeight: '600' },
  deleteButton: { backgroundColor: '#ff3b30', height: 42, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  divider: { height: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: { width: '100%', padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  modalButton: { flex: 1, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, // 🚀 აი ეს იყო აკლია
  warningIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  modalSubtitle: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 14, paddingHorizontal: 6 }
});