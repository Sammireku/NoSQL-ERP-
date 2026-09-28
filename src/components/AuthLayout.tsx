import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  ShieldAlert, 
  User, 
  Mail, 
  Key, 
  Loader2, 
  CheckCircle2, 
  LogOut,
  Building2,
  Users,
  Compass
} from 'lucide-react';
import { UserProfile, UserRole } from '../types/erp';
import { auth, sandboxMode, dataStore } from '../config/firebase';

import AuthSystem from './AuthSystem';

interface AuthLayoutProps {
  activeUser: UserProfile;
  onChangeUser: (uid: string) => void;
  onStartOnboarding?: (user: UserProfile) => void;
  staffList: UserProfile[];
  children: React.ReactNode;
}

// 1. Protected Route Wrapper Component
interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  userRole: UserRole;
  userRoles?: UserRole[];
  componentName: string;
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, userRole, userRoles, componentName, children }: ProtectedRouteProps) {
  // Look up current active user to see if they have multiple roles
  const activeUid = localStorage.getItem('erp_active_user_uid');
  const users = dataStore.getUsers();
  const matchedUser = users.find(u => u.uid === activeUid);
  const roles = matchedUser?.roles || userRoles || [userRole];
  const isAuthorized = userRole === 'ceo' || roles.includes('ceo') || roles.some(r => allowedRoles.includes(r));

  if (!isAuthorized) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs flex flex-col items-center text-center max-w-2xl mx-auto my-12 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-full mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">Requires permission: {allowedRoles.map(r => r.toUpperCase()).join(' or ')}</p>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 my-5 text-left w-full space-y-2">
          <p className="font-semibold text-slate-700">Access Control Details:</p>
          <p>
            Your current account role is <code className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">{userRole.toUpperCase()}</code>. 
            The <code className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">{componentName}</code> module is restricted to authorized roles.
          </p>
        </div>

        <p className="text-xs text-slate-500 leading-normal max-w-md">
          To access this area, please log in with an administrator or authorized account.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

// 2. Main Authentication Layout & Login Portal
export default function AuthLayout({ activeUser, onChangeUser, onStartOnboarding, staffList, children }: AuthLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setLoginError(null);

    // If real Firebase Auth is configured, login via Firebase Auth SDK
    if (auth) {
      try {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const tokenResult = await userCredential.user.getIdTokenResult();
        
        const roleClaim = tokenResult.claims.role as string || 'cashier';
        const matched = staffList.find(s => s.email.toLowerCase() === email.toLowerCase());
        if (matched) {
          onChangeUser(matched.uid);
        } else {
          const tempUser: UserProfile = {
            uid: userCredential.user.uid,
            name: userCredential.user.displayName || email.split('@')[0],
            email: email,
            role: roleClaim as any,
            permissions: roleClaim === 'manager' || roleClaim === 'sysadmin' ? ['all_access'] : ['view_crm'],
            ai_skills_match_score: 85,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          staffList.push(tempUser);
          onChangeUser(tempUser.uid);
        }
        setIsAuthenticated(true);
      } catch (err: any) {
        console.error("Firebase Login Error:", err);
        setLoginError(err.message || "Invalid credentials.");
      } finally {
        setLoading(false);
      }
    } else {
      setTimeout(() => {
        const matched = staffList.find(s => s.email.toLowerCase() === email.toLowerCase());
        if (matched) {
          onChangeUser(matched.uid);
          setIsAuthenticated(true);
        } else {
          setLoginError("Invalid email or password. Please try again or create a new user account.");
        }
        setLoading(false);
      }, 500);
    }
  };

  const handleSignOut = () => {
    if (auth) {
      auth.signOut().then(() => {
        setIsAuthenticated(false);
      });
    } else {
      setIsAuthenticated(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-800">
        <AuthSystem 
          activeUser={activeUser}
          onSelectUser={(user) => {
            onChangeUser(user.uid);
            setIsAuthenticated(true);
          }}
          onStartOnboarding={onStartOnboarding}
        />
      </div>
    );
  }

  // Once authenticated, render dashboard interface cleanly without clutter
  return (
    <div className="flex-1 flex flex-col w-full">
      {children}
    </div>
  );
}
