'use client';

import * as React from 'react';
import { ChatList } from './chat-list';
import { ChatWindow } from './chat-window';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { getOrCreateDmChatRoom, type ChatRoomId } from '@/services/realcollab'; // Import getOrCreateDmChatRoom
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface SelectedChatState {
  id: string; // Original ID (userId for DMs, roomId for groups)
  type: 'user' | 'room';
  actualChatRoomId: ChatRoomId | null; // The true ChatRoom._id for messaging
}

export function ChatInterface() {
  const [selectedChat, setSelectedChat] = React.useState<SelectedChatState | null>(null);
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isResolvingDmRoom, setIsResolvingDmRoom] = React.useState(false);


  const handleSelectChat = async (id: string, type: 'user' | 'room') => {
      console.log(`Selected chat: ID=${id}, Type=${type}`);
      if (type === 'user') {
        if (!user) {
          toast({ title: "Authentication Error", description: "Please log in to start a chat.", variant: "destructive" });
          return;
        }
        setIsResolvingDmRoom(true);
        try {
          // 'id' is the peerUserId for DM
          const roomData = await getOrCreateDmChatRoom(id);
          console.log(`Room ID ${roomData._id}`)
          setSelectedChat({ id, type, actualChatRoomId: roomData._id });
          console.log(`Resolved DM room for user ${id} to ChatRoomID: ${roomData._id}`);
        } catch (error) {
          console.error("Failed to get/create DM chat room:", error);
          const errorMessage = error instanceof Error ? error.message : "Could not open direct message.";
          toast({
            title: "Chat Error",
            description: errorMessage,
            variant: "destructive",
          });
          setSelectedChat(null); // Reset selection on error
        } finally {
          setIsResolvingDmRoom(false);
        }
      } else {
        // For 'room' type, the 'id' is already the actualChatRoomId
        setSelectedChat({ id, type, actualChatRoomId: id });
      }
  };


  return (
    <div className="flex flex-col h-screen bg-background">
       <header className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="block md:hidden"/>
            <h1 className="text-xl font-semibold">Chat</h1>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
            <div className="w-full md:w-[280px] lg:w-[320px] flex-shrink-0 bg-card md:bg-transparent">
                 <ChatList
                    selectedChatRoomId={selectedChat?.actualChatRoomId ?? null} // Use actualChatRoomId for highlighting
                    onSelectChatRoom={handleSelectChat}
                 />
             </div>

            <div className="flex-1 flex flex-col border-l">
             {authLoading && (
                 <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading user...</div>
             )}
             {!authLoading && !user && (
                 <div className="flex-1 flex items-center justify-center text-muted-foreground">Please log in to use chat.</div>
             )}
             {!authLoading && user && isResolvingDmRoom && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
                    Opening chat...
                </div>
             )}
             {!authLoading && user && !isResolvingDmRoom && selectedChat && selectedChat.actualChatRoomId ? (
                <ChatWindow key={selectedChat.actualChatRoomId} chatRoomId={selectedChat.actualChatRoomId} />
            ) : (
                 !authLoading && user && !selectedChat && !isResolvingDmRoom && (
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
