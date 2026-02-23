"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthContext";
import { useLanguage } from "@/providers/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Bell, Search, User } from "lucide-react";

const pageTitles = {
  "/": "Dashboard",
  "/sales": "Sales",
  "/sales/history": "Sales History",
  "/inventory": "Inventory",
  "/inventory/add": "Add Stock",
  "/debt": "Debts",
  "/ai": "AI Assistant",
  "/customers": "Customers",
  "/settings": "Settings",
  "/subscription": "Subscription",
  "/admin": "Admin Panel",
};

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  const title = pageTitles[pathname] || "SmartBiz";

  return (
    <header className="h-16 bg-zinc-900/50 backdrop-blur-lg border-b border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Page Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-white hidden sm:block">
          {title}
        </h1>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder={t('header.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User Menu */}
        <div className="flex items-center gap-3 pl-3 border-l border-zinc-800">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-white capitalize">
              {user?.role?.replace("_", " ") || "User"}
            </p>
            <p className="text-xs text-zinc-500">
              {t('header.businessOwner')}
            </p>
          </div>
          <button className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <User size={18} className="text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}
