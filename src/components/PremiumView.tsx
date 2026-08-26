import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { THEME_PALETTES } from '../utils/bgThemes';

interface PremiumViewProps {
  onBack: () => void;
}

const PLANS = [
  {
    id: 'free',
    name: 'უფასო',
    icon: 'document-text-outline' as const,
    color: '#8a8a92',
    tagline: 'დასაწყისისთვის',
    groups: [
      { label: 'განცხადებები', items: ['2 აქტიური განცხადება', 'განთავსება 3 ან 5 დღით', 'სასწრაფო — თვეში 1-ჯერ'] },
      { label: 'შეტყობინებები', items: ['Email & Browser შეტყობინება', 'SMS — კვირაში 2-ჯერ'] },
      { label: 'ხილვადობა', items: ['ნახვების რაოდენობა'] },
    ],
  },
  {
    id: 'premium',
    name: 'პრემიუმი',
    icon: 'star' as const,
    color: '#f5a623',
    tagline: 'ხშირად რომ დებ განცხადებას',
    popular: true,
    groups: [
      { label: 'განცხადებები', items: ['10 აქტიური განცხადება', 'განთავსება 15 დღემდე', 'სასწრაფო — შეუზღუდავად', 'ზემოთ აწევა — კვირაში 3-ჯერ'] },
      { label: 'შეტყობინებები', items: ['SMS — კვირაში 3-ჯერ'] },
      { label: 'პროფილი', items: ['სპეციალური ფონის თემები', 'პრემიუმ პროფილის ფონები', 'გამორჩეული ნიშანი პროფილზე'] },
    ],
  },
  {
    id: 'pro',
    name: 'პროფესიონალი',
    icon: 'flash' as const,
    color: '#8B5CF6',
    tagline: 'მაქსიმალური შედეგისთვის',
    groups: [
      { label: 'განცხადებები', items: ['ყველაფერი პრემიუმიდან', 'შეუზღუდავი განცხადება', 'ზემოთ აწევა — კვირაში 10-ჯერ'] },
      { label: 'შეტყობინებები', items: ['SMS — კვირაში 5-ჯერ'] },
      { label: 'პროფილი', items: ['ექსკლუზიური ფონის თემები', 'ექსკლუზიური პროფილის ფონები', 'პრიორიტეტი ძებნაში', 'პრემიალური ნიშანი პროფილზე'] },
      { label: 'ანალიტიკა', items: ['სრული სტატისტიკა გრაფიკებით'] },
    ],
  },
];

