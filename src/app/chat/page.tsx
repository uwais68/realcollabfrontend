'use client'; // Required for hooks

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { AppSidebar } from '@/components/app-sidebar';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export default function ChatPage() {
   const { user, isLoading } = useAuth();
   const router = useRouter();

   React.useEffect(() => {
    // If loading is finished and there's no user, redirect to login
    if (!isLoading && !user) {
       console.log("Chat page: No user found after loading, redirecting to /login");
      router.push('/login');
    }
   }, [user, isLoading, router]);


   // Show loading state or null while checking auth
   if (isLoading || !user) {
     return (
         <div className="flex justify-center items-center h-screen">
             <p>Loading...</p> {/* Or a spinner component */}
         </div>
     );
   }

  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1">
        <ChatInterface />
      </main>
    </div>
  );
}
