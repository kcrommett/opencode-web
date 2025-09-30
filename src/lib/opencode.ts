 "use client"

import { createProxyClient } from "./opencode-client"

const client = createProxyClient()

   export const openCodeService = {
       // App methods
       async getAgents() {
           try {
               console.log('Getting agents...');
               const response = await client.app.agents();
               console.log('Agents response:', response);
               return { data: response, error: null };
            } catch (error) {
                // Silently handle errors when server is unavailable
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
                // Silently handle errors when server is unavailable
                return { data: null, error: handleOpencodeError(error) };
            }
       },

       // Project methods
       async listProjects(directory?: string) {
           try {
               const response = await client.project.list({
                   query: directory ? { directory } : undefined
               });
               return { data: response, error: null };
            } catch (error) {
                // Silently handle errors when server is unavailable
                return { data: null, error: handleOpencodeError(error) };
            }
       },

       async getCurrentProject(directory?: string) {
           try {
               const response = await client.project.current({
                   query: directory ? { directory } : undefined
               });
               return { data: response };
            } catch (error) {
                // Silently handle errors when server is unavailable
                throw error;
            }
       },

      // Path methods
      async getCurrentPath() {
          try {
              const response = await client.path.get();
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      // Config methods
      async getConfig() {
          try {
              const response = await client.config.get();
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async getProviders() {
          try {
              const response = await client.config.providers();
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
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
                 // Silently handle errors when server is unavailable
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
                // Silently handle errors when server is unavailable
                return { data: null, error: handleOpencodeError(error) };
            }
       },

      async getMessages(sessionId: string) {
          const response = await client.session.messages({
              path: { id: sessionId }
          });
          return { data: response };
      },

        async getSessions(directory?: string) {
            try {
                const response = await client.session.list({
                    query: directory ? { directory } : undefined
                });
                let data = [];
                if (Array.isArray(response)) {
                    data = response;
                } else if (response && typeof response === 'object') {
                    if ('data' in response && Array.isArray(response.data)) {
                        data = response.data;
                    } else if ('sessions' in response && Array.isArray(response.sessions)) {
                        data = response.sessions;
                    }
                }
                return { data };
            } catch (error) {
                console.error('Error in getSessions:', error);
                return { data: [] };
            }
        },

      async getSession(sessionId: string) {
          try {
              const response = await client.session.get({ path: { id: sessionId } });
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
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
               // Silently handle errors when server is unavailable
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
               // Silently handle errors when server is unavailable
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
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async initSession(sessionId: string) {
          try {
              const response = await client.session.init({ path: { id: sessionId } });
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async abortSession(sessionId: string) {
          try {
              const response = await client.session.abort({ path: { id: sessionId } });
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async shareSession(sessionId: string) {
          try {
              const response = await client.session.share({ path: { id: sessionId } });
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async unshareSession(sessionId: string) {
          try {
              const response = await client.session.unshare({ path: { id: sessionId } });
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
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
               // Silently handle errors when server is unavailable
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
               // Silently handle errors when server is unavailable
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
               // Silently handle errors when server is unavailable
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
               // Silently handle errors when server is unavailable
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
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async unrevertMessage(sessionId: string) {
          try {
              const response = await client.session.unrevert({ path: { id: sessionId } });
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      // File methods
      async searchText(query: string) {
          try {
              const response = await client.find.text({ query: { pattern: query } });
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

       async findFiles(query: string) {
           try {
               const response = await client.find.files({ query: { query } });
               return { data: response };
            } catch (error) {
                // Silently handle errors when server is unavailable
                throw error;
            }
       },

       async findSymbols(query: string) {
           try {
               const response = await client.find.symbols({ query: { query } });
               return { data: response };
            } catch (error) {
                // Silently handle errors when server is unavailable
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
                // Silently handle errors when server is unavailable
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
                // Silently handle errors when server is unavailable
                throw error;
            }
       },

        async getFileStatus(directory?: string) {
            try {
                const query = typeof directory === 'string' && directory.length > 0 ? { directory } : undefined;
                const response = query ? await client.file.status({ query }) : await client.file.status();
                return { data: response };
             } catch (error) {
                 // Silently handle errors when server is unavailable
                 throw error;
             }
        },

       // TUI methods
       async appendPrompt(text: string) {

          try {
              const response = await client.tui.appendPrompt({ body: { text } });
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async openHelp() {
          try {
              const response = await client.tui.openHelp();
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async openSessions() {
          try {
              const response = await client.tui.openSessions();
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async openThemes() {
          try {
              const response = await client.tui.openThemes();
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async openModels() {
          try {
              const response = await client.tui.openModels();
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async submitPrompt() {
          try {
              const response = await client.tui.submitPrompt();
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async clearPrompt() {
          try {
              const response = await client.tui.clearPrompt();
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async executeCommand(command: string) {
          try {
              const response = await client.tui.executeCommand({ body: { command } });
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

      async showToast(message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') {
          try {
              const response = await client.tui.showToast({ body: { message, variant } });
              return { data: response };
           } catch (error) {
               // Silently handle errors when server is unavailable
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
               // Silently handle errors when server is unavailable
               throw error;
           }
      },

       // Events methods
       async subscribeToEvents() {
           try {
               const response = await client.event.subscribe();
               return { data: response, error: null };
            } catch (error) {
                // Silently handle errors when server is unavailable
                return { data: null, error: handleOpencodeError(error) };
            }
       },

       // Tool methods
       async getToolIds() {
           try {
               const response = await client.tool.ids();
               return { data: response };
            } catch (error) {
                throw error;
            }
       },

       async getTools(provider: string, model: string, directory?: string) {
           try {
               const response = await client.tool.list({
                   query: { provider, model, directory }
               });
               return { data: response };
            } catch (error) {
                throw error;
            }
       },

       // Session children methods
       async getSessionChildren(sessionId: string, directory?: string) {
           try {
               const response = await client.session.children({
                   path: { id: sessionId },
                   query: directory ? { directory } : undefined
               });
               return { data: response };
            } catch (error) {
                throw error;
            }
       },

       // Permission methods
       async respondToPermission(sessionId: string, permissionId: string, response: 'once' | 'always' | 'reject') {
           try {
               const result = await client.postSessionIdPermissionsPermissionId({
                   path: { id: sessionId, permissionID: permissionId },
                   body: { response }
               });
               return { data: result };
            } catch (error) {
                throw error;
            }
       },

       // Command methods
       async getCommands() {
           try {
               const response = await client.command.list();
               return { data: response };
            } catch (error) {
                throw error;
            }
       }
  }


export function handleOpencodeError(error: unknown): string {
       // Silently handle errors when server is unavailable
       
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
