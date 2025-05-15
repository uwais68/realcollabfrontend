'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ListChecks, MessageSquare, Bell, LogOut, UserCircle, Clock, Target } from 'lucide-react'; // Added Target for Milestones

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarMenuBadge,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import type { Notification } from '@/services/realcollab';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications } = useSocket();
  const { user, logout, isLoading } = useAuth();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const handleLogout = () => {
    logout();
    // No need to redirect here, AuthProvider handles redirect on user change
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === path;
    return pathname.startsWith(path);
  };
  

  const getUserInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '??';
  };


  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="items-center justify-between">
        <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
          CollabFlow
        </span>
        <SidebarTrigger className="md:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive('/')}
                tooltip="Dashboard"
              >
                <a>
                  <Home />
                  <span>Dashboard</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/tasks" passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive('/tasks')}
                tooltip="Tasks"
              >
                <a>
                  <ListChecks />
                  <span>Tasks</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/milestones" passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive('/milestones')}
                tooltip="Milestones"
              >
                <a>
                  <Target /> 
                  <span>Milestones</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          {/* Timelogs page doesn't exist yet, if it does, add a link similar to milestones */}
          {/* Example for Timelogs if a page /timelogs exists:
           <SidebarMenuItem>
            <Link href="/timelogs" passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive('/timelogs')}
                tooltip="Timelogs"
              >
                <a>
                  <Clock />
                  <span>Timelogs</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          */}
          <SidebarMenuItem>
            <Link href="/chat" passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive('/chat')}
                tooltip="Chat"
              >
                <a>
                  <MessageSquare />
                  <span>Chat</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/notifications" passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive('/notifications')}
                tooltip="Notifications"
              >
                <a>
                  <Bell />
                  <span>Notifications</span>
                   {unreadCount > 0 && (
                     <SidebarMenuBadge>{unreadCount}</SidebarMenuBadge>
                    )}
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
       <SidebarSeparator />
        <SidebarFooter className="p-2">
          {isLoading ? (
             <div className="flex items-center gap-2 p-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
             </div>
          ) : user ? (
            <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center">
              <SidebarMenuItem>
                <div className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-[width,height,padding]">
                   <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profilePicture} alt={`${user.firstName} ${user.lastName}`} />
                      <AvatarFallback>{getUserInitials(user.firstName, user.lastName)}</AvatarFallback>
                   </Avatar>
                   <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
                     <span className="font-medium">{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</span>
                     <span className="text-xs text-muted-foreground">{user.email}</span>
                   </div>
                 </div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                 <SidebarMenuButton onClick={handleLogout} tooltip="Logout" className="w-full justify-start">
                  <LogOut />
                  <span className="group-data-[collapsible=icon]:hidden">Logout</span>
                 </SidebarMenuButton>
              </SidebarMenuItem>
            </div>
          ) : (
             <SidebarMenuItem>
               <Link href="/login" passHref legacyBehavior>
                  <SidebarMenuButton tooltip="Login">
                     <a>
                       <LogOut />
                       <span className="group-data-[collapsible=icon]:hidden">Login</span>
                     </a>
                   </SidebarMenuButton>
               </Link>
            </SidebarMenuItem>
          )}
        </SidebarFooter>
    </Sidebar>
  );
}