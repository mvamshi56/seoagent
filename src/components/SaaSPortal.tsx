import React, { useState, useEffect, useRef } from "react";
import { User, LogIn, UserPlus, CreditCard, Sparkles, LogOut, CheckCircle, Shield, PlayCircle, Star, Zap } from "lucide-react";

export interface SaaSUser {
  loggedIn: boolean;
  userId: string;
  email?: string;
  plan: "Free" | "Pro" | "Enterprise";
  credits: number;
}

interface SaaSPortalProps {
  currentUser: SaaSUser;
  onUserUpdate: (user: SaaSUser) => void;
}

export function SaaSPortal({ currentUser, onUserUpdate }: SaaSPortalProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("admin@saas.com");
  const [password, setPassword] = useState("password123");
  const [authError, setAuthError] = useState("");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [message, setMessage] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const authModalRef = useRef<HTMLDivElement>(null);
  const pricingModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const trigger = document.getElementById("saas-portal-trigger");
        if (trigger && trigger.contains(event.target as Node)) {
          return;
        }
        setShowDropdown(false);
      }
      if (showAuthModal && authModalRef.current && !authModalRef.current.contains(event.target as Node)) {
        setShowAuthModal(false);
      }
      if (showPricingModal && pricingModalRef.current && !pricingModalRef.current.contains(event.target as Node)) {
        setShowPricingModal(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showDropdown, showAuthModal, showPricingModal]);

  useEffect(() => {
    // Sync status on load
    const syncUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { "x-user-id": currentUser.userId }
        });
        const data = await res.json();
        if (data.loggedIn) {
          onUserUpdate({
            loggedIn: true,
            userId: data.userId,
            email: data.email,
            plan: data.plan,
            credits: data.credits
          });
        }
      } catch (err) {
        console.error("SaaS Auth Check Error:", err);
      }
    };
    syncUser();
  }, [currentUser.userId]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/signup";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }
      localStorage.setItem("saas_userId", data.userId);
      onUserUpdate({
        loggedIn: true,
        userId: data.userId,
        email: data.email,
        plan: data.plan,
        credits: data.credits
      });
      setShowAuthModal(false);
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("saas_userId");
    onUserUpdate({
      loggedIn: false,
      userId: "public",
      plan: "Free",
      credits: 0
    });
    setShowDropdown(false);
  };

  const handleUpgrade = async (selectedPlan: "Free" | "Pro" | "Enterprise") => {
    try {
      const res = await fetch("/api/auth/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.userId
        },
        body: JSON.stringify({ plan: selectedPlan })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upgrade failed");
      }
      onUserUpdate({
        ...currentUser,
        plan: data.plan,
        credits: data.credits
      });
      setMessage(`Successfully upgraded to the ${selectedPlan} tier!`);
      setTimeout(() => setMessage(""), 4000);
      setShowPricingModal(false);
    } catch (err: any) {
      alert("Error upgrading plan: " + err.message);
    }
  };

  return (
    <div className="relative">
      {/* SaaS Ribbon / Status Indicator */}
      <div className="flex items-center gap-3">
        {currentUser.loggedIn ? (
          <div className="flex items-center gap-2">
            <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 text-[10px] font-black text-slate-700 rounded-full">
              <Zap size={10} className="text-amber-500 fill-amber-500" />
              <span>{currentUser.plan} WORKSPACE</span>
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-150 text-[10px] font-bold text-blue-700 rounded-lg font-mono">
              {currentUser.credits} CR
            </span>
          </div>
        ) : (
          <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-[10px] font-black text-amber-700 rounded-full animate-pulse">
            <Star size={10} className="text-amber-600 fill-amber-600" />
            <span>GUEST PREVIEW</span>
          </span>
        )}

        {/* Trigger Button */}
        <button
          id="saas-portal-trigger"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 text-white rounded-xl hover:bg-slate-900 shadow-sm hover:shadow active:scale-95 transition-all text-xs font-black uppercase tracking-wider shrink-0"
          title={currentUser.loggedIn ? currentUser.email : "SaaS Account"}
        >
          <User size={14} className="text-blue-400 shrink-0" />
          <span className="hidden sm:inline max-w-[120px] truncate">
            {currentUser.loggedIn ? currentUser.email?.split("@")[0] : "SaaS"}
          </span>
        </button>
      </div>

      {/* Success Notification Bar */}
      {message && (
        <div className="fixed top-24 right-6 bg-slate-900 border border-emerald-500 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle size={16} className="text-emerald-400" />
          <span className="text-xs font-bold">{message}</span>
        </div>
      )}

      {/* Dropdown Menu */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-3 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="pb-3 border-b border-slate-100 flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Account Matrix</span>
            <span className="text-sm font-extrabold text-slate-900 truncate">
              {currentUser.loggedIn ? currentUser.email : "Guest Session"}
            </span>
            <span className="text-xs text-slate-500">
              {currentUser.loggedIn ? "Separate database container ready" : "Register to persist crawls & deeper analysis"}
            </span>
          </div>

          {currentUser.loggedIn && (
            <div className="py-3 border-b border-slate-100 grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex flex-col">
                <span className="text-[9px] font-black uppercase text-slate-400">Current Plan</span>
                <span className="text-xs font-black text-blue-600 uppercase">{currentUser.plan}</span>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex flex-col">
                <span className="text-[9px] font-black uppercase text-slate-400">Crawl Credits</span>
                <span className="text-xs font-black text-slate-800 font-mono">{currentUser.credits}</span>
              </div>
            </div>
          )}

          <div className="pt-3 flex flex-col gap-1">
            {!currentUser.loggedIn ? (
              <>
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setShowAuthModal(true);
                    setShowDropdown(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 w-full text-left rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
                >
                  <LogIn size={14} className="text-slate-400" />
                  <span>Log In</span>
                </button>
                <button
                  onClick={() => {
                    setAuthMode("signup");
                    setShowAuthModal(true);
                    setShowDropdown(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 w-full text-left rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
                >
                  <UserPlus size={14} className="text-slate-400" />
                  <span>Create SaaS Account</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setShowPricingModal(true);
                    setShowDropdown(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 w-full text-left rounded-xl hover:bg-amber-50 hover:text-amber-800 text-xs font-bold text-amber-700 transition"
                >
                  <Sparkles size={14} className="text-amber-500 fill-amber-500 animate-pulse" />
                  <span>Upgrade Subscription</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 w-full text-left rounded-xl hover:bg-rose-50 hover:text-rose-600 text-xs font-bold text-slate-500 transition"
                >
                  <LogOut size={14} className="text-rose-400" />
                  <span>Logout Matrix</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300"
        >
          <div 
            ref={authModalRef}
            className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ×
            </button>

            <div className="text-center mb-6">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-2">
                <Shield size={24} />
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {authMode === "login" ? "Welcome Back to SaaS" : "Provision Multi-Tenant Account"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {authMode === "login"
                  ? "Sign in to resume secure, segregated enterprise crawls"
                  : "Register now to gain full isolated database instances immediately"}
              </p>
              
              <div className="mt-3 p-2 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Demo Preset:</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@saas.com");
                    setPassword("password123");
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wider transition"
                >
                  Fill Default Admin
                </button>
              </div>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Corporate Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Password Key
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>{authMode === "login" ? "Decrypt Session" : "Provision Container"}</span>
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              {authMode === "login" ? (
                <>
                  New to Enterprise SaaS?{" "}
                  <button type="button" onClick={() => setAuthMode("signup")} className="text-blue-600 hover:underline font-bold">
                    Create secure space
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button type="button" onClick={() => setAuthMode("login")} className="text-blue-600 hover:underline font-bold">
                    Log in here
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pricing / Booking subscription Modal */}
      {showPricingModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300"
        >
          <div 
            ref={pricingModalRef}
            className="bg-slate-50 border border-slate-200 w-full max-w-4xl rounded-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setShowPricingModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-600 text-2xl font-bold"
            >
              ×
            </button>

            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 text-[9px] font-black text-amber-700 rounded-full mb-2">
                <Sparkles size={10} className="fill-amber-500" />
                <span>SAAS MONETIZATION MATRIX</span>
              </span>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                Choose Your Strategy Plan
              </h3>
              <p className="text-sm text-slate-500 max-w-lg mx-auto mt-1">
                Segregate crawl speed, deep searches, and token allocations with specialized server limits.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Plan 1: Free */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col min-h-[400px] hover:shadow-lg transition-all relative">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Standard</span>
                <h4 className="text-xl font-extrabold text-slate-800 mb-2">Free Starter</h4>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black text-slate-900">$0</span>
                  <span className="text-xs font-bold text-slate-400">/ forever</span>
                </div>
                <div className="mb-6 space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span>Isolated workspace</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span>Max 20 pages per audit</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span>Depth Level 2 cap</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                    <span>100 initial credits</span>
                  </div>
                </div>
                <button
                  onClick={() => handleUpgrade("Free")}
                  disabled={currentUser.plan === "Free"}
                  className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                    currentUser.plan === "Free"
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "bg-slate-800 text-white hover:bg-slate-900"
                  }`}
                >
                  {currentUser.plan === "Free" ? "Active Plan" : "Downgrade"}
                </button>
              </div>

              {/* Plan 2: Pro */}
              <div className="bg-white border-2 border-blue-600 shadow-xl rounded-2xl p-5 flex flex-col min-h-[400px] relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                  MOST POPULAR Choice
                </div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Growth Expansion</span>
                <h4 className="text-xl font-extrabold text-slate-800 mb-2">Agency Premium</h4>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black text-slate-900">$29</span>
                  <span className="text-xs font-bold text-slate-400">/ month</span>
                </div>
                <div className="mb-6 space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500 fill-emerald-50" />
                    <span>Isolated workspace</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500 fill-emerald-50" />
                    <span className="font-bold">Max 150 pages per audit</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500 fill-emerald-50" />
                    <span>Depth Level 10 cap</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500 fill-emerald-50" />
                    <span className="font-bold">500 monthly crawl credits</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500 fill-emerald-50" />
                    <span>Advanced AI Strategy Reports</span>
                  </div>
                </div>
                <button
                  onClick={() => handleUpgrade("Pro")}
                  disabled={currentUser.plan === "Pro"}
                  className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                    currentUser.plan === "Pro"
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95"
                  }`}
                >
                  {currentUser.plan === "Pro" ? "Active Pro Plan" : "Upgrade to Pro"}
                </button>
              </div>

              {/* Plan 3: Enterprise */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col min-h-[400px] hover:shadow-lg transition-all relative">
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest leading-none mb-1">Corporate Suite</span>
                <h4 className="text-xl font-extrabold text-slate-800 mb-2">Unbounded Elite</h4>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black text-slate-900">$99</span>
                  <span className="text-xs font-bold text-slate-400">/ month</span>
                </div>
                <div className="mb-6 space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span>Isolated workspace</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span className="font-bold">Uncapped page audits</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span>Depth Level 100 maximum</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span className="font-bold">2,000 monthly credits</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span>AI Assistant Integration (unlimited)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span>PDF / Report Generators unlocked</span>
                  </div>
                </div>
                <button
                  onClick={() => handleUpgrade("Enterprise")}
                  disabled={currentUser.plan === "Enterprise"}
                  className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                    currentUser.plan === "Enterprise"
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "bg-purple-600 text-white hover:bg-purple-700 active:scale-95"
                  }`}
                >
                  {currentUser.plan === "Enterprise" ? "Active Enterprise" : "Upgrade to Elite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
