import { useState, useEffect, useCallback } from 'react';
import { openCodeService, handleOpencodeError } from '@/lib/opencode';
import type { Part } from "../../node_modules/@opencode-ai/sdk/dist/gen/types.gen";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface OpenCodeMessage {
  info?: {
    id?: string;
    role?: string;
    time?: {
      created?: number;
    };
  };
  parts?: Part[];
}

interface Session {
  id: string;
  title?: string;
  createdAt?: Date;
}

export function useOpenCode() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const createSession = useCallback(async (title?: string) => {
    try {
      setLoading(true);
      const response = await openCodeService.createSession(title);
      const session = response.data;
      if (!session) {
        throw new Error('Failed to create session');
      }
      const newSession: Session = {
        id: session.id,
        title: title || session.title,
        createdAt: new Date(),
      };
      setCurrentSession(newSession);
      setMessages([]);
      return newSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error(handleOpencodeError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentSession) {
      throw new Error('No active session');
    }

    try {
      setLoading(true);

      // Add user message to local state
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Send message to OpenCode
      const response = await openCodeService.sendMessage(currentSession.id, content);
      const data = response.data;
      if (!data) {
        throw new Error('No response data');
      }

      // Add assistant response to local state
      const textPart = data.parts?.find((part: Part) => part.type === 'text');
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: (textPart && 'text' in textPart ? textPart.text : '') || 'No response content',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      return assistantMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new Error(handleOpencodeError(error));
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const response = await openCodeService.getMessages(sessionId);
      const messagesArray = response.data || [];
      const loadedMessages: Message[] = messagesArray.map((msg: OpenCodeMessage, index: number) => {
        const textPart = msg.parts?.find((part: Part) => part.type === 'text');
        return {
          id: msg.info?.id || `msg-${index}`,
          type: msg.info?.role === 'user' ? 'user' : 'assistant',
          content: (textPart && 'text' in textPart ? textPart.text : '') || '',
          timestamp: new Date(msg.info?.time?.created || Date.now()),
        };
      });
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id);
    }
  }, [currentSession, loadMessages]);

  return {
    currentSession,
    messages,
    loading,
    createSession,
    sendMessage,
  };
}