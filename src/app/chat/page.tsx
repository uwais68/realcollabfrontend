
import { ChatInterface } from '@/components/chat-interface';
import { AppSidebar } from '@/components/app-sidebar';

export default function ChatPage() {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1">
        <ChatInterface />
      </main>
    </div>
  );
}
