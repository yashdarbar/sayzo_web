"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ShieldCheck, Mail, CheckCircle } from "lucide-react";
import { sendMagicLink } from "@/lib/firebase";
import { isAdminEmail } from "@/lib/adminConfig";
import { useAuth } from "@/app/Context/AuthContext";

const AdminAuthModal = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [email, setEmail] = useState("");

  // Use centralized auth context instead of own listener
  const { user: authUser, isLoading: authLoading, logout } = useAuth();

  // Use ref to store latest onSuccess callback to avoid stale closures
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const input =
    "w-full bg-[#18181B] text-white placeholder:text-zinc-500 px-4 py-4 my-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600";

  // Safe localStorage helper
  const safeSetLocalStorage = useCallback((key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.warn("localStorage not available:", err);
    }
  }, []);

  // Watch AuthContext for user changes (when user clicks magic link)
  // This replaces the direct onAuthStateChanged listener to avoid racing with AuthContext
  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;

    const verifyAdmin = async () => {
      if (!authUser) return;

      try {
        // Double-check admin email after sign-in
        if (!isAdminEmail(authUser.email)) {
          await logout();
          if (isMounted) {
            setError("Unauthorized: This email is not authorized for admin access");
            setLinkSent(false);
          }
          return;
        }

        // Admin verified, trigger success
        onSuccessRef.current?.({
          uid: authUser.uid,
          email: authUser.email,
        });
      } catch (err) {
        console.error("Admin auth error:", err);
        if (isMounted) {
          setError("Authentication failed. Please try again.");
        }
      }
    };

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, [authUser, authLoading, logout]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (linkSent) {
      setLinkSent(false);
    }
    setError("");
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendLink = async () => {
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Check if this is admin email before sending link
    if (!isAdminEmail(email)) {
      setError("This email is not authorized for admin access");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Store return URL for after magic link sign-in
      safeSetLocalStorage("sayzo_auth_return", "/website-aaadminpanel/dashboard");
      await sendMagicLink(email);
      setLinkSent(true);
    } catch (err) {
      console.error("Magic Link Error:", err);
      // Map Firebase error codes to user-friendly messages
      const errorMessages = {
        "auth/invalid-email": "Invalid email address",
        "auth/too-many-requests": "Too many requests. Please try again later.",
        "auth/network-request-failed": "Network error. Please check your connection.",
      };
      setError(errorMessages[err.code] || "Failed to send magic link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 pt-32">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl text-white font-bold">Admin Login</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Enter your admin email to continue
          </p>
        </div>

        {/* Link Sent Success State */}
        {linkSent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl text-white font-semibold mb-2">
              Check Your Email
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              We've sent a magic link to <span className="text-white">{email}</span>. Click the link in your email to sign in. If you don't see it, please check your spam folder.
            </p>
            <button
              onClick={handleSendLink}
              disabled={loading}
              className="text-green-500 hover:text-green-400 text-sm font-medium flex items-center justify-center gap-2 mx-auto"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Resend Link
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Email Input */}
            <div className="relative">
              <input
                className={input}
                type="email"
                placeholder="Admin Email Address *"
                value={email}
                onChange={handleEmailChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && validateEmail(email)) {
                    handleSendLink();
                  }
                }}
              />
            </div>

            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

            {/* Send Link Button */}
            <button
              disabled={loading || !validateEmail(email)}
              onClick={handleSendLink}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-4 rounded-full font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Send Magic Link
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAuthModal;
