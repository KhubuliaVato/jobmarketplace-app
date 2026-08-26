import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageType, translations } from '../utils/translations';
import { AuroraBackground } from './AuroraBackground';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_X_THRESHOLD = SCREEN_W * 0.3;
const SWIPE_UP_THRESHOLD = -SCREEN_H * 0.18;
const HINT_KEY = 'swipe_hint_seen';

interface SwipeJobsViewProps {
  onBack: () => void;
}

type SwipeAction = 'applied' | 'dismissed' | 'saved';

function getInitials(title: string) {
  if (!title) return '?';
  const words = title.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function SwipeJobsView({ onBack }: SwipeJobsViewProps) {
  const insets = useSafeAreaInsets();

  const userId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.userName);
  const resumeUrl = useAuthStore((state) => state.resumeUrl);
  const resumeName = useAuthStore((state) => state.resumeName);
  const searchTags = useAuthStore((state) => state.searchTags);
  const setResume = useAuthStore((state) => state.setResume);
  const setSearchTags = useAuthStore((state) => state.setSearchTags);

  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t: any = translations[language as LanguageType] || translations.ka;

  const [uploading, setUploading] = useState(false);
  const [tagsInput, setTagsInput] = useState(searchTags.join(', '));

  const [jobs, setJobs] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const [showHint, setShowHint] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // სვაიფის ტაბი ყოველთვის მუქია (TikTok-ისებრ ფოკუსი), თემის მიუხედავად
  const theme = {
    bg: 'transparent',                 // aurora ფონი გამოსჭვიოს
    cardBg: 'rgba(26,26,31,0.72)',     // მინისებრი ბარათი
    text: '#f5f5f7',
    subText: '#a0a0a8',
    faint: '#6a6a72',
    border: 'rgba(255,255,255,0.08)',
    inputBg: 'rgba(255,255,255,0.06)',
    accent: '#7B6BFF',
    green: '#30d158',
    red: '#ff453a',
    amber: '#ff9f0a',
  };

  const hasOnboarded = !!resumeUrl && searchTags.length > 0;

  useEffect(() => {
    if (hasOnboarded) {
      AsyncStorage.getItem(HINT_KEY).then((seen) => {
        if (!seen) setShowHint(true);
      });
    }
  }, [hasOnboarded]);

  const dismissHint = async () => {
    setShowHint(false);
    await AsyncStorage.setItem(HINT_KEY, '1');
  };

  const pickAndUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);

      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const ext = asset.name.split('.').pop() || 'pdf';
      const storagePath = `${userId}/resume_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(storagePath, arrayBuffer, {
          contentType: asset.mimeType || 'application/pdf',
          upsert: true,
        });
      if (uploadError) throw uploadError;

      await supabase.from('users')
        .update({ resume_url: storagePath, resume_name: asset.name })
        .eq('id', userId);

      setResume(storagePath, asset.name);
    } catch (err: any) {
      Alert.alert(t.error_alert_title || 'შეცდომა ❌', err.message || (t.resume_upload_error || 'რეზიუმეს ატვირთვა ვერ მოხერხდა'));
    } finally {
      setUploading(false);
    }
  };

  const saveTags = async () => {
    const tags = tagsInput
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

    if (tags.length === 0) {
      Alert.alert(t.error_alert_title || 'შეცდომა', t.tags_required_error || 'ჩაწერე მინიმუმ ერთი თეგი');
      return;
    }
    setSearchTags(tags);
    await supabase.from('users').update({ search_tags: tags }).eq('id', userId);
  };

  const loadDeck = async () => {
    try {
      setLoading(true);

      const { data: swiped } = await supabase
  .from('swipe_actions')
  .select('job_id')
  .eq('user_id', userId);
// 🔧 Set — სწრაფი ძებნისთვის, UUID-ებზეც უსაფრთხო
const swipedIds = new Set((swiped || []).map(s => s.job_id));

const { data: followedData } = await supabase
  .from('follows')
  .select('followed_id')
  .eq('follower_id', userId);
const followedIds = new Set(followedData?.map(f => f.followed_id) || []);

// 🔧 ბაზაში აღარ ვფილტრავთ id-ს in-ით; ლოკალურად ამოვაგდებთ დასვაიფულებს
const { data, error } = await supabase
  .from('jobs')
  .select('*')
  .eq('type', 'company')
  .or('status.is.null,status.eq.active');
if (error) throw error;

const { data: blk } = await supabase.rpc('my_blocked_ids');
const bset = new Set((blk || []).map((b: any) => b));

const scored = (data || [])
  .filter(job => !swipedIds.has(job.id) && !bset.has(job.author_id))   // 🔧 დასვაიფული + დაბლოკილი გამოირიცხოს
  .map(job => {
        const jobTags: string[] = (job.tags || []).map((x: string) => x.toLowerCase());
        const matchCount = searchTags.filter((tag: string) => jobTags.includes(tag)).length;
        const followBonus = followedIds.has(job.author_id) ? 3 : 0;
        return { ...job, _score: matchCount * 2 + followBonus, _matchCount: matchCount };
      });

      scored.sort((a, b) => b._score - a._score);
      setJobs(scored);
      setCurrentIndex(0);
    } catch (err) {
      console.log('Deck-ის ჩატვირთვის ხარვეზი:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasOnboarded) loadDeck();
  }, [hasOnboarded]);

  const handleSwipe = async (action: SwipeAction) => {
    const job = jobs[currentIndex];
    if (!job) return;

    setExpanded(false);
    setCurrentIndex(i => i + 1);
    translateX.value = 0;
    translateY.value = 0;

    try {
      await supabase.from('swipe_actions').insert([{
        user_id: userId, job_id: job.id, action
      }]);

      if (action === 'applied') {
        const { error } = await supabase.from('job_applications').insert([{
          job_id: job.id,
          job_title: job.title,
          applicant_id: userId,
          applicant_name: userName,
          company_id: job.author_id,
          resume_url: resumeUrl,
          resume_name: resumeName,
        }]);
        if (error && error.code !== '23505') throw error;
      }
    } catch (err: any) {
      console.log('სვაიფის შენახვის ხარვეზი:', err.message);
    }
  };

  const pan = Gesture.Pan()
    .enabled(!expanded)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const goRight = e.translationX > SWIPE_X_THRESHOLD;
      const goLeft = e.translationX < -SWIPE_X_THRESHOLD;
      const goUp = e.translationY < SWIPE_UP_THRESHOLD && Math.abs(e.translationX) < SWIPE_X_THRESHOLD;

      if (goRight) {
        translateX.value = withTiming(SCREEN_W * 1.3, { duration: 220 }, () => {
          runOnJS(handleSwipe)('applied');
        });
      } else if (goLeft) {
        translateX.value = withTiming(-SCREEN_W * 1.3, { duration: 220 }, () => {
          runOnJS(handleSwipe)('dismissed');
        });
      } else if (goUp) {
        translateY.value = withTiming(-SCREEN_H, { duration: 220 }, () => {
          runOnJS(handleSwipe)('saved');
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-SCREEN_W, SCREEN_W], [-8, 8])}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => {
    const x = translateX.value;
    const y = translateY.value;
    let color = 'transparent';
    let op = 0;
    if (x > 20) { color = '#30d158'; op = interpolate(x, [20, SWIPE_X_THRESHOLD], [0, 1], 'clamp'); }
    else if (x < -20) { color = '#ff453a'; op = interpolate(x, [-SWIPE_X_THRESHOLD, -20], [1, 0], 'clamp'); }
    else if (y < -20) { color = '#ff9f0a'; op = interpolate(y, [SWIPE_UP_THRESHOLD, -20], [1, 0], 'clamp'); }
    return { borderColor: color, opacity: op };
  });

  // ============ ონბორდინგი ============
  if (!hasOnboarded) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AuroraBackground />
        <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.onboardWrap}>
          <View style={[styles.onboardIcon, { backgroundColor: theme.accent + '20' }]}>
            <Ionicons name="documents-outline" size={30} color={theme.accent} />
          </View>
          <Text style={[styles.onboardTitle, { color: theme.text }]}>
            {t.swipe_onboard_title || 'დაიწყე ორ ნაბიჯში'}
          </Text>
          <Text style={[styles.onboardSub, { color: theme.subText }]}>
            {t.swipe_onboard_sub || 'ატვირთე რეზიუმე და მიუთითე რას ეძებ — შესაბამის ვაკანსიებს გაჩვენებთ'}
          </Text>

          <TouchableOpacity
            style={[styles.uploadBox, {
              backgroundColor: theme.cardBg,
              borderColor: resumeUrl ? theme.green : theme.border,
            }]}
            onPress={pickAndUploadResume}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator color={theme.accent} />
            ) : resumeUrl ? (
              <>
                <View style={[styles.uploadIconCircle, { backgroundColor: theme.green + '25' }]}>
                  <Ionicons name="checkmark" size={20} color={theme.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.uploadText, { color: theme.text }]} numberOfLines={1}>
                    {resumeName || 'CV ატვირთულია'}
                  </Text>
                  <Text style={[styles.uploadHint, { color: theme.subText }]}>{t.swipe_change_cv || 'შესაცვლელად დააჭირე'}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.uploadIconCircle, { backgroundColor: theme.accent + '20' }]}>
                  <Ionicons name="add" size={22} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.uploadText, { color: theme.text }]}>{t.swipe_upload_cv || 'ატვირთე რეზიუმე'}</Text>
                  <Text style={[styles.uploadHint, { color: theme.subText }]}>PDF · DOC · DOCX</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
            value={tagsInput}
            onChangeText={setTagsInput}
            placeholder={t.swipe_tags_placeholder || 'მაგ: react, დიზაინი, მარკეტინგი'}
            placeholderTextColor={theme.faint}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.accent }, (!resumeUrl || uploading) && { opacity: 0.4 }]}
            onPress={saveTags}
            disabled={!resumeUrl || uploading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{t.swipe_start_btn || 'დაწყება'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentJob = jobs[currentIndex];
  const nextJob = jobs[currentIndex + 1];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AuroraBackground />
      <View style={styles.deckHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.deckHeaderTitle, { color: theme.text }]}>{t.swipe_deck_title || 'ვაკანსიები'}</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.centerLoader}><ActivityIndicator size="large" color={theme.accent} /></View>
      ) : !currentJob ? (
        <View style={styles.centerLoader}>
          <View style={[styles.emptyIconCircle, { backgroundColor: theme.inputBg }]}>
            <Ionicons name="sparkles-outline" size={30} color={theme.subText} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{t.swipe_deck_empty_title || 'სულ ეს იყო'}</Text>
          <Text style={[styles.emptyText, { color: theme.subText }]}>
            {t.swipe_deck_empty || 'ახალ ვაკანსიებს მოგვიანებით შემოგთავაზებთ'}
          </Text>
          <TouchableOpacity style={[styles.ghostButton, { borderColor: theme.border }]} onPress={loadDeck}>
            <Text style={[styles.ghostButtonText, { color: theme.text }]}>{t.swipe_refresh || 'განახლება'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.deckArea}>
          {nextJob && !expanded && (
            <View style={[styles.card, styles.cardBehind, { backgroundColor: theme.cardBg, borderColor: theme.border }]} />
          )}

          <GestureDetector gesture={pan}>
            <Animated.View style={[
              styles.card,
              expanded && styles.cardExpanded,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
              !expanded && cardStyle,
            ]}>
              {!expanded && <Animated.View pointerEvents="none" style={[styles.glowBorder, glowStyle]} />}

              <View style={[styles.avatar, { backgroundColor: theme.accent + '20' }]}>
                <Text style={[styles.avatarText, { color: theme.accent }]}>{getInitials(currentJob.title)}</Text>
              </View>

              <Text style={[styles.cardTitle, { color: theme.text }]}>{currentJob.title}</Text>

              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: theme.subText }]}>{currentJob.location}</Text>
                <View style={[styles.metaDot, { backgroundColor: theme.faint }]} />
                <Text style={[styles.metaText, { color: theme.text, fontWeight: '600' }]}>{currentJob.budget} ₾</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {expanded ? (
                <ScrollView style={styles.descScroll} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.cardDesc, { color: theme.subText }]}>{currentJob.description}</Text>
                  <View style={styles.tagRow}>
                    {(currentJob.tags || []).map((tag: string) => {
                      const matched = searchTags.includes(tag.toLowerCase());
                      return (
                        <View key={tag} style={[styles.tagChip, { backgroundColor: matched ? theme.accent + '20' : theme.inputBg }]}>
                          <Text style={[styles.tagChipText, { color: matched ? theme.accent : theme.subText }]}>{tag}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={{ height: 20 }} />
                </ScrollView>
              ) : (
                <>
                  <Text style={[styles.cardDesc, { color: theme.subText }]} numberOfLines={6}>{currentJob.description}</Text>
                  <View style={styles.tagRow}>
                    {(currentJob.tags || []).slice(0, 4).map((tag: string) => {
                      const matched = searchTags.includes(tag.toLowerCase());
                      return (
                        <View key={tag} style={[styles.tagChip, { backgroundColor: matched ? theme.accent + '20' : theme.inputBg }]}>
                          <Text style={[styles.tagChipText, { color: matched ? theme.accent : theme.subText }]}>{tag}</Text>
                        </View>
                      );
                    })}
                    {currentJob._matchCount > 0 && (
                      <View style={[styles.tagChip, { backgroundColor: theme.green + '20' }]}>
                        <Ionicons name="checkmark-circle" size={12} color={theme.green} />
                        <Text style={[styles.tagChipText, { color: theme.green, marginLeft: 3 }]}>
                          {currentJob._matchCount} {t.swipe_tag_match || 'დამთხვევა'}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.expandButton, { backgroundColor: theme.inputBg }]}
                onPress={() => setExpanded(e => !e)}
                activeOpacity={0.7}
              >
                <Ionicons name={expanded ? 'contract-outline' : 'expand-outline'} size={15} color={theme.text} />
                <Text style={[styles.expandButtonText, { color: theme.text }]}>
                  {expanded ? (t.swipe_collapse || 'დახურვა') : (t.swipe_expand || 'სრულად')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </GestureDetector>
        </View>
      )}

      {showHint && !loading && currentJob && (
        <View style={styles.hintOverlay}>
          <View style={[styles.hintCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.hintTitle, { color: theme.text }]}>{t.swipe_hint_title || 'როგორ მუშაობს'}</Text>

            <View style={styles.hintRow}>
              <View style={[styles.hintIcon, { backgroundColor: theme.green + '20' }]}>
                <Ionicons name="arrow-forward" size={18} color={theme.green} />
              </View>
              <Text style={[styles.hintText, { color: theme.text }]}>{t.swipe_hint_right || 'მარჯვნივ — CV-ს უგზავნი კომპანიას'}</Text>
            </View>

            <View style={styles.hintRow}>
              <View style={[styles.hintIcon, { backgroundColor: theme.red + '20' }]}>
                <Ionicons name="arrow-back" size={18} color={theme.red} />
              </View>
              <Text style={[styles.hintText, { color: theme.text }]}>{t.swipe_hint_left || 'მარცხნივ — გამოტოვება'}</Text>
            </View>

            <View style={styles.hintRow}>
              <View style={[styles.hintIcon, { backgroundColor: theme.amber + '20' }]}>
                <Ionicons name="arrow-up" size={18} color={theme.amber} />
              </View>
              <Text style={[styles.hintText, { color: theme.text }]}>{t.swipe_hint_up || 'მაღლა — შენახვა მოგვიანებით'}</Text>
            </View>

            <TouchableOpacity style={[styles.hintButton, { backgroundColor: theme.accent }]} onPress={dismissHint} activeOpacity={0.85}>
              <Text style={styles.hintButtonText}>{t.swipe_hint_got_it || 'გასაგებია'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, alignSelf: 'flex-start' },

  onboardWrap: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  onboardIcon: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  onboardTitle: { fontSize: 26, fontWeight: '700', marginBottom: 8, letterSpacing: -0.5 },
  onboardSub: { fontSize: 15, lineHeight: 22, marginBottom: 32 },
  uploadBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12, gap: 14 },
  uploadIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  uploadText: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  uploadHint: { fontSize: 12 },
  input: { height: 54, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, marginBottom: 24 },
  primaryButton: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  deckHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  deckHeaderTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },

  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  emptyIconCircle: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6, letterSpacing: -0.3 },
  emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 24 },
  ghostButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 24, height: 46, justifyContent: 'center', alignItems: 'center' },
  ghostButtonText: { fontSize: 14, fontWeight: '600' },

  deckArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
  card: { position: 'absolute', width: SCREEN_W - 40, minHeight: 440, borderRadius: 28, borderWidth: 1, padding: 26 },
  cardExpanded: { top: 8, bottom: 8, height: undefined, minHeight: undefined },
  cardBehind: { transform: [{ scale: 0.95 }, { translateY: 16 }], opacity: 0.5 },
  glowBorder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, borderWidth: 2.5 },

  avatar: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  avatarText: { fontSize: 20, fontWeight: '700' },
  cardTitle: { fontSize: 23, fontWeight: '700', lineHeight: 30, marginBottom: 12, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  metaText: { fontSize: 14 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5 },
  divider: { height: 1, marginBottom: 18 },
  descScroll: { flex: 1, marginBottom: 12 },
  cardDesc: { fontSize: 15, lineHeight: 23, marginBottom: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  tagChipText: { fontSize: 12, fontWeight: '600' },

  expandButton: { position: 'absolute', bottom: 18, right: 18, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  expandButtonText: { fontSize: 12, fontWeight: '600' },

  hintOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  hintCard: { width: '100%', borderRadius: 24, padding: 24 },
  hintTitle: { fontSize: 19, fontWeight: '700', marginBottom: 20, letterSpacing: -0.3 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  hintIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  hintText: { fontSize: 15, fontWeight: '500', flex: 1 },
  hintButton: { height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  hintButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});