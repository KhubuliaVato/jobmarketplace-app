import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა

interface ProfileViewProps {
  onNavigateToRequests: () => void;
  targetUserId?: string | null; 
}

export default function ProfileView({ onNavigateToRequests, targetUserId = null }: ProfileViewProps) {
  const myUserId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.userName);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t = translations[language as LanguageType] || translations.ka;

  const activeProfileId = targetUserId || myUserId;
  const isOwnProfile = !targetUserId || targetUserId === myUserId;

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [activeListView, setActiveListView] = useState<'followers' | 'following' | null>(null);
  const [listData, setListData] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [reviews, setReviews] = useState<any[]>([]);
  const [activeProfileTab, setActiveProfileTab] = useState<'worker' | 'employer' | 'cancelled'>('worker');
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchUserProfile = async () => {
    if (!activeProfileId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', activeProfileId)
        .single();

      if (error) throw error;
      setProfileData(data);
      
      await checkFollowStatus();
      await fetchFollowCounts();
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
        Alert.alert('წვდომა უარყოფილია ⚠️', 'პროფილის სურათის შესაცვლელად საჭიროა გალერეის ნებართვა.');
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
      Alert.alert('შეცდომა ❌', err.message || 'სურათის ატვირთვა ვერ მოხერხდა');
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
      let query = supabase.from('follows').select('*');
      if (type === 'followers') {
        query = query.eq('followed_id', activeProfileId);
      } else {
        query = query.eq('follower_id', activeProfileId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setListData(data || []);
    } catch (error: any) {
      Alert.alert('შეცდომა ❌', 'სიის ჩატვირთვა ვერ მოხერხდა');
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
    } catch (error: any) {
      console.error('სტატუსის შემოწმების შეცდომა:', error.message);
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
      Alert.alert('შეცდომა ❌', error.message || 'ოპერაცია ვერ შესრულდა');
    } finally {
      setFollowLoading(false);
    }
  };

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

  const openPortfolio = async () => {
    const url = profileData?.portfolio_url;
    if (url) {
      const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
      const supported = await Linking.canOpenURL(formattedUrl);
      if (supported) {
        await Linking.openURL(formattedUrl);
      } else {
        Alert.alert('შეცდომა', 'მოცემული პორტფოლიოს ბმული არასწორია');
      }
    } else {
      Alert.alert('ინფორმაცია', 'მომხმარებელს პორტფოლიოს ბმული არ აქვს მითითებული');
    }
  };

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    tagBg: isDarkMode ? '#222227' : '#e5e5ea',
    searchBg: isDarkMode ? '#222227' : '#e5e5ea',
  };

  const filteredList = listData.filter((item) => {
    const nameToSearch = activeListView === 'followers' ? item.follower_name : item.followed_name;
    return nameToSearch?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const userSkills = profileData?.skills 
    ? profileData.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
    : ['React Native', 'TypeScript', 'UI/UX დიზაინი', 'Supabase'];

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
              filteredList.map((item) => {
                const displayName = activeListView === 'followers' ? item.follower_name : item.followed_name;
                return (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[styles.userRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                    onPress={() => Alert.alert('პროფილი', `მომავალში გაიხსნება ${displayName}-ის პირადი პროფილი`)}
                  >
                    <View style={styles.rowUserLeft}>
                      <View style={styles.smallAvatarCircle}>
                        <Ionicons name="person" size={18} color="#fff" />
                      </View>
                      <Text style={[styles.rowUserName, { color: theme.text }]}>{displayName || 'მომხმარებელი'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.subText} />
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={[styles.emptyText, { color: theme.subText }]}>{t.no_users_found || 'მომხმარებლები ვერ მოიძებნა'}</Text>
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* 1. მთავარი ბარათი */}
      <View style={[styles.mainCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : profileData?.avatar_url ? (
              <Image source={{ uri: profileData.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={44} color="#fff" />
            )}
          </View>
          
          {/* 🚀 🟢/🔴 მომხმარებლის ონლაინ სტატუსის მანათობელი წერტილი */}
          {!isOwnProfile && (
            <View 
              style={[
                styles.statusGlowDot, 
                { 
                  backgroundColor: profileData?.user_status === 'online' ? '#4CD964' : '#FF3B30',
                  borderColor: theme.cardBg,
                  shadowColor: profileData?.user_status === 'online' ? '#4CD964' : '#FF3B30'
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
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.profileName, { color: theme.text }]}>{profileData?.name || (t.no_name || 'სახელი არ არის')}</Text>
        <Text style={styles.profileTitle}>{profileData?.sphere || (t.specialist || 'სპეციალისტი')}</Text>
        
        <View style={styles.followRow}>
          <TouchableOpacity style={styles.followTouch} onPress={() => openFollowList('followers')}>
            <Text style={[styles.followText, { color: theme.text }]}>
              <Text style={styles.followNumber}>{followersCount}</Text> {t.follower_txt || 'გამომწერი'}
            </Text>
          </TouchableOpacity>
          
          <View style={[styles.followDivider, { backgroundColor: theme.border }]} />
          
          <TouchableOpacity style={styles.followTouch} onPress={() => openFollowList('following')}>
            <Text style={[styles.followText, { color: theme.text }]}>
              <Text style={styles.followNumber}>{followingCount}</Text> {t.following_txt || 'გამოწერილი'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. სტატისტიკა */}
      <View style={[styles.statsRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: theme.text }]}>
            {profileData?.rating !== null && profileData?.rating !== undefined ? Number(profileData.rating).toFixed(1) : '5.0'}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#FFD700" />
            <Text style={[styles.statLabel, { color: theme.subText, marginLeft: 2 }]}>{t.rating_label || 'რეიტინგი'}</Text>
          </View>
        </View>
        
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

        <TouchableOpacity style={styles.statBox} onPress={onNavigateToRequests} activeOpacity={0.7}>
          <View style={styles.iconWrapper}>
            <Ionicons name="mail" size={18} color="#5B42F5" />
          </View>
          <Text style={[styles.statLabel, { color: '#5B42F5', fontWeight: '700' }]}>{t.requests_label || 'მოთხოვნები'}</Text>
        </TouchableOpacity>

        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

        <TouchableOpacity style={styles.statBox} onPress={openPortfolio} activeOpacity={0.7}>
          <View style={styles.iconWrapper}>
            <Ionicons name="briefcase" size={18} color="#5B42F5" />
          </View>
          <Text style={[styles.statLabel, { color: '#5B42F5', fontWeight: '700' }]}>{t.portfolio_label || 'პორტფოლიო'}</Text>
        </TouchableOpacity>

        {!isOwnProfile && (
          <>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.statBox} onPress={handleFollowToggle} activeOpacity={0.7} disabled={followLoading}>
              {followLoading ? (
                <ActivityIndicator size="small" color="#5B42F5" />
              ) : (
                <>
                  <View style={styles.iconWrapper}>
                    <Ionicons name={isFollowing ? "checkmark-circle" : "person-add"} size={18} color={isFollowing ? "#34c759" : "#5B42F5"} />
                  </View>
                  <Text style={[styles.statLabel, { color: isFollowing ? "#34c759" : "#5B42F5", fontWeight: '700' }]}>
                    {isFollowing ? (t.following_btn || 'გამოწერილი') : (t.follow_btn || 'გამოწერა')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 3. ჩემ შესახებ */}
      <Text style={[styles.sectionHeader, { color: theme.subText }]}>{t.about_me || 'ჩემ შესახებ'}</Text>
      <View style={[styles.bioCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.bioText, { color: theme.text }]}>{profileData?.bio || (t.no_bio || 'აღწერა ჯერ არ არის დამატებული.')}</Text>
      </View>

      {/* 4. უნარები */}
      <Text style={[styles.sectionHeader, { color: theme.subText }]}>{t.skills_tech || 'უნარები და ტექნოლოგიები'}</Text>
      <View style={styles.skillsContainer}>
        {userSkills.map((skill: string, index: number) => (
          <View key={index} style={[styles.skillTag, { backgroundColor: theme.tagBg }]}>
            <Text style={[styles.skillText, { color: theme.text }]}>{skill}</Text>
          </View>
        ))}
      </View>

      {/* 5. სამმაგი ტაბების სისტემა შეფასებებისთვის თარგმანით */}
      <View style={[styles.tabHeaderRow, { borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.profileSubTab, activeProfileTab === 'worker' && styles.profileSubTabActive]}
          onPress={() => setActiveProfileTab('worker')}
          activeOpacity={0.7}
        >
          <Text style={[styles.profileSubTabText, activeProfileTab === 'worker' && styles.profileSubTabTextActive, { color: theme.text }]}>
            {t.tab_completed || 'შესრულებული'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.profileSubTab, activeProfileTab === 'employer' && styles.profileSubTabActive]}
          onPress={() => setActiveProfileTab('employer')}
          activeOpacity={0.7}
        >
          <Text style={[styles.profileSubTabText, activeProfileTab === 'employer' && styles.profileSubTabTextActive, { color: theme.text }]}>
            {t.tab_jobs || 'ვაკანსიები'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.profileSubTab, activeProfileTab === 'cancelled' && styles.profileSubTabActive]}
          onPress={() => setActiveProfileTab('cancelled')}
          activeOpacity={0.7}
        >
          <Text style={[styles.profileSubTabText, activeProfileTab === 'cancelled' && styles.profileSubTabTextActive, { color: '#ff3b30' }]}>
            {t.tab_cancelled || 'შეწყვეტილი'}
          </Text>
        </TouchableOpacity>
      </View>

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

              return (
                <View key={rev.id} style={[styles.reviewCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <View style={styles.reviewTop}>
                    <View style={styles.reviewerMeta}>
                      <View style={styles.reviewerAvatarPlaceholder}>
                        <Ionicons name="person" size={14} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reviewerName, { color: theme.text }]} numberOfLines={1}>{rev.reviewer_name}</Text>
                        <Text style={styles.reviewJobTitle} numberOfLines={1}>{rev.job_title}</Text>
                      </View>
                    </View>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons 
                          key={s} 
                          name={s <= rev.stars ? "star" : "star-outline"} 
                          size={12} 
                          color="#FFD700" 
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={[styles.reviewTitleText, { color: theme.text }]}>{rev.review_title}</Text>
                  <Text style={[styles.reviewDescText, { color: theme.subText }]}>{rev.review_details}</Text>
                </View>
              );
            })
          ) : (
            <Text style={[styles.noReviewsText, { color: theme.subText }]}>{t.no_reviews_found || 'შესაბამისი ჩანაწერები ჯერ არ მოიძებნა'}</Text>
          )}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 110 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainCard: { alignItems: 'center', padding: 24, borderRadius: 24, marginTop: 16, borderWidth: 1 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatarCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 44 },
  editAvatarButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#222227', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#16161a', zIndex: 10 },
  
  // 🚀 🟢🔴 სტილები პროფილის სტატუსის მბზინავი სფეროსთვის
  statusGlowDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },

  profileName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  profileTitle: { color: '#5B42F5', fontSize: 13, fontWeight: '600', marginBottom: 20 },
  followRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingTop: 4 },
  followTouch: { paddingHorizontal: 10, paddingVertical: 4 },
  followText: { fontSize: 14, fontWeight: '500' },
  followNumber: { fontWeight: '700' },
  followDivider: { width: 1, height: 16, marginHorizontal: 8 },
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
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14, fontWeight: '500' },
  tabHeaderRow: { flexDirection: 'row', marginTop: 24, marginBottom: 12, borderBottomWidth: 1, paddingHorizontal: 4 },
  profileSubTab: { flex: 1, alignItems: 'center', paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  profileSubTabActive: { borderBottomColor: '#5B42F5' },
  profileSubTabText: { fontSize: 13, fontWeight: '600', opacity: 0.6 },
  profileSubTabTextActive: { opacity: 1, fontWeight: '700' },
  reviewsListContainer: { gap: 10, marginTop: 4 },
  reviewCard: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reviewerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 },
  reviewerAvatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' },
  reviewerName: { fontSize: 13, fontWeight: '700' },
  reviewJobTitle: { fontSize: 11, color: '#5B42F5', fontWeight: '600', marginTop: 1 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewTitleText: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  reviewDescText: { fontSize: 12, lineHeight: 18 },
  noReviewsText: { textAlign: 'center', marginTop: 20, fontSize: 13, fontWeight: '500' },
  cardCancelled: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#ff3b30', marginBottom: 10, borderStyle: 'solid' }
});