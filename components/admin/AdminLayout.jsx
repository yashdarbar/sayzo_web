'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Menu, X } from 'lucide-react';
import { useAuth } from '@/app/Context/AuthContext';
import AdminSidebar from './AdminSidebar';

const AdminLayout = ({ children }) => {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !isAdmin) {
      router.push('/website-aaadminpanel');
    }
  }, [user, isAdmin, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#13a884] mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center px-4 mt-16">
        <button
          onClick={() => setShowMobileSidebar(true)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
        <span className="ml-4 font-semibold text-gray-800">Admin Dashboard</span>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="lg:hidden fixed left-0 top-0 h-full w-64 bg-white z-50 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span className="font-semibold text-gray-800">Menu</span>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <AdminSidebar isMobile onNavigate={() => setShowMobileSidebar(false)} />
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-32">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
