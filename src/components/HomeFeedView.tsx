import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { getTheme, RADIUS } from '../utils/theme';
import { LanguageType, translations } from '../utils/translations';

interface HomeFeedViewProps {
  onSelectCategory: (category: 'company' | 'private' | 'urgent' | 'following') => void;
  onOpenScroll: () => void;
}

// 🔧 press-ზე scale ეფექტი (web-ის button:active-ის ანალოგი)
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function PressableCard({ style, onPress, children }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  return (
    <AnimatedTouchable
      style={[style, { transform: [{ scale }] }]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.9}
    >
      {children}
    </AnimatedTouchable>
  );
}

// 🔧 pulse ეფექტი (web-ის badge-pulse ანალოგი) — სასწრაფოს icon-ისთვის
function PulseGlow({ color, children }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View>
      <Animated.View
        style={{
          position: 'absolute',
          width: 50, height: 50, borderRadius: 25,
          backgroundColor: color,
          opacity: 0.25,
          transform: [{ scale }],
        }}
      />
      {children}
    </View>
  );
}

// 🔧 stagger fade-in entrance (web-ის .stagger-ის ანალოგი)
function FadeInUp({ delay, children, style }: any) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export default function HomeFeedView({ onSelectCategory, onOpenScroll }: HomeFeedViewProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const theme = getTheme(isDarkMode, bgTheme);
  const userName = useAuthStore((state: any) => state.userName);

  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t: any = translations[language as LanguageType] || translations.ka;

  const [banner, setBanner] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBanner();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBanner();
    setRefreshing(false);
  };

  const fetchBanner = async () => {
    try {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setBanner(data);
    } catch {
      setBanner(null);
    }
  };

  const handleBannerPress = () => {
    if (!banner) return;
    if (banner.link_type === 'url' && banner.link_value) {
      Linking.openURL(banner.link_value);
      return;
    }
    if (banner.link_type === 'category' && banner.link_value) {
      const cat = banner.link_value;
      if (cat === 'swipe') {
        onOpenScroll();
      } else if (['company', 'private', 'urgent', 'following'].includes(cat)) {
        onSelectCategory(cat as any);
      }
    }
  };

  const cards = [
    { key: 'company', title: t.companies, sub: 'ოფიციალური ვაკანსიები', icon: 'business', accent: '#5B42F5', onPress: () => onSelectCategory('company') },
    { key: 'private', title: t.private_orders, sub: 'ერთჯერადი საქმეები', icon: 'clipboard', accent: '#34c759', onPress: () => onSelectCategory('private') },
    { key: 'swipe', title: 'სქროლი', sub: 'სვაიფით მოძებნა', icon: 'play-circle', accent: '#ff9500', onPress: onOpenScroll },
    { key: 'following', title: t.following, sub: 'ვისაც მიჰყვები', icon: 'people', accent: '#00c7be', onPress: () => onSelectCategory('following') },
  ];

  const firstName = (userName || '').split(' ')[0];

  return (
    <View style={{ flex: 1 }}>
      {/* ფონური ambient glow — web-ის .orb-ის ანალოგი */}
      <View pointerEvents="none" style={styles.orbWrap}>
        <View style={[styles.orb, { backgroundColor: theme.brand, top: -90, left: -70, opacity: isDarkMode ? 0.28 : 0.35 }]} />
        <View style={[styles.orb, { backgroundColor: '#00c7be', top: 20, right: -110, opacity: isDarkMode ? 0.18 : 0.25 }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.brand}
            colors={[theme.brand]}
          />
        }
      >
        <View style={styles.greetingRow}>
          <Text style={[styles.greetingTitle, { color: theme.text }]}>
            {firstName ? `გამარჯობა, ${firstName}` : 'გამარჯობა'}
          </Text>
          <Text style={[styles.greetingSub, { color: theme.textSub }]}>რას ეძებ დღეს?</Text>
        </View>

        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionAccentBar, { backgroundColor: theme.brand }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.discover_categories}</Text>
        </View>

      <View style={styles.gridContainer}>
        {cards.map((c, i) => (
          <FadeInUp key={c.key} delay={i * 60} style={{ width: '48.5%' }}>
            <PressableCard
              style={[styles.box, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={c.onPress}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${c.accent}1F`, borderColor: `${c.accent}33`, borderWidth: 1 }]}>
                <Ionicons name={c.icon as any} size={26} color={c.accent} />
              </View>

              <View style={styles.boxTextWrap}>
                <Text style={[styles.boxTitle, { color: theme.text }]}>{c.title}</Text>
                <Text style={[styles.boxSub, { color: theme.textSub }]} numberOfLines={2}>{c.sub}</Text>
              </View>

              <View style={styles.boxLinkRow}>
                <Text style={[styles.boxLinkText, { color: c.accent }]}>ნახვა</Text>
                <Ionicons name="arrow-forward" size={13} color={c.accent} />
              </View>
            </PressableCard>
          </FadeInUp>
        ))}

        {/* სასწრაფო განცხადებები — თანმიმდევრული სტილი */}
        <FadeInUp delay={4 * 60} style={{ width: '100%' }}>
          <PressableCard
            style={[styles.urgentFullBox, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onSelectCategory('urgent')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#ff453a1F', borderColor: '#ff453a33', borderWidth: 1, marginBottom: 0, marginRight: 14 }]}>
              <Ionicons name="flash" size={26} color="#ff453a" />
            </View>

            <View style={styles.urgentTextContainer}>
              <Text style={[styles.urgentTitle, { color: theme.text }]}>{t.urgent_orders || t.orders_urgent}</Text>
              <Text style={[styles.urgentSubtitle, { color: theme.textSub }]}>{t.urgent_sub}</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#ff453a" />
          </PressableCard>
        </FadeInUp>
      </View>

      {banner && (
        <FadeInUp delay={5 * 60} style={{ width: '100%' }}>
          <PressableCard
            style={[styles.bannerCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleBannerPress}
          >
            <Image source={{ uri: banner.image_url }} style={styles.bannerImage} resizeMode="cover" />
            {(banner.title || banner.subtitle) && (
              <View style={styles.bannerTextOverlay}>
                {banner.title ? <Text style={styles.bannerTitle} numberOfLines={1}>{banner.title}</Text> : null}
                {banner.subtitle ? <Text style={styles.bannerSubtitle} numberOfLines={2}>{banner.subtitle}</Text> : null}
              </View>
            )}
          </PressableCard>
        </FadeInUp>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  orbWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 280,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  scrollContainer: { paddingTop: 20, paddingBottom: 110, paddingHorizontal: 16 },
  greetingRow: { marginBottom: 22 },
  greetingTitle: { fontSize: 24, fontWeight: '800', letterSpacing: 0.2, marginBottom: 4 },
  greetingSub: { fontSize: 14, fontWeight: '500' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 9 },
  sectionAccentBar: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  box: {
    borderRadius: RADIUS.xl,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    minHeight: 172,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  boxTextWrap: { marginBottom: 12 },
  boxTitle: { fontSize: 15.5, fontWeight: '800', marginBottom: 4, letterSpacing: 0.1 },
  boxSub: { fontSize: 11.5, fontWeight: '500', lineHeight: 15 },
  boxLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  boxLinkText: { fontSize: 12.5, fontWeight: '700' },

  urgentFullBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  urgentTextContainer: { flex: 1 },
  urgentTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  urgentSubtitle: { fontSize: 12, lineHeight: 16 },

  bannerCard: {
    borderRadius: RADIUS.xl,
    marginTop: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  bannerImage: { width: '100%', height: 170 },
  bannerTextOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  bannerTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 3 },
  bannerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 16, fontWeight: '500' },
});