export default function PremiumView({ onBack }: PremiumViewProps) {
  const userId = useAuthStore((state) => state.userId);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const tier = useAuthStore((state: any) => state.tier) || 'free';
  const tierExpiresAt = useAuthStore((state: any) => state.tierExpiresAt);
  const setTier = useAuthStore((state: any) => state.setTier);

  const [loading, setLoading] = useState(true);

  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    card: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
  };

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('tier, tier_expires_at')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        const active = !data.tier_expires_at || new Date(data.tier_expires_at) > new Date();
        setTier(active ? (data.tier || 'free') : 'free', active ? data.tier_expires_at : null);
      }
      setLoading(false);
    })();
  }, [userId]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.backButtonRow} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#5B42F5" />
          <Text style={styles.backButtonText}>პარამეტრებში დაბრუნება</Text>
        </TouchableOpacity>

        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>აირჩიე შენი გეგმა</Text>
          <Text style={[styles.pageSub, { color: theme.subText }]}>
            მეტი ხილვადობა, მეტი გამოხმაურება. აირჩიე ის, რაც შენს საქმეს შეესაბამება.
          </Text>

          {userId && tier !== 'free' && tierExpiresAt && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>
                აქტიურია {new Date(tierExpiresAt).toLocaleDateString('ka-GE')}-მდე
              </Text>
            </View>
          )}
        </View>

        {PLANS.map((p) => {
          const isCurrent = tier === p.id;
          return (
            <View
              key={p.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: theme.card,
                  borderColor: p.popular ? p.color : theme.border,
                  borderWidth: p.popular ? 1.5 : 1,
                },
              ]}
            >
              {p.popular && (
                <View style={[styles.popularBadge, { backgroundColor: p.color }]}>
                  <Text style={styles.popularBadgeText}>ყველაზე პოპულარული</Text>
                </View>
              )}

              <View style={[styles.planIconCircle, { backgroundColor: `${p.color}1F` }]}>
                <Ionicons name={p.icon} size={22} color={p.color} />
              </View>

              <Text style={[styles.planName, { color: theme.text }]}>{p.name}</Text>
              <Text style={[styles.planTagline, { color: theme.subText }]}>{p.tagline}</Text>

              <View style={[styles.priceRow, { borderBottomColor: theme.border }]}>
                {p.id === 'free' ? (
                  <Text style={[styles.priceFree, { color: theme.text }]}>0 ₾</Text>
                ) : (
                  <View style={[styles.priceComingSoon, { backgroundColor: `${p.color}18` }]}>
                    <Text style={{ color: p.color, fontSize: 12.5, fontWeight: '700' }}>ფასი მალე გამოცხადდება</Text>
                  </View>
                )}
              </View>

              {p.groups.map((g, gi) => (
                <View key={gi} style={{ marginBottom: 14 }}>
                  <Text style={[styles.groupLabel, { color: p.color }]}>{g.label}</Text>
                  {g.items.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Ionicons name="checkmark" size={14} color={p.color} style={{ marginTop: 2 }} />
                      <Text style={[styles.featureText, { color: theme.text }]}>{f}</Text>
                    </View>
                  ))}
                </View>
              ))}

              {isCurrent ? (
                <View style={[styles.planButton, { borderColor: p.color, borderWidth: 2 }]}>
                  <Text style={{ color: p.color, fontWeight: '700', fontSize: 14 }}>თქვენი ამჟამინდელი გეგმა</Text>
                </View>
              ) : p.id === 'free' ? (
                <View style={[styles.planButton, { borderColor: theme.border, borderWidth: 1 }]}>
                  <Text style={{ color: theme.subText, fontWeight: '700', fontSize: 14 }}>ბაზისური</Text>
                </View>
              ) : (
                <View style={[styles.planButton, { borderColor: p.color, borderWidth: 2, opacity: 0.6 }]}>
                  <Text style={{ color: p.color, fontWeight: '700', fontSize: 14 }}>მალე გაიხსნება</Text>
                </View>
              )}
            </View>
          );
        })}

        <Text style={[styles.footerNote, { color: theme.subText }]}>
          გადახდის სისტემა მალე ჩაირთვება. კითხვების შემთხვევაში დაგვიკავშირდით.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 130 },
  backButtonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingVertical: 4 },
  backButtonText: { color: '#5B42F5', fontSize: 14, fontWeight: '600', marginLeft: 8 },

  headerBlock: { alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: '800', letterSpacing: 0.2, textAlign: 'center', marginBottom: 8 },
  pageSub: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 10 },
  activeBadge: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(91,66,245,0.12)' },
  activeBadgeText: { color: '#5B42F5', fontSize: 12.5, fontWeight: '700' },

  planCard: {
    position: 'relative',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 3,
  },
  popularBadge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
  },
  popularBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  planIconCircle: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 6, marginBottom: 12 },
  planName: { fontSize: 19, fontWeight: '800', marginBottom: 3 },
  planTagline: { fontSize: 12.5, marginBottom: 16 },

  priceRow: { paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1 },
  priceFree: { fontSize: 24, fontWeight: '800' },
  priceComingSoon: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },

  groupLabel: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 7 },
  featureText: { fontSize: 13.5, flex: 1, lineHeight: 18 },

  planButton: { paddingVertical: 14, borderRadius: 13, alignItems: 'center', marginTop: 4 },

  footerNote: { fontSize: 12.5, textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 18 },
});