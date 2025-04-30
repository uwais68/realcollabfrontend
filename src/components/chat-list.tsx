'use client';

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { useToast } from '@/hooks/use-toast';
import { getAllUsers } from '@/services/realcollab'; // Import API function
import type { User } from '@/context/AuthContext'; // Import User type
import { useAuth } from '@/context/AuthContext'; // To exclude self

// Represents either a direct user chat or a group room
interface ChatListItem {
  id: string; // User ID for direct chat, Room ID for group chat
  name: string;
  type: 'user' | 'room';
  profilePicture?: string; // For users
  // Add other relevant properties like last message, unread count etc.
}

interface ChatListProps {
  selectedChatRoomId: string | null; // This ID can be a User ID or a Room ID
  onSelectChatRoom: (id: string, type: 'user' | 'room') => void; // Pass type as well
}

export function ChatList({ selectedChatRoomId, onSelectChatRoom }: ChatListProps) {
  const [chatListItems, setChatListItems] = React.useState<ChatListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  const { user: currentUser } = useAuth(); // Get current user to exclude from list

  // TODO: Fetch real chat rooms AND users for direct messages
  React.useEffect(() => {
    const fetchChatListData = async () => {
      setLoading(true);
      try {
        // 1. Fetch potential chat partners (all other users)
        const users = await getAllUsers();
        const directChats: ChatListItem[] = users
           .filter(user => user._id !== currentUser?._id) // Exclude self
           .map(user => ({
            // For direct chats, the 'chatRoomId' used in ChatWindow will be the *other user's ID*.
            // A more robust backend might generate a unique room ID for 1-on-1 chats.
            // For now, we use the user ID as the identifier for the 1-on-1 chat.
            id: user._id!,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email!,
            type: 'user',
            profilePicture: user.profilePicture,
           }));

        // 2. Fetch group chat rooms (MOCK for now)
        // Replace with API call like `getChatRoomsForUser()` when available
        // This API should return rooms the current user is a participant in.
        const groupRooms: ChatListItem[] = [
          // Example group room structure - IDs should come from backend
          // { id: 'backend-generated-room-id-1', name: 'General Discussion', type: 'room' },
          // { id: 'backend-generated-room-id-2', name: 'Project Alpha Team', type: 'room' },
        ];


        // Combine and set the list
        setChatListItems([...groupRooms, ...directChats]);

      } catch (error) {
        console.error("Failed to fetch chat list data:", error);
        toast({
          title: "Error Loading Chats",
          description: "Could not load users or chat rooms.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) { // Only fetch when the current user is loaded
      fetchChatListData();
    } else {
        setLoading(false); // Stop loading if no user
    }

  }, [toast, currentUser]); // Depend on currentUser

  const getInitials = (name: string) => {
     if (!name) return '??';
     // Improved initials logic
     const names = name.split(' ').filter(Boolean); // Filter out empty strings
     if (names.length === 0) return '??';
     if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
     return (names[0][0] + names[names.length - 1][0]).toUpperCase();
   }

  return (
    <ScrollArea className="h-full p-2 border-r"> {/* Added border */}
      <h2 className="text-lg font-semibold p-2 group-data-[collapsible=icon]:hidden">Contacts & Rooms</h2>
      <div className="space-y-1 mt-2">
         {loading && (
             [...Array(5)].map((_, i) => (
                 <div key={i} className="flex items-center space-x-3 p-2">
                     <Skeleton className="h-8 w-8 rounded-full" />
                     <Skeleton className="h-4 flex-grow" />
                 </div>
             ))
         )}
        {!loading && chatListItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              "w-full justify-start h-auto py-2 px-3",
              // Highlight if the selected ID matches this item's ID
              selectedChatRoomId === item.id && "bg-accent text-accent-foreground"
            )}
            // Pass the ID (user or room) and type to the handler
            onClick={() => onSelectChatRoom(item.id, item.type)}
          >
            <Avatar className="h-8 w-8 mr-3">
              <AvatarImage src={item.profilePicture || `https://picsum.photos/seed/${item.id}/40/40`} alt={item.name} />
              <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
            </Avatar>
            <span className="truncate group-data-[collapsible=icon]:hidden">{item.name}</span>
            {/* Optional: Add unread count badge here */}
          </Button>
        ))}
        {!loading && chatListItems.length === 0 && !currentUser && (
             <p className="p-4 text-center text-sm text-muted-foreground">Log in to see chats.</p>
         )}
         {!loading && chatListItems.length === 0 && currentUser && (
             <p className="p-4 text-center text-sm text-muted-foreground">No contacts or rooms found.</p>
         )}
      </div>
    </ScrollArea>
  );
}

    