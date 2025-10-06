import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Button,
  Input,
  Textarea,
  View,
  Badge,
  Pre,
  Dialog,
  Separator,
  MobileSidebar,
  HamburgerMenu,
} from "@/app/_components/ui";
import { CommandPicker } from "@/app/_components/ui/command-picker";
import { AgentPicker } from "@/app/_components/ui/agent-picker";
import { SessionPicker } from "@/app/_components/ui/session-picker";
import { MessagePart } from "@/app/_components/message";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import { parseCommand } from "@/lib/commandParser";
import { getCommandSuggestions, completeCommand, type Command } from "@/lib/commands";
import { useTheme } from "@/hooks/useTheme";
import { themeList } from "@/lib/themes";
import { detectLanguage, highlightCode, isImageFile, addLineNumbers } from "@/lib/highlight";
import { useIsMobile } from "@/lib/breakpoints";
import 'highlight.js/styles/github-dark.css';

export const Route = createFileRoute('/')({
  component: OpenCodeChatTUI,
});

function OpenCodeChatTUI() {
  const [input, setInput] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionDirectory, setNewSessionDirectory] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('opencode-active-tab') || 'workspace';
    }
    return 'workspace';
  });
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [modelSearchQuery, setModelSearchQuery] = useState("");

  const [selectedFile, setSelectedFile] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('opencode-selected-file');
    }
    return null;
  });
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileSuggestions, setFileSuggestions] = useState<string[]>([]);
  const [showFileSuggestions, setShowFileSuggestions] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState<Command[]>([]);
  const [showCommandPicker, setShowCommandPicker] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [selectedFileSuggestionIndex, setSelectedFileSuggestionIndex] = useState(0);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);
  const fileSearchInputRef = useRef<HTMLInputElement>(null);
  
   const { currentTheme, changeTheme } = useTheme();
    const {
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
       files,
       fileDirectory,
       loadFiles,
       searchFiles,
       readFile,

       models,
       selectedModel,
       selectModel,
          openHelp,
          openThemes,
         isConnected,
         isHydrated,
        showHelp,
        setShowHelp,
        showThemes,
        setShowThemes,
          showOnboarding,
          setShowOnboarding,
          showModelPicker,
          setShowModelPicker,
          agents,
          currentAgent,
          selectAgent,
          extractTextFromParts,
          runShell,
          revertMessage,
          unrevertSession,
          shareSession,
          unshareSession,
          initSession,
          summarizeSession,
        } = useOpenCodeContext();

   // Removed automatic session creation to prevent spam

   const handleSend = async () => {
     if (!input.trim() || loading) return;

     const messageText = input;
     setInput("");

     try {
       if (!currentSession) {
         await createSession({ title: "opencode-web session" });
         await loadSessions();
       } else {
         const parsed = parseCommand(messageText);
         if (parsed.type === 'slash') {
           await handleCommand(messageText);
         } else if (parsed.type === 'shell') {
           await handleShellCommand(parsed.command || '');
          } else {
            await sendMessage(
              messageText,
              selectedModel?.providerID,
              selectedModel?.modelID,
            );
            await loadSessions(); // Refresh session metadata after sending message
          }
       }
     } catch (err) {
       console.error("Failed to send message:", err);
     }
   };

   const handleShellCommand = async (command: string) => {
      if (!currentSession) {
        const errorMsg = {
          id: `assistant-${Date.now()}`,
          type: "assistant" as const,
          content: "No active session. Create a session first.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }
      
      try {
        const userMessage = {
          id: `user-${Date.now()}`,
          type: "user" as const,
          content: `$ ${command}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        
        const response = await runShell(currentSession.id, command, []);
        
        if (response.data) {
          const assistantMessage = {
            id: response.data.info.id,
            type: "assistant" as const,
            content: extractTextFromParts(response.data.parts),
            parts: response.data.parts,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (error) {
        console.error('Failed to execute shell command:', error);
        const errorMsg = {
          id: `assistant-${Date.now()}`,
          type: "assistant" as const,
          content: `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    };

   const handleCommand = async (command: string) => {
     const parsed = parseCommand(command);
     const cmd = parsed.command;
     const args = parsed.args;

     switch (cmd) {
       case "new":
       case "clear":
         await createSession({ title: "New Session" });
         const newMessage = {
           id: `assistant-${Date.now()}`,
           type: "assistant" as const,
           content: "Started new session.",
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, newMessage]);
         break;
       case "models":
         // Open model picker dialog
         setShowModelPicker(true);
         break;
       case "model":
         if (!args || args.length < 1) {
           const errorMessage = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "Usage: /model <provider>/<model>",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMessage]);
           break;
         }
         const [providerID, modelID] = args[0].split("/");
         const model = models.find(
           (m) => m.providerID === providerID && m.modelID === modelID,
         );
         if (model) {
           selectModel(model);
           const successMessage = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: `Selected model: ${model.name}`,
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, successMessage]);
         } else {
           const errorMessage = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: `Model not found: ${args[0]}`,
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMessage]);
         }
         break;
       case "help":
         setShowHelp(true);
         break;
       case "themes":
         setShowThemes(true);
         break;
         case "sessions":
           setShowSessionPicker(true);
           break;
         case "agents":
           setShowAgentPicker(true);
           break;
        case "undo":
          if (!currentSession || messages.length === 0) {
            const errorMsg = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: "No messages to undo.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            break;
          }
          
          try {
            const lastAssistantMsg = [...messages]
              .reverse()
              .find(m => m.type === 'assistant');
            
            if (!lastAssistantMsg) {
              throw new Error('No assistant message to revert');
            }
            
            await revertMessage(currentSession.id, lastAssistantMsg.id);
            await loadSessions();
            
            const successMsg = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: "✅ Undid last message and reverted file changes.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, successMsg]);
            
            if (activeTab === 'files') {
              await loadFiles(fileDirectory);
            }
          } catch (error) {
            const errorMsg = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: `Undo failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
          }
          break;
        case "redo":
          if (!currentSession) {
            const errorMsg = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: "No active session.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            break;
          }
          
          try {
            await unrevertSession(currentSession.id);
            await loadSessions();
            
            const successMsg = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: "✅ Restored reverted changes.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, successMsg]);
            
            if (activeTab === 'files') {
              await loadFiles(fileDirectory);
            }
          } catch (error) {
            const errorMsg = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: `Redo failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
          }
          break;
       case "share":
         if (!currentSession) {
           const errorMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "No active session to share.",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMsg]);
           break;
         }
         
         try {
           const sharedSession = await shareSession(currentSession.id);
           
           const shareUrl = sharedSession?.share?.url || 'No URL available';
           
           await navigator.clipboard.writeText(shareUrl);
           
           const successMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: `✅ Session shared!\n\nURL: ${shareUrl}\n\n(Copied to clipboard)`,
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, successMsg]);
           
           await loadSessions();
         } catch (error) {
           const errorMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: `Share failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMsg]);
         }
         break;
       case "unshare":
         if (!currentSession) {
           const errorMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "No active session.",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMsg]);
           break;
         }
         
         try {
           await unshareSession(currentSession.id);
           
           const successMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "✅ Session is no longer shared.",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, successMsg]);
           
           await loadSessions();
         } catch (error) {
           const errorMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: `Unshare failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMsg]);
         }
         break;
       case "init":
         if (!currentSession || !selectedModel) {
           const errorMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "Need an active session and selected model.",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMsg]);
           break;
         }
         
         try {
           const lastMessage = messages[messages.length - 1];
           const messageID = lastMessage?.id || '';
           
           await initSession(
             currentSession.id,
             messageID,
             selectedModel.providerID,
             selectedModel.modelID
           );
           
           const successMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "✅ Project initialized. AGENTS.md has been created/updated.",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, successMsg]);
           
           if (activeTab === 'files') {
             await loadFiles(fileDirectory);
           }
         } catch (error) {
           const errorMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: `Init failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMsg]);
         }
         break;
       case "compact":
         if (!currentSession) {
           const errorMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "No active session to compact.",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMsg]);
           break;
         }
         
         try {
           const infoMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "🔄 Compacting session... This may take a moment.",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, infoMsg]);
           
           await summarizeSession(currentSession.id);
           await loadSessions();
           
           const successMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "✅ Session compacted successfully.",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, successMsg]);
         } catch (error) {
           const errorMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: `Compact failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMsg]);
         }
         break;
       case "details":
         setShowDetails(prev => !prev);
         const detailsMsg = {
           id: `assistant-${Date.now()}`,
           type: "assistant" as const,
           content: `Details ${!showDetails ? 'shown' : 'hidden'}.`,
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, detailsMsg]);
         break;
        case "export":
          if (!currentSession || messages.length === 0) {
            const errorMsg = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: "No session to export.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            break;
          }
          
          try {
            let markdown = `# ${currentSession.title || currentSession.id}\n\n`;
            markdown += `Project: ${currentProject?.worktree || 'Unknown'}\n`;
            markdown += `Created: ${currentSession.createdAt?.toLocaleString() || 'Unknown'}\n`;
            markdown += `Messages: ${messages.length}\n\n`;
            markdown += `---\n\n`;
            
            messages.forEach((msg, idx) => {
              const role = msg.type === 'user' ? '**User**' : '**Assistant**';
              markdown += `## Message ${idx + 1} - ${role}\n\n`;
              markdown += `_${msg.timestamp.toLocaleString()}_\n\n`;
              
              if (msg.parts && msg.parts.length > 0) {
                msg.parts.forEach(part => {
                  if (part.type === 'text' && 'text' in part) {
                    markdown += `${part.text}\n\n`;
                  } else if (part.type === 'tool' && 'tool' in part) {
                    markdown += `**Tool:** ${part.tool}\n`;
                    if ('state' in part && part.state) {
                      markdown += `**Status:** ${part.state.status}\n\n`;
                    }
                  }
                });
              } else {
                markdown += `${msg.content}\n\n`;
              }
              
              markdown += `---\n\n`;
            });
            
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentSession.title || 'session'}-${Date.now()}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            const successMsg = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: "✅ Session exported as markdown.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, successMsg]);
          } catch (error) {
            const errorMsg = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
          }
          break;
        case "debug":
          try {
            if (!currentSession) {
              const noSessionMsg = {
                id: `assistant-${Date.now()}`,
                type: "assistant" as const,
                content: "No active session to debug.",
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, noSessionMsg]);
              break;
            }
            
            // Fetch full session data
            const sessionResponse = await fetch(`http://localhost:4096/session/${currentSession.id}`);
            const sessionData = await sessionResponse.json();
            
            // Fetch all messages with full parts
            const messagesResponse = await fetch(`http://localhost:4096/session/${currentSession.id}/message`);
            const messagesData = await messagesResponse.json();
            
            const fullData = {
              session: sessionData,
              messages: messagesData,
              timestamp: new Date().toISOString()
            };
            
            // Download as JSON file
            const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SESSION-${currentSession.id}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            const debugMessage = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: `✅ Session data exported to SESSION-${currentSession.id}.json\n\nIncludes:\n- Session metadata\n- ${messagesData.length} messages with full parts\n- All tool executions and state`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, debugMessage]);
          } catch (error) {
            const errorMessage = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: `Debug export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
          }
          break;
        case "editor":
         if (args && args.length > 0) {
           const filePath = args[0];
           await handleFileSelect(filePath);
           setActiveTab('files');
           const successMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: `Opened ${filePath} in file viewer.`,
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, successMsg]);
         } else {
           const errorMsg = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "Usage: /editor <file-path>",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMsg]);
         }
         break;
       case "exit":
         setMessages([]);
         setInput("");
         setActiveTab("workspace");
         const exitMsg = {
           id: `assistant-${Date.now()}`,
           type: "assistant" as const,
           content: "Messages cleared. Use /new to start a new session.",
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, exitMsg]);
         break;
       default:
         const unknownMessage = {
           id: `assistant-${Date.now()}`,
           type: "assistant" as const,
           content: `Unknown command: ${cmd}. Type /help for available commands.`,
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, unknownMessage]);
     }
   };

     const handleCreateSession = async () => {
         const title = newSessionTitle.trim() || "New Session";
         const directory = newSessionDirectory.trim() || currentProject?.worktree;
         try {
             await createSession({ title, directory });
             await loadSessions();
             setNewSessionTitle("");
             setNewSessionDirectory("");
         } catch (err) {
             console.error("Failed to create session:", err);
         }
     };

  const handleSessionSwitch = async (sessionId: string) => {
    try {
      await switchSession(sessionId);
    } catch (err) {
      console.error("Failed to switch session:", err);
    }
  };

  const handleDeleteSession = async (
    sessionId: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    if (confirm("Are you sure you want to delete this session?")) {
      try {
        await deleteSession(sessionId);
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    }
  };

  const handleClearSessions = async () => {
    if (confirm("Are you sure you want to delete all sessions?")) {
      try {
        await clearAllSessions();
        await loadSessions();
      } catch (err) {
        console.error("Failed to clear sessions:", err);
      }
    }
  };

     const handleKeyDown = (e: React.KeyboardEvent) => {
       if (e.key === "Enter" && !e.shiftKey) {
         e.preventDefault();
         if (showCommandPicker && commandSuggestions.length > 0) {
           handleCommandSelect(commandSuggestions[selectedCommandIndex]);
         } else if (showFileSuggestions && fileSuggestions.length > 0) {
           setInput(input.replace(/@\w*$/, `@${fileSuggestions[selectedFileSuggestionIndex]} `));
           setShowFileSuggestions(false);
         } else {
           handleSend();
         }
       }
       if (e.key === "Tab") {
         e.preventDefault();
         if (showCommandPicker && commandSuggestions.length > 0) {
           const completed = completeCommand(input);
           if (completed) {
             setInput(completed + ' ');
             setShowCommandPicker(false);
           }
         } else if (input.startsWith('/')) {
           const completed = completeCommand(input);
           if (completed) {
             setInput(completed + ' ');
           }
         } else {
           cycleAgent();
         }
       }
       if (e.key === "ArrowDown") {
         if (showCommandPicker) {
           e.preventDefault();
           setSelectedCommandIndex((prev) => 
             prev < commandSuggestions.length - 1 ? prev + 1 : prev
           );
         } else if (showFileSuggestions) {
           e.preventDefault();
           setSelectedFileSuggestionIndex((prev) => 
             prev < fileSuggestions.length - 1 ? prev + 1 : prev
           );
         }
       }
       if (e.key === "ArrowUp") {
         if (showCommandPicker) {
           e.preventDefault();
           setSelectedCommandIndex((prev) => prev > 0 ? prev - 1 : prev);
         } else if (showFileSuggestions) {
           e.preventDefault();
           setSelectedFileSuggestionIndex((prev) => prev > 0 ? prev - 1 : prev);
         }
       }
       if (e.key === "Escape") {
         if (showCommandPicker) {
           e.preventDefault();
           setShowCommandPicker(false);
         } else if (showFileSuggestions) {
           e.preventDefault();
           setShowFileSuggestions(false);
         }
       }
     };

   const handleInputChange = async (value: string) => {
     setInput(value);
     if (value.startsWith('/')) {
       const suggestions = getCommandSuggestions(value);
       setCommandSuggestions(suggestions);
       setShowCommandPicker(suggestions.length > 0);
       setSelectedCommandIndex(0);
     } else {
       setShowCommandPicker(false);
     }
     
     if (value.includes('@')) {
       const query = value.split('@').pop() || '';
       if (query.length > 0) {
         try {
           const suggestions = await searchFiles(query);
           setFileSuggestions(suggestions.slice(0, 5));
           setShowFileSuggestions(true);
         } catch (error) {
           console.error('Failed to search files:', error);
         }
       } else {
         setShowFileSuggestions(false);
       }
     } else {
       setShowFileSuggestions(false);
     }
   };

   const handleCommandSelect = (command: Command) => {
     setShowCommandPicker(false);
     
     if (command.name === 'models') {
       setInput('');
       setShowModelPicker(true);
     } else if (command.name === 'themes') {
       setInput('');
       setShowThemes(true);
     } else if (command.name === 'help') {
       setInput('');
       setShowHelp(true);
     } else if (command.name === 'sessions') {
       setInput('');
       setShowSessionPicker(true);
     } else if (command.name === 'agents') {
       setInput('');
       setShowAgentPicker(true);
     } else if (['new', 'clear', 'undo', 'redo', 'share', 'unshare', 'init', 'compact', 'details', 'export', 'editor', 'exit'].includes(command.name)) {
       setInput('');
       void handleCommand(`/${command.name}`);
     } else {
       setInput(`/${command.name} `);
     }
   };

  // New feature handlers
  const handleProjectSwitch = async (project: typeof projects[0]) => {
    try {
      await switchProject(project);
    } catch (err) {
      console.error("Failed to switch project:", err);
    }
  };



    const handleFileSelect = async (filePath: string) => {
      try {
        const result = await readFile(filePath);
        setSelectedFile(filePath);
        if (result && typeof result === 'object' && 'content' in result) {
          setFileContent(result.content);
        } else if (typeof result === 'string') {
          setFileContent(result);
        } else {
          setFileContent("Unable to read file");
        }
      } catch (err) {
        console.error("Failed to read file:", err);
        setFileContent("Error reading file");
      }
    };

  const handleDirectoryOpen = async (path: string) => {
    try {
      await loadFiles(path);
      setSelectedFile(null);
      setFileContent(null);
    } catch (err) {
      console.error("Failed to load directory:", err);
    }
  };

  const handleNavigateUp = async () => {
    if (fileDirectory === '.') return;
    const parts = fileDirectory.split('/').filter(Boolean);
    parts.pop();
    const parent = parts.length > 0 ? parts.join('/') : '.';
    await handleDirectoryOpen(parent);
  };

  const breadcrumbParts = useMemo<string[]>(() => {
    if (!fileDirectory || fileDirectory === '.') {
      return [];
    }
    return fileDirectory.split('/').filter(Boolean);
  }, [fileDirectory]);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'directory' ? -1 : 1;
    });
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (!fileSearchQuery.trim()) return sortedFiles;
    const query = fileSearchQuery.toLowerCase();
    return sortedFiles.filter(file => 
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
    );
  }, [sortedFiles, fileSearchQuery]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aDate = a.updatedAt || a.createdAt || new Date(0);
      const bDate = b.updatedAt || b.createdAt || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
  }, [projects]);

  const filteredModels = useMemo(() => {
    if (!modelSearchQuery.trim()) return models;
    const query = modelSearchQuery.toLowerCase();
    return models.filter(model => 
      model.name.toLowerCase().includes(query) ||
      model.providerID.toLowerCase().includes(query) ||
      model.modelID.toLowerCase().includes(query)
    );
  }, [models, modelSearchQuery]);

    const handleTabChange = (tab: string) => {
      setActiveTab(tab);
      if (tab === "files") {
        if (files.length === 0) {
          void handleDirectoryOpen(fileDirectory || '.');
        }
        // Focus the file search input when switching to files tab
        setTimeout(() => {
          fileSearchInputRef.current?.focus();
        }, 0);
      }
      if (tab === "workspace") {
        void loadSessions();
      }
    };

   const cycleAgent = () => {
     if (agents.length === 0) return;
     let currentIndex = 0;
     if (currentAgent) {
       const currentId = currentAgent.id || currentAgent.name;
       currentIndex = agents.findIndex(a => {
         const agentId = a.id || a.name;
         return agentId === currentId;
       });
       if (currentIndex === -1) currentIndex = 0;
     }
     const nextIndex = (currentIndex + 1) % agents.length;
      selectAgent(agents[nextIndex]);
    };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (showModelPicker && modelSearchInputRef.current) {
      modelSearchInputRef.current.focus();
    }
  }, [showModelPicker]);

   useEffect(() => {
     setSelectedModelIndex(0);
   }, [modelSearchQuery]);



   useEffect(() => {
     if (typeof window !== 'undefined') {
       localStorage.setItem('opencode-active-tab', activeTab);
     }
   }, [activeTab]);

   // Focus file search input when files tab becomes active
   useEffect(() => {
     if (activeTab === 'files') {
       setTimeout(() => {
         fileSearchInputRef.current?.focus();
       }, 0);
     }
   }, [activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedFile) {
        localStorage.setItem('opencode-selected-file', selectedFile);
      } else {
        localStorage.removeItem('opencode-selected-file');
      }
    }
  }, [selectedFile]);

  useEffect(() => {
    const restoreFilesTab = async () => {
      if (isHydrated && activeTab === 'files') {
        console.log('[Hydration] Restoring files tab state');
        if (files.length === 0) {
          console.log('[Hydration] Loading files for directory:', fileDirectory);
          await loadFiles(fileDirectory || '.');
        }
        if (selectedFile && !fileContent) {
          console.log('[Hydration] Restoring selected file content:', selectedFile);
          await handleFileSelect(selectedFile);
        }
      }
    };
    void restoreFilesTab();
  }, [isHydrated, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isHydrated) {
    return (
      <View box="square" className="h-screen font-mono overflow-hidden flex items-center justify-center bg-theme-background text-theme-foreground">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-lg">Loading OpenCode Web...</div>
        </div>
      </View>
    );
  }

   return (
        <View box="square" className="font-mono overflow-hidden flex flex-col bg-theme-background text-theme-foreground" style={{
          height: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
          marginTop: 'env(safe-area-inset-top)',
          marginBottom: 'env(safe-area-inset-bottom)'
        }}>
        {/* Top Bar */}
         <div className="px-4 py-2 flex items-center justify-between bg-theme-background-alt">
           {isConnected === false && (
             <div className="px-2 py-1 rounded text-xs bg-theme-error text-theme-background">
               Disconnected from OpenCode server
             </div>
           )}
         </div>
        <div className="px-4 py-2 flex items-center justify-between bg-theme-background-alt">
         <div className="flex items-center gap-2 lg:gap-4">
            <HamburgerMenu
              isOpen={isMobileSidebarOpen}
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            />
            <Badge variant="foreground1" cap="round">
              opencode web
            </Badge>
             {isConnected !== null && (
               <div className="flex items-center gap-2">
                 <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
                 <Badge variant={isConnected ? "background2" : "foreground0"} cap="round" className="hidden sm:inline">
                   {isConnected ? "Connected" : "Disconnected"}
                 </Badge>
               </div>
             )}
            <div className="flex gap-2">
              {["workspace", "files"].map((tab) => (
                <Button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  variant={activeTab === tab ? "foreground0" : undefined}
                  box="square"
                  size="small"
                  className="capitalize"
                >
                  {tab}
                </Button>
              ))}
            </div>
        </div>
        <div className="hidden lg:flex items-center gap-2">
           <Button
             variant="foreground0"
             box="round"
             onClick={openHelp}
             size="small"
             className="border-none"
           >
             Help
           </Button>
           <Button
             variant="foreground0"
             box="round"
             onClick={openThemes}
             size="small"
             className="border-none"
           >
             Themes
           </Button>
         </div>
       </div>

          <Separator />

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden gap-0">
          {/* Desktop Sidebar - hidden on mobile */}
           <View box="square" className="hidden lg:flex lg:w-80 flex-col p-4 bg-theme-background-alt">
          <div className="flex-1 overflow-hidden">
               {activeTab === "workspace" && (
                  <div className="h-full flex flex-col overflow-hidden">
                    {/* Projects Section - 50% height */}
                    <div className="flex flex-col h-1/2 min-h-0">
                      <View box="square" className="p-2 mb-2 bg-theme-background-alt">
                        <h3 className="text-sm font-medium">Projects</h3>
                      </View>
                      <Separator className="mb-2" />
                  <div className="flex-1 overflow-y-auto scrollbar space-y-1">
                       {sortedProjects.length > 0 ? (
                         sortedProjects.map((project) => {
                           const isSelected = currentProject?.id === project.id;
                           return (
                            <div
                              key={project.id}
                              className="p-2 cursor-pointer transition-colors rounded"
                              style={{
                                backgroundColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-background)',
                                color: isSelected ? 'var(--theme-background)' : 'var(--theme-foreground)',
                              }}
                              onClick={() => handleProjectSwitch(project)}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = 'var(--theme-backgroundAlt)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = 'var(--theme-background)';
                                }
                              }}
                            >
                             <div className="font-medium text-sm truncate">
                               {project.worktree}
                             </div>
                              <div className="text-xs opacity-70 truncate">
                                VCS: {project.vcs || 'Unknown'}
                              </div>
                           </div>
                         );
                        })
                      ) : (
                      <div className="text-center text-sm py-4 text-theme-muted">
                          No projects found
                        </div>
                     )}
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                   {/* Sessions Section - 50% height */}
                   <div className="flex flex-col h-1/2 min-h-0">
                     <View box="square" className="p-2 mb-2 bg-theme-background-alt">
                       <div className="flex justify-between items-center">
                         <h3 className="text-sm font-medium">Sessions</h3>
                        <div className="flex gap-2">
                       <Button
                         variant="foreground0"
                         box="round"
                         onClick={handleClearSessions}
                         size="small"
                       >
                         Clear
                       </Button>
                       <Button
                         variant="foreground0"
                         box="round"
                         onClick={handleCreateSession}
                         size="small"
                       >
                         New
                        </Button>
                       </div>
                       </div>
                     </View>
                     <Separator className="mb-2" />
                     {!currentProject ? (
                     <div className="flex-1 flex items-center justify-center text-sm text-theme-muted">
                       Select a project first to view sessions
                     </div>
                   ) : (
                     <>
                       <div className="mb-2 flex-shrink-0">
                         <Input
                           value={newSessionTitle}
                           onChange={(e) => setNewSessionTitle(e.target.value)}
                           placeholder="Session title..."
                          size="small"
                          className="bg-theme-background text-theme-foreground border-theme-primary"
                        />
                         <div className="text-xs opacity-70 mt-1 truncate">
                           Project: {currentProject.worktree}
                         </div>
                       </div>
                         <div className="flex-1 overflow-y-auto scrollbar space-y-2 min-h-0">
                            {sessions.filter(session => 
                              session.projectID === currentProject?.id || 
                              session.directory === currentProject?.worktree
                            ).map((session) => {
                              const isSelected = currentSession?.id === session.id;
                              return (
                             <div
                               key={session.id}
                               className="p-2 cursor-pointer transition-colors rounded"
                               style={{
                                 backgroundColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-background)',
                                 color: isSelected ? 'var(--theme-background)' : 'var(--theme-foreground)',
                               }}
                               onClick={() => handleSessionSwitch(session.id)}
                               onMouseEnter={(e) => {
                                 if (!isSelected) {
                                   e.currentTarget.style.backgroundColor = 'var(--theme-backgroundAlt)';
                                 }
                               }}
                               onMouseLeave={(e) => {
                                 if (!isSelected) {
                                   e.currentTarget.style.backgroundColor = 'var(--theme-background)';
                                 }
                               }}
                             >
                             <div className="flex justify-between items-start">
                               <div className="flex-1 min-w-0">
                                 <div className="font-medium text-sm truncate">
                                   {session.title}
                                 </div>
                                  <div className="text-xs opacity-70">
                                    {session.createdAt?.toLocaleDateString() ||
                                      "Unknown"}
                                    {session.messageCount !== undefined && (
                                      <span className="ml-2">
                                        • {session.messageCount} messages
                                      </span>
                                    )}
                                    {session.updatedAt && (
                                      <span className="ml-2">
                                        • Updated: {session.updatedAt.toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                 {session.directory && (
                                   <div className="text-xs opacity-50 truncate">
                                     Dir: {session.directory}
                                   </div>
                                 )}
                               </div>
                               <Button
                                 variant="foreground0"
                                 box="round"
                                 size="small"
                                 onClick={(e) => handleDeleteSession(session.id, e)}
                                 className="ml-2 flex-shrink-0"
                               >
                                 ×
                                </Button>
                              </div>
                            </div>
                            );
                          })}
                           {sessions.length === 0 && (
                            <div className="text-center text-sm py-4 text-theme-muted">
                              No sessions for this project yet
                            </div>
                          )}
                       </div>
                     </>
                   )}
                 </div>
               </div>
             )}



             {activeTab === "files" && (
               <div className="space-y-4 h-full flex flex-col">
                 <View box="square" className="p-2 mb-2 bg-theme-background-alt">
                   <div className="flex items-center justify-between">
                     <h3 className="text-sm font-medium">Files</h3>
                     <Button
                       variant="foreground0"
                       box="round"
                       size="small"
                       onClick={() => void handleDirectoryOpen(fileDirectory || '.')}
                     >
                        Refresh
                      </Button>
                   </div>
                 </View>
                 <Separator />
                 <div className="space-y-2">
                    <Input
                      ref={fileSearchInputRef}
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                      placeholder="Search files..."
                      size="small"
                      className="w-full bg-theme-background text-theme-foreground border-theme-primary"
                    />
                 </div>
                 <Separator />
                 <div className="flex items-center justify-between text-xs text-theme-foreground gap-2">
                   <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
                     <Button
                       box="square"
                       size="small"
                       onClick={() => void handleDirectoryOpen('.')}
                       className="!py-1 !px-2 text-xs"
                     >
                       root
                     </Button>
                     {breadcrumbParts.map((part, index) => {
                       const fullPath = breadcrumbParts.slice(0, index + 1).join('/');
                       return (
                         <span key={fullPath} className="flex items-center gap-1">
                           <span className="text-theme-muted">/</span>
                           <Button
                             box="square"
                             size="small"
                             onClick={() => void handleDirectoryOpen(fullPath)}
                             className="!py-1 !px-2 text-xs"
                           >
                             {part}
                           </Button>
                         </span>
                       );
                     })}
                   </div>
                   <div className="flex gap-1 flex-shrink-0">
                     {fileSearchQuery && (
                       <Button
                         variant="foreground0"
                         box="round"
                         size="small"
                         onClick={() => setFileSearchQuery("")}
                       >
                         Clear
                       </Button>
                     )}
                    <Button
                      variant="foreground0"
                      box="round"
                      size="small"
                      disabled={fileDirectory === '.' || breadcrumbParts.length === 0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleNavigateUp();
                      }}
                      className="disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Up
                    </Button>
                   </div>
                 </div>
                 <Separator />
                   <div className="flex-1 overflow-y-auto scrollbar space-y-0.5">
                     {filteredFiles.length > 0 ? (
                       filteredFiles.map((file) => {
                        const isDirectory = file.type === 'directory';
                        const isSelected = !isDirectory && selectedFile === file.path;
                        return (
                           <div
                             key={file.path}
                             className="px-2 py-1 cursor-pointer transition-colors rounded"
                             style={{
                               backgroundColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-background)',
                               color: isSelected ? 'var(--theme-background)' : 'var(--theme-foreground)',
                             }}
                             onClick={() => {
                               if (isDirectory) {
                                 void handleDirectoryOpen(file.path);
                               } else {
                                 void handleFileSelect(file.path);
                               }
                             }}
                             onMouseEnter={(e) => {
                               if (!isSelected) {
                                 e.currentTarget.style.backgroundColor = 'var(--theme-backgroundAlt)';
                               }
                             }}
                             onMouseLeave={(e) => {
                               if (!isSelected) {
                                 e.currentTarget.style.backgroundColor = 'var(--theme-background)';
                               }
                             }}
                           >
                           <div className="flex items-center gap-2 text-sm">
                             <span className="text-base">{isDirectory ? '📁' : '📄'}</span>
                             <span className="truncate">{file.name}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                     <div className="text-center text-sm py-4 text-theme-muted">
                       No files loaded
                     </div>
                   )}
                </div>
                 <div className="text-xs opacity-50">
                   Path: {fileDirectory === '.' ? '/' : `/${fileDirectory}`} • {filteredFiles.length} items
                 </div>
               </div>
              )}
          </div>
        </View>

        {/* Mobile Sidebar Drawer */}
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        >
          {/* Mobile Menu Actions */}
          <div className="flex gap-2 mb-4 flex-shrink-0">
            <Button
              variant="foreground0"
              box="round"
              onClick={() => {
                openHelp();
                setIsMobileSidebarOpen(false);
              }}
              size="small"
              className="flex-1"
            >
              Help
            </Button>
            <Button
              variant="foreground0"
              box="round"
              onClick={() => {
                openThemes();
                setIsMobileSidebarOpen(false);
              }}
              size="small"
              className="flex-1"
            >
              Themes
            </Button>
          </div>

          {activeTab === "workspace" && (
            <div className="h-full flex flex-col gap-4 overflow-hidden">
              {/* Projects Section */}
              <div className="flex flex-col flex-1 min-h-0">
                <h3 className="text-sm font-medium mb-2">Projects</h3>
                <Separator className="mb-2" />
                <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                  {sortedProjects.length > 0 ? (
                    sortedProjects.map((project) => {
                      const isSelected = currentProject?.id === project.id;
                      return (
                      <div
                        key={project.id}
                        className="p-2 cursor-pointer transition-colors rounded"
                        style={{
                          backgroundColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-background)',
                          color: isSelected ? 'var(--theme-background)' : 'var(--theme-foreground)',
                        }}
                        onClick={() => {
                          handleProjectSwitch(project);
                          setIsMobileSidebarOpen(false);
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-backgroundAlt)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-background)';
                          }
                        }}
                      >
                        <div className="font-medium text-sm truncate">
                          {project.worktree}
                        </div>
                        <div className="text-xs opacity-70 truncate">
                          VCS: {project.vcs || 'Unknown'}
                        </div>
                      </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-sm py-4 text-theme-muted">
                      No projects found
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Sessions Section */}
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Sessions</h3>
                  <Button
                    variant="foreground0"
                    box="round"
                    onClick={handleCreateSession}
                    size="small"
                  >
                    New
                  </Button>
                </div>
                <Separator className="mb-2" />
                {!currentProject ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-theme-muted">
                    Select a project first
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                    {sessions.filter(session => 
                      session.projectID === currentProject?.id || 
                      session.directory === currentProject?.worktree
                    ).map((session) => {
                      const isSelected = currentSession?.id === session.id;
                      return (
                      <div
                        key={session.id}
                        className="p-2 cursor-pointer transition-colors rounded"
                        style={{
                          backgroundColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-background)',
                          color: isSelected ? 'var(--theme-background)' : 'var(--theme-foreground)',
                        }}
                        onClick={() => {
                          handleSessionSwitch(session.id);
                          setIsMobileSidebarOpen(false);
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-backgroundAlt)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-background)';
                          }
                        }}
                      >
                        <div className="font-medium text-sm truncate">
                          {session.title}
                        </div>
                        <div className="text-xs opacity-70">
                          {session.createdAt?.toLocaleDateString() || "Unknown"}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div className="h-full flex flex-col gap-2 overflow-hidden">
              <h3 className="text-sm font-medium">Files</h3>
              <Separator />
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {sortedFiles.length > 0 ? (
                  sortedFiles.map((file) => {
                    const isDirectory = file.type === 'directory';
                    const isSelected = !isDirectory && selectedFile === file.path;
                    return (
                      <div
                        key={file.path}
                        className="px-2 py-1 cursor-pointer transition-colors rounded"
                        style={{
                          backgroundColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-background)',
                          color: isSelected ? 'var(--theme-background)' : 'var(--theme-foreground)',
                        }}
                        onClick={() => {
                          if (isDirectory) {
                            void handleDirectoryOpen(file.path);
                          } else {
                            void handleFileSelect(file.path);
                            setIsMobileSidebarOpen(false);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-backgroundAlt)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-background)';
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-base">{isDirectory ? '📁' : '📄'}</span>
                          <span className="truncate">{file.name}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-sm py-4 text-theme-muted">
                    No files loaded
                  </div>
                )}
              </div>
            </div>
          )}
        </MobileSidebar>

        <Separator direction="vertical" />

        {/* Main Editor Area */}
        <View box="square" className="flex-1 flex flex-col gap-0 bg-theme-background">
           {/* Header */}
           <div className="px-4 py-2 flex justify-between items-center bg-theme-background-alt">
            <div className="flex items-center gap-2">
                 <span className="text-base font-normal text-theme-foreground">
                  OpenCode Chat Sessions: {currentSession?.title || currentSession?.id.slice(0, 8)}... . Project: {currentProject?.worktree}
                </span>
               </div>
            </div>

            <Separator />

           {/* Content */}
            {activeTab === "workspace" && (
             <div className="flex-1 flex flex-col overflow-hidden">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto scrollbar p-4 space-y-4 min-h-0">
                {messages.length === 0 && !loading && (
                  <div className="flex items-center justify-center h-full">
                    <View box="round" className="max-w-lg p-6 text-center bg-theme-background-alt">
                      <div className="text-4xl mb-4">👋</div>
                      <h2 className="text-xl font-bold mb-3 text-theme-foreground">
                        Welcome to OpenCode Web!
                      </h2>
                      <Pre
                        size="small"
                        className="break-words whitespace-pre-wrap overflow-wrap-anywhere mb-4 text-theme-foreground opacity-80"
                      >
                        {!currentProject 
                          ? "Select a project from the sidebar to get started, or create a new session to begin chatting with OpenCode."
                          : !currentSession
                          ? "Select an existing session from the sidebar or click 'New' to create a session and start coding with AI assistance."
                          : "Send a message to start chatting with OpenCode. Use @ to reference files, / for commands, and Tab to switch agents."}
                      </Pre>
                      <div className="flex gap-2 justify-center flex-wrap">
                        {!currentProject && (
                          <Badge variant="foreground0" cap="round" className="text-xs">
                            Step 1: Select a project →
                          </Badge>
                        )}
                        {currentProject && !currentSession && (
                          <Badge variant="foreground0" cap="round" className="text-xs">
                            Step 2: Create or select a session →
                          </Badge>
                        )}
                        {currentProject && currentSession && (
                          <Badge variant="foreground1" cap="round" className="text-xs">
                            Ready to code! 🚀
                          </Badge>
                        )}
                      </div>
                    </View>
                  </div>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                     <View
                       box="round"
                       className={`max-w-full sm:max-w-2xl p-3 ${
                         message.type === "user" 
                           ? "bg-theme-primary/20 border-theme-primary text-theme-foreground" 
                           : "bg-theme-background-alt text-theme-foreground"
                       }`}
                     >
                      {message.parts && message.parts.length > 0 ? (
                        <div className="space-y-2">
                          {message.parts.map((part, idx) => (
                            <MessagePart 
                              key={`${message.id}-part-${idx}`}
                              part={part}
                              messageRole={message.type}
                              showDetails={true}
                            />
                          ))}
                          {message.metadata && (
                            <div className="text-xs opacity-60 mt-2 flex gap-4 flex-wrap">
                              {message.metadata.agent && (
                                <span>Agent: {message.metadata.agent}</span>
                              )}
                              {message.metadata.tokens && (
                                <span>
                                  Tokens: {message.metadata.tokens.input + message.metadata.tokens.output}
                                  {message.metadata.tokens.reasoning > 0 && 
                                    ` (+${message.metadata.tokens.reasoning} reasoning)`
                                  }
                                </span>
                              )}
                              {message.metadata.cost && (
                                <span>Cost: ${message.metadata.cost.toFixed(4)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Pre
                          size="small"
                          className="break-words whitespace-pre-wrap overflow-wrap-anywhere"
                        >
                          {message.content}
                        </Pre>
                      )}
                    </View>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <View box="round" className="max-w-xs p-3 bg-theme-background-alt">
                      <Pre size="small" className="text-theme-foreground">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 rounded-full animate-bounce bg-theme-primary" />
                          <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.1s] bg-theme-primary" />
                          <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.2s] bg-theme-primary" />
                        </div>
                      </Pre>
                      <Badge
                        variant="foreground0"
                        cap="round"
                        className="mt-2 text-xs"
                      >
                        OpenCode
                      </Badge>
                    </View>
                  </div>
                )}
                <div ref={messagesEndRef} />
                </div>

                 <Separator />

                 {/* Input Area */}
                 <View box="square" className="p-2 sm:p-4 space-y-3 bg-theme-background-alt">
                      <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs text-theme-foreground">
                        <span className="font-medium">Model:</span>
                        <span className="text-theme-primary">{selectedModel?.name || 'Loading...'}</span>
                        <span className="text-theme-muted">•</span>
                        <span className="font-medium">Session:</span>
                        <span className="text-theme-primary">{currentSession?.title || 'No session'}</span>
                       {input.startsWith('/') && (
                         <>
                           <span className="text-theme-muted">•</span>
                           <span className="text-theme-error font-medium">Command Mode</span>
                         </>
                       )}
                     </div>
                     <Badge key={currentAgent?.id || currentAgent?.name} variant="foreground1" cap="round" className="flex-shrink-0">
                       Agent: {currentAgent?.name || 'None'}
                     </Badge>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <div className="flex-1 relative w-full">
                       {showCommandPicker && (
                         <CommandPicker
                           commands={commandSuggestions}
                           onSelect={handleCommandSelect}
                           selectedIndex={selectedCommandIndex}
                         />
                       )}
                       <Textarea
                         value={input}
                         onChange={(e) => handleInputChange(e.target.value)}
                         onKeyDown={handleKeyDown}
                         placeholder="Type your message, Tab to switch agent, /models to select model..."
                         rows={2}
                         size="large"
                         className="w-full bg-theme-background text-theme-foreground border-theme-primary resize-none"
                       />
                       {showFileSuggestions && fileSuggestions.length > 0 && (
                         <div 
                           className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto scrollbar z-10 shadow-lg rounded border"
                           style={{
                             backgroundColor: 'var(--theme-backgroundAlt)',
                             borderColor: 'var(--theme-primary)',
                             borderWidth: '1px',
                           }}
                         >
                           {fileSuggestions.map((file, index) => {
                             const isSelected = index === selectedFileSuggestionIndex;
                             return (
                               <div
                                 key={index}
                                 className="p-2 cursor-pointer transition-colors text-sm"
                                 style={{
                                   backgroundColor: isSelected ? 'var(--theme-primary)' : 'transparent',
                                   color: isSelected ? 'var(--theme-background)' : 'var(--theme-foreground)',
                                 }}
                                 onClick={() => {
                                   setInput(input.replace(/@\w*$/, `@${file} `));
                                   setShowFileSuggestions(false);
                                 }}
                                 onMouseEnter={(e) => {
                                   if (!isSelected) {
                                     e.currentTarget.style.backgroundColor = 'var(--theme-backgroundAlt)';
                                     e.currentTarget.style.opacity = '0.8';
                                   }
                                 }}
                                 onMouseLeave={(e) => {
                                   if (!isSelected) {
                                     e.currentTarget.style.backgroundColor = 'transparent';
                                     e.currentTarget.style.opacity = '1';
                                   }
                                 }}
                               >
                                 <div className="flex items-center justify-between gap-2">
                                   <div className="flex-1 truncate">
                                     {file}
                                   </div>
                                   {isSelected && (
                                     <Badge variant="background2" cap="round" className="text-xs">
                                       ↵
                                     </Badge>
                                   )}
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       )}
                     </div>
                      <Button
                        variant="foreground0"
                        box="square"
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="px-6 py-2 w-full sm:w-auto"
                      >
                        Send
                       </Button>
                   </div>
                </View>
             </div>
           )}

            {activeTab === "files" && (
             <div className="flex-1 p-4 flex flex-col overflow-hidden bg-theme-background">
              {selectedFile ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      {selectedFile.split("/").pop()}
                      {!isImageFile(selectedFile) && (
                        <Badge variant="foreground0" cap="round" className="text-xs">
                          {detectLanguage(selectedFile)}
                        </Badge>
                      )}
                    </h3>
                    <div className="flex gap-2">
                      {!isImageFile(selectedFile) && (
                        <Button
                          variant="foreground0"
                          box="round"
                          onClick={() => {
                            navigator.clipboard.writeText(fileContent || '')
                          }}
                          size="small"
                        >
                          Copy
                        </Button>
                      )}
                      <Button
                        variant="foreground0"
                        box="round"
                        onClick={() => setSelectedFile(null)}
                        size="small"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {isImageFile(selectedFile) ? (
                      <div className="flex items-center justify-center h-full bg-theme-backgroundAccent rounded p-4 overflow-auto scrollbar">
                        {fileContent ? (
                          <img
                            src={`data:image/${selectedFile.split('.').pop()};base64,${fileContent}`}
                            alt={selectedFile}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              console.error('Image load error for:', selectedFile);
                              e.currentTarget.style.display = 'none';
                              const errorMsg = document.createElement('div');
                              errorMsg.textContent = 'Failed to load image. The file may be binary data that cannot be displayed.';
                              errorMsg.className = 'text-red-400 text-center p-4';
                              e.currentTarget.parentElement?.appendChild(errorMsg);
                            }}
                          />
                        ) : (
                          <div className="text-center text-sm text-theme-muted">
                            No image data available
                          </div>
                        )}
                      </div>
                    ) : (
                      <pre className="hljs bg-theme-background p-4 rounded overflow-y-auto scrollbar h-full text-sm font-mono m-0">
                        <code
                          dangerouslySetInnerHTML={{
                            __html: addLineNumbers(
                              highlightCode(
                                fileContent ?? '',
                                detectLanguage(selectedFile)
                              )
                            )
                          }}
                        />
                      </pre>
                    )}
                  </div>
                </>
               ) : (
                <div className="flex-1 flex items-center justify-center text-theme-muted">
                  Select a file to view its contents
                </div>
              )}
             </div>
           )}
          </View>
        </div>

          {/* Help Dialog */}
        {showHelp && (
          <Dialog
            open={showHelp}
            onClose={() => setShowHelp(false)}
          >
           <View box="square" className="p-6 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-theme-background text-theme-foreground">
             <div className="flex justify-between items-center mb-4 flex-shrink-0">
               <h2 className="text-lg font-bold">OpenCode Commands</h2>
               <Button
                 variant="foreground0"
                 box="round"
                 onClick={() => setShowHelp(false)}
                 size="small"
               >
                 ✕
               </Button>
             </div>
             <Separator className="mb-4 flex-shrink-0" />
             
             <div className="space-y-6 overflow-y-auto scrollbar flex-1 pb-4">
               <div>
                 <div className="text-xs font-bold uppercase mb-2 opacity-60">Session</div>
                 <div className="space-y-1 font-mono text-sm">
                   <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                     <span className="text-theme-primary">/new</span>
                     <span className="opacity-70">Start a new session</span>
                   </div>
                   <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                     <span className="text-theme-primary">/clear</span>
                     <span className="opacity-70">Clear current session</span>
                   </div>
                   <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                     <span className="text-theme-primary">/sessions</span>
                     <span className="opacity-70">View all sessions</span>
                   </div>
                 </div>
               </div>

               <div>
                 <div className="text-xs font-bold uppercase mb-2 opacity-60">Model</div>
                 <div className="space-y-1 font-mono text-sm">
                   <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                     <span className="text-theme-primary">/models</span>
                     <span className="opacity-70">Open model picker</span>
                   </div>
                   <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                     <span className="text-theme-primary">/model &lt;provider&gt;/&lt;model&gt;</span>
                     <span className="opacity-70">Select specific model</span>
                   </div>
                 </div>
               </div>

               <div>
                 <div className="text-xs font-bold uppercase mb-2 opacity-60">Agent</div>
                 <div className="space-y-1 font-mono text-sm">
                   <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                     <span className="text-theme-primary">/agents</span>
                     <span className="opacity-70">Select agent</span>
                   </div>
                 </div>
               </div>

               <div>
                 <div className="text-xs font-bold uppercase mb-2 opacity-60">Theme</div>
                 <div className="space-y-1 font-mono text-sm">
                   <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                     <span className="text-theme-primary">/themes</span>
                     <span className="opacity-70">Open theme picker</span>
                   </div>
                 </div>
               </div>

               <div>
                 <div className="text-xs font-bold uppercase mb-2 opacity-60">File Operations</div>
                 <div className="space-y-1 font-mono text-sm">
                   <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                     <span className="text-theme-primary">/undo</span>
                     <span className="opacity-70">Undo last file changes</span>
                   </div>
                   <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                     <span className="text-theme-primary">/redo</span>
                     <span className="opacity-70">Redo last undone changes</span>
                   </div>
                 </div>
               </div>

                <div>
                  <div className="text-xs font-bold uppercase mb-2 opacity-60">Other</div>
                  <div className="space-y-1 font-mono text-sm">
                    <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                      <span className="text-theme-primary">/help</span>
                      <span className="opacity-70">Show this help dialog</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                      <span className="text-theme-primary">/share</span>
                      <span className="opacity-70">Share current session</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                      <span className="text-theme-primary">/export</span>
                      <span className="opacity-70">Export session</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-theme-background-alt">
                      <span className="text-theme-primary">/debug</span>
                      <span className="opacity-70">Export session data (JSON)</span>
                    </div>
                  </div>
                </div>

               <Separator />

               <div className="text-xs opacity-70 space-y-1">
                 <div><span className="font-bold">Tip:</span> Start typing / to see autocomplete suggestions</div>
                 <div><span className="font-bold">Tip:</span> Press Tab to complete commands</div>
                 <div><span className="font-bold">Tip:</span> Use @ to reference files in your messages</div>
               </div>
             </div>
           </View>
         </Dialog>
       )}

          {/* Themes Dialog */}
          {showThemes && (
            <Dialog
              open={showThemes}
              onClose={() => setShowThemes(false)}
            >
             <View box="square" className="p-6 max-w-md w-full max-h-[80vh] overflow-hidden bg-theme-background text-theme-foreground">
              <h2 className="text-lg font-bold mb-4">Select Theme</h2>
              <Separator className="mb-4" />
              <div className="max-h-96 overflow-y-auto scrollbar space-y-2 mb-4">
                {themeList.map((theme) => (
                  <div
                    key={theme.id}
                    className={`p-3 rounded cursor-pointer transition-colors border border-theme-border ${
                      currentTheme === theme.id
                        ? "bg-theme-primary/20 border-theme-primary text-theme-foreground"
                        : "bg-theme-background-alt hover:bg-opacity-50"
                    }`}
                    onClick={() => {
                      changeTheme(theme.id);
                      setShowThemes(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{theme.name}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {theme.id}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {Object.entries(theme.colors).slice(0, 5).map(([key, color]) => (
                          <div
                            key={key}
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: color }}
                            title={key}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="mb-4" />
              <div className="flex justify-end">
                <Button
                  variant="foreground0"
                  box="round"
                  onClick={() => setShowThemes(false)}
                  size="small"
                >
                  Close
                </Button>
              </div>
            </View>
          </Dialog>
        )}

          {/* Onboarding Dialog */}
          {showOnboarding && (
            <Dialog
              open={showOnboarding}
              onClose={() => setShowOnboarding(false)}
            >
             <View box="square" className="p-6 max-w-md w-full bg-theme-background text-theme-foreground">
              <h2 className="text-lg font-bold mb-4">Connect to OpenCode Server</h2>
              <Separator className="mb-4" />
              <p className="text-sm mb-4">Enter your OpenCode server URL:</p>
              <Input
                placeholder="http://192.168.1.100:4096"
                size="large"
                className="mb-4"
                onChange={() => {
                  // TODO: Update env var
                }}
              />
              <p className="text-xs opacity-70 mb-4">Find your IP: macOS/Linux: ifconfig | grep inet, Windows: ipconfig</p>
              <Separator className="mb-4" />
              <Button
                variant="foreground0"
                box="round"
                onClick={() => setShowOnboarding(false)}
                size="small"
              >
                Connect
              </Button>
            </View>
          </Dialog>
        )}

          {/* Model Picker Dialog */}
          {showModelPicker && (
            <Dialog
              open={showModelPicker}
              onClose={() => {
                setShowModelPicker(false);
                setModelSearchQuery('');
                setSelectedModelIndex(0);
              }}
            >
             <View box="square" className="p-6 max-w-md w-full max-h-[80vh] overflow-hidden bg-theme-background text-theme-foreground">
              <h2 className="text-lg font-bold mb-4">Select Model</h2>
              <Separator className="mb-4" />
               <div className="mb-4">
                 <Input
                   ref={modelSearchInputRef}
                   placeholder="Search models..."
                   size="small"
                   value={modelSearchQuery}
                   onChange={(e) => setModelSearchQuery(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'ArrowDown') {
                       e.preventDefault();
                       setSelectedModelIndex((prev) => 
                         prev < filteredModels.length - 1 ? prev + 1 : prev
                       );
                     } else if (e.key === 'ArrowUp') {
                       e.preventDefault();
                       setSelectedModelIndex((prev) => prev > 0 ? prev - 1 : prev);
                     } else if (e.key === 'Enter' && filteredModels.length > 0) {
                       e.preventDefault();
                       selectModel(filteredModels[selectedModelIndex]);
                       setShowModelPicker(false);
                       setModelSearchQuery('');
                       setSelectedModelIndex(0);
                     } else if (e.key === 'Escape') {
                       e.preventDefault();
                       setShowModelPicker(false);
                       setModelSearchQuery('');
                       setSelectedModelIndex(0);
                     }
                   }}
                 />
               </div>
               <div className="max-h-64 overflow-y-auto scrollbar space-y-2">
                 {filteredModels.length === 0 ? (
                   <div className="text-center text-sm py-4 opacity-70">
                     No models found
                   </div>
                 ) : (
                   filteredModels.map((model, index) => {
                     const isSelected = index === selectedModelIndex;
                     return (
                       <div
                         key={`${model.providerID}/${model.modelID}`}
                         className={`p-3 rounded cursor-pointer transition-colors ${
                           isSelected 
                             ? "bg-theme-primary/20 border border-theme-primary text-theme-foreground" 
                             : "bg-theme-background-alt text-theme-foreground"
                         }`}
                         onClick={() => {
                           selectModel(model);
                           setShowModelPicker(false);
                           setModelSearchQuery('');
                           setSelectedModelIndex(0);
                         }}
                       >
                         <div className="flex items-center justify-between">
                           <div className="flex-1">
                             <div className="font-medium">{model.name}</div>
                             <div className="text-xs opacity-70">{model.providerID}/{model.modelID}</div>
                           </div>
                           {isSelected && (
                             <Badge variant="background2" cap="round" className="text-xs">
                               ↵
                             </Badge>
                           )}
                         </div>
                       </div>
                     );
                   })
                 )}
              </div>
              <Separator className="mt-4 mb-4" />
              <div className="flex justify-between items-center">
                <div className="text-xs opacity-70">
                  Use ↑↓ arrows to navigate, Enter to select
                </div>
                <Button
                  variant="foreground0"
                  box="round"
                  onClick={() => {
                    setShowModelPicker(false);
                    setModelSearchQuery('');
                    setSelectedModelIndex(0);
                  }}
                  size="small"
                >
                  Cancel
                </Button>
              </div>
            </View>
          </Dialog>
        )}

        {/* Agent Picker */}
        {showAgentPicker && (
          <AgentPicker
            agents={agents}
            selectedAgent={currentAgent}
            onSelect={selectAgent}
            onClose={() => setShowAgentPicker(false)}
          />
        )}

        {/* Session Picker */}
        {showSessionPicker && (
          <SessionPicker
            sessions={sessions.filter(s => 
              s.projectID === currentProject?.id || 
              s.directory === currentProject?.worktree
            )}
            currentSession={currentSession}
            onSelect={switchSession}
            onDelete={deleteSession}
            onCreate={async (title) => {
              await createSession({ title });
              await loadSessions();
            }}
            onClose={() => setShowSessionPicker(false)}
          />
        )}
      </View>
    );
  }
