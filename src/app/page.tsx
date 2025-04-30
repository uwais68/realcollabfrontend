'use client'; // Required because we use hooks like useRouter and useEffect

import * as React from 'react';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import { Dashboard } from '@/components/dashboard';
import { AppSidebar } from '@/components/app-sidebar';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    // If loading is finished and there's no user, redirect to login
    if (!isLoading && !user) {
       console.log("Home page: No user found after loading, redirecting to /login");
      router.push('/login');
    }
     // No need to redirect if user is found, just render the page
  }, [user, isLoading, router]);

  // Show loading state or null while checking auth, prevents flicker
  if (isLoading || !user) {
    return (
        <div className="flex justify-center items-center h-screen">
            <p>Loading...</p> {/* Or a spinner component */}
        </div>
    );
  }


  // Render the dashboard if the user is authenticated
  return (
    <div className="flex h-screen"> {/* Ensure full height */}
      <AppSidebar />
      <main className="flex-1 overflow-y-auto"> {/* Allow content scrolling */}
        <Dashboard />
      </main>
    </div>
  );
}
