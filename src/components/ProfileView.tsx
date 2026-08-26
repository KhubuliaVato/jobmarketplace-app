import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Badge, getBadgesByIds } from '../utils/badges';
import { THEME_PALETTES } from '../utils/bgThemes';
import { getCover } from '../utils/covers';
import { isUserOnline } from '../utils/presence';
import { buildResumeHtml, ResumeTemplateId } from '../utils/resumeTemplates';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა
import ReportModal from './ReportModal';
import ShareSheet from './ShareSheet';
import TierBadge from './TierBadge';
import Toast, { ToastType } from './Toast';

const MONTHS_KA = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
function fmtPeriod(v?: string) {
  if (!v) return '';
  const [y, m] = v.split('-');
  if (!m) return y;
  const idx = parseInt(m, 10) - 1;
  return `${MONTHS_KA[idx] || ''} ${y}`;
}

// 🚀 ბეიჯების მიმოფანტვის კოორდინატები cover-ზე (web-ის positions მასივის შესატყვისი, დამცირებული cover-ის სიმაღლის მიხედვით: 96px vs web-ის ~200px)
// 🚀 ბეიჯების მიმოფანტვის კოორდინატები — ყველა არჩეული (14-მდე) ჩანს ფონზე, გადაფარვის გარეშე
const BADGE_POSITIONS = [
  { top: '6%', left: '40%', size: 22, rotate: -8 },
  { top: '54%', left: '38%', size: 20, rotate: 14 },
  { top: '10%', left: '54%', size: 20, rotate: 6 },
  { top: '56%', left: '54%', size: 18, rotate: -12 },
  { top: '4%', left: '68%', size: 21, rotate: 10 },
  { top: '52%', left: '68%', size: 22, rotate: -6 },
  { top: '26%', left: '46%', size: 20, rotate: 18 },
  { top: '30%', left: '61%', size: 18, rotate: -14 },
  { top: '8%', left: '82%', size: 26, rotate: 8 },
  { top: '54%', left: '82%', size: 20, rotate: -10 },
  { top: '30%', left: '76%', size: 22, rotate: 12 },
  { top: '42%', left: '30%', size: 18, rotate: -16 },
  { top: '12%', left: '30%', size: 16, rotate: 15 },
  { top: '36%', left: '90%', size: 24, rotate: -8 },
] as const;

// 🚀 tier-ის მიხედვით ავატარის მბზინავი ჩარჩოს ფერები (web-ის tierStyle-ის შესატყვისი)
const TIER_STYLES: Record<string, { colors: [string, string, string]; glow: string }> = {
  verified: { colors: ['#60A5FA', '#3B82F6', '#1D4ED8'], glow: '#3B82F6' },
  pro: { colors: ['#C4B5FD', '#8B5CF6', '#6D28D9'], glow: '#8B5CF6' },
  premium: { colors: ['#FCD34D', '#f5a623', '#D97706'], glow: '#f5a623' },
};

interface ProfileViewProps {
  onNavigateToRequests: () => void;
  targetUserId?: string | null;
  onOpenAdminChat?: (userId: string) => void;
  onNavigateToBadges?: () => void;
  onNavigateToProfile?: (userId: string) => void;
}

