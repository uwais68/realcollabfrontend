'use client';

import * as React from 'react';
import { ChatList } from './chat-list';
import { ChatWindow } from './chat-window';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext'; // Check auth state

interface SelectedChat {
  id: string;
  type: 'user' | 'room';
}

export function ChatInterface() {
  const [selectedChat, setSelectedChat] = React.useState<SelectedChat | null>(null);
  const { user, isLoading } = useAuth(); // Get user state


  const handleSelectChat = (id: string, type: 'user' | 'room') => {
      console.log(`Selected chat: ID=${id}, Type=${type}`);
      setSelectedChat({ id, type });
  };

   // Select the first chat by default (if available) after loading - Removed for now, let user select explicitly.
   // React.useEffect(() => {
   //   if (!selectedChat && chatListItems.length > 0) { // Check if chatListItems is populated
   //     handleSelectChat(chatListItems[0].id, chatListItems[0].type);
   //   }
   // }, [selectedChat, chatListItems]); // Add chatListItems dependency


  return (
    <div className="flex flex-col h-screen bg-background">
       <header className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="block md:hidden"/> {/* Mobile trigger */}
            <h1 className="text-xl font-semibold">Chat</h1>
          </div>
           {/* Consider adding selected chat name here */}
           {/* <div className="text-center text-sm font-medium truncate">{selectedChat ? `Chatting in ${selectedChat.type} ${selectedChat.id}` : ''}</div> */}
           {/* Add user profile/actions here */}
        </header>
        <div className="flex flex-1 overflow-hidden">
             {/* Chat List Sidebar */}
            <div className="w-full md:w-[280px] lg:w-[320px] flex-shrink-0 bg-card md:bg-transparent"> {/* Adjust width as needed */}
                 <ChatList
                    // Pass fetched or mock data here if ChatList doesn't fetch itself
                    selectedChatRoomId={selectedChat?.id ?? null}
                    onSelectChatRoom={handleSelectChat}
                 />
             </div>


            {/* Chat Window Area */}
            <div className="flex-1 flex flex-col border-l"> {/* Added border */}
             {isLoading && (
                 <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading user...</div>
             )}
             {!isLoading && !user && (
                 <div className="flex-1 flex items-center justify-center text-muted-foreground">Please log in to use chat.</div>
             )}
             {!isLoading && user && selectedChat ? (
                // Pass the ID which could be a user ID or room ID
                <ChatWindow key={selectedChat.id} chatRoomId={selectedChat.id} />
            ) : (
                 !isLoading && user && !selectedChat && (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
                         Select a contact or room from the left to start chatting.
                    </div>
                 )
            )}
            </div>
        </div>
    </div>
  );
}
