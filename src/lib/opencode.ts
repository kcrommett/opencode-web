 "use client"

import { createOpencodeClient } from "../../node_modules/@opencode-ai/sdk/dist/client.js"

const client = createOpencodeClient({
       baseUrl: "http://localhost:4096",
       responseStyle: "data",
 })

 export const openCodeService = {
     async createSession(title?: string) {
         try {
             console.log('Creating session with title:', title);
             const response = await client.session.create({
                 body: { title }
             });
             console.log('Session creation response:', response);
             return response;
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
         return response;
     },

     async getMessages(sessionId: string) {
         const response = await client.session.messages({
             path: { id: sessionId }
         });
         return response;
     },

     async getSessions() {
         return await client.session.list()
     },

     async getAgents() {
         try {
             console.log('Getting agents...');
             const response = await client.app.agents()
             console.log('Agents response:', response);
             return response;
         } catch (error) {
             console.error('Get agents failed:', error);
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
