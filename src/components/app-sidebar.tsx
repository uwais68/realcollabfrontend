'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListChecks, MessageSquare, Bell } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { useSocket } from '@/context/SocketContext';
import type { Notification } from '@/services/realcollab';

export function AppSidebar() {
  const pathname = usePathname();
  const { notifications } = useSocket();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    // Simple count for now, could be expanded to track read status
    setUnreadCount(notifications.length);
  }, [notifications]);

  const isActive = (path: string) => pathname === path;

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="items-center justify-between">
        <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
          RealCollab
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
    </Sidebar>
  );
}
