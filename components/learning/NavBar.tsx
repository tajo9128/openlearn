'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, Database, Github, Home, Shield, Users, Brain, FlaskConical, LogIn, UserPlus, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/brain', label: 'Brain', icon: Brain },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/workspace', label: 'Workspace', icon: FlaskConical },
  { href: '/cohorts', label: 'Cohorts', icon: Users },
  { href: '/knowledge', label: 'Knowledge', icon: Database },
  { href: '/github', label: 'GitHub', icon: Github },
  { href: '/compliance', label: 'Compliance', icon: Shield },
] as const;

export function NavBar() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('biodockify_user_id');
    const name = localStorage.getItem('biodockify_user_name');
    setUserId(id);
    setUserName(name);
  }, [pathname]); // Re-check on route change

  // Hide nav on classroom/generation/workspace/practice pages
  if (
    pathname.startsWith('/classroom') ||
    pathname.startsWith('/generation-preview') ||
    pathname.startsWith('/eval') ||
    pathname.startsWith('/workspace') ||
    pathname.startsWith('/practice')
  ) {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('biodockify_user_id');
    localStorage.removeItem('biodockify_user_name');
    setUserId(null);
    setUserName(null);
    setShowMenu(false);
    window.location.href = '/';
  };

  const handleLogin = () => {
    // Simple login: set a demo user ID (no backend auth needed for now)
    const name = prompt('Enter your name:');
    if (name) {
      const id = 'user-' + Date.now();
      localStorage.setItem('biodockify_user_id', id);
      localStorage.setItem('biodockify_user_name', name);
      setUserId(id);
      setUserName(name);
      window.location.reload();
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          
          <span className="font-bold text-neutral-900 dark:text-white hidden sm:inline">BioDockify Learn</span>
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Login/Signup or User Menu */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {userId ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  {userName?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hidden sm:inline">
                  {userName ?? 'User'}
                </span>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{userName}</p>
                    <p className="text-xs text-neutral-500">Logged in</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={handleLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </button>
              <button
                onClick={handleLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Up</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
