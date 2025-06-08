import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabaseService } from '../services/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  userId: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn && clerkUser) {
        // Sync with Supabase user table
        syncUserWithSupabase();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    }
  }, [isLoaded, isSignedIn, clerkUser]);

  const syncUserWithSupabase = async () => {
    if (!clerkUser) return;

    try {
      // Check if user exists in Supabase
      const existingUsers = await supabaseService.getUsers();
      let supabaseUser = existingUsers.find(u => u.email === clerkUser.primaryEmailAddress?.emailAddress);

      if (!supabaseUser) {
        // Create user in Supabase if doesn't exist
        const newUserData = {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          full_name: clerkUser.fullName || '',
          avatar_url: clerkUser.imageUrl || '',
          role: 'user',
          status: 'active' as const,
          last_active: new Date().toISOString()
        };

        supabaseUser = await supabaseService.createUser(newUserData);
        if (!supabaseUser) {
          // Fallback to local user object if creation fails
          supabaseUser = {
            ...newUserData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      }

      setUser(supabaseUser);
    } catch (error) {
      console.error('Error syncing user with Supabase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Clerk handles the sign out
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value: AuthContextType = {
    user,
    userId: user?.id || null,
    isLoading: !isLoaded || isLoading,
    isSignedIn: !!user,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};