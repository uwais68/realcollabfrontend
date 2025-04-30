'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { ChatList } from './chat-list';
import { ChatWindow } from './chat-window';
import { SidebarTrigger } from '@/components/ui/sidebar';

// TODO: Fetch chat rooms/contacts from API
const MOCK_CHAT_ROOMS = [
  { id: 'room1', name: 'General Discussion' },
  { id: 'project1', name: 'Project Alpha Team' },
  { id: 'user2', name: 'Alice Wonderland' },
];


export function ChatInterface() {
  const [selectedChatRoomId, setSelectedChatRoomId] = React.useState<string | null>(null);

  // Select the first room by default initially
  React.useEffect(() => {
    if (MOCK_CHAT_ROOMS.length > 0 && !selectedChatRoomId) {
      setSelectedChatRoomId(MOCK_CHAT_ROOMS[0].id);
    }
  }, [selectedChatRoomId]);


  return (
    <div className="flex flex-col h-screen">
       <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="block md:hidden"/> {/* Mobile trigger */}
            <h1 className="text-2xl font-semibold">Chat</h1>
          </div>
           {/* Add user profile/actions here */}
        </header>
        <div className="flex flex-1 overflow-hidden">
            {/* Chat List Sidebar - Consider making this collapsible on larger screens too */}
            <div className="w-full md:w-1/4 lg:w-1/5 border-r overflow-y-auto">
                <ChatList
                    chatRooms={MOCK_CHAT_ROOMS}
                    selectedChatRoomId={selectedChatRoomId}
                    onSelectChatRoom={setSelectedChatRoomId}
                />
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
            {selectedChatRoomId ? (
                <ChatWindow chatRoomId={selectedChatRoomId} />
            ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Select a chat to start messaging
                </div>
            )}
            </div>
        </div>
    </div>
  );
}
