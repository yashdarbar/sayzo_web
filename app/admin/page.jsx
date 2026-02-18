"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminAuthModal from "@/components/admin/AdminAuthModal";
import { auth } from "@/lib/firebase";
import { isAdminPhone } from "@/lib/adminConfig";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if already logged in as admin
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && isAdminPhone(user.phoneNumber)) {
        // Already logged in as admin, redirect to dashboard
        router.push("/admin/dashboard");
      } else {
        setChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleAuthSuccess = (user) => {
    router.push("/admin/dashboard");
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-32">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return <AdminAuthModal onSuccess={handleAuthSuccess} />;
}
