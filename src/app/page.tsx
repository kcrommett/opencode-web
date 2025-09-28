"use client";

import { useState, useEffect } from "react";
 import {
   Button,
   Input,
   View,
   Badge,
   Pre,
   Dialog,
 } from "@/app/_components/ui";
import { useOpenCode } from "@/hooks/useOpenCode";

export default function OpenCodeChatTUI() {
  const [input, setInput] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionDirectory, setNewSessionDirectory] = useState("");
  const [activeTab, setActiveTab] = useState("sessions");
  const [fileSearchQuery, setFileSearchQuery] = useState("");

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
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
    loadFiles,
    searchFiles,
    readFile,
    models,
    selectedModel,
    selectModel,
      openHelp,
      openThemes,
      currentPath,
      providersData,
      showHelp,
      setShowHelp,
      showThemes,
      setShowThemes,
    } = useOpenCode();

  // Create initial session on mount
  useEffect(() => {
    if (!currentSession) {
      createSession({ title: "opencode-web session" }).catch(console.error);
    }
  }, [currentSession, createSession]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const messageText = input;
    setInput("");

    try {
      if (!currentSession) {
        await createSession({ title: "opencode-web session" });
        await loadSessions();
      } else {
        // Check if it's a command
        if (messageText.startsWith("/")) {
          await handleCommand(messageText);
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

  const handleCommand = async (command: string) => {
    const parts = command.split(" ");
    const cmd = parts[0];

    switch (cmd) {
      case "/models":
        // Show available models
        const modelList = models
          .map((m) => `${m.providerID}/${m.modelID}: ${m.name}`)
          .join("\n");
        const response = `Available models:\n${modelList}\n\nCurrent: ${selectedModel?.name}\n\nUsage: /models <provider>/<model> to select`;
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          type: "assistant" as const,
          content: response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        break;
      case "/model":
        if (parts.length < 2) {
          const errorMessage = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "Usage: /model <provider>/<model>",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          break;
        }
        const [providerID, modelID] = parts[1].split("/");
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
            content: `Model not found: ${parts[1]}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
        break;
      default:
        const unknownMessage = {
          id: `assistant-${Date.now()}`,
          type: "assistant" as const,
          content: `Unknown command: ${cmd}. Type /models to see available models.`,
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
    if (e.key === "Enter") {
      handleSend();
    }
  };

  // New feature handlers
  const handleProjectSwitch = async (projectId: string) => {
    try {
      await switchProject(projectId);
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
       const response = await readFile(filePath);
       console.log('File read response:', response);
       setSelectedFile(filePath);
       if (response && response.data && response.data.content) {
         setFileContent(response.data.content);
       } else if (typeof response === "string") {
         setFileContent(response);
       } else {
         setFileContent(JSON.stringify(response) || "Unable to read file");
       }
     } catch (err) {
       console.error("Failed to read file:", err);
       setFileContent("Error reading file");
     }
   };

  const handleModelSelect = (modelId: string) => {
    const model = models.find((m) => m.modelID === modelId);
    if (model) {
      selectModel(model);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "files") {
      loadFiles(currentProject?.worktree || currentPath);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e2e] text-[#cdd6f4] font-mono">
      {/* Top Bar */}
       <div className="bg-[#313244] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="foreground1" cap="round">
            opencode web
          </Badge>
          <div className="flex gap-1">
            {["sessions", "projects", "files", "models"].map((tab) => (
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
      <div className="flex h-[calc(100vh-60px)]">
        {/* Sidebar */}
         <div className="w-80 bg-[#313244] flex flex-col">
          <div className="p-4 flex-1 overflow-hidden">
             {activeTab === "sessions" && (
               <div className="space-y-4 h-full flex flex-col">
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
                 {!currentProject ? (
                   <div className="text-center text-[#6c7086] text-sm py-4">
                     Select a project first to view sessions
                   </div>
                 ) : (
                   <>
                     <div className="space-y-2">
                       <Input
                         value={newSessionTitle}
                         onChange={(e) => setNewSessionTitle(e.target.value)}
                         placeholder="Session title..."
                         size="small"
                         className="bg-[#1e1e2e] text-[#cdd6f4] border-[#89b4fa]"
                       />
                       <div className="text-xs opacity-70">
                         Project: {currentProject.worktree}
                       </div>
                     </div>
                     <div className="flex-1 overflow-y-auto space-y-2">
                       {sessions.map((session) => (
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
             )}

            {activeTab === "projects" && (
              <div className="space-y-4 h-full flex flex-col">
                <h3 className="text-sm font-medium">Projects</h3>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {projects.length > 0 ? (
                    projects.map((project) => (
                      <div
                        key={project.id}
                        className={`p-2 rounded cursor-pointer transition-colors ${
                          currentProject?.id === project.id
                            ? "bg-[#89b4fa] text-[#1e1e2e]"
                            : "bg-[#1e1e2e] hover:bg-[#45475a]"
                        }`}
                        onClick={() => handleProjectSwitch(project.id)}
                      >
                        <div className="font-medium text-sm">
                          {project.worktree}
                        </div>
                        <div className="text-xs opacity-70">
                          {project.worktree}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-[#6c7086] text-sm py-4">
                      No projects found
                    </div>
                  )}
                </div>
                <div className="text-xs opacity-50">
                  Debug: {projects.length} projects loaded
                </div>
              </div>
            )}

            {activeTab === "files" && (
              <div className="space-y-4 h-full flex flex-col">
                <h3 className="text-sm font-medium">Files</h3>
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
                <div className="flex-1 overflow-y-auto space-y-2">
                   {files.length > 0 ? (
                     files.map((file, index) => (
                       <div
                         key={`${file.path}-${index}`}
                         className="p-2 rounded cursor-pointer bg-[#1e1e2e] hover:bg-[#45475a] transition-colors"
                         onClick={() => handleFileSelect(file.path)}
                       >
                         <div className="font-medium text-sm">{file.path.split('/').pop()}</div>
                         <div className="text-xs opacity-70">{file.type} • {file.size ? `${file.size} bytes` : ''}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-[#6c7086] text-sm py-4">
                      No files loaded
                    </div>
                  )}
                </div>
                <div className="text-xs opacity-50">
                  Debug: {files.length} files loaded
                </div>
              </div>
            )}

            {activeTab === "models" && (
              <div className="space-y-4 h-full flex flex-col">
                <h3 className="text-sm font-medium">Models</h3>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Provider
                    </label>
                    <select
                      value={selectedModel?.providerID || ""}
                      onChange={(e) => {
                        const providerID = e.target.value;
                        const providerModels = models.filter(
                          (m) => m.providerID === providerID,
                        );
                        if (providerModels.length > 0) {
                          selectModel(providerModels[0]);
                        }
                      }}
                      className="w-full p-2 bg-[#1e1e2e] text-[#cdd6f4] border border-[#89b4fa] rounded"
                    >
                       {Array.from(new Set(models.map((m) => m.providerID))).map(
                         (providerID) => {
                           const provider = providersData?.providers?.find(
                             (p) => p.id === providerID,
                           );
                           return (
                             <option key={providerID} value={providerID}>
                               {provider?.name || providerID}
                             </option>
                           );
                         },
                       )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Model
                    </label>
                    <select
                      value={selectedModel?.modelID || ""}
                      onChange={(e) => handleModelSelect(e.target.value)}
                      className="w-full p-2 bg-[#1e1e2e] text-[#cdd6f4] border border-[#89b4fa] rounded"
                    >
                      {models
                        .filter(
                          (m) => m.providerID === selectedModel?.providerID,
                        )
                        .map((model) => (
                          <option key={model.modelID} value={model.modelID}>
                            {model.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="text-xs opacity-70">
                  Current: {selectedModel?.name || "None selected"}
                </div>
                <div className="text-xs opacity-50">
                  Debug: {models.length} models loaded
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
                 OpenCode Chat Sessions: {currentSession?.id.slice(0, 8)}... . Project: {currentProject?.worktree} Model: {selectedModel?.name}
               </span>
             </div>
           </div>

          {/* Content */}
          {activeTab === "sessions" && (
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
                        {message.content}
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
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message or /models to select model..."
                    size="large"
                    className="flex-1 bg-[#1e1e2e] text-[#cdd6f4] border-[#89b4fa]"
                  />
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

          {activeTab === "files" && selectedFile && (
            <div className="flex-1 p-4 bg-[#1e1e2e]">
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
              <Pre
                size="small"
                className="bg-[#313244] p-4 rounded max-h-full overflow-y-auto text-[#cdd6f4] break-words whitespace-pre-wrap"
              >
                {fileContent}
              </Pre>
            </div>
          )}

          {activeTab === "files" && !selectedFile && (
            <div className="flex-1 p-4 text-center text-[#6c7086] bg-[#1e1e2e]">
              Select a file to view its contents
            </div>
          )}
         </div>
       </div>

       {/* Help Dialog */}
       {showHelp && (
         <Dialog
           open={showHelp}
           onClose={() => setShowHelp(false)}
           className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         >
           <div className="bg-[#1e1e2e] p-6 rounded-lg max-w-md w-full mx-4">
             <h2 className="text-lg font-bold mb-4">Help</h2>
             <p className="text-sm mb-4">Welcome to OpenCode Web! This is a web-based interface for OpenCode.</p>
             <p className="text-sm mb-4">Use the tabs to navigate between Sessions, Projects, Files, and Models.</p>
             <p className="text-sm mb-4">Type your message in the input box and press Enter or click Send to chat with OpenCode.</p>
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
           className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
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
     </div>
   );
 }
