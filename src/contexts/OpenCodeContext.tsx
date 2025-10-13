

import React, { createContext, useContext, ReactNode } from 'react';
import { useOpenCode } from '@/hooks/useOpenCode';

interface OpenCodeContextType {
  // All exports from useOpenCode
  currentSession: ReturnType<typeof useOpenCode>['currentSession'];
  messages: ReturnType<typeof useOpenCode>['messages'];
  setMessages: ReturnType<typeof useOpenCode>['setMessages'];
  sessions: ReturnType<typeof useOpenCode>['sessions'];
  loading: ReturnType<typeof useOpenCode>['loading'];
  createSession: ReturnType<typeof useOpenCode>['createSession'];
  sendMessage: ReturnType<typeof useOpenCode>['sendMessage'];
  loadSessions: ReturnType<typeof useOpenCode>['loadSessions'];
  loadMessages: ReturnType<typeof useOpenCode>['loadMessages'];
  switchSession: ReturnType<typeof useOpenCode>['switchSession'];
  deleteSession: ReturnType<typeof useOpenCode>['deleteSession'];
  clearAllSessions: ReturnType<typeof useOpenCode>['clearAllSessions'];
  projects: ReturnType<typeof useOpenCode>['projects'];
  currentProject: ReturnType<typeof useOpenCode>['currentProject'];
  switchProject: ReturnType<typeof useOpenCode>['switchProject'];
  loadProjects: ReturnType<typeof useOpenCode>['loadProjects'];
   files: ReturnType<typeof useOpenCode>['files'];
   fileDirectory: ReturnType<typeof useOpenCode>['fileDirectory'];
   loadFiles: ReturnType<typeof useOpenCode>['loadFiles'];
   searchFiles: ReturnType<typeof useOpenCode>['searchFiles'];
   readFile: ReturnType<typeof useOpenCode>['readFile'];

  searchText: ReturnType<typeof useOpenCode>['searchText'];
  models: ReturnType<typeof useOpenCode>['models'];
  selectedModel: ReturnType<typeof useOpenCode>['selectedModel'];
  selectModel: ReturnType<typeof useOpenCode>['selectModel'];
  loadModels: ReturnType<typeof useOpenCode>['loadModels'];
  config: ReturnType<typeof useOpenCode>['config'];
  currentPath: ReturnType<typeof useOpenCode>['currentPath'];
  loadCurrentPath: ReturnType<typeof useOpenCode>['loadCurrentPath'];
  providersData: ReturnType<typeof useOpenCode>['providersData'];
  isConnected: ReturnType<typeof useOpenCode>['isConnected'];
  sseConnectionState: ReturnType<typeof useOpenCode>['sseConnectionState'];
  isHydrated: ReturnType<typeof useOpenCode>['isHydrated'];
  openHelp: ReturnType<typeof useOpenCode>['openHelp'];
  openSessions: ReturnType<typeof useOpenCode>['openSessions'];
  openThemes: ReturnType<typeof useOpenCode>['openThemes'];
  openModels: ReturnType<typeof useOpenCode>['openModels'];
  showToast: ReturnType<typeof useOpenCode>['showToast'];
  showHelp: ReturnType<typeof useOpenCode>['showHelp'];
  setShowHelp: ReturnType<typeof useOpenCode>['setShowHelp'];
  showThemes: ReturnType<typeof useOpenCode>['showThemes'];
  setShowThemes: ReturnType<typeof useOpenCode>['setShowThemes'];
   showOnboarding: ReturnType<typeof useOpenCode>['showOnboarding'];
   setShowOnboarding: ReturnType<typeof useOpenCode>['setShowOnboarding'];
   showModelPicker: ReturnType<typeof useOpenCode>['showModelPicker'];
   setShowModelPicker: ReturnType<typeof useOpenCode>['setShowModelPicker'];
   agents: ReturnType<typeof useOpenCode>['agents'];
   currentAgent: ReturnType<typeof useOpenCode>['currentAgent'];
   selectAgent: ReturnType<typeof useOpenCode>['selectAgent'];
   loadAgents: ReturnType<typeof useOpenCode>['loadAgents'];
   extractTextFromParts: ReturnType<typeof useOpenCode>['extractTextFromParts'];
   runShell: ReturnType<typeof useOpenCode>['runShell'];
   revertMessage: ReturnType<typeof useOpenCode>['revertMessage'];
   unrevertSession: ReturnType<typeof useOpenCode>['unrevertSession'];
    shareSession: ReturnType<typeof useOpenCode>['shareSession'];
    unshareSession: ReturnType<typeof useOpenCode>['unshareSession'];
    initSession: ReturnType<typeof useOpenCode>['initSession'];
    summarizeSession: ReturnType<typeof useOpenCode>['summarizeSession'];
    currentPermission: ReturnType<typeof useOpenCode>['currentPermission'];
    setCurrentPermission: ReturnType<typeof useOpenCode>['setCurrentPermission'];
    shouldBlurEditor: ReturnType<typeof useOpenCode>['shouldBlurEditor'];
    setShouldBlurEditor: ReturnType<typeof useOpenCode>['setShouldBlurEditor'];
    currentSessionTodos: ReturnType<typeof useOpenCode>['currentSessionTodos'];
    setCurrentSessionTodos: ReturnType<typeof useOpenCode>['setCurrentSessionTodos'];
  }

const OpenCodeContext = createContext<OpenCodeContextType | undefined>(undefined);

export const useOpenCodeContext = () => {
  const context = useContext(OpenCodeContext);
  if (!context) {
    throw new Error('useOpenCodeContext must be used within an OpenCodeProvider');
  }
  return context;
};

interface OpenCodeProviderProps {
  children: ReactNode;
}

export const OpenCodeProvider: React.FC<OpenCodeProviderProps> = ({ children }) => {
  const hookValue = useOpenCode();

  return (
    <OpenCodeContext.Provider value={hookValue}>
      {children}
    </OpenCodeContext.Provider>
  );
};