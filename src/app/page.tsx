'use client';

import { useState, useEffect } from 'react';
import { Button, Input, View, Badge, Separator, Pre } from '@/app/_components/ui';
import { useOpenCode } from '@/hooks/useOpenCode';

export default function OpenCodeChatTUI() {
    const [input, setInput] = useState('');
    const {
        currentSession,
        messages,
        loading,
        createSession,
        sendMessage
    } = useOpenCode();

    // Create initial session on mount
    useEffect(() => {
        if (!currentSession) {
            createSession('opencode-web session').catch(console.error);
        }
    }, [currentSession, createSession]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const messageText = input;
        setInput('');

        try {
            if (!currentSession) {
                await createSession('opencode-web session');
            }
            await sendMessage(messageText);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="min-h-screen bg-[#1e1e2e] text-[#cdd6f4] font-mono p-4">
            <View box="round" className="max-w-4xl mx-auto h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-[#89b4fa]">
                    <div className="flex justify-between items-center">
                        <Badge variant="foreground1" cap="round">opencode-web</Badge>
                        {currentSession && (
                            <Badge variant="foreground0" cap="round" className="text-xs">
                                Session: {currentSession.id.slice(0, 8)}...
                            </Badge>
                        )}
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
    );
}