export default function ProfileView({ onNavigateToRequests, targetUserId = null, onOpenAdminChat, onNavigateToBadges, onNavigateToProfile }: ProfileViewProps) {
  const myUserId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.userName);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t = translations[language as LanguageType] || translations.ka;

  const activeProfileId = targetUserId || myUserId;
  const isOwnProfile = !targetUserId || targetUserId === myUserId;

  const [reportOpen, setReportOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);

  useEffect(() => {
    if (!myUserId) { setViewerIsAdmin(false); return; }
    supabase.from('users').select('role').eq('id', myUserId).maybeSingle()
      .then(({ data }) => setViewerIsAdmin(data?.role === 'admin'));
  }, [myUserId]);

  // ბლოკის სტატუსის შემოწმება პროფილის გახსნისას
  useEffect(() => {
    if (isOwnProfile || !myUserId || !activeProfileId) { setIsBlocked(false); return; }
    supabase.rpc('my_blocked_ids').then(({ data }) => {
      const bset = new Set((data || []).map((b: any) => b));
      setIsBlocked(bset.has(activeProfileId));
    });
  }, [activeProfileId, myUserId, isOwnProfile]);

  const handleBlockToggle = async () => {
    if (!activeProfileId || isOwnProfile) return;
    setBlockLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_block', { p_blocked_id: activeProfileId });
      if (error) throw error;
      setIsBlocked(data === true);
      showToast(data ? 'success' : 'info', data ? 'დაბლოკილია' : 'ბლოკი მოიხსნა',
        data ? 'ამ მომხმარებელს ვეღარ ნახავთ' : '');
    } catch (e: any) {
      showToast('error', 'შეცდომა', e.message);
    } finally {
      setBlockLoading(false);
    }
  };

  // Toast
  const [toast, setToast] = useState<{ visible: boolean; type: ToastType; title: string; message?: string }>({
    visible: false, type: 'success', title: '',
  });
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToast({ visible: true, type, title, message });
  };

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ავატარის გადიდება
  const [avatarZoom, setAvatarZoom] = useState(false);

  // ბეიჯები (ფონზე საჩვენებელი)
  const [shownBadges, setShownBadges] = useState<Badge[]>([]);
  
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [notifyModalVisible, setNotifyModalVisible] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyPush, setNotifyPush] = useState(false);
  const [notifySms, setNotifySms] = useState(false);
  const [notifySaving, setNotifySaving] = useState(false);

  const [activeListView, setActiveListView] = useState<'followers' | 'following' | null>(null);
  const [listData, setListData] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [jobs, setJobs] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeProfileTab, setActiveProfileTab] = useState<'worker' | 'employer' | 'cancelled'>('worker');
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [resumeTemplate, setResumeTemplate] = useState<ResumeTemplateId>('minimal');
  const [resumeGenerating, setResumeGenerating] = useState(false);

  const generateAndShareResume = async () => {
    if (!profileData) return;
    setResumeGenerating(true);
    try {
      const html = buildResumeHtml(profileData, resumeTemplate);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        try {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'რეზიუმეს გაზიარება' });
        } catch {
          // მიმღები აპი ვერ მოიძებნა (მაგ. emulator-ზე Gmail/Drive არ დგას) — PDF მაინც შეიქმნა
          showToast('info', 'PDF შეიქმნა', 'გაზიარების აპი ვერ მოიძებნა მოწყობილობაზე');
        }
      } else {
        showToast('success', 'PDF შეიქმნა', uri);
      }
      setResumeModalVisible(false);
    } catch (err: any) {
      showToast('error', 'ვერ შეიქმნა PDF', err.message || '');
    } finally {
      setResumeGenerating(false);
    }
  };

  const fetchUserJobs = async () => {
    if (!activeProfileId) return;
    try {
      const { data: jbs } = await supabase
        .from('jobs')
        .select('id, title, position_title, budget, location, type, is_urgent, created_at')
        .eq('author_id', activeProfileId)
        .or('status.is.null,status.eq.active')
        .order('created_at', { ascending: false })
        .limit(6);
      setJobs(jbs || []);
    } catch {
      setJobs([]);
    }
  };

  const fetchUserProfile = async () => {
    if (!activeProfileId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeProfileId)
        .maybeSingle();

      if (error) throw error;
      setProfileData(data);
      
      await checkFollowStatus();
      await fetchFollowCounts();
      await fetchUserJobs();
    } catch (error: any) {
      console.error('მონაცემების წამოღების შეცდომა:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePickAndUploadAvatar = async () => {
    if (!isOwnProfile || !myUserId) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast('error', 'წვდომა უარყოფილია', 'საჭიროა გალერეის ნებართვა');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedImageUri = result.assets[0].uri;
      setUploadingAvatar(true);

      const fileExt = selectedImageUri.split('.').pop() || 'jpg';
      const fileName = `${myUserId}-${Date.now()}.${fileExt}`;

      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          console.error(e);
          reject(new TypeError("სურათის ბინარულ ფორმატში გადაყვანა ვერ მოხერხდა"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", selectedImageUri, true);
        xhr.send(null);
      });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob as Blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicAvatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicAvatarUrl })
        .eq('id', myUserId);

      if (updateError) throw updateError;

      setProfileData((prev: any) => ({ ...prev, avatar_url: publicAvatarUrl }));
      
    } catch (err: any) {
      showToast('error', 'ატვირთვა ვერ მოხერხდა', err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const fetchUserReviews = async () => {
    if (!activeProfileId) return;
    try {
      setLoadingReviews(true);
      
      const { data: reviewsData, error: revError } = await supabase
        .from('reviews')
        .select('*')
        .eq('target_id', activeProfileId);

      if (revError) throw revError;

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        setLoadingReviews(false);
        return;
      }

      const { data: chatsData } = await supabase
        .from('chats')
        .select('job_id, client_id, freelancer_id');

      const enrichedReviews = reviewsData.map(review => {
        const relatedChat = chatsData?.find(c => c.job_id === review.job_id);
        let roleType: 'worker' | 'employer' | 'cancelled' = 'worker';
        
        if (review.is_negative_cancel) {
          roleType = 'cancelled';
        } else if (relatedChat && relatedChat.client_id === activeProfileId) {
          roleType = 'employer';
        } else {
          roleType = 'worker';
        }

        return {
          ...review,
          roleType
        };
      });

      setReviews(enrichedReviews);
    } catch (err) {
      console.error('შეფასებების წამოღების შეცდომა:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchFollowCounts = async () => {
    if (!activeProfileId) return;
    try {
      const { count: followers, error: ferr } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followed_id', activeProfileId);

      const { count: following, error: fingErr } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', activeProfileId);

      if (ferr) throw ferr;
      if (fingErr) throw fingErr;

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    } catch (error: any) {
      console.error('ციფრების დათვლის შეცდომა:', error.message);
    }
  };

  const openFollowList = async (type: 'followers' | 'following') => {
    setActiveListView(type);
    setSearchQuery('');

    try {
      setListLoading(true);
      const col = type === 'followers' ? 'followed_id' : 'follower_id';
      const { data, error } = await supabase.from('follows').select('follower_id, followed_id').eq(col, activeProfileId);
      if (error) throw error;

      const ids = (data || []).map((f: any) => (type === 'followers' ? f.follower_id : f.followed_id));
      if (ids.length === 0) { setListData([]); return; }

      const { data: profs, error: pErr } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url, sphere')
        .in('id', ids);
      if (pErr) throw pErr;
      setListData(profs || []);
    } catch (error: any) {
      showToast('error', 'ჩატვირთვა ვერ მოხერხდა', '');
    } finally {
      setListLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (isOwnProfile || !myUserId) return;
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', myUserId)
        .eq('followed_id', activeProfileId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
      if (data) {
        setNotifyEmail(data.notify_email || false);
        setNotifyPush(data.notify_push || false);
        setNotifySms(data.notify_sms || false);
      } else {
        setNotifyEmail(false);
        setNotifyPush(false);
        setNotifySms(false);
      }
    } catch (error: any) {
      console.error('სტატუსის შემოწმების შეცდომა:', error.message);
    }
  };

  const saveNotifyPrefs = async () => {
    if (isOwnProfile || !myUserId) return;
    setNotifySaving(true);
    try {
      const { error } = await supabase
        .from('follows')
        .update({ notify_email: notifyEmail, notify_push: notifyPush, notify_sms: notifySms })
        .eq('follower_id', myUserId)
        .eq('followed_id', activeProfileId);
      if (error) throw error;
      showToast('success', 'შენახულია', '');
      setNotifyModalVisible(false);
    } catch (error: any) {
      showToast('error', 'ვერ შეინახა', error.message);
    } finally {
      setNotifySaving(false);
    }
  };

  const handleFollowToggle = async () => {
    if (isOwnProfile || !myUserId) return;
    try {
      setFollowLoading(true);
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', myUserId)
          .eq('followed_id', activeProfileId);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([
            {
              follower_id: myUserId,
              follower_name: userName,
              followed_id: activeProfileId,
              followed_name: profileData?.name || 'მომხმარებელი'
            }
          ]);

        if (error) throw error;
        setIsFollowing(true);
      }
      await fetchFollowCounts();
    } catch (error: any) {
      showToast('error', 'ოპერაცია ვერ შესრულდა', error.message);
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchBadges = async () => {
    if (!activeProfileId) return;
    try {
      // ბეიჯების გადათვლა (ახლის მოპოვება)
      await supabase.rpc('award_badges', { p_user: activeProfileId });

      // მოპოვებული ბეიჯები
      const { data: earned } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', activeProfileId);

      const earnedIds = new Set((earned || []).map((b: any) => b.badge_id));

      // რომელი ჩანს ფონზე (რიგითობით)
      const displayed: string[] = profileData?.displayed_badges || [];
      const valid = displayed.filter(id => earnedIds.has(id));

      setShownBadges(getBadgesByIds(valid));
    } catch {
      setShownBadges([]);
    }
  };

  useEffect(() => {
    if (profileData) fetchBadges();
  }, [profileData?.id, profileData?.displayed_badges]);

  useEffect(() => {
    fetchUserProfile();
    fetchUserReviews();


    // 🚀 ონლაინ სტატუსის რეალთაიმ განახლება
    const statusSubscription = supabase
      .channel(`public:users:${activeProfileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${activeProfileId}`,
        },
        (payload) => {
          setProfileData((prev: any) => ({ ...prev, user_status: payload.new.user_status, last_seen: payload.new.last_seen }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusSubscription);
    };
  }, [activeProfileId]);

  const [shareSheetVisible, setShareSheetVisible] = useState(false);

  const openPortfolio = async () => {
    const url = profileData?.portfolio_url;
    if (url) {
      const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
      const supported = await Linking.canOpenURL(formattedUrl);
      if (supported) {
        await Linking.openURL(formattedUrl);
      } else {
        showToast('error', 'არასწორი ბმული', 'პორტფოლიოს ბმული არასწორია');
      }
    } else {
      showToast('info', 'პორტფოლიო არ არის', 'ბმული არ არის მითითებული');
    }
  };

  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
    tagBg: isDarkMode ? '#222227' : '#e5e5ea',
    searchBg: isDarkMode ? '#222227' : '#e5e5ea',
  };

  const filteredList = listData.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (item.name || '').toLowerCase().includes(q) || (item.username || '').toLowerCase().includes(q);
  });

  const userSkills: string[] = profileData?.skills
    ? profileData.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];
  const experience: any[] = Array.isArray(profileData?.jobs_experience) ? profileData.jobs_experience : [];
  const education: any[] = Array.isArray(profileData?.education) ? profileData.education : [];
  const languages: any[] = Array.isArray(profileData?.languages) ? profileData.languages : [];
  const hasInfo = !!(profileData?.location || profileData?.availability || profileData?.salary_expect || profileData?.portfolio_url);

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color="#5B42F5" />
      </View>
    );
  }

  // 🚀 გამომწერების/გამოწერილების სიის გვერდი თარგმანით
  if (activeListView) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.listHeaderRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => setActiveListView(null)}>
            <Ionicons name="arrow-back" size={22} color="#5B42F5" />
            <Text style={styles.backButtonText}>{t.back_to_profile || 'პროფილზე დაბრუნება'}</Text>
          </TouchableOpacity>
          <Text style={[styles.listTitle, { color: theme.text }]}>
            {activeListView === 'followers' ? (t.my_followers || 'გამომწერები') : (t.my_following || 'გამოწერილები')}
          </Text>
        </View>

        <View style={[styles.listSearchContainer, { backgroundColor: theme.searchBg }]}>
          <Ionicons name="search-outline" size={18} color={theme.subText} style={styles.searchIcon} />
          <TextInput
            style={[styles.listSearchInput, { color: theme.text }]}
            placeholder={t.search_by_name || "მოძებნე სახელით..."}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.subText} />
            </TouchableOpacity>
          )}
        </View>

        {listLoading ? (
          <View style={styles.listLoader}>
            <ActivityIndicator size="large" color="#5B42F5" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listScrollContent} showsVerticalScrollIndicator={false}>
            {filteredList.length > 0 ? (
              filteredList.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.userRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                  onPress={() => {
                    setActiveListView(null);
                    onNavigateToProfile?.(item.id);
                  }}
                >
                  <View style={styles.rowUserLeft}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.smallAvatarCircle} />
                    ) : (
                      <View style={styles.smallAvatarCircle}>
                        <Ionicons name="person" size={18} color="#fff" />
                      </View>
                    )}
                    <View>
                      <Text style={[styles.rowUserName, { color: theme.text }]}>{item.name || 'მომხმარებელი'}</Text>
                      {(item.username || item.sphere) && (
                        <Text style={[styles.rowUserSub, { color: theme.subText }]} numberOfLines={1}>
                          {item.username ? `@${item.username}` : ''}{item.username && item.sphere ? ' · ' : ''}{item.sphere || ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.subText} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: theme.subText }]}>{t.no_users_found || 'მომხმარებლები ვერ მოიძებნა'}</Text>
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  // ფონი და ბეიჯები
  const cover = getCover(profileData?.cover_id);
  const completedJobs = reviews.filter((r: any) => r.roleType === 'worker').length;

  // 🚀 tier-ის მიხედვით ავატარის ჩარჩოს სტილი
  const tierStyle = profileData?.is_verified_company
    ? TIER_STYLES.verified
    : profileData?.tier === 'pro'
    ? TIER_STYLES.pro
    : profileData?.tier === 'premium'
    ? TIER_STYLES.premium
    : null;

  // დაბლოკილი მომხმარებლის ეკრანი (ადმინს არ ეხება)
  if (isBlocked && !isOwnProfile && !viewerIsAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,59,48,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Ionicons name="ban" size={38} color="#ff3b30" />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8, textAlign: 'center' }}>
          მომხმარებელი მიუწვდომელია
        </Text>
        <Text style={{ fontSize: 14, color: theme.subText, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
          თქვენ დაბლოკეთ ეს მომხმარებელი.
        </Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(52,199,89,0.15)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
          onPress={handleBlockToggle}
          disabled={blockLoading}
        >
          {blockLoading
            ? <ActivityIndicator size="small" color="#34c759" />
            : <><Ionicons name="lock-open-outline" size={18} color="#34c759" /><Text style={{ color: '#34c759', fontWeight: '700', fontSize: 14 }}>ბლოკის მოხსნა</Text></>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
    <Toast
      visible={toast.visible}
      type={toast.type}
      title={toast.title}
      message={toast.message}
      onHide={() => setToast(prev => ({ ...prev, visible: false }))}
    />

    {/* ავატარის გადიდება */}
    <Modal visible={avatarZoom} transparent animationType="fade" onRequestClose={() => setAvatarZoom(false)}>
      <TouchableOpacity
        style={styles.zoomOverlay}
        activeOpacity={1}
        onPress={() => setAvatarZoom(false)}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <Image
            source={{ uri: profileData?.avatar_url }}
            style={styles.zoomImage}
            resizeMode="cover"
          />
        </TouchableOpacity>

        <Text style={styles.zoomName} numberOfLines={1}>
          {profileData?.name || ''}
        </Text>

        <TouchableOpacity style={styles.zoomClose} onPress={() => setAvatarZoom(false)}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>

    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

      {/* 1. მთავარი ბარათი — ფონით */}
      <View style={[styles.mainCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>

        {/* ფონი */}
        <LinearGradient
          colors={cover.colors as any}
          start={cover.start}
          end={cover.end}
          style={styles.coverBg}
        >
          {/* ბეიჯები — ფონზე მიმოფანტული (web-ის ანალოგიით) */}
          {shownBadges.length > 0 && (
            <View style={styles.badgesScatter} pointerEvents="box-none">
              {shownBadges.map((b, i) => {
                const pos = BADGE_POSITIONS[i % BADGE_POSITIONS.length];
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => showToast('info', b.name, b.description)}
                    activeOpacity={0.8}
                    style={{
                      position: 'absolute',
                      top: pos.top,
                      left: pos.left,
                      transform: [{ rotate: `${pos.rotate}deg` }],
                    }}
                  >
                    <Image
                      source={b.image}
                      style={{ width: pos.size, height: pos.size, opacity: 0.65 }}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </LinearGradient>

        {/* შიგთავსი */}
        <View style={styles.cardBody}>

          {/* ავატარი — ფონზე გადმოსული */}
          <View style={styles.avatarContainer}>
            {tierStyle ? (
              <LinearGradient
                colors={tierStyle.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.avatarGradientWrap,
                  {
                    shadowColor: tierStyle.glow,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.55,
                    shadowRadius: 10,
                    elevation: 8,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.avatarBoxInner}
                  onPress={() => profileData?.avatar_url && setAvatarZoom(true)}
                  activeOpacity={profileData?.avatar_url ? 0.85 : 1}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : profileData?.avatar_url ? (
                    <Image source={{ uri: profileData.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={38} color="#fff" />
                  )}
                </TouchableOpacity>
              </LinearGradient>
            ) : (
              <TouchableOpacity
                style={styles.avatarBox}
                onPress={() => profileData?.avatar_url && setAvatarZoom(true)}
                activeOpacity={profileData?.avatar_url ? 0.85 : 1}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : profileData?.avatar_url ? (
                  <Image source={{ uri: profileData.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={38} color="#fff" />
                )}
              </TouchableOpacity>
            )}

            {/* ონლაინ სტატუსი */}
            {!isOwnProfile && (
              <View
                style={[
                  styles.statusGlowDot,
                  {
                    backgroundColor: isUserOnline(profileData) ? '#4CD964' : '#FF3B30',
                    borderColor: theme.cardBg,
                    shadowColor: isUserOnline(profileData) ? '#4CD964' : '#FF3B30'
                  }
                ]}
              />
            )}

            {isOwnProfile && (
              <TouchableOpacity
                style={styles.editAvatarButton}
                onPress={handlePickAndUploadAvatar}
                disabled={uploadingAvatar}
              >
                <Ionicons name="camera" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* ინფო */}
          <View style={[styles.nameRow, { flexWrap: 'wrap', rowGap: 6 }]}>
            <Text style={[styles.profileName, { color: theme.text }]} numberOfLines={1}>
              {profileData?.name || (t.no_name || 'სახელი არ არის')}
            </Text>
            {profileData?.is_verified_company && (
              <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
            )}
            {(profileData?.tier === 'pro' || profileData?.tier === 'premium' || profileData?.is_verified_company) && (
              <TierBadge tier={profileData?.tier} verified={profileData?.is_verified_company} />
            )}
          </View>

          {profileData?.looking_for_work && profileData?.account_type !== 'company' && (
            <View style={styles.lookingForWorkPill}>
              <View style={styles.lookingForWorkDot} />
              <Text style={styles.lookingForWorkText}>ვეძებ სამსახურს</Text>
            </View>
          )}

          <Text style={styles.profileTitle} numberOfLines={1}>
            {profileData?.sphere || (t.specialist || 'სპეციალისტი')}
          </Text>

          {profileData?.created_at && (
            <Text style={[styles.joinedText, { color: theme.subText }]}>
              {'გაწევრიანდა'} {new Date(profileData.created_at).toLocaleDateString('ka-GE', { year: 'numeric', month: 'long' })}
            </Text>
          )}

          {((profileData?.contact_email && (isOwnProfile || profileData?.show_contact_email)) ||
            (profileData?.phone_number && (isOwnProfile || profileData?.show_phone))) && (
            <View style={styles.contactChipsRow}>
              {profileData?.contact_email && (isOwnProfile || profileData?.show_contact_email) && (
                <TouchableOpacity
                  style={[styles.contactChip, { backgroundColor: theme.bg, borderColor: theme.border }]}
                  onPress={() => Linking.openURL(`mailto:${profileData.contact_email}`)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="mail-outline" size={13} color={theme.subText} />
                  <Text style={[styles.contactChipText, { color: theme.subText }]} numberOfLines={1}>
                    {profileData.contact_email}
                  </Text>
                </TouchableOpacity>
              )}
              {profileData?.phone_number && (isOwnProfile || profileData?.show_phone) && (
                <TouchableOpacity
                  style={[styles.contactChip, { backgroundColor: theme.bg, borderColor: theme.border }]}
                  onPress={() => Linking.openURL(`tel:${profileData.phone_number}`)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="call-outline" size={13} color={theme.subText} />
                  <Text style={[styles.contactChipText, { color: theme.subText }]} numberOfLines={1}>
                    {profileData.phone_number}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ღილაკები */}
          <View style={styles.actionsRow}>
            {isOwnProfile ? (
              <>
                <View style={styles.actionsGroupRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'rgba(91, 66, 245, 0.12)' }]}
                    onPress={onNavigateToRequests}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="mail" size={16} color="#5B42F5" />
                    <Text style={[styles.actionLabel, { color: '#5B42F5' }]} numberOfLines={1}>
                      {t.requests_label || 'მოთხოვნები'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'rgba(255, 149, 0, 0.12)' }]}
                    onPress={openPortfolio}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="briefcase" size={16} color="#ff9500" />
                    <Text style={[styles.actionLabel, { color: '#ff9500' }]} numberOfLines={1}>
                      {t.portfolio_label || 'პორტფოლიო'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.actionsGroupRow}>
                  <TouchableOpacity
                    style={[styles.iconActionBtn, styles.iconActionBtnFlex, { backgroundColor: 'rgba(91, 66, 245, 0.12)' }]}
                    onPress={onNavigateToBadges}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="ribbon-outline" size={18} color="#5B42F5" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.iconActionBtn, styles.iconActionBtnFlex, { backgroundColor: 'rgba(255, 149, 0, 0.12)' }]}
                    onPress={() => setResumeModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#ff9500" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.iconActionBtn, styles.iconActionBtnFlex, { backgroundColor: 'rgba(142,142,147,0.14)' }]}
                    onPress={() => setShareSheetVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="share-social-outline" size={18} color={theme.subText} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: isFollowing ? 'rgba(52, 199, 89, 0.14)' : '#5B42F5' }
                  ]}
                  onPress={handleFollowToggle}
                  disabled={followLoading}
                  activeOpacity={0.85}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? '#34c759' : '#fff'} />
                  ) : (
                    <>
                      <Ionicons
                        name={isFollowing ? 'checkmark-circle' : 'person-add'}
                        size={16}
                        color={isFollowing ? '#34c759' : '#fff'}
                      />
                      <Text style={[styles.actionLabel, { color: isFollowing ? '#34c759' : '#fff' }]} numberOfLines={1}>
                        {isFollowing ? (t.following_btn || 'გამოწერილი') : (t.follow_btn || 'გამოწერა')}
                      </Text>
                    </>
                                   )}
                </TouchableOpacity>

                {isFollowing && (
                  <TouchableOpacity
                    style={[
                      styles.iconActionBtn,
                      { backgroundColor: notifyEmail || notifyPush || notifySms ? 'rgba(55,181,98,0.14)' : 'rgba(142,142,147,0.14)' },
                    ]}
                    onPress={() => setNotifyModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={notifyEmail || notifyPush || notifySms ? 'notifications' : 'notifications-outline'}
                      size={17}
                      color={notifyEmail || notifyPush || notifySms ? '#34c759' : theme.subText}
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: 'rgba(255, 149, 0, 0.12)' }]}
                  onPress={openPortfolio}
                  activeOpacity={0.8}
                >
                  <Ionicons name="briefcase" size={16} color="#ff9500" />
                  <Text style={[styles.actionLabel, { color: '#ff9500' }]} numberOfLines={1}>
                    {t.portfolio_label || 'პორტფოლიო'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: 'rgba(142,142,147,0.14)' }]}
                  onPress={() => setReportOpen(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flag-outline" size={17} color={theme.subText} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: isBlocked ? 'rgba(52,199,89,0.14)' : 'rgba(255,59,48,0.12)' }]}
                  onPress={handleBlockToggle}
                  disabled={blockLoading}
                  activeOpacity={0.8}
                >
                  {blockLoading
                    ? <ActivityIndicator size="small" color="#ff3b30" />
                    : <Ionicons name={isBlocked ? 'lock-open-outline' : 'ban-outline'} size={17} color={isBlocked ? '#34c759' : '#ff3b30'} />}
                </TouchableOpacity>

                {viewerIsAdmin && (
                  <TouchableOpacity
                    style={[styles.iconActionBtn, { backgroundColor: 'rgba(255,59,48,0.12)' }]}
                    onPress={() => onOpenAdminChat?.(activeProfileId!)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shield-checkmark-outline" size={17} color="#ff3b30" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: 'rgba(142,142,147,0.14)' }]}
                  onPress={() => setShareSheetVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={17} color={theme.subText} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Stats grid — web-ის ანალოგიით */}
          <View style={[styles.statsRow, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <TouchableOpacity style={styles.statBox} onPress={() => openFollowList('followers')} activeOpacity={0.7}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{followersCount}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>{t.pf_followers || 'გამომწერი'}</Text>
            </TouchableOpacity>

            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.statBox} onPress={() => openFollowList('following')} activeOpacity={0.7}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{followingCount}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>{t.pf_following || 'გამოწერილი'}</Text>
            </TouchableOpacity>

            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{reviews.length}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>{t.pf_reviews || 'შეფასება'}</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#5B42F5' }]}>
                {profileData?.rating !== null && profileData?.rating !== undefined ? Number(profileData.rating).toFixed(1) : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>{t.pf_rating || 'რეიტინგი'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. ჩემ შესახებ */}
      <Text style={[styles.sectionHeader, { color: theme.subText }]}>{t.about_me || 'ჩემ შესახებ'}</Text>
      <View style={[styles.bioCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.bioText, { color: theme.text }]}>{profileData?.bio || (t.no_bio || 'აღწერა ჯერ არ არის დამატებული.')}</Text>
      </View>

      {/* 4. უნარები */}
      <Text style={[styles.sectionHeader, { color: theme.subText }]}>{t.skills_tech || 'უნარები და ტექნოლოგიები'}</Text>
      <View style={styles.skillsContainer}>
        {userSkills.length > 0 ? (
          userSkills.map((skill: string, index: number) => (
            <View key={index} style={[styles.skillTag, { backgroundColor: theme.tagBg }]}>
              <Text style={[styles.skillText, { color: theme.text }]}>{skill}</Text>
            </View>
          ))
        ) : (
          <View style={[styles.emptySkillsBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Ionicons name="pricetags-outline" size={18} color={theme.subText} />
            <Text style={[styles.emptySkillsText, { color: theme.subText }]}>
              {isOwnProfile ? 'უნარები ჯერ არ დაგიმატებია' : 'უნარები არ არის მითითებული'}
            </Text>
          </View>
        )}
      </View>

      {/* დეტალები — ერთიანი ბარათი (ინფო + ენები + გამოცდილება + განათლება), თხელი გამყოფებით */}
      <Text style={[styles.sectionHeader, { color: theme.subText }]}>დეტალები</Text>
      <View style={[styles.unifiedCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>

        {profileData?.portfolio_url && (
          <>
            <TouchableOpacity style={styles.detailRow} onPress={openPortfolio} activeOpacity={0.75}>
              <Ionicons name="link-outline" size={16} color="#5B42F5" />
              <Text style={[styles.infoRowText, { color: '#5B42F5' }]}>პორტფოლიო</Text>
            </TouchableOpacity>
            <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
          </>
        )}

        {profileData?.location && (
          <>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={theme.subText} />
              <Text style={[styles.infoRowText, { color: theme.text }]}>{profileData.location}</Text>
            </View>
            <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
          </>
        )}

        {profileData?.availability && (
          <>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={theme.subText} />
              <Text style={[styles.infoRowText, { color: theme.text }]}>{profileData.availability}</Text>
            </View>
            <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
          </>
        )}

        {profileData?.salary_expect && (
          <>
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color={theme.subText} />
              <Text style={[styles.infoRowText, { color: '#5B42F5', fontWeight: '700' }]}>{profileData.salary_expect}</Text>
            </View>
            <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
          </>
        )}

        {languages.length > 0 && (
          <>
            <View style={styles.detailSection}>
              <View style={styles.detailSectionLabelRow}>
                <Ionicons name="language-outline" size={16} color={theme.subText} />
                <Text style={[styles.detailSectionLabel, { color: theme.subText }]}>ენები</Text>
              </View>
              <View style={styles.langChipsRow}>
                {languages.map((l: any, i: number) => (
                  <View key={l.id || i} style={styles.langBadge}>
                    <Text style={styles.langBadgeText}>{l.name}{l.level ? ` · ${l.level}` : ''}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
          </>
        )}

        <View style={styles.detailSection}>
          <View style={styles.detailSectionLabelRow}>
            <Ionicons name="briefcase-outline" size={16} color={theme.subText} />
            <Text style={[styles.detailSectionLabel, { color: theme.subText }]}>გამოცდილება</Text>
          </View>
          {experience.length === 0 ? (
            <Text style={[styles.bioText, { color: theme.subText, paddingLeft: 26 }]}>
              {isOwnProfile ? 'ჯერ არაფერი დაგიმატებია. დაამატე რედაქტირებიდან.' : 'ინფორმაცია არ არის'}
            </Text>
          ) : (
            <View style={styles.timelineWrap}>
              <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
              {experience.map((e: any, i: number) => (
                <View key={e.id || i} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: e.current ? '#5B42F5' : theme.border, borderColor: theme.cardBg }]} />
                  <Text style={[styles.timelineTitle, { color: theme.text }]}>{e.company}</Text>
                  {!!e.position && <Text style={[styles.timelineSub, { color: theme.subText }]}>{e.position}</Text>}
                  <Text style={[styles.timelinePeriod, { color: theme.subText }]}>
                    {fmtPeriod(e.from)} — {e.current ? 'დღემდე' : fmtPeriod(e.to)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {education.length > 0 && (
          <>
            <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
            <View style={styles.detailSection}>
              <View style={styles.detailSectionLabelRow}>
                <Ionicons name="school-outline" size={16} color={theme.subText} />
                <Text style={[styles.detailSectionLabel, { color: theme.subText }]}>განათლება</Text>
              </View>
              <View style={styles.timelineWrap}>
                <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                {education.map((e: any, i: number) => (
                  <View key={e.id || i} style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: e.current ? '#5B42F5' : theme.border, borderColor: theme.cardBg }]} />
                    <Text style={[styles.timelineTitle, { color: theme.text }]}>{e.school}</Text>
                    {!!e.degree && <Text style={[styles.timelineSub, { color: theme.subText }]}>{e.degree}</Text>}
                    <Text style={[styles.timelinePeriod, { color: theme.subText }]}>
                      {fmtPeriod(e.from)} — {e.current ? 'დღემდე' : fmtPeriod(e.to)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </View>

      {/* აქტიური განცხადებები */}
      {jobs.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { color: theme.subText }]}>
            აქტიური განცხადებები ({jobs.length})
          </Text>
          <View style={styles.jobsGrid}>
            {jobs.map((j) => (
              <View key={j.id} style={[styles.jobCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.jobCardTop}>
                  <Text style={[styles.jobCardTitle, { color: theme.text }]} numberOfLines={2}>
                    {j.position_title || j.title}
                  </Text>
                  {j.is_urgent && (
                    <View style={styles.jobUrgentTag}>
                      <Text style={styles.jobUrgentText}>სასწრაფო</Text>
                    </View>
                  )}
                </View>
                <View style={styles.jobMetaRow}>
                  {!!j.budget && <Text style={styles.jobBudget}>{j.budget}</Text>}
                  {!!j.location && <Text style={[styles.jobLocation, { color: theme.subText }]}>{j.location}</Text>}
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 5. სამეული — pill-style სეგმენტირებული კონტროლი */}
      <View style={[styles.segmentedControl, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.segmentPill, activeProfileTab === 'worker' && styles.segmentPillActive]}
          onPress={() => setActiveProfileTab('worker')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              { color: activeProfileTab === 'worker' ? '#fff' : theme.subText },
            ]}
            numberOfLines={1}
          >
            {t.tab_completed || 'შესრულებული'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentPill, activeProfileTab === 'employer' && styles.segmentPillActive]}
          onPress={() => setActiveProfileTab('employer')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              { color: activeProfileTab === 'employer' ? '#fff' : theme.subText },
            ]}
            numberOfLines={1}
          >
            {t.tab_jobs || 'ვაკანსიები'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentPill,
            activeProfileTab === 'cancelled' && { backgroundColor: '#ff3b30' },
          ]}
          onPress={() => setActiveProfileTab('cancelled')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              { color: activeProfileTab === 'cancelled' ? '#fff' : '#ff3b30' },
            ]}
            numberOfLines={1}
          >
            {t.tab_cancelled || 'შეწყვეტილი'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rating breakdown summary — web-ის ანალოგიით */}
      {!loadingReviews && activeProfileTab !== 'cancelled' && (() => {
        const filtered = reviews.filter(r => r.roleType === activeProfileTab);
        if (filtered.length === 0) return null;
        const avg = filtered.reduce((a, r) => a + (r.stars || 0), 0) / filtered.length;
        const dist = [5, 4, 3, 2, 1].map(s => ({ s, count: filtered.filter(r => r.stars === s).length }));
        return (
          <View style={[styles.ratingSummaryCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.ratingSummaryLeft}>
              <Text style={styles.ratingSummaryAvg}>{avg.toFixed(1)}</Text>
              <View style={{ flexDirection: 'row', gap: 2, marginTop: 6 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <Ionicons key={n} name={n <= Math.round(avg) ? 'star' : 'star-outline'} size={13} color="#f5a623" />
                ))}
              </View>
              <Text style={[styles.ratingSummaryCount, { color: theme.subText }]}>{filtered.length} შეფასება</Text>
            </View>
            <View style={styles.ratingSummaryRight}>
              {dist.map(({ s, count }) => {
                const pct = filtered.length ? (count / filtered.length) * 100 : 0;
                return (
                  <View key={s} style={styles.ratingBarRow}>
                    <Text style={[styles.ratingBarLabel, { color: theme.subText }]}>{s}</Text>
                    <Ionicons name="star" size={10} color="#f5a623" />
                    <View style={[styles.ratingBarTrack, { backgroundColor: theme.bg }]}>
                      <View style={[styles.ratingBarFill, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={[styles.ratingBarCount, { color: theme.subText }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* შეფასებებისა და შეწყვეტების სია */}
      {loadingReviews ? (
        <ActivityIndicator size="small" color="#5B42F5" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.reviewsListContainer}>
          {reviews.filter(r => r.roleType === activeProfileTab).length > 0 ? (
            reviews.filter(r => r.roleType === activeProfileTab).map((rev) => {
              
              if (activeProfileTab === 'cancelled') {
                return (
                  <View key={rev.id} style={[styles.cardCancelled, { backgroundColor: isDarkMode ? '#2c1616' : '#fff5f5' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: '#ff3b30', fontSize: 13, fontWeight: '700' }}>{t.cancelled_early || '⚠️ დროზე ადრე შეწყვეტილი'}</Text>
                      <Text style={{ color: theme.subText, fontSize: 11 }}>
                        {new Date(rev.created_at).toLocaleDateString('ka-GE')}
                      </Text>
                    </View>
                    <Text style={[styles.reviewTitleText, { color: theme.text, marginBottom: 4 }]}>
                      {t.project_label || 'პროექტი:'} {rev.job_title}
                    </Text>
                    <Text style={[styles.reviewDescText, { color: theme.text, fontWeight: '600' }]}>
                      {t.reason_label || 'მიზეზი:'} <Text style={{ fontWeight: '400', color: isDarkMode ? '#ffbcaf' : '#555' }}>{rev.review_details}</Text>
                    </Text>
                  </View>
                );
              }

              const sentiment = rev.stars >= 4
                ? { label: 'კმაყოფილი', color: '#37B562', bg: 'rgba(55,181,98,0.1)' }
                : rev.stars >= 3
                ? { label: 'ნეიტრალური', color: '#f5a623', bg: 'rgba(245,166,35,0.1)' }
                : { label: 'უკმაყოფილო', color: '#D9463A', bg: 'rgba(217,70,58,0.1)' };
              return (
                <View key={rev.id} style={[styles.reviewCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <Ionicons name="chatbox-ellipses" size={44} color={theme.subText} style={styles.reviewQuoteIcon} />

                  <View style={styles.reviewTop}>
                    <View style={styles.reviewerMeta}>
                      <View style={styles.reviewerAvatarPlaceholder}>
                        <Text style={styles.reviewerAvatarInitial}>{(rev.reviewer_name || '?').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reviewerName, { color: theme.text }]} numberOfLines={1}>{rev.reviewer_name}</Text>
                        <Text style={styles.reviewJobTitle} numberOfLines={1}>{rev.job_title}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= rev.stars ? "star" : "star-outline"}
                            size={12}
                            color="#f5a623"
                          />
                        ))}
                      </View>
                      <Text style={{ fontSize: 10, color: theme.subText }}>
                        {rev.created_at ? new Date(rev.created_at).toLocaleDateString('ka-GE') : ''}
                      </Text>
                    </View>
                  </View>

                  {!!rev.review_title && <Text style={[styles.reviewTitleText, { color: theme.text }]}>{rev.review_title}</Text>}
                  {!!rev.review_details && (
                    <View style={styles.reviewQuoteBar}>
                      <Text style={[styles.reviewDescText, { color: theme.subText }]}>{rev.review_details}</Text>
                    </View>
                  )}

                  <View style={[styles.reviewFooter, { borderTopColor: theme.border }]}>
                    <View style={[styles.sentimentTag, { backgroundColor: sentiment.bg }]}>
                      <Text style={[styles.sentimentTagText, { color: sentiment.color }]}>{sentiment.label}</Text>
                    </View>
                    <Text style={{ fontSize: 10.5, color: theme.subText, marginLeft: 'auto' }}>
                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={[styles.noReviewsText, { color: theme.subText }]}>{t.no_reviews_found || 'შესაბამისი ჩანაწერები ჯერ არ მოიძებნა'}</Text>
          )}
        </View>
      )}

    </ScrollView>

    <Modal
      visible={notifyModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setNotifyModalVisible(false)}
    >
      <View style={styles.notifyOverlay}>
        <View style={[styles.notifyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.notifyTitle, { color: theme.text }]}>შეტყობინებები</Text>
          <Text style={[styles.notifySub, { color: theme.subText }]}>
            აირჩიე, როგორ გინდა რომ შეგატყობინოთ {profileData?.name || 'ამ მომხმარებლის'} აქტივობაზე
          </Text>

          <View style={[styles.notifyRow, { borderColor: theme.border }]}>
            <Text style={[styles.notifyRowLabel, { color: theme.text }]}>ელფოსტა</Text>
            <TouchableOpacity
              style={[styles.notifySwitch, { backgroundColor: notifyEmail ? '#5B42F5' : theme.border }]}
              onPress={() => setNotifyEmail((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.notifySwitchThumb, notifyEmail && styles.notifySwitchThumbActive]} />
            </TouchableOpacity>
          </View>

          <View style={[styles.notifyRow, { borderColor: theme.border }]}>
            <Text style={[styles.notifyRowLabel, { color: theme.text }]}>Push შეტყობინება</Text>
            <TouchableOpacity
              style={[styles.notifySwitch, { backgroundColor: notifyPush ? '#5B42F5' : theme.border }]}
              onPress={() => setNotifyPush((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.notifySwitchThumb, notifyPush && styles.notifySwitchThumbActive]} />
            </TouchableOpacity>
          </View>

          <View style={[styles.notifyRow, { borderColor: theme.border, borderBottomWidth: 0 }]}>
            <Text style={[styles.notifyRowLabel, { color: theme.text }]}>SMS</Text>
            <TouchableOpacity
              style={[styles.notifySwitch, { backgroundColor: notifySms ? '#5B42F5' : theme.border }]}
              onPress={() => setNotifySms((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.notifySwitchThumb, notifySms && styles.notifySwitchThumbActive]} />
            </TouchableOpacity>
          </View>

          <View style={styles.notifyBtnRow}>
            <TouchableOpacity
              style={[styles.notifyCancelBtn, { borderColor: theme.border }]}
              onPress={() => setNotifyModalVisible(false)}
            >
              <Text style={[styles.notifyCancelText, { color: theme.text }]}>გაუქმება</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notifySaveBtn}
              onPress={saveNotifyPrefs}
              disabled={notifySaving}
            >
              {notifySaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.notifySaveText}>შენახვა</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    <Modal
      visible={resumeModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setResumeModalVisible(false)}
    >
      <View style={styles.notifyOverlay}>
        <View style={[styles.notifyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.notifyTitle, { color: theme.text }]}>PDF რეზიუმე</Text>
          <Text style={[styles.notifySub, { color: theme.subText }]}>აირჩიე შაბლონი და გააზიარე/შეინახე</Text>

          <View style={styles.templateRow}>
            {([
              { id: 'minimal', label: 'მინიმალური' },
              { id: 'classic', label: 'კლასიკური' },
              { id: 'modern', label: 'მოდერნი' },
            ] as { id: ResumeTemplateId; label: string }[]).map((tpl) => (
              <TouchableOpacity
                key={tpl.id}
                onPress={() => setResumeTemplate(tpl.id)}
                style={[
                  styles.templateChip,
                  {
                    backgroundColor: resumeTemplate === tpl.id ? '#5B42F5' : theme.bg,
                    borderColor: resumeTemplate === tpl.id ? '#5B42F5' : theme.border,
                  },
                ]}
              >
                <Text style={{ color: resumeTemplate === tpl.id ? '#fff' : theme.subText, fontSize: 12.5, fontWeight: '700' }}>
                  {tpl.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.notifyBtnRow}>
            <TouchableOpacity
              style={[styles.notifyCancelBtn, { borderColor: theme.border }]}
              onPress={() => setResumeModalVisible(false)}
              disabled={resumeGenerating}
            >
              <Text style={[styles.notifyCancelText, { color: theme.text }]}>გაუქმება</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notifySaveBtn}
              onPress={generateAndShareResume}
              disabled={resumeGenerating}
            >
              {resumeGenerating
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.notifySaveText}>PDF გაზიარება</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    <ShareSheet
      visible={shareSheetVisible}
      onClose={() => setShareSheetVisible(false)}
      url={`https://freejob.ge/profile/${activeProfileId}`}
      title={profileData?.name || 'პროფილი'}
      subtitle={profileData?.username ? `@${profileData.username}` : (profileData?.sphere || undefined)}
      avatarUrl={profileData?.avatar_url}
    />

    {!isOwnProfile && activeProfileId && (
      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="user"
        targetId={activeProfileId}
      />
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 110 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainCard: { borderRadius: 24, marginTop: 16, borderWidth: 1, overflow: 'hidden' },
  coverBg: { height: 96, width: '100%' },
badgesScatter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16 },
  avatarContainer: { position: 'relative', width: 92, marginTop: -46, marginBottom: 12 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 4 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingValue: { fontSize: 14, fontWeight: '800' },
  ratingCount: { fontSize: 11.5, fontWeight: '500' },
  actionsRow: { gap: 9, marginTop: 14 },
  actionsGroupRow: { flexDirection: 'row', gap: 9 },
  iconActionBtnFlex: { flex: 1, width: undefined },
  iconActionBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13, paddingVertical: 12, paddingHorizontal: 8 },
  actionLabel: { fontSize: 12.5, fontWeight: '700' },
  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  zoomImage: { width: Dimensions.get('window').width * 0.82, height: Dimensions.get('window').width * 0.82, borderRadius: 24 },
  zoomName: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 22 },
  zoomClose: { position: 'absolute', top: 54, right: 22, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  emptySkillsBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', width: '100%' },
  emptySkillsText: { fontSize: 13, fontWeight: '500' },
  avatarBox: { width: 92, height: 92, borderRadius: 18, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3.5, borderColor: 'rgba(255,255,255,0.22)' },
  avatarGradientWrap: { width: 92, height: 92, borderRadius: 21, padding: 3.5, justifyContent: 'center', alignItems: 'center' },
  avatarBoxInner: { width: '100%', height: '100%', borderRadius: 17, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  editAvatarButton: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.65)', width: 27, height: 27, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', zIndex: 10 },
  
  // 🚀 🟢🔴 სტილები პროფილის სტატუსის მბზინავი სფეროსთვის
  statusGlowDot: { position: 'absolute', bottom: 6, right: 6, width: 15, height: 15, borderRadius: 8, borderWidth: 2.5, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 5, zIndex: 10 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  profileName: { fontSize: 20, fontWeight: '800' },
  profileTitle: { color: '#5B42F5', fontSize: 12.5, fontWeight: '600', marginTop: 2, marginBottom: 10 },

  followTouch: { paddingVertical: 3 },
  followText: { fontSize: 13, fontWeight: '500' },
  followNumber: { fontWeight: '700' },
  followDivider: { width: 1, height: 14, marginHorizontal: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 16, marginTop: 16, borderWidth: 1 },
  statBox: { alignItems: 'center', justifyContent: 'center', flex: 1, height: 44 },
  statNumber: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  iconWrapper: { height: 20, marginBottom: 2, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  statDivider: { width: 1, height: 28 },
  sectionHeader: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 24, marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  bioCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  bioText: { fontSize: 14, lineHeight: 22 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  skillTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, margin: 4 },
  skillText: { fontSize: 12, fontWeight: '500' },
  listHeaderRow: { paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButtonText: { color: '#5B42F5', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  listTitle: { fontSize: 20, fontWeight: '700' },
  listSearchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 44, marginHorizontal: 16, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  listSearchInput: { flex: 1, fontSize: 14, height: '100%' },
  listLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  listScrollContent: { paddingHorizontal: 16, paddingBottom: 110 },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  rowUserLeft: { flexDirection: 'row', alignItems: 'center' },
  smallAvatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowUserName: { fontSize: 15, fontWeight: '600' },
  rowUserSub: { fontSize: 12, marginTop: 1, maxWidth: 220 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14, fontWeight: '500' },
  segmentedControl: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, borderWidth: 1, marginTop: 24, marginBottom: 14 },
  segmentPill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10 },
  segmentPillActive: { backgroundColor: '#5B42F5' },
  segmentText: { fontSize: 12, fontWeight: '700' },
  reviewsListContainer: { gap: 10, marginTop: 4 },
  reviewCard: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reviewerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 },
  reviewerAvatarPlaceholder: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' },
  reviewerAvatarInitial: { color: '#fff', fontSize: 15, fontWeight: '700' },
  reviewQuoteIcon: { position: 'absolute', top: 12, right: 14, opacity: 0.05 },
  reviewQuoteBar: { borderLeftWidth: 2, borderLeftColor: 'rgba(245,166,35,0.35)', paddingLeft: 10, marginTop: 4 },
  reviewFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  sentimentTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  sentimentTagText: { fontSize: 11.5, fontWeight: '700' },

  // Rating breakdown summary
  ratingSummaryCard: { flexDirection: 'row', gap: 20, padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  ratingSummaryLeft: { alignItems: 'center', minWidth: 76 },
  ratingSummaryAvg: { fontSize: 44, fontWeight: '800', color: '#f5a623', lineHeight: 48 },
  ratingSummaryCount: { fontSize: 11, fontWeight: '600', marginTop: 6 },
  ratingSummaryRight: { flex: 1, justifyContent: 'center', gap: 7 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingBarLabel: { fontSize: 11, fontWeight: '700', width: 8 },
  ratingBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  ratingBarFill: { height: 6, borderRadius: 3, backgroundColor: '#f5a623' },
  ratingBarCount: { fontSize: 11, fontWeight: '600', width: 16, textAlign: 'right' },
  reviewerName: { fontSize: 13, fontWeight: '700' },
  reviewJobTitle: { fontSize: 11, color: '#5B42F5', fontWeight: '600', marginTop: 1 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewTitleText: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  reviewDescText: { fontSize: 12, lineHeight: 18 },
  noReviewsText: { textAlign: 'center', marginTop: 20, fontSize: 13, fontWeight: '500' },
  cardCancelled: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#ff3b30', marginBottom: 10, borderStyle: 'solid' },

  // შეტყობინებების მოდალი
  notifyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  notifyCard: { width: '100%', borderRadius: 20, borderWidth: 1, padding: 20 },
  notifyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  notifySub: { fontSize: 12.5, lineHeight: 18, marginBottom: 16 },
  notifyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  notifyRowLabel: { fontSize: 14, fontWeight: '600' },
  notifySwitch: { width: 44, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  notifySwitchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  notifySwitchThumbActive: { alignSelf: 'flex-end' },
  notifyBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  notifyCancelBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  notifyCancelText: { fontSize: 14, fontWeight: '600' },
  notifySaveBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' },
  notifySaveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  templateRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  templateChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },

  lookingForWorkPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(55,181,98,0.15)', borderWidth: 1, borderColor: 'rgba(55,181,98,0.3)', marginBottom: 6 },
  lookingForWorkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#37B562' },
  lookingForWorkText: { fontSize: 11.5, fontWeight: '700', color: '#37B562' },
  joinedText: { fontSize: 10.5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  contactChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  contactChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, borderWidth: 1, maxWidth: 200 },
  contactChipText: { fontSize: 11.5, fontWeight: '500' },

  // ერთიანი "დეტალები" ბარათი
  unifiedCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  detailDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  detailSection: { paddingHorizontal: 16, paddingVertical: 14 },
  detailSectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  detailSectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoRowText: { fontSize: 13.5, fontWeight: '500', flexShrink: 1 },
  langChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 26 },
  langBadge: { backgroundColor: 'rgba(91,66,245,0.14)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  langBadgeText: { color: '#5B42F5', fontSize: 11, fontWeight: '700' },

  // Timeline (გამოცდილება/განათლება)
  timelineWrap: { position: 'relative', paddingLeft: 26 },
  timelineLine: { position: 'absolute', left: 4, top: 6, bottom: 6, width: 1 },
  timelineItem: { position: 'relative', marginBottom: 18 },
  timelineDot: { position: 'absolute', left: -20, top: 3, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  timelineTitle: { fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  timelineSub: { fontSize: 12, marginTop: 2 },
  timelinePeriod: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 5 },

  // აქტიური განცხადებები
  jobsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  jobCard: { width: '48.5%', padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  jobCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 8 },
  jobCardTitle: { flex: 1, fontSize: 12.5, fontWeight: '700', lineHeight: 17 },
  jobUrgentTag: { backgroundColor: 'rgba(255,59,48,0.12)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  jobUrgentText: { color: '#ff3b30', fontSize: 9, fontWeight: '800' },
  jobMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  jobBudget: { color: '#5B42F5', fontSize: 11.5, fontWeight: '700' },
  jobLocation: { fontSize: 11, fontWeight: '500' },
});