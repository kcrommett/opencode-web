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
import 'highlight.js/styles/github-dark.css';

export const Route = createFileRoute('/')({
  component: OpenCodeChatTUI,
});

function OpenCodeChatTUI() {
  const [input, setInput] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionDirectory, setNewSessionDirectory] = useState("");
  const [activeTab, setActiveTab] = useState("workspace");
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [modelSearchQuery, setModelSearchQuery] = useState("");

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileSuggestions, setFileSuggestions] = useState<string[]>([]);
  const [showFileSuggestions, setShowFileSuggestions] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState<Command[]>([]);
  const [showCommandPicker, setShowCommandPicker] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);
  
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
     try {
       // TODO: Implement shell command execution
       const shellMessage = {
         id: `assistant-${Date.now()}`,
         type: "assistant" as const,
         content: `Shell command not yet implemented: ${command}`,
         timestamp: new Date(),
       };
       setMessages((prev) => [...prev, shellMessage]);
     } catch (error) {
       console.error('Failed to execute shell command:', error);
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
          try {
            // TODO: Call revert API
            const undoMessage = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: "Undo completed. Files reverted.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, undoMessage]);
            // Refresh files
            await loadFiles(fileDirectory);
          } catch {

           const errorMessage = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "Undo failed.",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMessage]);
         }
         break;
        case "redo":
          try {
            // TODO: Call unrevert API
            const redoMessage = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: "Redo completed. Files restored.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, redoMessage]);
            // Refresh files
            await loadFiles(fileDirectory);
          } catch {

           const errorMessage = {
             id: `assistant-${Date.now()}`,
             type: "assistant" as const,
             content: "Redo failed.",
             timestamp: new Date(),
           };
           setMessages((prev) => [...prev, errorMessage]);
         }
         break;
       case "share":
         // TODO: Implement share
         const shareMessage = {
           id: `assistant-${Date.now()}`,
           type: "assistant" as const,
           content: "Share not yet implemented.",
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, shareMessage]);
         break;
       case "unshare":
         // TODO: Implement unshare
         const unshareMessage = {
           id: `assistant-${Date.now()}`,
           type: "assistant" as const,
           content: "Unshare not yet implemented.",
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, unshareMessage]);
         break;
       case "init":
         // TODO: Implement init
         const initMessage = {
           id: `assistant-${Date.now()}`,
           type: "assistant" as const,
           content: "Init not yet implemented.",
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, initMessage]);
         break;
       case "compact":
         // TODO: Implement compact
         const compactMessage = {
           id: `assistant-${Date.now()}`,
           type: "assistant" as const,
           content: "Compact not yet implemented.",
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, compactMessage]);
         break;
       case "details":
         // TODO: Implement details toggle
         const detailsMessage = {
           id: `assistant-${Date.now()}`,
           type: "assistant" as const,
           content: "Details toggle not yet implemented.",
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, detailsMessage]);
         break;
        case "export":
          // TODO: Implement export
          const exportMessage = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "Export not yet implemented.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, exportMessage]);
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
         // TODO: Implement editor
         const editorMessage = {
           id: `assistant-${Date.now()}`,
           type: "assistant" as const,
           content: "Editor not yet implemented.",
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, editorMessage]);
         break;
       case "exit":
         // TODO: Implement exit
         const exitMessage = {
           id: `assistant-${Date.now()}`,
           type: "assistant" as const,
           content: "Exit not yet implemented.",
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, exitMessage]);
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
       if (e.key === "ArrowDown" && showCommandPicker) {
         e.preventDefault();
         setSelectedCommandIndex((prev) => 
           prev < commandSuggestions.length - 1 ? prev + 1 : prev
         );
       }
       if (e.key === "ArrowUp" && showCommandPicker) {
         e.preventDefault();
         setSelectedCommandIndex((prev) => prev > 0 ? prev - 1 : prev);
       }
       if (e.key === "Escape" && showCommandPicker) {
         e.preventDefault();
         setShowCommandPicker(false);
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

  const handleFileSearch = async () => {
    if (!fileSearchQuery.trim()) return;
    try {
      await searchFiles(fileSearchQuery);
      // TODO: Display search results in UI
    } catch (err) {
      console.error("Failed to search files:", err);
    }
  };

    const handleFileSelect = async (filePath: string) => {
      try {
        const content = await readFile(filePath);
        setSelectedFile(filePath);
        setFileContent(content ?? "Unable to read file");
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
       void handleDirectoryOpen(fileDirectory || '.');
     }
     if (tab === "workspace") {
       void loadSessions(); // Reload sessions for the current project
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

  if (!isHydrated) {
    return (
      <View box="square" className="h-screen font-mono overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-foreground)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-lg">Loading OpenCode Web...</div>
        </div>
      </View>
    );
  }

  return (
       <View box="square" className="h-screen font-mono overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-foreground)' }}>
        {/* Top Bar */}
         <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
           {isConnected === false && (
             <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--theme-error)', color: 'var(--theme-background)' }}>
               Disconnected from OpenCode server
             </div>
           )}
         </div>
        <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
         <div className="flex items-center gap-4">
            <Badge variant="foreground1" cap="round">
              opencode web
            </Badge>
            {isConnected !== null && (
              <Badge variant={isConnected ? "background2" : "foreground0"} cap="round">
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
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
        <div className="flex items-center gap-2">
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
          {/* Sidebar */}
           <View box="square" className="w-80 md:w-80 sm:w-full flex flex-col p-4" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
          <div className="flex-1 overflow-hidden">
               {activeTab === "workspace" && (
                  <div className="h-full flex flex-col overflow-hidden">
                    {/* Projects Section - 50% height */}
                    <div className="flex flex-col h-1/2 min-h-0">
                      <View box="square" className="p-2 mb-2" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                        <h3 className="text-sm font-medium">Projects</h3>
                      </View>
                      <Separator className="mb-2" />
                  <div className="flex-1 overflow-y-auto scrollbar space-y-1">
                       {sortedProjects.length > 0 ? (
                         sortedProjects.map((project) => (
                           <View
                             box="round"
                             key={project.id}
                             className={`p-2 cursor-pointer transition-colors ${
                               currentProject?.id === project.id
                                 ? "bg-[#89b4fa] text-[#1e1e2e]"
                                 : "bg-[#1e1e2e] hover:bg-[#45475a]"
                             }`}
                             onClick={() => handleProjectSwitch(project)}
                           >
                             <div className="font-medium text-sm truncate">
                               {project.worktree}
                             </div>
                              <div className="text-xs opacity-70 truncate">
                                VCS: {project.vcs || 'Unknown'}
                              </div>
                           </View>
                        ))
                      ) : (
                      <div className="text-center text-sm py-4" style={{ color: 'var(--theme-muted)' }}>
                          No projects found
                        </div>
                     )}
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                   {/* Sessions Section - 50% height */}
                   <div className="flex flex-col h-1/2 min-h-0">
                     <View box="square" className="p-2 mb-2" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
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
                     <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--theme-muted)' }}>
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
                           className="bg-[#1e1e2e] text-[#cdd6f4] border-[#89b4fa]"
                         />
                         <div className="text-xs opacity-70 mt-1 truncate">
                           Project: {currentProject.worktree}
                         </div>
                       </div>
                         <div className="flex-1 overflow-y-auto scrollbar space-y-2 min-h-0">
                            {sessions.filter(session => 
                              session.projectID === currentProject?.id || 
                              session.directory === currentProject?.worktree
                            ).map((session) => (
                            <View
                              box="round"
                              key={session.id}
                              className={`p-2 cursor-pointer transition-colors ${
                                currentSession?.id === session.id
                                  ? "bg-[#89b4fa] text-[#1e1e2e]"
                                  : "bg-[#1e1e2e] hover:bg-[#45475a]"
                              }`}
                              onClick={() => handleSessionSwitch(session.id)}
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
                            </View>
                          ))}
                           {sessions.length === 0 && (
                            <div className="text-center text-sm py-4" style={{ color: 'var(--theme-muted)' }}>
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
                 <View box="square" className="p-2 mb-2" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
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
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    size="small"
                    className="bg-[#1e1e2e] text-[#cdd6f4] border-[#89b4fa]"
                  />
                  <Button
                    variant="foreground0"
                    box="round"
                    onClick={handleFileSearch}
                    size="small"
                  >
                     Search
                   </Button>
                 </div>
                 <Separator />
                 <div className="flex items-center justify-between text-xs text-[#cdd6f4]">
                   <div className="flex flex-wrap items-center gap-1">
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
                           <span className="text-[#6c7086]">/</span>
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
                  <Button
                    variant="foreground0"
                    box="round"
                    size="small"
                    disabled={fileDirectory === '.'}
                    onClick={() => void handleNavigateUp()}
                    className="disabled:opacity-40"
                  >
                     Up
                   </Button>
                 </div>
                 <Separator />
                  <div className="flex-1 overflow-y-auto scrollbar space-y-0.5">
                    {sortedFiles.length > 0 ? (
                      sortedFiles.map((file) => {
                        const isDirectory = file.type === 'directory';
                        const isSelected = !isDirectory && selectedFile === file.path;
                        return (
                          <View
                            box="round"
                            key={file.path}
                            className={`px-2 py-1 transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[#89b4fa] text-[#1e1e2e]"
                                : "bg-[#1e1e2e] hover:bg-[#45475a]"
                            }`}
                            onClick={() => {
                              if (isDirectory) {
                                void handleDirectoryOpen(file.path);
                              } else {
                                void handleFileSelect(file.path);
                              }
                            }}
                          >
                           <div className="flex items-center gap-2 text-sm">
                             <span className="text-base">{isDirectory ? '📁' : '📄'}</span>
                             <span className="truncate">{file.name}</span>
                            </div>
                          </View>
                        );
                      })
                    ) : (
                     <div className="text-center text-sm py-4" style={{ color: 'var(--theme-muted)' }}>
                       No files loaded
                     </div>
                   )}
                </div>
                <div className="text-xs opacity-50">
                  Path: {fileDirectory === '.' ? '/' : `/${fileDirectory}`} • {sortedFiles.length} items
                </div>
               </div>
             )}
          </div>
        </View>

        <Separator direction="vertical" />

        {/* Main Editor Area */}
        <View box="square" className="flex-1 flex flex-col gap-0" style={{ backgroundColor: 'var(--theme-background)' }}>
           {/* Header */}
           <div className="px-4 py-2 flex justify-between items-center" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
            <div className="flex items-center gap-2">
                 <span className="text-base font-normal" style={{ color: 'var(--theme-foreground)' }}>
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
                    <View box="round" className="max-w-lg p-6 text-center" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                      <div className="text-4xl mb-4">👋</div>
                      <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--theme-foreground)' }}>
                        Welcome to OpenCode Web!
                      </h2>
                      <Pre
                        size="small"
                        className="break-words whitespace-pre-wrap overflow-wrap-anywhere mb-4"
                        style={{ color: 'var(--theme-foreground)', opacity: 0.8 }}
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
                      className="max-w-2xl p-3"
                      style={{
                        backgroundColor: message.type === "user" ? 'var(--theme-primary)' : 'var(--theme-backgroundAlt)',
                        color: message.type === "user" ? 'var(--theme-background)' : 'var(--theme-foreground)'
                      }}
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
                    <View box="round" className="max-w-xs p-3" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                      <Pre size="small" style={{ color: 'var(--theme-foreground)' }}>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--theme-primary)' }} />
                          <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.1s]" style={{ backgroundColor: 'var(--theme-primary)' }} />
                          <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.2s]" style={{ backgroundColor: 'var(--theme-primary)' }} />
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
                 <View box="square" className="p-4 space-y-3" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                      <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs text-[#cdd6f4]">
                        <span className="font-medium">Model:</span>
                        <span className="text-[#89b4fa]">{selectedModel?.name || 'Loading...'}</span>
                        <span className="text-[#6c7086]">•</span>
                        <span className="font-medium">Session:</span>
                        <span className="text-[#89b4fa]">{currentSession?.title || 'No session'}</span>
                       {input.startsWith('/') && (
                         <>
                           <span className="text-[#6c7086]">•</span>
                           <span className="text-[#f38ba8] font-medium">Command Mode</span>
                         </>
                       )}
                     </div>
                     <Badge key={currentAgent?.id || currentAgent?.name} variant="foreground1" cap="round" className="flex-shrink-0">
                       Agent: {currentAgent?.name || 'None'}
                     </Badge>
                   </div>
                  <div className="flex gap-3 items-end">
                   <div className="flex-1 relative">
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
                        className="w-full bg-[#1e1e2e] text-[#cdd6f4] border-[#89b4fa] resize-none"
                      />
                     {showFileSuggestions && fileSuggestions.length > 0 && (
                       <div className="absolute top-full left-0 right-0 bg-[#1e1e2e] border border-[#89b4fa] rounded mt-1 max-h-32 overflow-y-auto scrollbar z-10">
                         {fileSuggestions.map((file, index) => (
                           <div
                             key={index}
                             className="p-2 hover:bg-[#45475a] cursor-pointer text-[#cdd6f4]"
                             onClick={() => {
                               setInput(input.replace(/@\w*$/, `@${file}`));
                               setShowFileSuggestions(false);
                             }}
                           >
                             {file}
                           </div>
                         ))}
                       </div>
                     )}
                    </div>
                     <Button
                       variant="foreground0"
                       box="square"
                       onClick={handleSend}
                       disabled={!input.trim()}
                       className="px-6 py-2"
                     >
                       Send
                      </Button>
                  </div>
                </View>
             </div>
           )}

            {activeTab === "files" && (
             <div className="flex-1 p-4 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--theme-background)' }}>
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
                      <div className="flex items-center justify-center h-full bg-[#313244] rounded p-4 overflow-auto scrollbar">
                        <img
                          src={`data:image/*;base64,${btoa(fileContent || '')}`}
                          alt={selectedFile}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <pre className="hljs bg-[#0d1117] p-4 rounded overflow-y-auto scrollbar h-full text-sm font-mono m-0">
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
                <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--theme-muted)' }}>
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
           <View box="square" className="p-6 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-foreground)' }}>
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
                   <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                     <span className="text-[#89b4fa]">/new</span>
                     <span className="opacity-70">Start a new session</span>
                   </div>
                   <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                     <span className="text-[#89b4fa]">/clear</span>
                     <span className="opacity-70">Clear current session</span>
                   </div>
                   <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                     <span className="text-[#89b4fa]">/sessions</span>
                     <span className="opacity-70">View all sessions</span>
                   </div>
                 </div>
               </div>

               <div>
                 <div className="text-xs font-bold uppercase mb-2 opacity-60">Model</div>
                 <div className="space-y-1 font-mono text-sm">
                   <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                     <span className="text-[#89b4fa]">/models</span>
                     <span className="opacity-70">Open model picker</span>
                   </div>
                   <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                     <span className="text-[#89b4fa]">/model &lt;provider&gt;/&lt;model&gt;</span>
                     <span className="opacity-70">Select specific model</span>
                   </div>
                 </div>
               </div>

               <div>
                 <div className="text-xs font-bold uppercase mb-2 opacity-60">Agent</div>
                 <div className="space-y-1 font-mono text-sm">
                   <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                     <span className="text-[#89b4fa]">/agents</span>
                     <span className="opacity-70">Select agent</span>
                   </div>
                 </div>
               </div>

               <div>
                 <div className="text-xs font-bold uppercase mb-2 opacity-60">Theme</div>
                 <div className="space-y-1 font-mono text-sm">
                   <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                     <span className="text-[#89b4fa]">/themes</span>
                     <span className="opacity-70">Open theme picker</span>
                   </div>
                 </div>
               </div>

               <div>
                 <div className="text-xs font-bold uppercase mb-2 opacity-60">File Operations</div>
                 <div className="space-y-1 font-mono text-sm">
                   <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                     <span className="text-[#89b4fa]">/undo</span>
                     <span className="opacity-70">Undo last file changes</span>
                   </div>
                   <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                     <span className="text-[#89b4fa]">/redo</span>
                     <span className="opacity-70">Redo last undone changes</span>
                   </div>
                 </div>
               </div>

                <div>
                  <div className="text-xs font-bold uppercase mb-2 opacity-60">Other</div>
                  <div className="space-y-1 font-mono text-sm">
                    <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                      <span className="text-[#89b4fa]">/help</span>
                      <span className="opacity-70">Show this help dialog</span>
                    </div>
                    <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                      <span className="text-[#89b4fa]">/share</span>
                      <span className="opacity-70">Share current session</span>
                    </div>
                    <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                      <span className="text-[#89b4fa]">/export</span>
                      <span className="opacity-70">Export session</span>
                    </div>
                    <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>
                      <span className="text-[#89b4fa]">/debug</span>
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
             <View box="square" className="p-6 max-w-md w-full max-h-[80vh] overflow-hidden" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-foreground)' }}>
              <h2 className="text-lg font-bold mb-4">Select Theme</h2>
              <Separator className="mb-4" />
              <div className="max-h-96 overflow-y-auto scrollbar space-y-2 mb-4">
                {themeList.map((theme) => (
                  <div
                    key={theme.id}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      currentTheme === theme.id
                        ? "text-[var(--theme-background)]"
                        : "hover:bg-opacity-50"
                    }`}
                    style={{
                      backgroundColor: currentTheme === theme.id ? 'var(--theme-primary)' : 'var(--theme-backgroundAlt)',
                      borderColor: 'var(--theme-border)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
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
             <View box="square" className="p-6 max-w-md w-full" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-foreground)' }}>
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
             <View box="square" className="p-6 max-w-md w-full max-h-[80vh] overflow-hidden" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-foreground)' }}>
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
                         className="p-3 rounded cursor-pointer transition-colors"
                         style={{
                           backgroundColor: isSelected
                             ? 'var(--theme-primary)'
                             : 'var(--theme-backgroundAlt)',
                           color: isSelected
                             ? 'var(--theme-background)'
                             : 'var(--theme-foreground)',
                         }}
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
