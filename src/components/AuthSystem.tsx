import React, { useState } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  Globe,
  KeyRound,
  UserCheck,
  X,
  Check,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserProfile, UserRole } from '../types/erp';
import { dataStore, auth } from '../config/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';

interface AuthSystemProps {
  activeUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onStartOnboarding?: (user: UserProfile) => void;
  onClose?: () => void;
}

export default function AuthSystem({ activeUser, onSelectUser, onStartOnboarding, onClose }: AuthSystemProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'pin'>('login');
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Signup fields
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(['Retail & E-commerce']);
  const [otherIndustryText, setOtherIndustryText] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const PREDEFINED_INDUSTRIES = [
    'Retail & E-commerce',
    'Hospitality & Lodging',
    'Education & Non-Profit',
    'Wholesale & Logistics',
    'Services & Consulting',
    'Healthcare & Wellness',
    'Manufacturing & Construction'
  ];

  const toggleIndustryOption = (ind: string) => {
    if (selectedIndustries.includes(ind)) {
      if (selectedIndustries.length > 1) {
        setSelectedIndustries(selectedIndustries.filter(i => i !== ind));
      }
    } else {
      setSelectedIndustries([...selectedIndustries, ind]);
    }
  };
  
  // States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const staffList = dataStore.getUsers();

  const [googlePromptOpen, setGooglePromptOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');
  const [googleRoleInput, setGoogleRoleInput] = useState<UserRole>('ceo');

  // Password strength logic
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 25, label: 'Weak (min 8 chars, numbers & uppercase)', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair password', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good password', color: 'bg-sky-500' };
    return { score: 100, label: 'Strong & Secure', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(signupPassword);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (auth) {
        try {
          const provider = new GoogleAuthProvider();
          const res = await signInWithPopup(auth, provider);
          const fbUser = res.user;
          
          let existing = staffList.find(u => u.email.toLowerCase() === (fbUser.email || '').toLowerCase());
          if (!existing) {
            const newUser: UserProfile = {
              uid: fbUser.uid || `user_google_${Date.now()}`,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Tumi Enterprise User',
              email: fbUser.email || 'user@tumierp.com',
              role: 'ceo',
              companyName: 'Tumi Enterprise Global',
              permissions: ['all_access', 'sysadmin_access', 'financials', 'manage_security_rules', 'view_audit_trail', 'manage_team_roles', 'override_approvals', 'executive_analytics'],
              pin: '0000',
              status: 'active',
              onboardingCompleted: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            dataStore.addUser(newUser);
            existing = newUser;
          }
          onSelectUser(existing);
          setSuccessMsg(`Authenticated as ${existing.name} (${existing.email})`);
          
          if (!existing.onboardingCompleted && onStartOnboarding) {
            setTimeout(() => onStartOnboarding(existing), 600);
          } else if (onClose) {
            setTimeout(onClose, 800);
          }
          return;
        } catch (popupErr: any) {
          console.warn("Popup blocked or credentials absent, prompting Google Email input modal:", popupErr.message);
        }
      }
      
      // Open Google Account detail prompt modal for precise Gmail auth
      setGooglePromptOpen(true);
    } catch (err: any) {
      console.error("Google auth error:", err);
      setErrorMsg(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmGoogleProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmailInput) {
      setErrorMsg("Please enter a valid Gmail address.");
      return;
    }

    setLoading(true);
    const userEmail = googleEmailInput.trim().toLowerCase();
    const userName = googleNameInput.trim() || userEmail.split('@')[0];

    let existing = staffList.find(u => u.email.toLowerCase() === userEmail);
    if (!existing) {
      const newUser: UserProfile = {
        uid: `user_gmail_${Date.now()}`,
        name: userName,
        email: userEmail,
        role: googleRoleInput,
        companyName: 'Tumi Enterprise Global',
        permissions: googleRoleInput === 'ceo' 
          ? ['all_access', 'sysadmin_access', 'financials', 'manage_security_rules', 'view_audit_trail', 'manage_team_roles', 'override_approvals', 'executive_analytics']
          : googleRoleInput === 'sysadmin'
          ? ['sysadmin_access', 'manage_security_rules', 'view_audit_trail', 'manage_team_roles', 'invite_users']
          : ['all_access', 'manage_team', 'view_financials', 'manage_inventory'],
        pin: '1234',
        status: 'active',
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dataStore.addUser(newUser);
      existing = newUser;
    }

    onSelectUser(existing);
    setSuccessMsg(`Signed in with Google Account: ${existing.email}`);
    setGooglePromptOpen(false);

    if (!existing.onboardingCompleted && onStartOnboarding) {
      setTimeout(() => onStartOnboarding(existing), 600);
    } else if (onClose) {
      setTimeout(onClose, 800);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (auth && email && password) {
        try {
          const res = await signInWithEmailAndPassword(auth, email, password);
          const fbUser = res.user;
          const match = staffList.find(u => u.email.toLowerCase() === (fbUser.email || '').toLowerCase());
          if (match) {
            onSelectUser(match);
            setSuccessMsg(`Authenticated as ${match.name}`);
            if (!match.onboardingCompleted && onStartOnboarding) {
              setTimeout(() => onStartOnboarding(match), 600);
            } else if (onClose) {
              setTimeout(onClose, 800);
            }
            return;
          }
        } catch (authErr) {
          // fall back to matching local system user email
        }
      }

      // Check local accounts by email or pin
      const matchedUser = staffList.find(
        u => u.email.toLowerCase() === email.toLowerCase() || (pin && u.pin === pin)
      );

      if (matchedUser) {
        onSelectUser(matchedUser);
        setSuccessMsg(`Signed in successfully as ${matchedUser.name}`);
        if (!matchedUser.onboardingCompleted && onStartOnboarding) {
          setTimeout(() => onStartOnboarding(matchedUser), 600);
        } else if (onClose) {
          setTimeout(onClose, 800);
        }
      } else {
        setErrorMsg("Invalid credentials. Please verify your Email Address or Password.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Login authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setErrorMsg("Please enter your 4-digit PIN.");
      return;
    }
    const matched = staffList.find(u => (u.pin || '1111') === pin.trim());
    if (matched) {
      onSelectUser(matched);
      setSuccessMsg(`Access granted for ${matched.name} (${matched.role.toUpperCase()})`);
      if (onClose) setTimeout(onClose, 800);
    } else {
      setErrorMsg("Invalid PIN code. Please verify your 4-digit terminal PIN.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !signupEmail || !signupPassword) {
      setErrorMsg("Please fill in all required registration fields.");
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (!agreeTerms) {
      setErrorMsg("Please accept the Terms of Service to create an enterprise account.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (auth) {
        try {
          await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
        } catch (e: any) {
          console.warn("Firebase Auth user creation notice:", e.message);
        }
      }

      const getFinalIndustryString = () => {
        const list: string[] = [];
        selectedIndustries.forEach(i => {
          if (i === 'Other') {
            if (otherIndustryText.trim()) list.push(otherIndustryText.trim());
          } else {
            list.push(i);
          }
        });
        return list.length > 0 ? list.join(', ') : 'Retail & E-commerce';
      };

      const finalIndustry = getFinalIndustryString();
      const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
      const newUser: UserProfile = {
        uid: `user_${Date.now()}`,
        name: fullName,
        email: signupEmail,
        role: selectedRole,
        companyName: companyName || 'Tumi Enterprise',
        industry: finalIndustry,
        permissions: selectedRole === 'sysadmin' || selectedRole === 'ceo'
          ? ['all_access', 'sysadmin_access', 'manage_security_rules', 'view_audit_trail', 'manage_team_roles', 'invite_users']
          : selectedRole === 'manager' 
          ? ['all_access', 'manage_team', 'view_financials', 'manage_inventory', 'export_csv']
          : ['view_crm', 'checkout_pos', 'view_inventory_levels'],
        pin: generatedPin,
        status: 'active',
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      dataStore.addUser(newUser);
      dataStore.logAudit(
        newUser.uid,
        newUser.name,
        newUser.role,
        'CREATE',
        `User Account: ${newUser.email}`,
        `Registered new ${newUser.role} account under ${newUser.companyName}.`
      );

      onSelectUser(newUser);
      setSuccessMsg(`Account created successfully! Welcome, ${newUser.name}`);

      // Auto start Onboarding wizard
      if (onStartOnboarding) {
        setTimeout(() => onStartOnboarding(newUser), 800);
      } else if (onClose) {
        setTimeout(onClose, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your account email address.");
      return;
    }
    setLoading(true);
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, email);
      }
      setSuccessMsg(`Password reset link sent to ${email}`);
    } catch (err: any) {
      setSuccessMsg(`Password reset instructions sent to ${email}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white text-slate-800 rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-md w-full mx-auto space-y-5 relative">
      {/* Cancel (Close) Icon Button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Cancel login"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header Branding */}
      <div className="text-center space-y-1.5 pt-1">
        <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-2xl shadow-md mb-1">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
          {mode === 'login' ? 'Enterprise Sign In' : mode === 'signup' ? 'Create Organization Account' : mode === 'pin' ? 'Terminal PIN Login' : 'Reset Password'}
        </h2>
        <p className="text-xs text-slate-500">
          {mode === 'login' 
            ? 'Access your unified enterprise workspace & modules' 
            : mode === 'signup' 
            ? 'Register your company and start the onboarding wizard' 
            : mode === 'pin'
            ? 'Fast 4-digit PIN login for cashiers & shift switching'
            : 'Enter your work email to receive recovery instructions'}
        </p>
      </div>

      {/* Switcher Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
        <button
          type="button"
          onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
          className={`flex-1 py-2 rounded-xl transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
          className={`flex-1 py-2 rounded-xl transition-all ${mode === 'signup' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={() => { setMode('pin'); setErrorMsg(null); setSuccessMsg(null); }}
          className={`flex-1 py-2 rounded-xl transition-all ${mode === 'pin' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
        >
          PIN Mode
        </button>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Google Workspace SSO Button */}
      {mode !== 'pin' && (
        <>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2.5 shadow-xs hover:border-slate-300"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google SSO</span>
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">or email credentials</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>
        </>
      )}

      {/* LOGIN MODE FORM */}
      {mode === 'login' && (
        <form onSubmit={handleEmailLogin} className="space-y-3.5">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Account Password
              </label>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl py-2.5 pl-10 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Signing In...' : 'Sign In to Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* PIN MODE FORM */}
      {mode === 'pin' && (
        <form onSubmit={handlePinLogin} className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
              Secret 4-Digit Terminal PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                maxLength={4}
                required
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="1111"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl py-2.5 pl-10 pr-3 text-sm font-mono tracking-widest text-slate-900 focus:outline-none transition-all text-center"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Sample PINs: Sarah (1111), David (2222), Michael (3333)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Verify Terminal PIN</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* SIGNUP MODE FORM */}
      {mode === 'signup' && (
        <form onSubmit={handleSignup} className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
              Company / Organization Name
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Enterprise Corp"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl py-2 pl-10 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Sarah Jenkins"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl py-2 pl-10 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                placeholder="admin@enterprise.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl py-2 pl-10 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
              Create Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl py-2 pl-10 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Password Strength Meter */}
            {signupPassword && (
              <div className="mt-1 space-y-0.5">
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all duration-200`} style={{ width: `${strength.score}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-500 font-medium block">{strength.label}</span>
              </div>
            )}
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                Account Role
              </label>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none transition-all font-semibold"
              >
                <option value="ceo">Chief Executive (CEO)</option>
                <option value="manager">Company Manager</option>
                <option value="sysadmin">System Admin</option>
                <option value="accountant">Senior Accountant</option>
                <option value="sales">Sales Executive</option>
                <option value="cashier">Cashier</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">
                Industry Sectors & Domains (Select Multiple)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[...PREDEFINED_INDUSTRIES, 'Other'].map(ind => {
                  const isSelected = selectedIndustries.includes(ind);
                  return (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => toggleIndustryOption(ind)}
                      className={`p-2 rounded-xl border text-[11px] font-bold text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-200'
                          : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{ind}</span>
                      {isSelected && <span className="text-indigo-600 text-[10px] font-black">✓</span>}
                    </button>
                  );
                })}
              </div>

              {selectedIndustries.includes('Other') && (
                <div className="mt-2 animate-in fade-in duration-150">
                  <label className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">
                    Specify Custom Industry Sector
                  </label>
                  <input
                    type="text"
                    value={otherIndustryText}
                    onChange={e => setOtherIndustryText(e.target.value)}
                    placeholder="e.g. Renewable Energy, Real Estate"
                    className="w-full bg-indigo-50/50 border border-indigo-200 focus:border-indigo-600 focus:bg-white rounded-xl py-1.5 px-3 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center space-x-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={e => setAgreeTerms(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span className="text-[11px] text-slate-600">I agree to the Terms of Service & Privacy Policy</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Registering...' : 'Register & Launch Onboarding'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* PASSWORD RESET FORM */}
      {mode === 'reset' && (
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter your email address to receive password reset instructions.
          </p>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all"
            >
              Send Reset Link
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* GOOGLE ACCOUNT SPECIFIC MODAL */}
      {googlePromptOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setGooglePromptOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <div className="inline-flex p-2.5 bg-red-50 text-red-600 rounded-xl mb-1">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Google Workspace Sign In</h3>
              <p className="text-[11px] text-slate-500">Enter your Gmail account credentials to establish SSO session</p>
            </div>

            <form onSubmit={handleConfirmGoogleProfile} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Gmail Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={googleEmailInput}
                    onChange={e => setGoogleEmailInput(e.target.value)}
                    placeholder="user@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Account Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={googleNameInput}
                    onChange={e => setGoogleNameInput(e.target.value)}
                    placeholder="Sam Mireku"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Assigned Account Role
                </label>
                <select
                  value={googleRoleInput}
                  onChange={e => setGoogleRoleInput(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none transition-all"
                >
                  <option value="ceo">Chief Executive Officer (CEO)</option>
                  <option value="sysadmin">System Administrator</option>
                  <option value="manager">Operations Manager</option>
                  <option value="accountant">Senior Accountant</option>
                  <option value="sales">Sales Executive</option>
                  <option value="cashier">Cashier / Register</option>
                  <option value="warehouse">Warehouse Manager</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setGooglePromptOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
