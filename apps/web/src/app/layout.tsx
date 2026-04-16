// Application shell — top navbar + left sidebar + content area.
import type { JSX } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Bell,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageCircle,
  SquareKanban,
  Users,
  Building2,
  Folder,
} from 'lucide-react';
import { cn } from '@orgflow/ui';
import { ThemeToggle } from '../features/theme/ThemeToggle.js';
import { authStorage } from '../features/auth/storage.js';
import { useNavigate } from 'react-router-dom';

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
];

export function AppLayout(): JSX.Element {
  const profile = authStorage.getProfile();
  const navigate = useNavigate();
  const visibleItems = navItems.filter((item) =>
    profile === null ? false : item.roles.includes(profile.role),
  );

  const handleLogout = (): void => {
    authStorage.clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:flex">
        <div className="mb-6 text-lg font-semibold">OrgFlow AI</div>
        <nav className="flex flex-col gap-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {profile === null ? 'Not signed in' : `${profile.displayName} · ${profile.role}`}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {profile !== null && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogOut size={14} />
                Sign out
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
