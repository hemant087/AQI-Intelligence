import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAqiData } from '../../src/hooks/useAqiData';

export default function AiAssistantScreen() {
  const { aqiInfo, latestReading, aqiScore } = useAqiData();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: 'Hello! I am AtmoPulse AI. Ask me anything about the air quality around you, health recommendations, or current news.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const predefinedQuestions = [
    "Is it safe to go jogging now?",
    "Why is the AQI so high today?",
    "What precautions should I take?"
  ];

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setIsLoading(false);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isGenerating) return;
    
    const userMsg = text.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuestion('');
    setIsLoading(true);
    setIsGenerating(true);

    // Initialize AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      let contextStr = `Current AQI: ${aqiScore || 'Unknown'}, Level: ${aqiInfo.level}. `;
      if (latestReading) {
        contextStr += `PM2.5: ${latestReading.pm25.toFixed(1)} µg/m³. `;
      }
      
      const systemPrompt = `You are AtmoPulse AI, an air quality assistant. Keep responses brief, structured, and helpful. Focus on actionable advice based on the context. Context: ${contextStr}`;
      const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:11434' : 'http://localhost:11434';
      
      const isWeb = Platform.OS === 'web';
      
      // Build the memory window: System prompt + User/AI History + Current Question
      const chatMemory = [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: userMsg }
      ];

      const payload = {
        model: 'llama3.1:8b',
        messages: chatMemory,
        stream: isWeb 
      };

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to reach local LLM');
      }

      if (isWeb && response.body) {
        setIsLoading(false); 
        setMessages(prev => [...prev, { role: 'ai', content: '' }]); 
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let currentText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                currentText += parsed.message.content;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content = currentText;
                  return newMsgs;
                });
              }
            } catch (e) {}
          }
        }
      } else {
        const data = await response.json();
        const reply = data.message?.content || "I couldn't generate a response.";
        setMessages(prev => [...prev, { role: 'ai', content: reply }]);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation stopped by user');
      } else {
        console.log('Error calling LLM:', error);
        setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I couldn't connect to the local LLM. Please make sure Ollama is running and accessible." }]);
      }
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={index} style={{ fontWeight: 'bold', color: '#ffffff' }}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#212121" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AtmoPulse <Text style={{color:'#888', fontSize: 16}}>⌵</Text></Text>
        <TouchableOpacity onPress={() => setMessages([{ role: 'ai', content: 'Hello! Ask me anything about the air quality around you.'}])}>
          <MaterialCommunityIcons name="square-edit-outline" size={24} color="#ececec" />
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <View style={styles.chatWrapper}>
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={styles.chatContainer} 
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 1 && (
               <View style={styles.emptyState}>
                 <Text style={styles.emptyStateTitle}>What's the air quality like today?</Text>
               </View>
            )}

            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              if (idx === 0) return null; 
              
              return (
                <View key={idx} style={[styles.messageWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
                  {!isUser && (
                    <View style={styles.aiAvatar}>
                      <MaterialCommunityIcons name="robot-outline" size={18} color="white" />
                    </View>
                  )}
                  <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
                    <Text style={styles.messageText}>
                      {isUser ? msg.content : renderFormattedText(msg.content)}
                    </Text>
                  </View>
                </View>
              )
            })}
            
            {isLoading && (
              <View style={[styles.messageWrapper, styles.aiWrapper]}>
                <View style={styles.aiAvatar}>
                  <MaterialCommunityIcons name="robot-outline" size={18} color="white" />
                </View>
                <View style={styles.aiBubble}>
                    <Text style={[styles.messageText, {fontStyle: 'italic', color: '#888'}]}>Thinking...</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.interactionArea}>
          {messages.length === 1 && (
            <View style={styles.quickActionsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 15, alignItems: 'center'}}>
                {predefinedQuestions.map((pq, idx) => (
                  <TouchableOpacity key={idx} style={styles.quickActionBtn} onPress={() => handleSend(pq)}>
                    <Text style={styles.quickActionText}>{pq}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.inputArea}>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="plus" size={24} color="#b4b4b4" style={styles.attachIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Message AtmoPulse AI..."
                placeholderTextColor="#888"
                value={question}
                onChangeText={setQuestion}
                multiline
                maxLength={500}
                editable={!isGenerating}
                onKeyPress={(e: any) => {
                  if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(question);
                  }
                }}
                submitBehavior="blurAndSubmit"
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!question.trim() && !isGenerating) && styles.sendButtonDisabled]} 
                disabled={!question.trim() && !isGenerating}
                onPress={() => isGenerating ? stopGeneration() : handleSend(question)}
              >
                {isGenerating ? (
                   <MaterialCommunityIcons name="square" size={18} color="black" />
                ) : (
                   question.trim() ? (
                      <MaterialCommunityIcons name="arrow-up" size={20} color="black" />
                   ) : (
                      <MaterialCommunityIcons name="microphone" size={20} color="#b4b4b4" />
                   )
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.disclaimer}>AtmoPulse AI can make mistakes. Consider verifying safety guidelines.</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121', 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#212121',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ececec',
  },
  flex1: {
    flex: 1,
  },
  chatWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  chatContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  emptyStateTitle: {
    fontSize: 28,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 24,
    width: '100%',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#2f2f2f',
    padding: 12,
    paddingHorizontal: 18,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
    maxWidth: '90%',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#ececec',
  },
  interactionArea: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  quickActionsContainer: {
    marginBottom: 10,
  },
  quickActionBtn: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#444',
  },
  quickActionText: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '400',
  },
  inputArea: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    backgroundColor: '#2f2f2f',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    alignItems: 'flex-end',
    width: '100%',
    minHeight: 52,
  },
  attachIcon: {
    marginBottom: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 36,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#ffffff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: 'transparent',
  },
  disclaimer: {
    color: '#777',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  }
});
