import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';

export function useChat(chatPartnerId, jobId, jobTitle) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ვიღებთ სისტემაში შესული იუზერის მონაცემებს Zustand-იდან
  const myId = useAuthStore((state) => state.userId);
  const myName = useAuthStore((state) => state.userName);

  // 1. კონკრეტული ვაკანსიის მიმოწერის ისტორიის წამოღება
  const fetchMessages = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. ახალი შეტყობინების გაგზავნა შენი ბაზის სვეტების შესაბამისად
  const sendMessage = async (textInput) => {
    if (!textInput.trim() || !jobId) return;

    const newMessage = {
      sender_id: myId,
      sender_name: myName,
      sender_avatar: 'EMPTY',
      job_id: jobId,
      job_title: jobTitle,
      text: textInput, // თუ ბაზაში სვეტის სახელი განსხვავებულია, აქ შეიცვლება
      receiver_id: chatPartnerId
    };

    try {
      const { error } = await supabase.from('messages').insert([newMessage]);
      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error.message);
    }
  };

  // 3. Supabase Realtime კონექშენი - უსმენს მხოლოდ ამ კონკრეტულ ვაკანსიას
  useEffect(() => {
    fetchMessages();

    const subscription = supabase
      .channel(`chat_job_${jobId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `job_id=eq.${jobId}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [jobId]);

  return { messages, loading, sendMessage, refresh: fetchMessages };
}