import { ReactNode } from "react";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import FloatingSupport from "@/components/FloatingSupport";
import UserAccountDrawer from "@/components/UserAccountDrawer";
import AppSidebar from "@/components/AppSidebar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Bar - Minimal with User Account */}
        <header className="sticky top-0 z-40 h-14 bg-card/95 backdrop-blur-sm border-b border-border flex items-center justify-end px-6">
          <UserAccountDrawer />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <OfflineIndicator />
      <FloatingSupport />
    </div>
  );
}
