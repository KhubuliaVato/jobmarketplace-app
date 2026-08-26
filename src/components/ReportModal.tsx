import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'job' | 'user' | 'message';
  targetId: string;
  onDone?: () => void;
}

const REASONS = [
  { id: 'spam', label: 'სპამი', icon: 'megaphone-outline' },
  { id: 'scam', label: 'თაღლითობა', icon: 'warning-outline' },
  { id: 'inappropriate', label: 'უხამსი შინაარსი', icon: 'eye-off-outline' },
  { id: 'harassment', label: 'შეურაცხყოფა', icon: 'sad-outline' },
  { id: 'other', label: 'სხვა', icon: 'ellipsis-horizontal-outline' },
];

export default function ReportModal({ visible, onClose, targetType, targetId, onDone }: ReportModalProps) {
  const isDarkMode = useAuthStore((state) => state.isDarkMode);
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const theme = {
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#888' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#1c1c22' : '#f2f2f7',
    rowBg: isDarkMode ? '#1c1c22' : '#f7f7fa',
  };

  const reset = () => { setReason(null); setComment(''); setDone(false); };

  const handleClose = () => { reset(); onClose(); };

  const submit = async () => {
    if (!reason) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc('submit_report', {
        p_target_type: targetType,
        p_target_id: targetId,
        p_reason: reason,
        p_comment: comment.trim() || null,
      });
      if (error) throw error;
      setDone(true);
      onDone?.();
    } catch {
      // ჩუმად — ორმაგი რეპორტი ან შეცდომა
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <View style={styles.doneCircle}>
                <Ionicons name="checkmark" size={30} color="#34c759" />
              </View>
              <Text style={[styles.title, { color: theme.text, marginTop: 12 }]}>მადლობა</Text>
              <Text style={[styles.sub, { color: theme.subText, textAlign: 'center' }]}>
                თქვენი საჩივარი მიღებულია და გადაიხედება ჩვენი გუნდის მიერ.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleClose}>
                <Text style={styles.primaryBtnText}>დახურვა</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>საჩივრის გაგზავნა</Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons name="close" size={22} color={theme.subText} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.sub, { color: theme.subText }]}>აირჩიე მიზეზი</Text>

              <View style={{ marginTop: 12, gap: 8 }}>
                {REASONS.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.reasonRow,
                      { backgroundColor: theme.rowBg, borderColor: reason === r.id ? '#5B42F5' : 'transparent' },
                    ]}
                    onPress={() => setReason(r.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={r.icon as any} size={18} color={reason === r.id ? '#5B42F5' : theme.subText} />
                    <Text style={[styles.reasonText, { color: reason === r.id ? '#5B42F5' : theme.text }]}>{r.label}</Text>
                    {reason === r.id && <Ionicons name="checkmark-circle" size={18} color="#5B42F5" />}
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="დამატებითი კომენტარი (არასავალდებულო)"
                placeholderTextColor={theme.subText}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={300}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, !reason && { opacity: 0.4 }]}
                onPress={submit}
                disabled={!reason || loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>გაგზავნა</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  card: { borderRadius: 22, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 4 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 12, borderWidth: 1.5 },
  reasonText: { flex: 1, fontSize: 14.5, fontWeight: '600' },
  input: { minHeight: 70, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, marginTop: 14, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: '#5B42F5', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(52,199,89,0.12)', justifyContent: 'center', alignItems: 'center' },
});