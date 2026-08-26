import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  chatId: string;
  isAdmin: boolean;
  onBack: () => void;
  onClosed?: () => void;
}

export default function AdminChatView({ chatId, isAdmin, onBack, onClosed }: Props) {
  const isDarkMode = useAuthStore((s) => s.isDarkMode);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const scrollRef = useRef<ScrollView>(null);

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#888' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputBg: isDarkMode ? '#1c1c22' : '#f2f2f7',
    adminBubble: '#ff3b30',
    userBubble: '#5B42F5',
  };

  const load = async () => {
    const { data } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    setMessages(data || []);

    const { data: chat } = await supabase
      .from('admin_chats')
      .select('status')
      .eq('id', chatId)
      .maybeSingle();
    if (chat) setStatus(chat.status);

    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`admin_chat_${chatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chatId]);

  const send = async () => {
    const body = text.trim();
    if (!body || status === 'closed') return;
    setSending(true);
    try {
      if (isAdmin) {
        const { error } = await supabase.rpc('admin_send_message', { p_chat_id: chatId, p_text: body });
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('admin_messages')
          .insert({ chat_id: chatId, sender_is_admin: false, text: body })
          .select().single();
        if (error) throw error;
        setMessages((prev) => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
      }
      setText('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    } catch {
      // ჩუმად
    } finally {
      setSending(false);
    }
  };

  const closeChat = async () => {
    const { error } = await supabase.rpc('admin_close_chat', { p_chat_id: chatId });
    if (!error) { setStatus('closed'); onClosed?.(); }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      {/* header */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#ff3b30" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#fff" />
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>ადმინისტრაცია</Text>
        </View>
        {isAdmin && status === 'open' ? (
          <TouchableOpacity onPress={closeChat} style={styles.closeBtn}>
            <Ionicons name="lock-closed" size={16} color="#ff3b30" />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      {loading ? (
        <ActivityIndicator color="#ff3b30" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          {messages.length === 0 && (
            <Text style={[styles.empty, { color: theme.subText }]}>
              {isAdmin ? 'დაწერე შეტყობინება მომხმარებელს' : 'ადმინისტრაციის შეტყობინება'}
            </Text>
          )}
          {messages.map((m) => {
            const mine = isAdmin ? m.sender_is_admin : !m.sender_is_admin;
            return (
              <View key={m.id} style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
                <View style={[
                  styles.bubble,
                  { backgroundColor: m.sender_is_admin ? theme.adminBubble : theme.userBubble },
                ]}>
                  <Text style={styles.bubbleText}>{m.text}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {status === 'closed' ? (
        <View style={[styles.closedBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="lock-closed" size={15} color={theme.subText} />
          <Text style={[styles.closedText, { color: theme.subText }]}>ეს მიმოწერა დახურულია</Text>
        </View>
      ) : (
        <View style={[styles.inputBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="შეტყობინება..."
            placeholderTextColor={theme.subText}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={sending || !text.trim()}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 44, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#ff3b30', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  closeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,59,48,0.12)', justifyContent: 'center', alignItems: 'center' },
  messages: { padding: 14, paddingBottom: 20 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16 },
  bubbleText: { color: '#fff', fontSize: 14.5, lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 28, marginBottom: 76, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 110 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ff3b30', justifyContent: 'center', alignItems: 'center' },
  closedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingBottom: 30, marginBottom: 76, borderTopWidth: 1 },
  closedText: { fontSize: 13.5, fontWeight: '600' },
});