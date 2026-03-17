'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  Search,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import type { Profile } from '@/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Browse Events', icon: Search },
  { href: '/alerts', label: 'My Alerts', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <aside className="w-60 border-r border-border flex flex-col bg-card min-h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          TixHound
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === href
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-muted transition-colors text-left cursor-pointer">
              <Avatar className="w-7 h-7">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{profile?.full_name ?? 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
