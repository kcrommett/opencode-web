'use client';

import { useState, useEffect } from 'react';
import { Button, Input, View, Badge, Separator, Pre } from '@/app/_components/ui';
import { useOpenCode } from '@/hooks/useOpenCode';

export default function OpenCodeChatTUI() {
    const [input, setInput] = useState('');
    const [newSessionTitle, setNewSessionTitle] = useState('');
    const [newSessionDirectory, setNewSessionDirectory] = useState('');
    const {
        currentSession,
        messages,
        sessions,
        loading,
        createSession,
        sendMessage,
        loadSessions,
        switchSession,
        deleteSession,
        clearAllSessions
    } = useOpenCode();

    // Create initial session on mount
    useEffect(() => {
        if (!currentSession) {
            createSession({ title: 'opencode-web session' }).catch(console.error);
        }
    }, [currentSession, createSession]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const messageText = input;
        setInput('');

        try {
            if (!currentSession) {
                await createSession({ title: 'opencode-web session' });
                await loadSessions();
            } else {
                await sendMessage(messageText);
                await loadSessions(); // Refresh session metadata after sending message
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleCreateSession = async () => {
        const title = newSessionTitle.trim() || 'New Session';
        const directory = newSessionDirectory.trim() || undefined;
        try {
            await createSession({ title, directory });
            await loadSessions();
            setNewSessionTitle('');
            setNewSessionDirectory('');
        } catch (err) {
            console.error('Failed to create session:', err);
        }
    };

    const handleSessionSwitch = async (sessionId: string) => {
        try {
            await switchSession(sessionId);
        } catch (err) {
            console.error('Failed to switch session:', err);
        }
    };

    const handleDeleteSession = async (sessionId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (confirm('Are you sure you want to delete this session?')) {
            try {
                await deleteSession(sessionId);
            } catch (err) {
                console.error('Failed to delete session:', err);
            }
        }
    };

    const handleClearSessions = async () => {
        if (confirm('Are you sure you want to delete all sessions?')) {
            try {
                await clearAllSessions();
                await loadSessions();
            } catch (err) {
                console.error('Failed to clear sessions:', err);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="min-h-screen bg-[#1e1e2e] text-[#cdd6f4] font-mono p-4">
            <div className="max-w-6xl mx-auto h-[80vh] flex gap-4">
                {/* Session Sidebar */}
                <div className="w-64 bg-[#313244] rounded-lg p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <Badge variant="foreground1" cap="round">Sessions</Badge>
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
                    <div className="mb-4 space-y-2">
                        <Input
                            value={newSessionTitle}
                            onChange={(e) => setNewSessionTitle(e.target.value)}
                            placeholder="Session title..."
                            size="small"
                            className="bg-[#1e1e2e] text-[#cdd6f4] border-[#89b4fa]"
                        />
                        <Input
                            value={newSessionDirectory}
                            onChange={(e) => setNewSessionDirectory(e.target.value)}
                            placeholder="Working directory (optional)"
                            size="small"
                            className="bg-[#1e1e2e] text-[#cdd6f4] border-[#89b4fa]"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className={`p-2 rounded cursor-pointer transition-colors ${
                                    currentSession?.id === session.id
                                        ? 'bg-[#89b4fa] text-[#1e1e2e]'
                                        : 'bg-[#1e1e2e] hover:bg-[#45475a]'
                                }`}
                                onClick={() => handleSessionSwitch(session.id)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">
                                            {session.title}
                                        </div>
                                        <div className="text-xs opacity-70">
                                            {session.createdAt?.toLocaleDateString() || 'Unknown'}
                                            {session.messageCount !== undefined && (
                                                <span className="ml-2">• {session.messageCount} messages</span>
                                            )}
                                        </div>
                                        {session.updatedAt && session.updatedAt.getTime() !== session.createdAt?.getTime() && (
                                            <div className="text-xs opacity-50">
                                                Updated: {session.updatedAt.toLocaleDateString()}
                                            </div>
                                        )}
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
                                No sessions yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <View box="round" className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-[#89b4fa]">
                    <div className="flex justify-between items-center">
                        <Badge variant="foreground1" cap="round">opencode-web</Badge>
                        <div className="flex items-center gap-2">
                            {currentSession && (
                                <Badge variant="foreground0" cap="round" className="text-xs">
                                    Session: {currentSession.id.slice(0, 8)}...
                                </Badge>
                            )}
                            {currentSession?.directory && (
                                <Badge variant="foreground0" cap="round" className="text-xs truncate max-w-[200px]">
                                    Dir: {currentSession.directory}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Separator className="mt-2" />
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && !loading && (
                        <div className="flex justify-start">
                            <View box="round" className="max-w-xs p-3 bg-[#313244]">
                                <Pre size="small" className="text-[#cdd6f4] break-words whitespace-pre-wrap overflow-wrap-anywhere">
                                    Welcome to opencode-web! Send a message to start chatting with OpenCode.
                                </Pre>
                                <Badge variant="foreground0" cap="round" className="mt-2 text-xs">
                                    OpenCode
                                </Badge>
                            </View>
                        </div>
                    )}
                    {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <View box="round" className={`max-w-md p-3 ${message.type === 'user' ? 'bg-[#89b4fa]' : 'bg-[#313244]'}`}>
                                <Pre size="small" className="text-[#cdd6f4] break-words whitespace-pre-wrap overflow-wrap-anywhere">
                                    {message.content}
                                </Pre>
                                <div className="flex justify-between items-center mt-2">
                                    <Badge
                                        variant={message.type === 'user' ? 'background2' : 'foreground0'}
                                        cap="round"
                                        className="text-xs"
                                    >
                                        {message.type === 'user' ? 'You' : 'OpenCode'}
                                    </Badge>
                                    <span className="text-xs text-[#6c7086]">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                <Badge variant="foreground0" cap="round" className="mt-2 text-xs">
                                    OpenCode
                                </Badge>
                            </View>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-[#89b4fa]">
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            size="large"
                            className="flex-1 bg-[#313244] text-[#cdd6f4] border-[#89b4fa]"
                        />
                        <Button
                            variant="foreground0"
                            box="round"
                            onClick={handleSend}
                            disabled={!input.trim()}
                        >
                            Send
                        </Button>
                    </div>
                </div>
                </View>
            </div>
        </div>
    );
}
