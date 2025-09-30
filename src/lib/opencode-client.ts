import * as serverFns from './opencode-server-fns'

export const openCodeService = {
  async getAgents() {
    try {
      const response = await serverFns.getAgents();
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async log(message: string, level: 'info' | 'error' | 'debug' | 'warn' = 'info') {
    console.log(`[${level.toUpperCase()}] ${message}`);
    return { data: true, error: null };
  },

  async listProjects(directory?: string) {
    try {
      const response = await serverFns.listProjects({ data: { directory } });
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async getCurrentProject(directory?: string) {
    try {
      const response = await serverFns.getCurrentProject({ data: { directory } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getCurrentPath() {
    try {
      const response = await serverFns.getCurrentPath({ data: {} });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getConfig() {
    try {
      const response = await serverFns.getConfig();
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getProviders() {
    try {
      const response = await serverFns.getProviders();
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async createSession({ title, directory }: { title?: string; directory?: string } = {}) {
    try {
      const response = await serverFns.createSession({ data: { title, directory } });
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async sendMessage(sessionId: string, content: string, providerID = "anthropic", modelID = "claude-3-5-sonnet-20241022") {
    try {
      const response = await serverFns.sendMessage({ data: { sessionId, content, providerID, modelID } });
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async getMessages(sessionId: string) {
    const response = await serverFns.getMessages({ data: { sessionId } });
    return { data: response };
  },

  async getSessions(directory?: string) {
    try {
      const response = await serverFns.getSessions({ data: { directory } });
      return { data: response };
    } catch (error) {
      console.error('Error in getSessions:', error);
      return { data: [] };
    }
  },

  async getSession(sessionId: string) {
    try {
      const response = await serverFns.getSession({ data: { sessionId } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async updateSession(sessionId: string, updates: { title?: string }) {
    try {
      const response = await serverFns.updateSession({ data: { sessionId, title: updates.title } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async deleteSession(sessionId: string) {
    try {
      const response = await serverFns.deleteSession({ data: { sessionId } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async deleteAllSessions() {
    try {
      return { data: true };
    } catch (error) {
      throw error;
    }
  },

  async initSession(sessionId: string, messageID: string, providerID: string, modelID: string) {
    try {
      const response = await serverFns.initSession({ data: { sessionId, messageID, providerID, modelID } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async abortSession(sessionId: string) {
    try {
      const response = await serverFns.abortSession({ data: { sessionId } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async shareSession(sessionId: string) {
    try {
      const response = await serverFns.shareSession({ data: { sessionId } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async unshareSession(sessionId: string) {
    try {
      const response = await serverFns.unshareSession({ data: { sessionId } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async summarizeSession(sessionId: string) {
    try {
      const response = await serverFns.summarizeSession({ data: { sessionId } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getSessionMessage(sessionId: string, messageID: string) {
    try {
      const response = await serverFns.getMessage({ data: { sessionId, messageId: messageID } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async sendCommand(sessionId: string, command: string, args?: string[]) {
    try {
      const response = await serverFns.runCommand({ data: { sessionId, command, args } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async runShell(sessionId: string, command: string, args?: string[]) {
    try {
      const response = await serverFns.runCommand({ data: { sessionId, command, args } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async revertMessage(sessionId: string, messageID: string) {
    try {
      const response = await serverFns.revertMessage({ data: { sessionId, messageID } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async unrevertMessage(sessionId: string) {
    try {
      const response = await serverFns.unrevertSession({ data: { sessionId } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async searchText(pattern: string) {
    try {
      const response = await serverFns.findInFiles({ data: { pattern } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async findFiles(query: string) {
    try {
      const response = await serverFns.findFiles({ data: { query } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async findSymbols(query: string) {
    try {
      const response = await serverFns.findSymbols({ data: { query } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async listFiles(path: string, directory?: string) {
    try {
      const response = await serverFns.listFiles({ data: { path, directory } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async readFile(filePath: string, directory?: string) {
    try {
      const response = await serverFns.readFile({ data: { filePath, directory } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getFileStatus() {
    try {
      const response = await serverFns.getFileStatus();
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async appendPrompt(text: string) {
    try {
      const response = await serverFns.appendPrompt({ data: { text } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async openHelp() {
    try {
      return { data: true };
    } catch (error) {
      throw error;
    }
  },

  async openSessions() {
    try {
      return { data: true };
    } catch (error) {
      throw error;
    }
  },

  async openThemes() {
    try {
      return { data: true };
    } catch (error) {
      throw error;
    }
  },

  async openModels() {
    try {
      return { data: true };
    } catch (error) {
      throw error;
    }
  },

  async submitPrompt() {
    try {
      const response = await serverFns.submitPrompt();
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async clearPrompt() {
    try {
      const response = await serverFns.clearPrompt();
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async executeCommand(command: string) {
    try {
      const response = await serverFns.executeCommand({ data: { command } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async showToast(message: string, title?: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') {
    try {
      const response = await serverFns.showToast({ data: { message, title, variant } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async setAuth(providerId: string, type: 'api', key: string) {
    try {
      const response = await serverFns.setAuth({ data: { providerId, auth: { type, key } } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async subscribeToEvents() {
    try {
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async getToolIds() {
    try {
      const response = await serverFns.getToolIds({ data: {} });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getTools(provider: string, model: string, directory?: string) {
    try {
      const response = await serverFns.getTools({ data: { provider, model, directory } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getSessionChildren(sessionId: string) {
    try {
      const response = await serverFns.getSessionChildren({ data: { sessionId } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async respondToPermission(sessionId: string, permissionId: string, permissionResponse: boolean) {
    try {
      const response = await serverFns.respondToPermission({ data: { sessionId, permissionId, response: permissionResponse } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getCommands() {
    try {
      const response = await serverFns.getCommands({ data: {} });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async updateConfig(config: Record<string, unknown>, directory?: string) {
    try {
      const response = await serverFns.updateConfig({ data: { config, directory } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  }
};

export function handleOpencodeError(error: unknown): string {
  if (error && typeof error === 'object' && 'status' in error) {
    const apiError = error as { status: number; message?: string }
    return `API Error (${apiError.status}): ${apiError.message || 'Unknown error'}`
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message
  }
  if (error instanceof Error) {
    return error.message
  }
  return `Unknown error occurred: ${JSON.stringify(error)}`
}