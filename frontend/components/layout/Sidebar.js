"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthContext";
import { useLanguage } from "@/providers/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Users, 
  Brain, 
  CreditCard, 
  Settings,
  Building2,
  UserPlus,
  ChevronRight,
  LogOut,
  Truck
} from "lucide-react";

export default function Sidebar() {
  const path = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const isActive = (href) => path === href;

  const NavItem = ({ href, icon: Icon, label, badge }) => (
    <Link
      href={href}
      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
        isActive(href) 
          ? "bg-indigo-600 text-white" 
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>
      {badge && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-700">
          {badge}
        </span>
      )}
    </Link>
  );

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 h-screen p-4 flex flex-col">
      {/* Logo */}
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Building2 className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold text-white">SmartBiz</span>
        </Link>
      </div>

      {/* Language Switcher */}
      <div className="px-4 mb-4">
        <LanguageSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        <div className="px-4 mb-2">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('nav.main')}</span>
        </div>
        
        <NavItem href="/" icon={LayoutDashboard} label={t('sidebar.dashboard')} />
        <NavItem href="/sales" icon={Receipt} label={t('sidebar.quickSale')} />
        
        <div className="px-4 mt-6 mb-2">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('nav.management')}</span>
        </div>
        
        <NavItem href="/inventory" icon={Package} label={t('sidebar.inventory')} />
        <NavItem href="/orders" icon={Truck} label={t('sidebar.supplierOrders')} />
        <NavItem href="/customers" icon={Users} label={t('sidebar.customers')} />
        <NavItem href="/debt" icon={CreditCard} label={t('sidebar.debtTracking')} />
        
        <div className="px-4 mt-6 mb-2">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('nav.aiFeatures')}</span>
        </div>
        
        <NavItem href="/ai" icon={Brain} label={t('sidebar.aiAssistant')} />
        
        <div className="px-4 mt-6 mb-2">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('nav.account')}</span>
        </div>
        
        <NavItem href="/subscription" icon={CreditCard} label={t('sidebar.subscription')} />
        <NavItem href="/admin/settings" icon={Settings} label={t('sidebar.businessSettings')} />
        
        {user?.role === "owner" && (
          <NavItem href="/admin/users" icon={UserPlus} label={t('sidebar.manageUsers')} />
        )}
      </nav>

      {/* User Info */}
      <div className="border-t border-zinc-800 pt-4 mt-4">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
            <p className="text-xs text-zinc-500 capitalize">{user?.role || "User"}</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title={t('auth.logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
