 "use client"

import { createOpencodeClient } from "../../node_modules/@opencode-ai/sdk/dist/client.js"

const client = createOpencodeClient({
        baseUrl: process.env.NEXT_PUBLIC_OPENCODE_URL || "http://localhost:4096",
        responseStyle: "data",
  })

   export const openCodeService = {
       // App methods
       async getAgents() {
           try {
               console.log('Getting agents...');
               const response = await client.app.agents();
               console.log('Agents response:', response);
               return { data: response, error: null };
           } catch (error) {
               console.error('Get agents failed:', error);
               return { data: null, error: handleOpencodeError(error) };
           }
       },

       async log(message: string, level: 'info' | 'error' | 'debug' | 'warn' = 'info', service: string = 'opencode-web') {
           try {
               const response = await client.app.log({
                   body: { message, level, service }
               });
               return { data: response, error: null };
           } catch (error) {
               console.error('Log failed:', error);
               return { data: null, error: handleOpencodeError(error) };
           }
       },

       // Project methods
       async listProjects() {
           try {
               const response = await client.project.list();
               return { data: response, error: null };
           } catch (error) {
               console.error('List projects failed:', error);
               return { data: null, error: handleOpencodeError(error) };
           }
       },

      async getCurrentProject() {
          try {
              const response = await client.project.current();
              return { data: response };
          } catch (error) {
              console.error('Get current project failed:', error);
              throw error;
          }
      },

      // Path methods
      async getCurrentPath() {
          try {
              const response = await client.path.get();
              return { data: response };
          } catch (error) {
              console.error('Get current path failed:', error);
              throw error;
          }
      },

      // Config methods
      async getConfig() {
          try {
              const response = await client.config.get();
              return { data: response };
          } catch (error) {
              console.error('Get config failed:', error);
              throw error;
          }
      },

      async getProviders() {
          try {
              const response = await client.config.providers();
              return { data: response };
          } catch (error) {
              console.error('Get providers failed:', error);
              throw error;
          }
      },

      // Session methods
       async createSession({ title, directory }: { title?: string; directory?: string } = {}) {
            try {
                console.log('Creating session with title:', title, 'and directory:', directory);
                const body: { title?: string } = {};
                if (title) body.title = title;
                const response = await client.session.create({
                    query: directory ? { directory } : undefined,
                    body
                });
                console.log('Session creation response:', response);
                return { data: response, error: null };
            } catch (error) {
                console.error('Session creation failed:', error);
                return { data: null, error: handleOpencodeError(error) };
            }
       },

       async sendMessage(sessionId: string, content: string, providerID: string = "anthropic", modelID: string = "claude-3-5-sonnet-20241022") {
           try {
               const response = await client.session.prompt({
                   path: { id: sessionId },
                   body: {
                       model: { providerID, modelID },
                       parts: [{ type: "text", text: content }]
                   }
               });
               return { data: response, error: null };
           } catch (error) {
               console.error('Send message failed:', error);
               return { data: null, error: handleOpencodeError(error) };
           }
       },

      async getMessages(sessionId: string) {
          const response = await client.session.messages({
              path: { id: sessionId }
          });
          return { data: response };
      },

      async getSessions() {
          const response = await client.session.list();
          const data = Array.isArray(response) ? response : (response && 'data' in response ? response.data : []);
          return { data };
      },

      async getSession(sessionId: string) {
          try {
              const response = await client.session.get({ path: { id: sessionId } });
              return { data: response };
          } catch (error) {
              console.error('Get session failed:', error);
              throw error;
          }
      },

      async updateSession(sessionId: string, updates: { title?: string; directory?: string }) {
          try {
              const response = await client.session.update({
                  path: { id: sessionId },
                  body: updates
              });
              return { data: response };
          } catch (error) {
              console.error('Update session failed:', error);
              throw error;
          }
      },

      async deleteSession(sessionId: string) {
          try {
              console.log('Deleting session:', sessionId);
              const response = await client.session.delete({
                  path: { id: sessionId }
              });
              console.log('Session deletion response:', response);
              return { data: response };
          } catch (error) {
              console.error('Session deletion failed:', error);
              throw error;
          }
      },

      async deleteAllSessions() {
          try {
              console.log('Deleting all sessions');
              const response = await client.session.list();
              const sessions = (Array.isArray(response)
                  ? response
                  : response && 'data' in response
                      ? response.data
                      : []) as Array<{ id: string }>;
              await Promise.all(
                  sessions.map((session) =>
                      client.session.delete({ path: { id: session.id } })
                  )
              );
              return { data: sessions.map((session) => session.id) };
          } catch (error) {
              console.error('Delete all sessions failed:', error);
              throw error;
          }
      },

      async initSession(sessionId: string) {
          try {
              const response = await client.session.init({ path: { id: sessionId } });
              return { data: response };
          } catch (error) {
              console.error('Init session failed:', error);
              throw error;
          }
      },

      async abortSession(sessionId: string) {
          try {
              const response = await client.session.abort({ path: { id: sessionId } });
              return { data: response };
          } catch (error) {
              console.error('Abort session failed:', error);
              throw error;
          }
      },

      async shareSession(sessionId: string) {
          try {
              const response = await client.session.share({ path: { id: sessionId } });
              return { data: response };
          } catch (error) {
              console.error('Share session failed:', error);
              throw error;
          }
      },

      async unshareSession(sessionId: string) {
          try {
              const response = await client.session.unshare({ path: { id: sessionId } });
              return { data: response };
          } catch (error) {
              console.error('Unshare session failed:', error);
              throw error;
          }
      },

      async summarizeSession(sessionId: string) {
          try {
              const response = await client.session.summarize({
                  path: { id: sessionId }
              });
              return { data: response };
          } catch (error) {
              console.error('Summarize session failed:', error);
              throw error;
          }
      },

      async getSessionMessage(sessionId: string, messageID: string) {
          try {
              const response = await client.session.message({
                  path: { id: sessionId, messageID }
              });
              return { data: response };
          } catch (error) {
              console.error('Get session message failed:', error);
              throw error;
          }
      },

      async sendCommand(sessionId: string, command: string, args: string = '') {
          try {
              const response = await client.session.command({
                  path: { id: sessionId },
                  body: { command, arguments: args }
              });
              return { data: response };
          } catch (error) {
              console.error('Send command failed:', error);
              throw error;
          }
      },

      async runShell(sessionId: string, command: string, agent: string = 'bash') {
          try {
              const response = await client.session.shell({
                  path: { id: sessionId },
                  body: { command, agent }
              });
              return { data: response };
          } catch (error) {
              console.error('Run shell failed:', error);
              throw error;
          }
      },

      async revertMessage(sessionId: string, messageID: string) {
          try {
              const response = await client.session.revert({
                  path: { id: sessionId },
                  body: { messageID }
              });
              return { data: response };
          } catch (error) {
              console.error('Revert message failed:', error);
              throw error;
          }
      },

      async unrevertMessage(sessionId: string) {
          try {
              const response = await client.session.unrevert({ path: { id: sessionId } });
              return { data: response };
          } catch (error) {
              console.error('Unrevert message failed:', error);
              throw error;
          }
      },

      // File methods
      async searchText(query: string) {
          try {
              const response = await client.find.text({ query: { pattern: query } });
              return { data: response };
          } catch (error) {
              console.error('Search text failed:', error);
              throw error;
          }
      },

       async findFiles(query: string) {
           try {
               const response = await client.find.files({ query: { query } });
               return { data: response };
           } catch (error) {
               console.error('Find files failed:', error);
               throw error;
           }
       },

       async findSymbols(query: string) {
           try {
               const response = await client.find.symbols({ query: { query } });
               return { data: response };
           } catch (error) {
               console.error('Find symbols failed:', error);
               throw error;
           }
       },

       async listFiles(path: string, directory?: string) {
           try {
               const query: { path: string; directory?: string } = { path };
               if (directory) {
                   query.directory = directory;
               }
               const response = await client.file.list({ query });
               return { data: response };
           } catch (error) {
               console.error('List files failed:', error);
               throw error;
           }
       },

       async readFile(filePath: string, directory?: string) {
           try {
               const query: { path: string; directory?: string } = { path: filePath };
               if (directory) {
                   query.directory = directory;
               }
               const response = await client.file.read({ query });
               return { data: response };
           } catch (error) {
               console.error('Read file failed:', error);
               throw error;
           }
       },

        async getFileStatus(directory?: string) {
            try {
                const query = typeof directory === 'string' && directory.length > 0 ? { directory } : undefined;
                const response = query ? await client.file.status({ query }) : await client.file.status();
                return { data: response };
            } catch (error) {
                console.error('Get file status failed:', error);
                throw error;
            }
        },

       // TUI methods
       async appendPrompt(text: string) {

          try {
              const response = await client.tui.appendPrompt({ body: { text } });
              return { data: response };
          } catch (error) {
              console.error('Append prompt failed:', error);
              throw error;
          }
      },

      async openHelp() {
          try {
              const response = await client.tui.openHelp();
              return { data: response };
          } catch (error) {
              console.error('Open help failed:', error);
              throw error;
          }
      },

      async openSessions() {
          try {
              const response = await client.tui.openSessions();
              return { data: response };
          } catch (error) {
              console.error('Open sessions failed:', error);
              throw error;
          }
      },

      async openThemes() {
          try {
              const response = await client.tui.openThemes();
              return { data: response };
          } catch (error) {
              console.error('Open themes failed:', error);
              throw error;
          }
      },

      async openModels() {
          try {
              const response = await client.tui.openModels();
              return { data: response };
          } catch (error) {
              console.error('Open models failed:', error);
              throw error;
          }
      },

      async submitPrompt() {
          try {
              const response = await client.tui.submitPrompt();
              return { data: response };
          } catch (error) {
              console.error('Submit prompt failed:', error);
              throw error;
          }
      },

      async clearPrompt() {
          try {
              const response = await client.tui.clearPrompt();
              return { data: response };
          } catch (error) {
              console.error('Clear prompt failed:', error);
              throw error;
          }
      },

      async executeCommand(command: string) {
          try {
              const response = await client.tui.executeCommand({ body: { command } });
              return { data: response };
          } catch (error) {
              console.error('Execute command failed:', error);
              throw error;
          }
      },

      async showToast(message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') {
          try {
              const response = await client.tui.showToast({ body: { message, variant } });
              return { data: response };
          } catch (error) {
              console.error('Show toast failed:', error);
              throw error;
          }
      },

      // Auth methods (simplified for now)
      async setAuth(providerId: string, type: 'api', key: string) {
          try {
              const response = await client.auth.set({
                  path: { id: providerId },
                  body: { type, key }
              });
              return { data: response };
          } catch (error) {
              console.error('Set auth failed:', error);
              throw error;
          }
      },

       // Events methods
       async subscribeToEvents() {
           try {
               const response = await client.event.subscribe();
               return { data: response, error: null };
           } catch (error) {
               console.error('Subscribe to events failed:', error);
               return { data: null, error: handleOpencodeError(error) };
           }
       }
  }


export function handleOpencodeError(error: unknown): string {
      console.error('OpenCode Error Details:', error);
      
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
