'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Radar,
  History,
  Target,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  GraduationCap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { User } from '@/types'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user: User
  collapsed: boolean
  onToggleCollapse: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scan/new', label: 'New Scan', icon: Radar },
  { href: '/scans', label: 'Scan History', icon: History },
  { href: '/priority-queue', label: 'Priority Queue', icon: Target },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/tutor-leads', label: 'TutorLeads', icon: GraduationCap },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({
  user,
  collapsed,
  onToggleCollapse,
  darkMode,
  onToggleDarkMode,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-gray-200 dark:border-gray-800">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">LR</span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-gray-900 dark:text-white text-sm">LeadRadar</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-1">
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={collapsed ? (darkMode ? 'Light mode' : 'Dark mode') : undefined}
        >
          {darkMode ? <Sun size={18} className="flex-shrink-0" /> : <Moon size={18} className="flex-shrink-0" />}
          {!collapsed && <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* User info */}
        {!collapsed && (
          <div className="px-2.5 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{user.email}</p>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight size={12} className="text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronLeft size={12} className="text-gray-600 dark:text-gray-400" />
        )}
      </button>
    </aside>
  )
}
