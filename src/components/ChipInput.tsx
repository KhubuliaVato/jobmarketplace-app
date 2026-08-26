import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ChipInputProps {
  value: string[];
  onChange: (chips: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  accent?: string;
  isDarkMode: boolean;
  max?: number;
}

export default function ChipInput({
  value,
  onChange,
  placeholder = 'ჩაწერე და დააჭირე Enter',
  suggestions = [],
  accent = '#5B42F5',
  isDarkMode,
  max = 15,
}: ChipInputProps) {
  const [text, setText] = useState('');

  const theme = {
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#1c1c22' : '#f2f2f7',
  };

  const addChip = (raw: string) => {
    const chip = raw.trim();
    if (!chip) return;
    if (value.length >= max) return;
    if (value.some(v => v.toLowerCase() === chip.toLowerCase())) {
      setText('');
      return;
    }
    onChange([...value, chip]);
    setText('');
  };

  const removeChip = (chip: string) => {
    onChange(value.filter(c => c !== chip));
  };

  // შემოთავაზებები, რომლებიც ჯერ არ არის დამატებული
  const available = suggestions.filter(
    s => !value.some(v => v.toLowerCase() === s.toLowerCase())
  );

  return (
    <View>
      <View style={[styles.box, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
        {value.length > 0 && (
          <View style={styles.chipsWrap}>
            {value.map(chip => (
              <View key={chip} style={[styles.chip, { backgroundColor: accent + '20', borderColor: accent + '55' }]}>
                <Text style={[styles.chipText, { color: accent }]}>{chip}</Text>
                <TouchableOpacity onPress={() => removeChip(chip)} hitSlop={6}>
                  <Ionicons name="close" size={14} color={accent} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={value.length >= max ? 'ლიმიტი შევსებულია' : placeholder}
          placeholderTextColor="#555"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => addChip(text)}
          blurOnSubmit={false}
          returnKeyType="done"
          editable={value.length < max}
        />
      </View>

      {available.length > 0 && value.length < max && (
        <View style={styles.suggestWrap}>
          {available.slice(0, 8).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.suggestChip, { borderColor: theme.border }]}
              onPress={() => addChip(s)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={13} color={theme.subText} />
              <Text style={[styles.suggestText, { color: theme.subText }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4, minHeight: 46 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingLeft: 10, paddingRight: 7, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1,
  },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  input: { fontSize: 14, paddingVertical: 6, minHeight: 32 },

  suggestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  suggestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
  },
  suggestText: { fontSize: 11.5, fontWeight: '600' },
});