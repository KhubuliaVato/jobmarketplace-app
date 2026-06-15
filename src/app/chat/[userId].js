import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useChat } from '../../hooks/useChat';
import { useAuthStore } from '../../store/useAuthStore';

export default function ChatScreen() {
  // ვიღებთ პარამეტრებს როუტერიდან (ვინ არის პარტნიორი, რა საქმეა)
  const { userId, jobId, jobTitle } = useLocalSearchParams();
  const { messages, loading, sendMessage } = useChat(userId, jobId, jobTitle);
  const [text, setText] = useState('');
  const myId = useAuthStore((state) => state.userId);

  const handleSend = () => {
    if (text.trim()) {
      sendMessage(text);
      setText('');
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loaderText}>მესიჯები იტვირთება...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{jobTitle || 'მიმოწერა'}</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const isMine = item.sender_id === myId;
          return (
            <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
              {!isMine && <Text style={styles.senderName}>{item.sender_name}</Text>}
              <Text style={isMine ? styles.myText : styles.theirText}>{item.text}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="ჩაწერეთ შეტყობინება..."
          placeholderTextColor="#999"
        />
        <Button title="გაგზავნა" onPress={handleSend} color="#007AFF" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 10, color: '#666' },
  header: { padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  listContainer: { padding: 10 },
  bubble: { padding: 12, marginVertical: 4, borderRadius: 16, maxWidth: '75%' },
  myBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  theirBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#eee' },
  senderName: { fontSize: 11, fontWeight: '600', color: '#8e8e93', marginBottom: 3 },
  myText: { color: '#fff', fontSize: 15 },
  theirText: { color: '#000', fontSize: 15 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
  input: { flex: 1, height: 40, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, marginRight: 10, paddingHorizontal: 15, backgroundColor: '#fafafa' }
});