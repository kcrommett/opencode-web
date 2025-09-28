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
  directory?: string;
  createdAt?: Date;
  updatedAt?: Date;
  messageCount?: number;
}

export function useOpenCode() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Load current session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('opencode-current-session');
    if (savedSessionId) {
      // We'll set this after sessions are loaded
      localStorage.setItem('opencode-current-session', savedSessionId);
    }
  }, []);

  // Save current session to localStorage when it changes
  useEffect(() => {
    if (currentSession) {
      localStorage.setItem('opencode-current-session', currentSession.id);
    } else {
      localStorage.removeItem('opencode-current-session');
    }
  }, [currentSession]);

  const createSession = useCallback(async ({ title, directory }: { title?: string; directory?: string } = {}) => {
    try {
      setLoading(true);
      const response = await openCodeService.createSession({ title, directory });
      const session = response.data as unknown as { id: string; title?: string; directory?: string; createdAt?: string | number; updatedAt?: string | number } | undefined;
      if (!session) {
        throw new Error('Failed to create session');
      }
      const newSession: Session = {
        id: session.id,
        title: title || session.title,
        directory: directory || session.directory,
        createdAt: session.createdAt ? new Date(session.createdAt) : new Date(),
        updatedAt: session.updatedAt ? new Date(session.updatedAt) : undefined,
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
      const data = response.data as unknown as { parts?: Part[] } | undefined;
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
      const messagesArray = (response.data as unknown as OpenCodeMessage[]) || [];
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

  const loadSessions = useCallback(async () => {
    try {
      const response = await openCodeService.getSessions();
      const sessionsArray = (response.data as Array<{ id: string; title?: string; directory?: string; createdAt?: string | number; updatedAt?: string | number }>) || [];
      
      // Load messages for each session to get message count and last updated time
      const loadedSessions: Session[] = await Promise.all(
        sessionsArray.map(async (session) => {
          let messageCount = 0;
          let updatedAt = session.createdAt ? new Date(session.createdAt) : new Date();
          
          try {
            const messagesResponse = await openCodeService.getMessages(session.id);
            const messagesArray = (messagesResponse.data as unknown as OpenCodeMessage[]) || [];
            messageCount = messagesArray.length;
            
            // Get the latest message timestamp for updatedAt
            if (messagesArray.length > 0) {
              const latestMessage = messagesArray[messagesArray.length - 1];
              if (latestMessage?.info?.time?.created) {
                updatedAt = new Date(latestMessage.info.time.created);
              }
            }
          } catch (error) {
            console.warn(`Failed to load messages for session ${session.id}:`, error);
          }
          
          return {
            id: session.id,
            title: session.title || `Session ${session.id.slice(0, 8)}`,
            directory: session.directory,
            createdAt: new Date(session.createdAt || Date.now()),
            updatedAt: session.updatedAt ? new Date(session.updatedAt) : updatedAt,
            messageCount,
          };
        })
      );
      
      setSessions(loadedSessions);

      // Restore saved session if it exists in the loaded sessions
      const savedSessionId = localStorage.getItem('opencode-current-session');
      if (savedSessionId && !currentSession) {
        const savedSession = loadedSessions.find(s => s.id === savedSessionId);
        if (savedSession) {
          setCurrentSession(savedSession);
          await loadMessages(savedSessionId);
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, [currentSession, loadMessages]);

  const switchSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      await loadMessages(sessionId);
    }
  }, [sessions, loadMessages]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await openCodeService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw new Error(handleOpencodeError(error));
    }
  }, [currentSession]);

  const clearAllSessions = useCallback(async () => {
    try {
      setLoading(true);
      await openCodeService.deleteAllSessions();
      setSessions([]);
      setCurrentSession(null);
      setMessages([]);
      localStorage.removeItem('opencode-current-session');
    } catch (error) {
      console.error('Failed to clear sessions:', error);
      throw new Error(handleOpencodeError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id);
    }
  }, [currentSession, loadMessages]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    currentSession,
    messages,
    sessions,
    loading,
    createSession,
    sendMessage,
    loadSessions,
    switchSession,
    deleteSession,
    clearAllSessions,
  };
}
