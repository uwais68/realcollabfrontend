'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Use App Router's useRouter
import { jwtDecode } from 'jwt-decode'; // Using jwt-decode assuming no signature verification needed client-side

import {
    registerUser,
    loginUser,
    getCurrentUser, // Function to get user details from token/backend
    RegisterData,
    LoginData,
} from '@/services/realcollab'; // Import API functions
import { useToast } from '@/hooks/use-toast';

// Define the structure of the user object based on UserSchema
export interface User {
    _id: string; // MongoDB ObjectId as string
    firstName?: string;
    lastName?: string;
    email: string;
    role: 'User' | 'Admin';
    profilePicture?: string;
     // Exclude password, otp, otpExpires from client-side user object
}

// Define the structure of the decoded JWT payload
interface DecodedToken {
    userId: string;
    role: 'User' | 'Admin';
    iat: number;
    exp: number;
}


interface AuthContextProps {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (userData: RegisterData) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const AUTH_TOKEN_COOKIE_NAME = 'authToken'; // Define cookie name

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Start loading until auth state is verified
    const router = useRouter();
    const { toast } = useToast();

    // Function to set token in state and cookie
    const setAuthToken = (newToken: string | null) => {
        setToken(newToken);
        if (newToken) {
            // Set cookie with expiration (e.g., 1 hour, matching token)
            const decoded = jwtDecode<DecodedToken>(newToken);
            const expires = new Date(decoded.exp * 1000);
            console.log("Setting auth cookie, expires:", expires.toUTCString());
            document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=${encodeURIComponent(newToken)}; path=/; expires=${expires.toUTCString()}; SameSite=Lax;`; // Add Secure in production
        } else {
             console.log("Removing auth cookie");
            // Remove cookie by setting expiration date in the past
            document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`; // Add Secure in production
        }
    };


     // Check for existing token in cookies on initial load
     const initializeAuth = useCallback(async () => {
         console.log("Initializing auth...");
         setIsLoading(true);
         try {
             const existingToken = getAuthTokenFromCookie(); // Helper function to read cookie
             console.log("Existing token found:", !!existingToken);
             if (existingToken) {
                 const decoded = jwtDecode<DecodedToken>(existingToken);
                 // Check if token is expired
                 if (decoded.exp * 1000 > Date.now()) {
                     console.log("Token is valid. Fetching user data...");
                     setToken(existingToken); // Set token in state first
                     // Fetch user details using the token (e.g., from a /me endpoint)
                     // This ensures user data is up-to-date and verifies token server-side implicitly
                     const currentUser = await getCurrentUser(); // Assumes getCurrentUser uses the token from getHeaders()
                     setUser(currentUser as User); // Cast as User, assuming getCurrentUser returns the correct shape
                     console.log("User data loaded:", currentUser.email);
                 } else {
                     console.log("Token expired. Clearing auth state.");
                     setAuthToken(null); // Clear expired token from cookie and state
                     setUser(null);
                 }
             } else {
                console.log("No existing token found.");
                setUser(null); // Ensure user is null if no token
             }
         } catch (error) {
             console.error("Auth initialization error:", error);
             setAuthToken(null); // Clear token on error
             setUser(null);
         } finally {
              console.log("Auth initialization complete.");
             setIsLoading(false);
         }
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, []); // Empty dependency array ensures this runs only once on mount

     useEffect(() => {
        initializeAuth();
     }, [initializeAuth]);


    const login = async (email: string, password: string) => {
         console.log(`Attempting login for ${email}`);
        setIsLoading(true);
        try {
            const response = await loginUser({ email, password });
            console.log('Login successful, token received:', response.token.substring(0, 10) + "...");
            setAuthToken(response.token);
            // Fetch user data after setting token
            const currentUser = await getCurrentUser();
            setUser(currentUser as User);
            console.log('User set after login:', currentUser.email);
            // Redirect is handled by the page effect or middleware now
            // router.push('/');
        } catch (error) {
            console.error("Login failed in AuthContext:", error);
            setUser(null);
            setAuthToken(null);
            throw error; // Re-throw error to be caught by the form
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (userData: RegisterData) => {
        console.log(`Attempting registration for ${userData.email}`);
         setIsLoading(true); // Indicate loading during registration API call
         try {
            await registerUser(userData);
            console.log('Registration successful.');
             // Optionally show success toast here or let the form handle it
            // toast({ title: "Registration Successful", description: "Please log in." });
            // No need to set user/token here, user needs to log in separately
         } catch (error) {
             console.error("Registration failed in AuthContext:", error);
             throw error; // Re-throw error for the form
         } finally {
             setIsLoading(false);
         }
    };

    const logout = () => {
         console.log("Logging out user.");
        setUser(null);
        setAuthToken(null); // Clears token from state and cookie
         toast({ title: "Logged Out", description: "You have been successfully logged out." });
        // Redirect to login page after state updates
         // Using push might cause issues if components depending on user haven't unmounted yet.
         // Rely on useEffect in protected pages or middleware for redirection.
         router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};


// Helper function to get token from cookie (client-side only)
const getAuthTokenFromCookie = (): string | null => {
    if (typeof document === 'undefined') return null; // Check if running in browser
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.startsWith(AUTH_TOKEN_COOKIE_NAME + '=')) {
            return decodeURIComponent(cookie.substring(AUTH_TOKEN_COOKIE_NAME.length + 1));
        }
    }
    return null;
};
