import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface TierBadgeProps {
  tier?: string | null;
  verified?: boolean;
  compact?: boolean;
}

export default function TierBadge({ tier, verified, compact = false }: TierBadgeProps) {
  let color = '';
  let label = '';
  let icon: keyof typeof Ionicons.glyphMap = 'star';

  if (verified) {
    color = '#3B82F6';
    label = 'ვერიფიცირებული';
    icon = 'shield-checkmark';
  } else if (tier === 'pro') {
    color = '#8B5CF6';
    label = 'პროფესიონალი';
    icon = 'rocket';
  } else if (tier === 'premium') {
    color = '#f5a623';
    label = 'პრემიუმი';
    icon = 'star';
  } else {
    return null;
  }

  if (compact) {
    return <Ionicons name={icon} size={13} color={color} />;
  }

  return (
    <View style={[styles.badge, { backgroundColor: `${color}1F`, borderColor: `${color}40` }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});