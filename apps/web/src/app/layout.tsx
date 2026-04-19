// Application shell — top navbar + left sidebar + content area.
import { cn } from '@orgflow/ui';
import {
  Bell,
  BookOpen,
  Building2,
  Folder,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageCircle,
  SquareKanban,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState, type JSX } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useUnreadAnnouncementCount } from '../features/announcements/useAnnouncements.js';
import { authStorage } from '../features/auth/storage.js';
import { useLogout } from '../features/auth/useAuth.js';
import { ThemeToggle } from '../features/theme/ThemeToggle.js';
import { AppErrorBoundary } from './ErrorBoundary.js';

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
  roles: ('admin' | 'leader' | 'member')[];
}

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: <LayoutDashboard size={16} />,
    roles: ['admin', 'leader', 'member'],
  },
  {
    to: '/tasks',
    label: 'Tasks',
    icon: <ListChecks size={16} />,
    roles: ['admin', 'leader', 'member'],
  },
  {
    to: '/kanban',
    label: 'Kanban',
    icon: <SquareKanban size={16} />,
    roles: ['admin', 'leader', 'member'],
  },
  { to: '/projects', label: 'Projects', icon: <Folder size={16} />, roles: ['admin', 'leader'] },
  { to: '/teams', label: 'Teams', icon: <Building2 size={16} />, roles: ['admin'] },
  { to: '/users', label: 'Users', icon: <Users size={16} />, roles: ['admin'] },
  {
    to: '/announcements',
    label: 'Announcements',
    icon: <Bell size={16} />,
    roles: ['admin', 'leader', 'member'],
  },
  {
    to: '/assistant',
    label: 'AI Assistant',
    icon: <MessageCircle size={16} />,
    roles: ['admin', 'leader', 'member'],
  },
  {
    to: '/knowledge',
    label: 'Knowledge',
    icon: <BookOpen size={16} />,
    roles: ['admin'],
  },
];

export function AppLayout(): JSX.Element {
  const profile = authStorage.getProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const visibleItems = navItems.filter((item) =>
    profile === null ? false : item.roles.includes(profile.role),
  );

  const { data: unreadCount } = useUnreadAnnouncementCount();

  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logout = useLogout();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleLogout = (): void => {
    setLoggingOut(true);
    void logout().then(() => {
      navigate('/login', { replace: true });
    });
  };

  const sidebarNav = (
    <nav aria-label="Primary navigation" className="flex flex-col gap-1">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              isActive
                ? 'bg-brand-600 text-white'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )
          }
        >
          <span aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
          {item.label === 'Announcements' && unreadCount !== undefined && unreadCount > 0 && (
            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobileMenu}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeMobileMenu();
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close menu"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-slate-200 bg-white p-4 transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 md:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Mobile navigation"
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="text-lg font-semibold">OrgFlow AI</span>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>
        {sidebarNav}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden w-56 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:flex"
        aria-label="Primary"
      >
        <div className="mb-6 text-lg font-semibold">OrgFlow AI</div>
        {sidebarNav}
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(true);
              }}
              className="rounded-md p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {profile === null ? 'Not signed in' : `${profile.displayName} · ${profile.role}`}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {profile !== null && (
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-busy={loggingOut}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogOut size={14} aria-hidden="true" />
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            )}
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 p-6 focus:outline-none">
          <AppErrorBoundary>
            <Outlet />
          </AppErrorBoundary>
        </main>
      </div>
    </div>
  );
}
