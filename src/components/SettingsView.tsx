import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase'; // 🚀 შემოტანილია სუპაბეისი პროფილის ფოტოს წამოსაღებად
import { useAuthStore } from '../store/useAuthStore';
import { BG_THEMES, isThemeLocked, THEME_PALETTES } from '../utils/bgThemes';
import { LanguageType, translations } from '../utils/translations';

interface SettingsViewProps {
  onEditProfile: () => void;
  onNavigateToSecurity: () => void;
  onNavigateToFAQ: () => void;
  onNavigateToLegal: (tab: 'terms' | 'privacy') => void;
  onNavigateToAdmin: () => void;
  onNavigateToCover: () => void;// 🔧
  onNavigateToPremium: () => void;
  onNavigateToStats: () => void;
  onNavigateToMyJobs: () => void;
  onNavigateToBlocked: () => void;
}

export default function SettingsView({ onEditProfile, onNavigateToSecurity, onNavigateToFAQ, onNavigateToAdmin, onNavigateToCover, onNavigateToLegal, onNavigateToPremium, onNavigateToStats, onNavigateToMyJobs, onNavigateToBlocked }: SettingsViewProps) {  
  const userId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.userName);

  
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const setIsDarkMode = useAuthStore((state) => state.setIsDarkMode);

  // 🚀 ენის გლობალური სთეითები Zustand-იდან (უსაფრთხო წამოღება)
  const language = useAuthStore((state: any) => state.language) || 'ka';
  const [isAdmin, setIsAdmin] = useState(false);
  // 🚀 ვამოწმებთ სთორში ორივე შესაძლო სახელს: setLanguage ან changeLanguage, თუ არადა პირდაპირ setState-ით ვანახლებთ
  const storeSetLanguage = useAuthStore((state: any) => state.setLanguage || state.changeLanguage);

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const setBgTheme = useAuthStore((state: any) => state.setBgTheme);
  
  // 🚀 ენის ამოსარჩევი მოდალის სთეითი
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);

  // მიმდინარე ენის მიხედვით აქტიური თარგმანების ობიექტი
  const t = translations[language as LanguageType] || translations.ka;

  useEffect(() => {
    if (userId) {
      fetchUserAvatar();
      checkAdmin(); // 🔧
      supabase.rpc('my_tier').then(({ data }: any) => {
        setTier(typeof data === 'string' ? data : (data?.tier ?? null));
      });
    } else {
      setAvatarUrl(null);
      setIsAdmin(false); // 🔧
      setTier(null);
    }
  }, [userId]);

  const selectBgTheme = async (themeId: string, locked: boolean) => {
    if (locked || !userId) return;
    setBgTheme(themeId);
    await supabase.from('users').update({ bg_theme: themeId }).eq('id', userId);
  };

  const checkAdmin = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      setIsAdmin(data?.role === 'admin');
    } catch {
      setIsAdmin(false);
    }
  };

  const fetchUserAvatar = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', userId)
        .single();
      
      if (data && data.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    } catch (err) {
      console.log('სეთინგებში ავატარის ჩატვირთვის შეცდომა:', err);
    }
  };

 const setUserId = useAuthStore((state) => state.setUserId);
  const setUserName = useAuthStore((state) => state.setUserName);
  const setUserRole = useAuthStore((state) => state.setUserRole);
  const setResume = useAuthStore((state) => state.setResume);
  const setMustChangePassword = useAuthStore((state) => state.setMustChangePassword);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setUserName(null);
    setUserRole(null);
    setResume(null, null);
    setMustChangePassword(false);
  };

  const handleSelectLanguage = (langCode: LanguageType) => {
    if (storeSetLanguage) {
      storeSetLanguage(langCode);
    } else {
      // 🚀 თუ სთორში ფუნქციას სხვა სახელი ჰქვია, პირდაპირ Zustand-ის შიდა მეთოდით ვაახლებთ 'language' თვისებას
      useAuthStore.setState({ language: langCode });
    }
    setIsLangModalVisible(false); // იცვლება ინლაინ რეჟიმში, ყოველგვარი შემაწუხებელი Popup-ის გარეშე
  };

  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
    iconBg: isDarkMode ? '#1f1f24' : '#f2f2f7',
  };

  const SettingRow = ({ icon, title, rightElement, onPress, isDestructive = false }: any) => (
    <TouchableOpacity 
      style={[styles.row, { borderColor: theme.border }]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        <View style={[
          styles.iconContainer, 
          { backgroundColor: theme.iconBg },
          isDestructive && styles.destructiveIconBg
        ]}>
          <Ionicons name={icon} size={20} color={isDestructive ? '#ff453a' : '#5B42F5'} />
        </View>
        <Text style={[
          styles.rowTitle, 
          { color: theme.text },
          isDestructive && styles.destructiveText
        ]}>{title}</Text>
      </View>
      {rightElement ? rightElement : <Ionicons name="chevron-forward" size={16} color={theme.subText} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.bg }]} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* იუზერის ბარათი */}
      {userId ? (
        <View style={[styles.profileCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={[styles.avatarCircle, { overflow: 'hidden' }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={32} color="#fff" />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>{userName}</Text>
            <Text style={[styles.profileStatus, { color: theme.subText }]}>{t.active_profile}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.profileCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.iconBg }]}>
            <Ionicons name="person-outline" size={32} color={theme.subText} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>{t.guest}</Text>
            <Text style={[styles.profileStatus, { color: theme.subText }]}>{t.not_authorized}</Text>
          </View>
        </View>
      )}

      {/* სექცია 1: ანგარიში */}
      {userId && (
        <>
          <Text style={[styles.sectionHeader, { color: theme.subText }]}>{t.account}</Text>
          <View style={[styles.group, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <SettingRow icon="person-outline" title={t.edit_profile} onPress={onEditProfile} />
            <SettingRow icon="briefcase-outline" title="ჩემი განცხადებები" onPress={onNavigateToMyJobs} />
            <SettingRow icon="lock-closed-outline" title={t.security} onPress={onNavigateToSecurity} />
            <SettingRow icon="color-palette-outline" title="პროფილის ფონი" onPress={onNavigateToCover} />
            <SettingRow icon="star-outline" title="პრემიუმი" onPress={onNavigateToPremium} />
            <SettingRow icon="stats-chart-outline" title="სტატისტიკა" onPress={onNavigateToStats} />
            <SettingRow icon="ban-outline" title="დაბლოკილები" onPress={onNavigateToBlocked} />
          </View>
        </>
      )}

      {/* სექცია 2: პარამეტრები */}
      <Text style={[styles.sectionHeader, { color: theme.subText }]}>{t.preferences}</Text>
      <View style={[styles.group, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <SettingRow 
          icon="moon-outline" 
          title={t.dark_mode} 
          rightElement={
            <Switch
              trackColor={{ false: '#d1d1d6', true: '#4c36cc' }}
              thumbColor={isDarkMode ? '#5B42F5' : '#fff'}
              ios_backgroundColor="#d1d1d6"
              onValueChange={setIsDarkMode}
              value={isDarkMode}
            />
          }
        />
        <SettingRow 
          icon="notifications-outline" 
          title={t.notifications} 
          rightElement={
            <Switch
              trackColor={{ false: '#d1d1d6', true: '#4c36cc' }}
              thumbColor={isNotificationsEnabled ? '#5B42F5' : '#fff'}
              ios_backgroundColor="#d1d1d6"
              onValueChange={setIsNotificationsEnabled}
              value={isNotificationsEnabled}
            />
          }
        />
        <SettingRow 
          icon="globe-outline" 
          title={`${t.app_language} (${language.toUpperCase()})`} 
          onPress={() => setIsLangModalVisible(true)} 
        />
      </View>

      {isDarkMode && userId && (
        <>
          <View style={styles.themeHeaderRow}>
            <Text style={[styles.sectionHeader, { color: theme.subText, marginBottom: 0 }]}>ფონის თემა</Text>
            {!(tier === 'premium' || tier === 'pro') && (
              <TouchableOpacity style={styles.premiumChip} onPress={onNavigateToPremium}>
                <Ionicons name="diamond" size={11} color="#fff" />
                <Text style={styles.premiumChipText}>Premium</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.group, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 16, borderBottomWidth: 0 }]}>
            <View style={styles.themeSwatchRow}>
              {BG_THEMES.map((th) => {
                const locked = isThemeLocked(th, tier);
                const active = bgTheme === th.id;
                return (
                  <TouchableOpacity
                    key={th.id}
                    onPress={() => selectBgTheme(th.id, locked)}
                    activeOpacity={locked ? 1 : 0.8}
                    style={[
                      styles.themeSwatch,
                      { backgroundColor: th.color, borderColor: active ? '#5B42F5' : theme.border, opacity: locked ? 0.55 : 1 },
                    ]}
                  >
                    {locked ? (
                      <Ionicons name={th.lock === 'pro' ? 'diamond' : 'star'} size={14} color="#fff" />
                    ) : active ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      )}

      {/* სექცია 3: მხარდაჭერა */}
      <Text style={[styles.sectionHeader, { color: theme.subText }]}>{t.support}</Text>
      <View style={[styles.group, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <SettingRow icon="help-circle-outline" title={t.faq} onPress={onNavigateToFAQ} />
        <SettingRow icon="document-text-outline" title="წესები და პირობები" onPress={() => onNavigateToLegal('terms')} />
        <SettingRow icon="shield-checkmark-outline" title="კონფიდენციალურობის პოლიტიკა" onPress={() => onNavigateToLegal('privacy')} />
      </View>


      {/* 🔧 ადმინ სექცია — მხოლოდ role='admin'-ს */}
      {isAdmin && (
        <>
          <Text style={[styles.sectionHeader, { color: theme.subText }]}>ადმინისტრირება</Text>
          <View style={[styles.group, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <SettingRow icon="shield-checkmark-outline" title="ადმინ პანელი" onPress={onNavigateToAdmin} />
          </View>
        </>
      )}

      {/* სექცია 4: გასვლა */}
      {userId && (
        <View style={[styles.group, { backgroundColor: theme.cardBg, borderColor: theme.border, marginTop: 8 }]}>
          <SettingRow 
            icon="log-out-outline" 
            title={t.logout} 
            isDestructive={true} 
            onPress={handleLogout}
          />
        </View>
      )}

      {/* 🚀 ენის ასარჩევი მოდალური ფანჯარა */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isLangModalVisible}
        onRequestClose={() => setIsLangModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.select_language}</Text>
            
            <TouchableOpacity style={[styles.langOption, { borderColor: theme.border }]} onPress={() => handleSelectLanguage('ka')}>
              <Text style={[styles.langOptionText, { color: theme.text }, language === 'ka' && styles.activeLangText]}>ქართული (GE)</Text>
              {language === 'ka' && <Ionicons name="checkmark" size={18} color="#5B42F5" />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.langOption, { borderColor: theme.border }]} onPress={() => handleSelectLanguage('en')}>
              <Text style={[styles.langOptionText, { color: theme.text }, language === 'en' && styles.activeLangText]}>English (EN)</Text>
              {language === 'en' && <Ionicons name="checkmark" size={18} color="#5B42F5" />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.langOption, { borderColor: theme.border, borderBottomWidth: 0 }]} onPress={() => handleSelectLanguage('ru')}>
              <Text style={[styles.langOptionText, { color: theme.text }, language === 'ru' && styles.activeLangText]}>Русский (RU)</Text>
              {language === 'ru' && <Ionicons name="checkmark" size={18} color="#5B42F5" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelModalButton} onPress={() => setIsLangModalVisible(false)}>
              <Text style={styles.cancelModalButtonText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 110 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginVertical: 16, borderWidth: 1 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  profileStatus: { fontSize: 12 },
  sectionHeader: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  group: { borderRadius: 16, marginBottom: 20, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  destructiveIconBg: { backgroundColor: '#2c1616' },
  rowTitle: { fontSize: 15, fontWeight: '500', marginLeft: 12 },
  destructiveText: { color: '#ff453a' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: { width: '100%', padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  langOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 14, borderBottomWidth: 1 },
  langOptionText: { fontSize: 14, fontWeight: '500' },
  activeLangText: { color: '#5B42F5', fontWeight: '700' },
  cancelModalButton: { marginTop: 16, paddingVertical: 8, width: '100%', alignItems: 'center' },
  cancelModalButtonText: { color: '#ff453a', fontSize: 14, fontWeight: '600' },

  themeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginLeft: 4, marginRight: 4 },
  premiumChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: '#8B5CF6' },
  premiumChipText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
  themeSwatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeSwatch: { width: 48, height: 48, borderRadius: 14, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
});