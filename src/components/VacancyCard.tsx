import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { THEME_PALETTES } from '../utils/bgThemes';


interface VacancyCardProps {
  job: any;
  onPress: () => void;
}

export default function VacancyCard({ job, onPress }: VacancyCardProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#8a8a92' : '#8e8e93',
    border: palette ? palette.border : '#e5e5ea',
    chipBg: isDarkMode ? '#1c1c22' : '#f2f2f7',
  };

  const skills: string[] = job.skills
    ? String(job.skills).split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const companyName = job.company?.name || 'კომპანია';
  const companyAvatar = job.company?.avatar_url;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* სურათი */}
      {job.image_url ? (
        <Image source={{ uri: job.image_url }} style={styles.banner} resizeMode="cover" />
      ) : null}

      {/* ზედა რიგი */}
      <View style={styles.topRow}>
        {companyAvatar ? (
          <Image source={{ uri: companyAvatar }} style={styles.logo} />
        ) : (
          <View style={[styles.logoEmpty, { backgroundColor: 'rgba(91,66,245,0.12)' }]}>
            <Ionicons name="business" size={20} color="#5B42F5" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={[styles.position, { color: theme.text }]} numberOfLines={1}>
            {job.position_title || job.title}
          </Text>
          <Text style={[styles.company, { color: theme.subText }]} numberOfLines={1}>
            {companyName}
          </Text>
        </View>

        {job.has_promotion && (
          <View style={styles.promoBadge}>
            <Ionicons name="trending-up" size={13} color="#34c759" />
          </View>
        )}
      </View>

      {/* მეტა */}
      <View style={styles.metaRow}>
        {job.budget ? (
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={14} color="#34c759" />
            <Text style={[styles.metaText, { color: theme.text }]} numberOfLines={1}>{job.budget}</Text>
          </View>
        ) : null}

        {job.location ? (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={theme.subText} />
            <Text style={[styles.metaText, { color: theme.subText }]} numberOfLines={1}>{job.location}</Text>
          </View>
        ) : null}
      </View>

      {/* უნარები */}
      {skills.length > 0 && (
        <View style={styles.chipsRow}>
          {skills.slice(0, 3).map((s, i) => (
            <View key={i} style={[styles.chip, { backgroundColor: theme.chipBg }]}>
              <Text style={[styles.chipText, { color: theme.subText }]} numberOfLines={1}>{s}</Text>
            </View>
          ))}
          {skills.length > 3 && (
            <View style={[styles.chip, { backgroundColor: theme.chipBg }]}>
              <Text style={[styles.chipText, { color: theme.subText }]}>+{skills.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* ქვედა */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={[styles.detailsText, { color: '#5B42F5' }]}>დეტალურად</Text>
        <Ionicons name="chevron-forward" size={16} color="#5B42F5" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  banner: { width: '100%', height: 130, borderRadius: 12, marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 12 },
  logoEmpty: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  position: { fontSize: 15.5, fontWeight: '800' },
  company: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  promoBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(52,199,89,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  metaRow: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '55%' },
  metaText: { fontSize: 12.5, fontWeight: '600' },

  chipsRow: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, maxWidth: 130 },
  chipText: { fontSize: 11.5, fontWeight: '600' },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
    marginTop: 12, paddingTop: 10, borderTopWidth: 1,
  },
  detailsText: { fontSize: 12.5, fontWeight: '700' },
});