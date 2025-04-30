'use client';

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Assuming you have Avatar

interface ChatRoom {
  id: string;
  name: string;
  // Add other relevant properties like last message, unread count, avatar etc.
}

interface ChatListProps {
  chatRooms: ChatRoom[];
  selectedChatRoomId: string | null;
  onSelectChatRoom: (roomId: string) => void;
}

export function ChatList({ chatRooms, selectedChatRoomId, onSelectChatRoom }: ChatListProps) {

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <ScrollArea className="h-full p-2">
      <div className="space-y-1">
        {chatRooms.map((room) => (
          <Button
            key={room.id}
            variant="ghost"
            className={cn(
              "w-full justify-start h-auto py-2 px-3",
              selectedChatRoomId === room.id && "bg-accent text-accent-foreground"
            )}
            onClick={() => onSelectChatRoom(room.id)}
          >
            <Avatar className="h-8 w-8 mr-3">
              {/* Placeholder image - replace with actual avatars if available */}
              <AvatarImage src={`https://picsum.photos/seed/${room.id}/40/40`} alt={room.name} />
              <AvatarFallback>{getInitials(room.name)}</AvatarFallback>
            </Avatar>
            <span className="truncate">{room.name}</span>
            {/* Optional: Add unread count badge here */}
          </Button>
        ))}
        {chatRooms.length === 0 && (
           <p className="p-4 text-center text-sm text-muted-foreground">No chats available.</p>
        )}
      </div>
    </ScrollArea>
  );
}
