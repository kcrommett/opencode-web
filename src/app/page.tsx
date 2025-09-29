"use client";

 import { useState, useMemo } from "react";
  import {
    Button,
    Input,
    Textarea,
    View,
    Badge,
    Pre,
    Dialog,
  } from "@/app/_components/ui";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import { parseCommand } from "@/lib/commandParser";

export default function OpenCodeChatTUI() {
  const [input, setInput] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionDirectory, setNewSessionDirectory] = useState("");
  const [activeTab, setActiveTab] = useState("workspace");
  const [fileSearchQuery, setFileSearchQuery] = useState("");

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileSuggestions, setFileSuggestions] = useState<string[]>([]);
  const [showFileSuggestions, setShowFileSuggestions] = useState(false);
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
             selectedModel.providerID,
             selectedModel.modelID,
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
          // Switch to sessions tab
          setActiveTab("workspace");
          break;
        case "agents":
          // Cycle to next agent
          cycleAgent();
          const agentMessage = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Switched to agent: ${currentAgent?.name || 'Unknown'}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, agentMessage]);
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
         handleSend();
       }
       if (e.key === "Tab") {
         e.preventDefault();
         cycleAgent();
       }
     };

   const handleInputChange = async (value: string) => {
     setInput(value);
     if (value.includes('@')) {
       const query = value.split('@').pop() || '';
       if (query.length > 0) {
         try {
           const suggestions = await searchFiles(query);
           setFileSuggestions(suggestions.slice(0, 5)); // Limit to 5
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
       currentIndex = agents.findIndex(a => a.id === currentAgent.id);
       if (currentIndex === -1) currentIndex = 0;
     }
     const nextIndex = (currentIndex + 1) % agents.length;
     selectAgent(agents[nextIndex]);
   };

  return (
     <div className="h-screen bg-[#1e1e2e] text-[#cdd6f4] font-mono overflow-hidden flex flex-col">
       {/* Top Bar */}
        <div className="bg-[#313244] px-4 py-2 flex items-center justify-between">
          {!isConnected && (
            <div className="bg-[#f38ba8] text-[#1e1e2e] px-2 py-1 rounded text-xs">
              Disconnected from OpenCode server
            </div>
          )}
        </div>
        <div className="bg-[#313244] px-4 py-2 flex items-center justify-between">
         <div className="flex items-center gap-4">
           <Badge variant="foreground1" cap="round">
             opencode web
           </Badge>
           <Badge variant={isConnected ? "background2" : "foreground0"} cap="round">
             {isConnected ? "Connected" : "Disconnected"}
           </Badge>
           <div className="flex gap-1">
             {["workspace", "files"].map((tab) => (
               <button
                 key={tab}
                 onClick={() => handleTabChange(tab)}
                 className={`px-3 py-1 text-sm font-medium capitalize rounded transition-colors ${
                   activeTab === tab
                     ? "bg-[#89b4fa] text-[#1e1e2e]"
                     : "text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#45475a]"
                 }`}
               >
                 {tab}
               </button>
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

        {/* Main Content */}
         <div className="flex-1 flex overflow-hidden">
         {/* Sidebar */}
          <div className="w-80 md:w-80 sm:w-full bg-[#313244] flex flex-col">
          <div className="p-4 flex-1 overflow-hidden">
              {activeTab === "workspace" && (
                <div className="space-y-4 h-full flex flex-col">
                  {/* Projects Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Projects</h3>
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {sortedProjects.length > 0 ? (
                        sortedProjects.map((project) => (
                          <div
                            key={project.id}
                            className={`p-2 rounded cursor-pointer transition-colors ${
                              currentProject?.id === project.id
                                ? "bg-[#89b4fa] text-[#1e1e2e]"
                                : "bg-[#1e1e2e] hover:bg-[#45475a]"
                            }`}
                            onClick={() => handleProjectSwitch(project)}
                          >
                            <div className="font-medium text-sm">
                              {project.worktree}
                            </div>
                             <div className="text-xs opacity-70">
                               VCS: {project.vcs || 'Unknown'} | Updated: {project.updatedAt?.toLocaleDateString() || project.createdAt?.toLocaleDateString() || 'N/A'}
                             </div>
                          </div>
                       ))
                     ) : (
                       <div className="text-center text-[#6c7086] text-sm py-4">
                         No projects found
                       </div>
                     )}
                   </div>
                 </div>
                 
                 {/* Sessions Section */}
                 <div className="flex-1 flex flex-col">
                   <div className="flex justify-between items-center mb-4">
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
                   {!currentProject ? (
                     <div className="flex-1 flex items-center justify-center text-[#6c7086] text-sm">
                       Select a project first to view sessions
                     </div>
                   ) : (
                     <>
                       <div className="mb-4">
                         <Input
                           value={newSessionTitle}
                           onChange={(e) => setNewSessionTitle(e.target.value)}
                           placeholder="Session title..."
                           size="small"
                           className="bg-[#1e1e2e] text-[#cdd6f4] border-[#89b4fa]"
                         />
                         <div className="text-xs opacity-70 mt-1">
                           Project: {currentProject.worktree}
                         </div>
                       </div>
                        <div className="flex-1 overflow-y-auto space-y-2 max-h-96">
                           {sessions.filter(session => 
                             session.projectID === currentProject?.id || 
                             session.directory === currentProject?.worktree
                           ).map((session) => (
                           <div
                             key={session.id}
                             className={`p-2 rounded cursor-pointer transition-colors ${
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
                           </div>
                         ))}
                         {sessions.length === 0 && (
                           <div className="text-center text-[#6c7086] text-sm py-4">
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
                <div className="flex items-center justify-between text-xs text-[#cdd6f4]">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      className="text-[#89b4fa] hover:underline"
                      onClick={() => void handleDirectoryOpen('.')}
                    >
                      root
                    </button>
                    {breadcrumbParts.map((part, index) => {
                      const fullPath = breadcrumbParts.slice(0, index + 1).join('/');
                      return (
                        <span key={fullPath} className="flex items-center gap-1">
                          <span className="text-[#6c7086]">/</span>
                          <button
                            className="text-[#89b4fa] hover:underline"
                            onClick={() => void handleDirectoryOpen(fullPath)}
                          >
                            {part}
                          </button>
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
                <div className="flex-1 overflow-y-auto space-y-2">
                   {sortedFiles.length > 0 ? (
                     sortedFiles.map((file) => {
                       const isDirectory = file.type === 'directory';
                       const isSelected = !isDirectory && selectedFile === file.path;
                       return (
                         <div
                           key={file.path}
                           className={`p-2 rounded transition-colors cursor-pointer ${
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
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2 font-medium text-sm">
                               <span>{isDirectory ? '📁' : '📄'}</span>
                               <span>{file.name}</span>
                             </div>
                             <span className="text-xs text-[#6c7086]">
                               {isDirectory ? 'Directory' : 'File'}
                             </span>
                           </div>
                           <div className="text-xs opacity-60 truncate">{file.path}</div>
                         </div>
                       );
                     })
                  ) : (
                    <div className="text-center text-[#6c7086] text-sm py-4">
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
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col bg-[#1e1e2e]">
           {/* Header */}
           <div className="bg-[#313244] px-4 py-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
                 <span className="text-base font-normal text-[#cdd6f4]">
                  OpenCode Chat Sessions: {currentSession?.title || currentSession?.id.slice(0, 8)}... . Project: {currentProject?.worktree}
                </span>
              </div>
           </div>

          {/* Content */}
           {activeTab === "workspace" && (
            <div className="flex-1 flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !loading && (
                  <div className="flex justify-start">
                    <View box="round" className="max-w-xs p-3 bg-[#313244]">
                      <Pre
                        size="small"
                        className="text-[#cdd6f4] break-words whitespace-pre-wrap overflow-wrap-anywhere"
                      >
                        Welcome to opencode-web! Send a message to start
                        chatting with OpenCode.
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
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <View
                      box="round"
                      className={`max-w-md p-3 ${message.type === "user" ? "bg-[#89b4fa]" : "bg-[#313244]"}`}
                    >
                       <Pre
                         size="small"
                         className="text-[#cdd6f4] break-words whitespace-pre-wrap overflow-wrap-anywhere"
                       >
                         {message.content.includes('```') ? (
                           <div dangerouslySetInnerHTML={{ __html: message.content.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>') }} />
                         ) : (
                           message.content
                         )}
                       </Pre>
                      <div className="flex justify-between items-center mt-2">
                        <Badge
                          variant={
                            message.type === "user"
                              ? "background2"
                              : "foreground0"
                          }
                          cap="round"
                          className="text-xs"
                        >
                          {message.type === "user" ? "You" : "OpenCode"}
                        </Badge>
                        <span className="text-xs text-[#6c7086]">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </View>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <View box="round" className="max-w-xs p-3 bg-[#313244]">
                      <Pre size="small" className="text-[#cdd6f4]">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-[#89b4fa] rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-[#89b4fa] rounded-full animate-bounce [animation-delay:0.1s]" />
                          <div className="w-2 h-2 bg-[#89b4fa] rounded-full animate-bounce [animation-delay:0.2s]" />
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
              </div>

               {/* Input Area */}
                <div className="bg-[#313244] p-4">
                  <div className="mb-2 flex items-center justify-between text-xs opacity-70">
                    <div className="flex items-center gap-2">
                      <span>Model: {selectedModel?.name}</span>
                      <span>•</span>
                      <span>Session: {currentSession?.title}</span>
                      {input.startsWith('/') && <span>• Command Mode</span>}
                    </div>
                    <Badge key={currentAgent?.id} variant="foreground1" cap="round" className="bg-[#f38ba8] text-[#1e1e2e] border border-[#f38ba8]">
                      Agent: {currentAgent?.name || 'None'}
                    </Badge>
                  </div>
                 <div className="flex gap-2">
                   <div className="flex-1 relative">
                      <Textarea
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                         placeholder="Type your message, Tab to switch agent, /models to select model..."
                        rows={2}
                        size="large"
                        className="w-full pl-4 bg-[#1e1e2e] text-[#cdd6f4] border-[#89b4fa] resize-none"
                      />
                     {showFileSuggestions && fileSuggestions.length > 0 && (
                       <div className="absolute top-full left-0 right-0 bg-[#1e1e2e] border border-[#89b4fa] rounded mt-1 max-h-32 overflow-y-auto z-10">
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
                      box="round"
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="no-underline"
                    >
                      Send
                    </Button>
                 </div>
               </div>
            </div>
          )}

          {activeTab === "files" && (
            <div className="flex-1 p-4 bg-[#1e1e2e] flex flex-col overflow-hidden">
              {selectedFile ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">
                      {selectedFile.split("/").pop()}
                    </h3>
                    <Button
                      variant="foreground0"
                      box="round"
                      onClick={() => setSelectedFile(null)}
                      size="small"
                    >
                      Close
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Pre
                      size="small"
                      className="bg-[#313244] p-4 rounded text-[#cdd6f4] break-words whitespace-pre-wrap overflow-y-auto h-full"
                    >
                      {fileContent ?? "Unable to read file"}
                    </Pre>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#6c7086]">
                  Select a file to view its contents
                </div>
              )}
            </div>
          )}
         </div>
       </div>

        {/* Help Dialog */}
        {showHelp && (
          <Dialog
            open={showHelp}
            onClose={() => setShowHelp(false)}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
           <div className="bg-[#1e1e2e] p-6 rounded-lg max-w-md w-full mx-4">
             <h2 className="text-lg font-bold mb-4">Help</h2>
             <p className="text-sm mb-4">Welcome to OpenCode Web! This is a web-based interface for OpenCode.</p>
              <p className="text-sm mb-4">Use the tabs to navigate between Sessions, Projects, Files, and Models.</p>
              <p className="text-sm mb-4">Type your message in the input box and press Enter or click Send to chat with OpenCode.</p>
              <p className="text-sm mb-4">Available commands: /new, /models (opens model picker), /model, /help, /themes, /sessions, /undo, /redo, /share, /unshare, /init, /compact, /details, /export, /editor, /exit</p>
             <button
               onClick={() => setShowHelp(false)}
               className="bg-[#89b4fa] text-[#1e1e2e] px-4 py-2 rounded"
             >
               Close
             </button>
           </div>
         </Dialog>
       )}

         {/* Themes Dialog */}
         {showThemes && (
           <Dialog
             open={showThemes}
             onClose={() => setShowThemes(false)}
             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
           >
            <div className="bg-[#1e1e2e] p-6 rounded-lg max-w-md w-full mx-4">
              <h2 className="text-lg font-bold mb-4">Themes</h2>
              <p className="text-sm mb-4">Theme selection is not yet implemented.</p>
              <button
                onClick={() => setShowThemes(false)}
                className="bg-[#89b4fa] text-[#1e1e2e] px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </Dialog>
        )}

         {/* Onboarding Dialog */}
         {showOnboarding && (
           <Dialog
             open={showOnboarding}
             onClose={() => setShowOnboarding(false)}
             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
           >
            <div className="bg-[#1e1e2e] p-6 rounded-lg max-w-md w-full mx-4">
              <h2 className="text-lg font-bold mb-4">Connect to OpenCode Server</h2>
              <p className="text-sm mb-4">Enter your OpenCode server URL:</p>
              <Input
                placeholder="http://192.168.1.100:4096"
                size="large"
                className="bg-[#1e1e2e] text-[#cdd6f4] border-[#89b4fa] mb-4"
                onChange={() => {
                  // TODO: Update env var
                }}
              />
              <p className="text-xs opacity-70 mb-4">Find your IP: macOS/Linux: ifconfig | grep inet, Windows: ipconfig</p>
              <button
                onClick={() => setShowOnboarding(false)}
                className="bg-[#89b4fa] text-[#1e1e2e] px-4 py-2 rounded"
              >
                Connect
              </button>
            </div>
          </Dialog>
        )}

         {/* Model Picker Dialog */}
         {showModelPicker && (
           <Dialog
             open={showModelPicker}
             onClose={() => setShowModelPicker(false)}
             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
           >
            <div className="bg-[#1e1e2e] p-6 rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
              <h2 className="text-lg font-bold mb-4">Select Model</h2>
              <div className="mb-4">
                <Input
                  placeholder="Search models..."
                  size="small"
                  className="bg-[#313244] text-[#cdd6f4] border-[#89b4fa]"
                  onChange={() => {
                    // TODO: Implement search
                  }}
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {models.map((model) => (
                  <div
                    key={`${model.providerID}/${model.modelID}`}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      selectedModel?.providerID === model.providerID && selectedModel?.modelID === model.modelID
                        ? "bg-[#89b4fa] text-[#1e1e2e]"
                        : "bg-[#313244] hover:bg-[#45475a]"
                    }`}
                    onClick={() => {
                      selectModel(model);
                      setShowModelPicker(false);
                    }}
                  >
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs opacity-70">{model.providerID}/{model.modelID}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="foreground0"
                  box="round"
                  onClick={() => setShowModelPicker(false)}
                  size="small"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Dialog>
        )}
      </div>
    );
  }
