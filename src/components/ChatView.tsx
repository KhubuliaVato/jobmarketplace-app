import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase'; // 🔌 გასწორებული იმპორტის მისამართი
import { useAuthStore } from '../store/useAuthStore';
import { LanguageType, translations } from '../utils/translations'; // 🚀 შემოტანილია ენის მხარდაჭერა

export default function ChatView() {
  const userId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.userName);
  const isDarkMode = useAuthStore((state) => state.isDarkMode);

  // 🚀 ენის დინამიური წამოღება გლობალური სთორიდან
  const language = useAuthStore((state: any) => state.language) || 'ka';
  const t = translations[language as LanguageType] || translations.ka;
  
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // შეწყვეტის მოდალის სთეითები
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // პარტნიორის შეფასების სისტემის სთეითები
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewDetails, setReviewDetails] = useState('');
  const [reviewStars, setReviewStars] = useState(5);
  const [hasReviewedPartner, setHasReviewedPartner] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const theme = {
    bg: isDarkMode ? '#0d0d11' : '#f5f5f7',
    cardBg: isDarkMode ? '#16161a' : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#666' : '#8e8e93',
    border: isDarkMode ? '#222227' : '#e5e5ea',
    inputText: isDarkMode ? '#fff' : '#000',
    chatIncoming: isDarkMode ? '#222227' : '#e5e5ea',
    systemBg: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
  };

  useEffect(() => {
    fetchChats();
  }, [userId]);

  const fetchChats = async () => {
    if (!userId) return;
    setLoadingChats(true);
    
    try {
      const { data: chatsData, error } = await supabase
        .from('chats')
        .select('*')
        .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!chatsData || chatsData.length === 0) {
        setChats([]);
        setLoadingChats(false);
        return;
      }

      let filteredChats = chatsData.filter(c => c.job_state !== 'cancelled');

      const completedJobIds = filteredChats.filter(c => c.job_state === 'completed').map(c => c.job_id).filter(Boolean);
      
      if (completedJobIds.length > 0) {
        const { data: writtenReviews } = await supabase
          .from('reviews')
          .select('job_id')
          .in('job_id', completedJobIds)
          .eq('reviewer_name', userName || '');

        if (writtenReviews && writtenReviews.length > 0) {
          const reviewedIds = writtenReviews.map(r => r.job_id);
          filteredChats = filteredChats.filter(c => !(c.job_state === 'completed' && reviewedIds.includes(c.job_id)));
        }
      }

      if (filteredChats.length === 0) {
        setChats([]);
        setLoadingChats(false);
        return;
      }

      const partnerIds = filteredChats.map(c => c.client_id === userId ? c.freelancer_id : c.client_id);
      const jobIds = filteredChats.map(c => c.job_id).filter(Boolean);

      // 🚀 დაემატა user_status სვეტი ჩათის პარტნიორისთვის
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, avatar_url, user_status')
        .in('id', partnerIds);

      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title')
        .in('id', jobIds);

      const enrichedChats = filteredChats.map(chat => {
        const partnerId = chat.client_id === userId ? chat.freelancer_id : chat.client_id;
        const partnerUser = usersData?.find(u => u.id === partnerId);
        const relatedJob = jobsData?.find(j => j.id === chat.job_id);

        return {
          ...chat,
          partner_name: partnerUser?.name || 'მომხმარებელი',
          partner_avatar: partnerUser?.avatar_url || null,
          user_status: partnerUser?.user_status || 'offline',
          job_title: relatedJob?.title || 'სამუშაო შეკვეთა'
        };
      });

      setChats(enrichedChats);
    } catch (err: any) {
      console.error('Error fetching chats:', err.message);
    } finally {
      setLoadingChats(false);
    }
  };

  // 🚀 ონლაინ სტატუსის რეალთაიმ განახლება ჩათის პარტნიორებისთვის
  useEffect(() => {
    if (chats.length === 0) return;

    const partnerIds = chats.map(c => c.client_id === userId ? c.freelancer_id : c.client_id);
    
    const statusChannel = supabase
      .channel('chat-partners-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
      }, (payload: any) => {
        if (partnerIds.includes(payload.new.id)) {
          setChats(prevChats => prevChats.map(chat => {
            const partnerId = chat.client_id === userId ? chat.freelancer_id : chat.client_id;
            if (partnerId === payload.new.id) {
              return { ...chat, user_status: payload.new.user_status };
            }
            return chat;
          }));
          
          setSelectedChat((prev: any) => {
            if (prev) {
              const activePartnerId = prev.client_id === userId ? prev.freelancer_id : prev.client_id;
              if (activePartnerId === payload.new.id) {
                return { ...prev, user_status: payload.new.user_status };
              }
            }
            return prev;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [chats.length]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    fetchMessages(selectedChat.id);
    checkIfReviewed();

    const messageChannel = supabase
      .channel(`room-${selectedChat.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `chat_id=eq.${selectedChat.id}`
      }, (payload: any) => { 
        setMessages((prev) => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          const filtered = prev.filter(m => !(m.isOptimistic && m.text === payload.new.text && m.sender_id === payload.new.sender_id));
          return [...filtered, payload.new];
        });
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chats',
        filter: `id=eq.${selectedChat.id}`
      }, (payload: any) => { 
        setSelectedChat((current: any) => {
          if (!current) return null;
          return { ...current, ...payload.new };
        });
        setChats(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [selectedChat?.id]);

  const checkIfReviewed = async () => {
    if (!selectedChat) return;
    const partnerId = selectedChat.client_id === userId ? selectedChat.freelancer_id : selectedChat.client_id;
    try {
      const { data } = await supabase
        .from('reviews')
        .select('id')
        .eq('job_id', selectedChat.job_id)
        .eq('target_id', partnerId);

      setHasReviewedPartner(data && data.length > 0 ? true : false);
    } catch (err) {
      setHasReviewedPartner(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 200);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!typedMessage.trim() || !selectedChat) return;
    const msgText = typedMessage;
    setTypedMessage('');

    const tempId = 'temp-' + Date.now();
    const optimisticMsg = {
      id: tempId,
      chat_id: selectedChat.id,
      sender_id: userId,
      text: msgText,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          chat_id: selectedChat.id,
          sender_id: userId,
          text: msgText
        }]);

      if (error) throw error;
    } catch (err: any) {
      setMessages((prev) => prev.filter(m => m.id !== tempId));
      Alert.alert('შეცდომა', 'მესიჯი ვერ გაიგზავნა.');
    }
  };

  const isClient = selectedChat?.client_id === userId;

  const handleStartJob = async () => {
    if (!selectedChat) return;
    
    const updateData = isClient ? { client_started: true } : { worker_started: true };
    const shouldStartFully = isClient ? selectedChat.worker_started : selectedChat.client_started;
    const finalState = shouldStartFully ? { ...updateData, job_state: 'started' } : updateData;

    const { error } = await supabase.from('chats').update(finalState).eq('id', selectedChat.id);
    
    if (error) {
      Alert.alert('შეცდომა', error.message);
      return;
    }
    
    await supabase.from('messages').insert([{
      chat_id: selectedChat.id,
      sender_id: '00000000-0000-0000-0000-000000000000',
      text: shouldStartFully 
        ? `⚡ საქმე ოფიციალურად დაიწყო!` 
        : `📌 ${userName}-მა დაადასტურა საქმის დაწყება.`
    }]);
  };

  const handleCompleteJob = async () => {
    if (!selectedChat) return;

    const updateData = isClient ? { client_completed: true } : { worker_completed: true };
    const shouldCompleteFully = isClient ? selectedChat.worker_completed : selectedChat.client_completed;
    const finalState = shouldCompleteFully ? { ...updateData, job_state: 'completed' } : updateData;

    const { error } = await supabase.from('chats').update(finalState).eq('id', selectedChat.id);
    
    if (error) {
      Alert.alert('შეცდომა', error.message);
      return;
    }

    await supabase.from('messages').insert([{
      chat_id: selectedChat.id,
      sender_id: '00000000-0000-0000-0000-000000000000',
      text: shouldCompleteFully 
        ? `🎉 პროექტი წარმატებით დასრულდა!` 
        : `📌 ${userName}-მა მოითხოვა საქმის დასრულება.`
    }]);
  };

  const handleCancelJob = async () => {
    if (!cancelReason.trim() || !selectedChat) {
      Alert.alert('ყურადღება ⚠️', 'გთხოვთ ჩაწეროთ შეწყვეტის მიზეზი');
      return;
    }

    try {
      const { error: chatError } = await supabase
        .from('chats')
        .update({ job_state: 'cancelled' })
        .eq('id', selectedChat.id);

      if (chatError) throw chatError;

      const { error: reviewError } = await supabase
        .from('reviews')
        .insert([{
          job_id: selectedChat.job_id,
          job_title: selectedChat.job_title,
          reviewer_name: userName || 'მომხმარებელი',
          target_name: selectedChat.partner_name,
          review_title: 'დროზე ადრე შეწყვეტა',
          review_details: cancelReason,
          stars: 0,
          is_negative_cancel: true,
          target_id: userId
        }]);

      if (reviewError) throw reviewError;

      await supabase.from('messages').insert([{
        chat_id: selectedChat.id,
        sender_id: '00000000-0000-0000-0000-000000000000',
        text: `❌ საქმე დროზე ადრე შეწყდა ${userName}-ის მიერ. მიზეზი: ${cancelReason}`
      }]);

      setIsCancelModalVisible(false);
      setCancelReason('');
      setSelectedChat(null);
      fetchChats();
      Alert.alert('შეწყვეტილია', 'სამუშაო პროცესი დროზე ადრე შეწყდა.');
    } catch (err: any) {
      Alert.alert('შეცდომა', err.message || 'ოპერაცია ვერ შესრულდა');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewTitle.trim() || !reviewDetails.trim() || !selectedChat) {
      Alert.alert('ყურადღება ⚠️', 'გთხოვთ შეავსოთ ყველა ველი');
      return;
    }

    const partnerId = selectedChat.client_id === userId ? selectedChat.freelancer_id : selectedChat.client_id;

    try {
      setIsSubmittingReview(true);

      const { error: insertError } = await supabase
        .from('reviews')
        .insert([{
          job_id: selectedChat.job_id,
          job_title: selectedChat.job_title,
          reviewer_name: userName || 'მომხმარებელი',
          target_name: selectedChat.partner_name,
          review_title: reviewTitle,
          review_details: reviewDetails,
          stars: reviewStars,
          is_negative_cancel: false,
          target_id: partnerId
        }]);

      if (insertError) throw insertError;

      const { data: allTargetReviews } = await supabase
        .from('reviews')
        .select('stars')
        .eq('target_id', partnerId)
        .eq('is_negative_cancel', false);

      if (allTargetReviews && allTargetReviews.length > 0) {
        const totalStars = allTargetReviews.reduce((sum, r) => sum + Number(r.stars), 0);
        const computedAvg = totalStars / allTargetReviews.length;

        await supabase
          .from('users')
          .update({ rating: computedAvg })
          .eq('id', partnerId);
      }

      setHasReviewedPartner(true);
      setIsReviewModalVisible(false);
      setReviewTitle('');
      setReviewDetails('');
      setSelectedChat(null);
      fetchChats();
      
    } catch (err: any) {
      Alert.alert('შეცდომა ❌', err.message || 'შეფასების შენახვა ვერ მოხერხდა');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const hasIStarted = isClient ? selectedChat?.client_started : selectedChat?.worker_started;
  const hasICompleted = isClient ? selectedChat?.client_completed : selectedChat?.worker_completed;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={[styles.headerWrapper, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={styles.header}>
          <View style={[styles.textPushedHeaderRow, { flexDirection: 'row', alignItems: 'center' }]}>
            {selectedChat && (
              <TouchableOpacity onPress={() => setSelectedChat(null)} style={{ marginRight: 12, marginTop: 4 }}>
                <Ionicons name="arrow-back" size={24} color="#5B42F5" />
              </TouchableOpacity>
            )}
            
            {/* 🚀 შიდა ჩათის ჰედერის ავატარი სტატუსის გლოუთი */}
            {selectedChat && (
              <View style={{ position: 'relative', marginRight: 10, marginTop: 4 }}>
                {selectedChat.partner_avatar ? (
                  <Image source={{ uri: selectedChat.partner_avatar }} style={[styles.headerAvatar, { marginRight: 0, marginTop: 0 }]} />
                ) : (
                  <View style={[styles.headerAvatar, { marginRight: 0, marginTop: 0, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{selectedChat.partner_name?.charAt(0)}</Text>
                  </View>
                )}
                <View 
                  style={[
                    styles.chatHeaderGlowDot, 
                    { 
                      backgroundColor: selectedChat.user_status === 'online' ? '#4CD964' : '#FF3B30',
                      borderColor: theme.cardBg,
                      shadowColor: selectedChat.user_status === 'online' ? '#4CD964' : '#FF3B30'
                    }
                  ]} 
                />
              </View>
            )}

            <Text style={[styles.headerStaticTitle, { color: theme.text, fontSize: 20 }]}>
              {selectedChat ? selectedChat.partner_name : (t.chats_header || 'მიმოწერები')}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {selectedChat ? (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <View style={[styles.workflowContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: theme.subText, fontSize: 10, fontWeight: '600' }}>{t.status_label || 'სტატუსი:'}</Text>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>
                {(!selectedChat.job_state || selectedChat.job_state === 'pending') && (t.status_pending || '⏳ შეთანხმების ეტაპი')}
                {selectedChat.job_state === 'started' && (t.status_started || '⚡ მიმდინარეობს')}
                {selectedChat.job_state === 'completed' && (t.status_completed || 'დასრულებული')}
                {selectedChat.job_state === 'cancelled' && (t.status_cancelled || 'შეწყვეტილია')}
              </Text>
            </View>

            {(!selectedChat.job_state || selectedChat.job_state === 'pending') && (
              <TouchableOpacity style={[styles.actionButton, hasIStarted && styles.disabledButton]} onPress={handleStartJob} disabled={hasIStarted}>
                <Text style={styles.actionButtonText}>{hasIStarted ? (t.waiting || 'მოლოდინი...') : (t.start_btn || 'დაწყება')}</Text>
              </TouchableOpacity>
            )}

            {selectedChat.job_state === 'started' && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#4CD964' }, hasICompleted && styles.disabledButton]} onPress={handleCompleteJob} disabled={hasICompleted}>
                <Text style={styles.actionButtonText}>{hasICompleted ? (t.waiting || 'მოლოდინი...') : (t.complete_btn || 'დასრულება')}</Text>
              </TouchableOpacity>
            )}

            {selectedChat.job_state === 'completed' && !hasReviewedPartner && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#ff9500' }]} 
                onPress={() => setIsReviewModalVisible(true)}
              >
                <Text style={styles.actionButtonText}>{t.review_star_btn || 'შეფასება ⭐'}</Text>
              </TouchableOpacity>
            )}

            {selectedChat.job_state !== 'completed' && selectedChat.job_state !== 'cancelled' && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#ff3b30', marginLeft: 6 }]} 
                onPress={() => setIsCancelModalVisible(true)}
              >
                <Text style={styles.actionButtonText}>{t.cancel_cross_btn || 'შეწყვეტა ✖️'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingMessages ? (
            <ActivityIndicator size="large" color="#5B42F5" style={{ flex: 1 }} />
          ) : (
            <ScrollView ref={scrollViewRef} contentContainerStyle={{ padding: 16, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
              {messages.map((msg: any) => {
                if (msg.sender_id === '00000000-0000-0000-0000-000000000000') {
                  return (
                    <View key={msg.id} style={[styles.systemMessageContainer, { backgroundColor: theme.systemBg, borderColor: theme.border }]}>
                      <Text style={{ fontSize: 12, textAlign: 'center', color: isDarkMode ? '#aaa' : '#555' }}>{msg.text}</Text>
                    </View>
                  );
                }
                const isMe = msg.sender_id === userId;
                return (
                  <View key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: 12 }}>
                    <View style={{
                      backgroundColor: isMe ? '#5B42F5' : theme.chatIncoming,
                      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16
                    }}>
                      <Text style={{ color: isMe ? '#fff' : theme.text, fontSize: 14 }}>{msg.text}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={[styles.inputBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.bg, color: theme.inputText }]}
              placeholder={t.message_placeholder || "შეტყობინება..."}
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              value={typedMessage}
              onChangeText={setTypedMessage}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* შეწყვეტის მიზეზის მოდალი */}
          <Modal animationType="fade" transparent={true} visible={isCancelModalVisible} onRequestClose={() => setIsCancelModalVisible(false)}>
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
              <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{t.cancel_modal_title || 'საქმის დროზე ადრე შეწყვეტა'}</Text>
                <Text style={{ color: theme.subText, fontSize: 12, marginBottom: 16, textAlign: 'center' }}>
                  {t.cancel_modal_subtitle || 'გთხოვთ მიუთითოთ მიზეზი, თუ რატომ წყვეტთ სამუშაო ხელშეკრულებას:'}
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.bg, color: theme.inputText, borderColor: theme.border }]}
                  placeholder={t.cancel_reason_placeholder || "ჩაწერეთ კონკრეტული მიზეზი..."}
                  placeholderTextColor="#666"
                  multiline={true}
                  numberOfLines={4}
                  value={cancelReason}
                  onChangeText={setCancelReason}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' }}>
                  <TouchableOpacity style={[styles.modalButton, { borderColor: theme.border, borderWidth: 1 }]} onPress={() => { setIsCancelModalVisible(false); setCancelReason(''); }}>
                    <Text style={{ color: theme.subText, fontWeight: '600' }}>{t.cancel || 'გაუქმება'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ff3b30' }]} onPress={handleCancelJob}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.cancel_btn || 'შეწყვეტა'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* შეფასების მოდალი */}
          <Modal animationType="slide" transparent={true} visible={isReviewModalVisible} onRequestClose={() => setIsReviewModalVisible(false)}>
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
              <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text, fontSize: 18, marginBottom: 4 }]}>{t.review_modal_title || 'პარტნიორის შეფასება ⭐'}</Text>
                <Text style={{ color: theme.subText, fontSize: 12, marginBottom: 16, textAlign: 'center' }}>{t.review_modal_subtitle || 'გთხოვთ შეაფასოთ მუშაობის ხარისხი და კომუნიკაცია'}</Text>
                
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setReviewStars(star)}>
                      <Ionicons 
                        name={star <= reviewStars ? "star" : "star-outline"} 
                        size={32} 
                        color="#FFD700" 
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[styles.singleLineInput, { backgroundColor: theme.bg, color: theme.inputText, borderColor: theme.border }]}
                  placeholder={t.review_title_placeholder || "შეფასების სათაური (მაგ: საუკეთესო პარტნიორი)"}
                  placeholderTextColor="#666"
                  value={reviewTitle}
                  onChangeText={setReviewTitle}
                />

                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.bg, color: theme.inputText, borderColor: theme.border, marginTop: 12 }]}
                  placeholder={t.review_details_placeholder || "დაწერეთ დეტალური აღწერა..."}
                  placeholderTextColor="#666"
                  multiline={true}
                  numberOfLines={4}
                  value={reviewDetails}
                  onChangeText={setReviewDetails}
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' }}>
                  <TouchableOpacity 
                    style={[styles.modalButton, { borderColor: theme.border, borderWidth: 1 }]} 
                    onPress={() => { setIsReviewModalVisible(false); }}
                    disabled={isSubmittingReview}
                  >
                    <Text style={{ color: theme.subText, fontWeight: '600' }}>{t.later_btn || 'მოგვიანებით'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: '#5B42F5' }]} 
                    onPress={handleSubmitReview}
                    disabled={isSubmittingReview}
                  >
                    {isSubmittingReview ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.send_btn || 'გაგზავნა'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
          {loadingChats ? (
            <ActivityIndicator size="small" color="#5B42F5" style={{ marginTop: 20 }} />
          ) : chats.length === 0 ? (
            <Text style={{ color: theme.subText, textAlign: 'center', marginTop: 40 }}>{t.no_chats || 'მიმოწერები არ არის'}</Text>
          ) : (
            chats.map((chat) => (
              <TouchableOpacity key={chat.id} style={[styles.chatRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => setSelectedChat(chat)}>
                
                {/* 🚀 გარეთა ჩათის სიის ავატარი სტატუსის გლოუთი */}
                <View style={{ position: 'relative' }}>
                  <View style={[styles.chatAvatar, { backgroundColor: '#5B42F5', overflow: 'hidden' }]}>
                    {chat.partner_avatar ? (
                      <Image source={{ uri: chat.partner_avatar }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarLetter}>{chat.partner_name?.charAt(0)}</Text>
                    )}
                  </View>
                  <View 
                    style={[
                      styles.chatListGlowDot, 
                      { 
                        backgroundColor: chat.user_status === 'online' ? '#4CD964' : '#FF3B30',
                        borderColor: theme.cardBg,
                        shadowColor: chat.user_status === 'online' ? '#4CD964' : '#FF3B30'
                      }
                    ]} 
                  />
                </View>

                <View style={styles.chatMeta}>
                  <Text style={[styles.chatName, { color: theme.text }]}>{chat.partner_name}</Text>
                  <Text style={styles.chatJobTitle} numberOfLines={1}>
                    {chat.job_state === 'started' && (t.prefix_started || '⚡ მიმდინარე: ')}
                    {chat.job_state === 'cancelled' && (t.prefix_cancelled || 'შეწყვეტილი: ')}
                    {chat.job_state === 'completed' && (t.prefix_completed || 'დასრულებული: ')}
                    {chat.job_title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: { borderBottomWidth: 1, paddingTop: Platform.OS === 'android' ? 35 : 0 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  textPushedHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  headerStaticTitle: { fontSize: 22, fontWeight: 'bold' },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10, marginTop: 4 },
  
  // 🚀 ჩათის სიისა და ჰედერის ონლაინ/ოფლაინ გლოუ წერტილების სტილები
  chatHeaderGlowDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },
  chatListGlowDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },

  workflowContainer: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionButton: { paddingHorizontal: 12, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#5B42F5' },
  disabledButton: { backgroundColor: '#a395f9', opacity: 0.8 },
  actionButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chatRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  chatAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarLetter: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chatMeta: { flex: 1, marginLeft: 12 },
  chatName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  chatJobTitle: { fontSize: 12, color: '#5B42F5', fontWeight: '600' },
  inputBar: { position: 'absolute', bottom: 75, left: 0, right: 0, borderTopWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, height: 40, fontSize: 14 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#5B42F5', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  systemMessageContainer: { alignSelf: 'center', marginVertical: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', maxWidth: '85%' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalCard: { width: '100%', padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  singleLineInput: { width: '100%', height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  modalInput: { width: '100%', height: 80, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  modalButton: { flex: 1, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }
});