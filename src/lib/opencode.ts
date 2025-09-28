 "use client"

import { createOpencodeClient } from "../../node_modules/@opencode-ai/sdk/dist/client.js"

const client = createOpencodeClient({
       baseUrl: "http://localhost:4096",
       responseStyle: "data",
 })

 export const openCodeService = {
     async createSession({ title, directory }: { title?: string; directory?: string } = {}) {
         try {
             console.log('Creating session with title:', title, 'and directory:', directory);
             const body: { title?: string; directory?: string } = {};
             if (title) body.title = title;
             if (directory) body.directory = directory;
             const response = await client.session.create({
                 body
             });
             console.log('Session creation response:', response);
             return { data: response };
         } catch (error) {
             console.error('Session creation failed:', error);
             throw error;
         }
     },

     async sendMessage(sessionId: string, content: string, providerID: string = "anthropic", modelID: string = "claude-3-5-sonnet-20241022") {
         const response = await client.session.prompt({
             path: { id: sessionId },
             body: {
                 model: { providerID, modelID },
                 parts: [{ type: "text", text: content }]
             }
         });
         return { data: response };
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

 async getAgents() {
          try {
              console.log('Getting agents...');
              const response = await client.app.agents()
              console.log('Agents response:', response);
              return { data: response };
          } catch (error) {
              console.error('Get agents failed:', error);
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
