'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, Database, Github, Home, GraduationCap, Shield, Users, Brain, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/brain', label: 'Brain', icon: Brain },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/workspace', label: 'Workspace', icon: FlaskConical },
  { href: '/cohorts', label: 'Cohorts', icon: Users },
  { href: "/knowledge", label: "Knowledge", icon: Database },
  { href: "/github", label: "GitHub", icon: Github },
  { href: "/compliance", label: 'Compliance', icon: Shield },
] as const;

export function NavBar() {
  const pathname = usePathname();

  // Hide nav on classroom/generation/workspace pages
  if (
    pathname.startsWith('/classroom') ||
    pathname.startsWith('/generation-preview') ||
    pathname.startsWith('/eval') ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/practice")
  ) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-biodockify.svg" alt="BioDockify" className="h-8 w-auto" />
          <span className="font-bold text-neutral-900 dark:text-white">BioDockify Learn</span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
