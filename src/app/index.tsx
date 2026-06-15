import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Image, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';

// კომპონენტების იმპორტები
import ChatView from '../components/ChatView';
import CreateJobView from '../components/CreateJobView';
import EditProfileView from '../components/EditProfileView';
import FAQView from '../components/FAQView'; // 🚀 შემოტანილია FAQ გვერდი
import HomeFeedView from '../components/HomeFeedView';
import IncomingRequestsView from '../components/IncomingRequestsView';
import LoginView from '../components/LoginView';
import ProfileView from '../components/ProfileView';
import RegisterView from '../components/RegisterView';
import SecuritySettingsView from '../components/SecuritySettingsView';
import SettingsView from '../components/SettingsView';

import CompanyJobsView from '../components/jobfeed/CompanyJobsView';
import FollowingJobsView from '../components/jobfeed/FollowingJobsView';
import PrivateJobsView from '../components/jobfeed/PrivateJobsView';
import UrgentJobsView from '../components/jobfeed/UrgentJobsView';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა

export default function HomeScreen() {
  const userId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.userName);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  
  // 🚀 დაზღვეულია any-ით, რათა მკაცრმა TypeScript-მა აღარ გამოიტანოს ერორები კომპილაციისას
  const t: any = translations[language as LanguageType] || translations.ka;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('home'); 
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedCategory, setSelectedCategory] = useState<'company' | 'private' | 'urgent' | 'following' | null>(null);

  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);

  // იუზერების ძებნისა და ისტორიისთვის
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    searchBg: isDarkMode ? '#222227' : '#e5e5ea',
    inputText: isDarkMode ? '#fff' : '#000',
  };

  useEffect(() => {
    if (userId) {
      fetchCurrentUserAvatar();
    } else {
      setCurrentUserAvatar(null);
    }
  }, [userId, activeTab]);

  const fetchCurrentUserAvatar = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', userId)
        .single();
      
      if (data && data.avatar_url) {
        setCurrentUserAvatar(data.avatar_url);
      }
    } catch (err) {
      console.log('ავატარის ჩატვირთვის შეცდომა ჰედერისთვის:', err);
    }
  };

  const handleUserSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchedUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar_url, sphere')
        .ilike('name', `%${text}%`)
        .limit(10);

      if (!error && data) {
        setSearchedUsers(data);
      }
    } catch (err) {
      console.log('ძებნის შეცდომა:', err);
    }
  };

  const handleSelectUser = (user: any) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((u) => u.id !== user.id);
      return [user, ...filtered].slice(0, 6);
    });

    setSearchQuery('');
    setSearchedUsers([]);
    setIsSearchFocused(false);

    setInspectUserId(user.id);
    setActiveTab('profile_inspect');
  };

  const handleRemoveRecent = (id: string) => {
    setRecentSearches((prev) => prev.filter((u) => u.id !== id));
  };

  const renderHeaderContent = () => {
    if (activeTab === 'auth') return <View style={styles.textPushedHeaderRow}><Text style={[styles.headerStaticTitle, { color: theme.text }]}>{authMode === 'login' ? (t.auth_mode_login || 'ავტორიზაცია') : (t.auth_mode_register || 'რეგისტრაცია')}</Text></View>;
    if (activeTab === 'category_view' || activeTab === 'faq') return null; // 🚀 FAQView-ს თავისი შიდა ჰედერი აქვს და აქ null გვინდა
    if (activeTab === 'create') return <View style={styles.textPushedHeaderRow}><Text style={[styles.headerStaticTitle, { color: theme.text }]}>{t.add_ad_header || 'განცხადების დამატება'}</Text></View>;
    if (activeTab === 'settings') return <View style={styles.textPushedHeaderRow}><Text style={[styles.headerStaticTitle, { color: theme.text }]}>{t.settings || 'პარამეტრები'}</Text></View>;
    if (activeTab === 'security_settings') return <View style={styles.textPushedHeaderRow}><Text style={[styles.headerStaticTitle, { color: theme.text }]}>{t.security_header || 'უსაფრთხოება'}</Text></View>; 
    if (activeTab === 'edit_profile') return <View style={styles.textPushedHeaderRow}><Text style={[styles.headerStaticTitle, { color: theme.text }]}>{t.edit_profile || 'პროფილის შეცვლა'}</Text></View>;
    if (activeTab === 'profile' || activeTab === 'profile_inspect') return <View style={styles.textPushedHeaderRow}><Text style={[styles.headerStaticTitle, { color: theme.text }]}>{activeTab === 'profile' ? (t.my_profile_header || 'ჩემი პროფილი') : (t.user_profile_header || 'მომხმარებლის პროფილი')}</Text></View>;
    if (activeTab === 'incoming_requests') return <View style={styles.textPushedHeaderRow}><Text style={[styles.headerStaticTitle, { color: theme.text }]}>{t.incoming_requests || 'შემოსული მოთხოვნები'}</Text></View>;
    
    return (
      <>
        <View style={styles.topRow}>
          <Text style={[styles.logoText, { color: theme.text }]}>I<Text style={styles.logoAccent}>Pove</Text></Text>
          {userId && (
            <View style={styles.profileContainer}>
              {currentUserAvatar ? (
                <Image source={{ uri: currentUserAvatar }} style={styles.topHeaderAvatar} />
              ) : (
                <View style={[styles.topHeaderAvatar, { backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={12} color="#fff" />
                </View>
              )}
              <Text style={[styles.usernameText, { color: theme.text }]} numberOfLines={1}>{userName || (t.default_user_fallback || 'მომხმარებელი')}</Text>
            </View>
          )}
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme.searchBg }]}>
          <Ionicons name="people-outline" size={18} color={theme.subText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.inputText }]}
            placeholder={t.search_user_placeholder || "მოძებნე მომხმარებელი..."}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            value={searchQuery}
            onChangeText={handleUserSearch}
            onFocus={() => setIsSearchFocused(true)}
          />
          {isSearchFocused && (
            <TouchableOpacity onPress={() => { setIsSearchFocused(false); setSearchQuery(''); setSearchedUsers([]); }}>
              <Ionicons name="close-circle" size={18} color={theme.subText} />
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };

  const renderMainContent = () => {
    if (isSearchFocused && activeTab === 'home') {
      return (
        <ScrollView style={[styles.searchResultsWrapper, { backgroundColor: theme.bg }]} keyboardShouldPersistTaps="handled">
          {searchQuery.trim().length > 0 ? (
            searchedUsers.length > 0 ? (
              searchedUsers.map((user) => (
                <TouchableOpacity key={user.id} style={[styles.userRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => handleSelectUser(user)}>
                  {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.searchRowAvatar} />
                  ) : (
                    <View style={[styles.searchRowAvatar, { backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' }]}><Ionicons name="person" size={16} color="#fff" /></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.searchRowName, { color: theme.text }]}>{user.name}</Text>
                    <Text style={{ color: theme.subText, fontSize: 11 }}>{user.sphere || (t.specialist || 'სპეციალისტი')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.subText} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.searchStateText, { color: theme.subText }]}>{t.no_users_found || 'მომხმარებელი ვერ მოიძებნა'}</Text>
            )
          ) : (
            <View style={{ paddingHorizontal: 4 }}>
              <Text style={[styles.recentSearchTitle, { color: theme.text }]}>{t.recent_searched_users || 'ბოლო დასერჩილი იუზერები'}</Text>
              {recentSearches.length > 0 ? (
                recentSearches.map((user) => (
                  <View key={user.id} style={[styles.userRow, { backgroundColor: theme.cardBg, borderColor: theme.border, marginBottom: 8 }]}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => handleSelectUser(user)}>
                      {user.avatar_url ? (
                        <Image source={{ uri: user.avatar_url }} style={styles.searchRowAvatar} />
                      ) : (
                        <View style={[styles.searchRowAvatar, { backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' }]}><Ionicons name="person" size={16} color="#fff" /></View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.searchRowName, { color: theme.text }]}>{user.name}</Text>
                        <Text style={{ color: theme.subText, fontSize: 11 }}>{user.sphere || (t.specialist || 'სპეციალისტი')}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ padding: 6 }} onPress={() => handleRemoveRecent(user.id)}>
                      <Ionicons name="close" size={16} color={theme.subText} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={[styles.searchStateText, { color: theme.subText, marginTop: 10 }]}>{t.search_history_empty || 'ძებნის ისტორია ცარიელია'}</Text>
              )}
            </View>
          )}
        </ScrollView>
      );
    }

    if (activeTab === 'auth') {
      return (
        <View style={styles.authFlex}>
          {authMode === 'login' ? (
            <LoginView onSuccess={() => setActiveTab('profile')} onSwitchToRegister={() => setAuthMode('register')} />
          ) : (
            <RegisterView onSuccess={() => setActiveTab('profile')} onSwitchToLogin={() => setAuthMode('login')} />
          )}
          <TouchableOpacity style={styles.authGlobalCancel} onPress={() => setActiveTab('home')}>
            <Text style={{ color: theme.subText, fontWeight: '500' }}>{t.cancel || 'გაუქმება'}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (activeTab === 'category_view' && selectedCategory) {
      if (selectedCategory === 'company') return <CompanyJobsView onBack={() => { setSelectedCategory(null); setActiveTab('home'); }} />;
      if (selectedCategory === 'private') return <PrivateJobsView onBack={() => { setSelectedCategory(null); setActiveTab('home'); }} />;
      if (selectedCategory === 'urgent') return <UrgentJobsView onBack={() => { setSelectedCategory(null); setActiveTab('home'); }} />;
      if (selectedCategory === 'following') return <FollowingJobsView onBack={() => { setSelectedCategory(null); setActiveTab('home'); }} />;
    }

    if (activeTab === 'create') {
      if (!userId) {
        return (
          <View style={styles.unauthorizedContainer}>
            <View style={styles.lockIconCircle}>
              <Ionicons name="lock-closed" size={32} color="#5B42F5" />
            </View>
            <Text style={[styles.unauthorizedTitle, { color: theme.text }]}>{t.auth_required_title || 'ავტორიზაცია აუცილებელია 🔒'}</Text>
            <Text style={[styles.unauthorizedSubtitle, { color: theme.subText }]}>
              {t.auth_required_subtitle || 'განცხადების განსათავსებლად გთხოვთ ჯერ გაიაროთ ავტორიზაცია ან დარეგისტრირდეთ სისტემაში'}
            </Text>
            <TouchableOpacity style={styles.unauthorizedButton} onPress={() => { setAuthMode('login'); setActiveTab('auth'); }}>
              <Text style={styles.unauthorizedButtonText}>{t.login_register_btn || 'შესვლა / რეგისტრაცია'}</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return <CreateJobView onSuccess={() => setActiveTab('home')} />;
    }

    // 🚀 გადაეცემა onNavigateToFAQ ფუნქციაც, რომელიც გადართავს ტაბს
    if (activeTab === 'settings') {
      return (
        <SettingsView 
          onEditProfile={() => setActiveTab('edit_profile')} 
          onNavigateToSecurity={() => setActiveTab('security_settings')} 
          onNavigateToFAQ={() => setActiveTab('faq')} 
        />
      );
    }

    if (activeTab === 'edit_profile') return <EditProfileView onBack={() => setActiveTab('settings')} />;
    if (activeTab === 'security_settings') return <SecuritySettingsView onBack={() => setActiveTab('settings')} />;
    
    // 🚀 ახალი: FAQView-ს რენდერი და უკან დაბრუნება სეთინგებში
    if (activeTab === 'faq') return <FAQView onBack={() => setActiveTab('settings')} />;
    
    if (activeTab === 'profile') return <ProfileView onNavigateToRequests={() => setActiveTab('incoming_requests')} />;
    if (activeTab === 'profile_inspect' && inspectUserId) {
      return <ProfileView onNavigateToRequests={() => setActiveTab('incoming_requests')} targetUserId={inspectUserId} />;
    }

    if (activeTab === 'incoming_requests') return <IncomingRequestsView onBack={() => setActiveTab('profile')} onAcceptSuccess={() => setActiveTab('chat')} />;
    if (activeTab === 'chat') return <ChatView />;

    return (
      <HomeFeedView 
        onSelectCategory={(cat) => { setSelectedCategory(cat); setActiveTab('category_view'); }} 
        onOpenScroll={() => Alert.alert(t.scroll_alert_title || 'სქროლი 🎬', t.scroll_alert_msg || 'აქ მალე ჩავაშენებთ TikTok-ის სტილის ულამაზეს ვიდეო სისტემას!')}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.cardBg} translucent={true} />
      
      {activeTab !== 'chat' && (
        <SafeAreaView style={[styles.headerWrapper, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={styles.header}>
            {renderHeaderContent()}
          </View>
        </SafeAreaView>
      )}

      {renderMainContent()}

      {/* ფუტერი */}
      <View style={[styles.footer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.tabButton} onPress={() => { setSelectedCategory(null); setInspectUserId(null); setActiveTab('home'); setIsSearchFocused(false); }}>
          <Ionicons name={activeTab === 'home' || activeTab === 'category_view' ? "home" : "home-outline"} size={22} color={activeTab === 'home' || activeTab === 'category_view' ? "#5B42F5" : theme.subText} />
          <Text style={[styles.tabText, { color: theme.subText }, (activeTab === 'home' || activeTab === 'category_view') && styles.tabTextActive]}>{t.nav_home || 'მთავარი'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tabButton} onPress={() => { setInspectUserId(null); setActiveTab('chat'); setIsSearchFocused(false); }}>
          <Ionicons name={activeTab === 'chat' ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={22} color={activeTab === 'chat' ? "#5B42F5" : theme.subText} />
          <Text style={[styles.tabText, { color: theme.subText }, activeTab === 'chat' && styles.tabTextActive]}>{t.nav_chat || 'ჩათი'}</Text>
        </TouchableOpacity>

        <View style={styles.raisedTabWrapper}>
          <TouchableOpacity style={styles.raisedTabButton} onPress={() => { setInspectUserId(null); setIsSearchFocused(false); setAuthMode('login'); setActiveTab(userId ? 'profile' : 'auth'); }}>
            <Ionicons name="person" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.tabText, styles.raisedTabText, { color: theme.subText }, (activeTab === 'profile' || activeTab === 'profile_inspect' || activeTab === 'auth' || activeTab === 'edit_profile' || activeTab === 'incoming_requests' || activeTab === 'security_settings') && styles.tabTextActive]}>{t.nav_profile || 'პროფილი'}</Text>
        </View>
        <TouchableOpacity style={styles.tabButton} onPress={() => { setInspectUserId(null); setIsSearchFocused(false); setActiveTab('create'); }}>
          <Ionicons name={activeTab === 'create' ? "add-circle" : "add-circle-outline"} size={24} color={activeTab === 'create' ? "#5B42F5" : theme.subText} />
          <Text style={[styles.tabText, { color: theme.subText }, activeTab === 'create' && styles.tabTextActive]}>{t.nav_add || 'დამატება'}</Text>
        </TouchableOpacity>
        
        {/* 🚀 ფუტერის ხატულა განათდება მაშინაც, როცა აქტიურია სეთინგები ან თავად FAQ გვერდი */}
        <TouchableOpacity style={styles.tabButton} onPress={() => { setInspectUserId(null); setIsSearchFocused(false); setActiveTab('settings'); }}>
          <Ionicons name={activeTab === 'settings' || activeTab === 'faq' ? "settings" : "settings-outline"} size={22} color={activeTab === 'settings' || activeTab === 'faq' ? "#5B42F5" : theme.subText} />
          <Text style={[styles.tabText, { color: theme.subText }, (activeTab === 'settings' || activeTab === 'faq') && styles.tabTextActive]}>{t.nav_settings || 'სეთინგები'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: { borderBottomWidth: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  textPushedHeaderRow: { justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: Platform.OS === 'ios' ? 20 : 25, paddingBottom: 5, marginBottom: 5 },
  headerStaticTitle: { fontSize: 22, fontWeight: 'bold' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logoText: { fontSize: 24, fontWeight: 'bold', letterSpacing: 0.5 },
  logoAccent: { color: '#5B42F5' },
  profileContainer: { flexDirection: 'row', alignItems: 'center' },
  topHeaderAvatar: { width: 26, height: 26, borderRadius: 13, marginRight: 8 },
  usernameText: { fontSize: 14, fontWeight: '600', maxWidth: 180 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  searchResultsWrapper: { flex: 1, padding: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  searchRowAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 12 },
  searchRowName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  searchStateText: { textAlign: 'center', marginTop: 30, fontSize: 13, fontWeight: '500' },
  recentSearchTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.3, opacity: 0.8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 15 : 0 },
  tabButton: { alignItems: 'center', justifyContent: 'center', width: 65 },
  tabText: { fontSize: 10, fontWeight: '500', marginTop: 4 },
  tabTextActive: { color: '#5B42F5' },
  raisedTabWrapper: { alignItems: 'center', justifyContent: 'center', width: 70, height: 70 },
  raisedTabButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center', position: 'absolute', top: -24, shadowColor: '#5B42F5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  raisedTabText: { position: 'absolute', bottom: 6 },
  authFlex: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 20 },
  authGlobalCancel: { alignItems: 'center', marginTop: 14, paddingVertical: 4 },
  unauthorizedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60 },
  lockIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(91, 66, 245, 0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  unauthorizedTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  unauthorizedSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
  unauthorizedButton: { backgroundColor: '#5B42F5', height: 46, borderRadius: 12, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  unauthorizedButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});