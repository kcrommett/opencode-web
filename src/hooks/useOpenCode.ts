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
    projectId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    messageCount?: number;
  }

 interface Project {
   id: string;
   worktree: string;
   vcs?: string;
   time?: {
     created?: number;
     updated?: number;
   };
   createdAt?: Date;
   updatedAt?: Date;
 }

  interface FileInfo {
    path: string;
    type: 'file' | 'directory';
    size?: number;
    modifiedAt?: Date;
  }

 interface Model {
   providerID: string;
   modelID: string;
   name: string;
 }

 interface Config {
   model?: string;
   providers?: { id: string; name?: string; models?: { id: string; name?: string }[] }[];
 }

  interface ProvidersData {
    providers?: { id: string; name?: string; models?: { id: string; name?: string }[] | Record<string, { name?: string; [key: string]: unknown }> }[];
    default?: { [key: string]: string };
  }

export function useOpenCode() {
   const [currentSession, setCurrentSession] = useState<Session | null>(null);
   const [messages, setMessages] = useState<Message[]>([]);
   const [loading, setLoading] = useState(false);
   const [sessions, setSessions] = useState<Session[]>([]);
   const [projects, setProjects] = useState<Project[]>([]);
   const [currentProject, setCurrentProject] = useState<Project | null>(null);
   const [files, setFiles] = useState<FileInfo[]>([]);
  const [models, setModels] = useState<Model[]>([]);
    const [selectedModel, setSelectedModel] = useState<Model>({ providerID: 'anthropic', modelID: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' });
    const [config, setConfig] = useState<Config | null>(null);
    const [currentPath, setCurrentPath] = useState<string>('');
     const [providersData, setProvidersData] = useState<ProvidersData | null>(null);
     const [showHelp, setShowHelp] = useState(false);
     const [showThemes, setShowThemes] = useState(false);

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
       const sessionDirectory = directory || currentProject?.worktree;
       const response = await openCodeService.createSession({ title, directory: sessionDirectory });
       const session = response.data as unknown as { id: string; title?: string; directory?: string; projectID?: string; createdAt?: string | number; updatedAt?: string | number } | undefined;
       if (!session) {
         throw new Error('Failed to create session');
       }
       const newSession: Session = {
         id: session.id,
         title: title || session.title,
         directory: sessionDirectory || session.directory,
         projectId: session.projectID || currentProject?.id,
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
   }, [currentProject]);

   const sendMessage = useCallback(async (content: string, providerID?: string, modelID?: string) => {
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
       const response = await openCodeService.sendMessage(currentSession.id, content, providerID, modelID);
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
       const sessionsArray = (response.data as Array<{ id: string; title?: string; directory?: string; projectID?: string; createdAt?: string | number; updatedAt?: string | number }>) || [];
       
       // Filter sessions by current project if selected
       const filteredSessions = currentProject ? sessionsArray.filter(s => s.projectID === currentProject.id) : sessionsArray;
       
       // Load messages for each session to get message count and last updated time
       const loadedSessions: Session[] = await Promise.all(
         filteredSessions.map(async (session) => {
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
             projectId: session.projectID,
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
   }, [currentSession, loadMessages, currentProject]);

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

    // Project management
    const loadProjects = useCallback(async () => {
      try {
        console.log('Loading projects...');
        const response = await openCodeService.listProjects();
        console.log('Projects response:', response);
        const projectsArray: Project[] = Array.isArray(response.data) ? response.data : [];
        console.log('Projects array:', projectsArray);
        setProjects(projectsArray);
        if (projectsArray.length > 0 && !currentProject) {
          setCurrentProject(projectsArray[0]);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
         // Fallback: Set some dummy projects for testing
         const dummyProjects: Project[] = [
           { id: '1', worktree: '/path/to/project1' },
           { id: '2', worktree: '/path/to/project2' }
         ];
        setProjects(dummyProjects);
        if (!currentProject) {
          setCurrentProject(dummyProjects[0]);
        }
      }
    }, [currentProject]);

   const switchProject = useCallback(async (projectId: string) => {
     const project = projects.find(p => p.id === projectId);
     if (project) {
       setCurrentProject(project);
     }
   }, [projects]);

     // File operations
     const loadFiles = useCallback(async (directory?: string) => {
       try {
         console.log('Loading files for directory:', directory);
         const response = await openCodeService.getFileStatus(directory);
         console.log('Files response:', response);
         const filesArray = Array.isArray(response.data) ? response.data : [];
         console.log('Files array:', filesArray);
         setFiles(filesArray);
       } catch (error) {
         console.error('Failed to load files:', error);
         // Fallback: Set some dummy files for testing
         const dummyFiles: FileInfo[] = [
           { path: '/sample/file1.txt', type: 'file', size: 1024 },
           { path: '/sample/file2.js', type: 'file', size: 2048 },
           { path: '/sample/folder', type: 'directory' }
         ];
         setFiles(dummyFiles);
       }
     }, []);

   const searchFiles = useCallback(async (query: string) => {
     try {
       const response = await openCodeService.findFiles(query);
       const filePaths = Array.isArray(response.data) ? response.data : [];
       return filePaths;
     } catch (error) {
       console.error('Failed to search files:', error);
       return [];
     }
   }, []);

   const readFile = useCallback(async (filePath: string) => {
     try {
       const response = await openCodeService.readFile(filePath);
       return response.data;
     } catch (error) {
       console.error('Failed to read file:', error);
       return null;
     }
   }, []);

   const searchText = useCallback(async (query: string) => {
     try {
       const response = await openCodeService.searchText(query);
       const results = Array.isArray(response.data) ? response.data : [];
       return results;
     } catch (error) {
       console.error('Failed to search text:', error);
       return [];
     }
   }, []);

    // Model selection
    const loadModels = useCallback(async () => {
      try {
        console.log('Loading models...');
        const response = await openCodeService.getProviders();
         console.log('Providers response:', response);
         const providersData = response.data as ProvidersData | undefined;
         console.log('Providers data:', providersData);
         setProvidersData(providersData || null);
         if (providersData && providersData.providers && Array.isArray(providersData.providers)) {
           const availableModels: Model[] = [];
            providersData.providers.forEach((provider: { id: string; name?: string; models?: { id: string; name?: string }[] | Record<string, { name?: string; [key: string]: unknown }> }) => {
             console.log('Processing provider:', provider);
             // Check if provider has models
             if (provider.models && typeof provider.models === 'object') {
               // Handle models as object
                Object.entries(provider.models).forEach(([modelId, modelData]: [string, { name?: string; [key: string]: unknown }]) => {
                 availableModels.push({
                   providerID: provider.id,
                   modelID: modelId,
                   name: modelData.name || `${provider.name || provider.id} ${modelId}`
                 });
               });
              } else if (provider.models && Array.isArray(provider.models)) {
                // Handle models as array
                (provider.models as { id: string; name?: string }[]).forEach((model: { id: string; name?: string }) => {
                 availableModels.push({
                   providerID: provider.id,
                   modelID: model.id,
                   name: model.name || `${provider.name || provider.id} ${model.id}`
                 });
               });
             }
             // Only add if has models, don't treat provider as model
           });
           console.log('Available models:', availableModels);
           setModels(availableModels);
           if (availableModels.length > 0 && !selectedModel) {
             setSelectedModel(availableModels[0]);
           }
         }
      } catch (error) {
        console.error('Failed to load models:', error);
        // Fallback: Set some dummy models for testing
        const dummyModels: Model[] = [
          { providerID: 'anthropic', modelID: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
          { providerID: 'openai', modelID: 'gpt-4', name: 'GPT-4' }
        ];
        setModels(dummyModels);
        if (!selectedModel) {
          setSelectedModel(dummyModels[0]);
        }
      }
    }, [selectedModel]);

   const selectModel = useCallback((model: Model) => {
     setSelectedModel(model);
   }, []);

   // Config and path
   const loadConfig = useCallback(async () => {
     try {
       const response = await openCodeService.getConfig();
       const configData = response.data as Config | undefined;
       setConfig(configData || null);
     } catch (error) {
       console.error('Failed to load config:', error);
     }
   }, []);

   const loadCurrentPath = useCallback(async () => {
     try {
       const response = await openCodeService.getCurrentPath();
       const pathData = response.data as { path?: string } | undefined;
       setCurrentPath(pathData?.path || '');
     } catch (error) {
       console.error('Failed to load current path:', error);
     }
   }, []);

   // TUI controls
    const openHelp = useCallback(async () => {
      // Open help dialog in frontend
      setShowHelp(true);
    }, []);

   const openSessions = useCallback(async () => {
     try {
       await openCodeService.openSessions();
     } catch (error) {
       console.error('Failed to open sessions:', error);
     }
   }, []);

    const openThemes = useCallback(async () => {
      // Open themes dialog in frontend
      setShowThemes(true);
    }, []);

   const openModels = useCallback(async () => {
     try {
       await openCodeService.openModels();
     } catch (error) {
       console.error('Failed to open models:', error);
     }
   }, []);

   const showToast = useCallback(async (message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') => {
     try {
       await openCodeService.showToast(message, variant);
     } catch (error) {
       console.error('Failed to show toast:', error);
     }
   }, []);

   // Load sessions on mount
   useEffect(() => {
     loadSessions();
     loadProjects();
     loadConfig();
     loadModels();
   }, [loadSessions, loadProjects, loadConfig, loadModels]);

    return {
      currentSession,
      messages,
      setMessages,
      sessions,
      loading,
      createSession,
      sendMessage,
      loadSessions,
      switchSession,
      deleteSession,
      clearAllSessions,
      // New features
      projects,
      currentProject,
      switchProject,
      loadProjects,
      files,
      loadFiles,
      searchFiles,
      readFile,
      searchText,
      models,
      selectedModel,
      selectModel,
      loadModels,
      config,
      currentPath,
      loadCurrentPath,
      providersData,
       openHelp,
       openSessions,
       openThemes,
       openModels,
       showToast,
       showHelp,
       setShowHelp,
       showThemes,
       setShowThemes,
    };
 }
