import type { JSX } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  Table,
  type TableColumn,
} from '@orgflow/ui';
import type {
  AdminDashboardResponseDto,
  DashboardResponseDto,
  LeaderDashboardResponseDto,
  MemberDashboardResponseDto,
} from '@orgflow/shared-types';
import { useDashboard } from './useDashboard.js';

interface StatCardProps {
  label: string;
  value: number;
  tone?: 'default' | 'danger' | 'success' | 'info';
}

function StatCard({ label, value, tone = 'default' }: StatCardProps): JSX.Element {
  const color =
    tone === 'danger'
      ? 'text-rose-600'
      : tone === 'success'
        ? 'text-emerald-600'
        : tone === 'info'
          ? 'text-brand-600'
          : 'text-slate-900 dark:text-slate-100';
  return (
    <Card>
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`text-3xl font-semibold ${color}`}>{value}</span>
      </div>
    </Card>
  );
}

export function DashboardPage(): JSX.Element {
  const dashboardQuery = useDashboard();

  if (dashboardQuery.isLoading) {
    return <Skeleton className="h-40" />;
  }
  if (dashboardQuery.isError) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        description={dashboardQuery.error.message}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void dashboardQuery.refetch();
            }}
          >
            Retry
          </Button>
        }
      />
    );
  }
  const data = dashboardQuery.data;
  if (!data) {
    return <EmptyState title="No dashboard data" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Overview scoped to your role.</p>
      </header>
      {renderByScope(data)}
    </div>
  );
}

function renderByScope(data: DashboardResponseDto): JSX.Element {
  if (data.scope === 'admin') return <AdminView data={data} />;
  if (data.scope === 'leader') return <LeaderView data={data} />;
  return <MemberView data={data} />;
}

function AdminView({ data }: { data: AdminDashboardResponseDto }): JSX.Element {
  const columns: TableColumn<AdminDashboardResponseDto['byTeam'][number]>[] = [
    { key: 'team', header: 'Team', render: (r) => r.teamName },
    { key: 'projects', header: 'Projects', align: 'right', render: (r) => r.projectCount },
    { key: 'tasks', header: 'Tasks', align: 'right', render: (r) => r.taskCount },
    {
      key: 'overdue',
      header: 'Overdue',
      align: 'right',
      render: (r) => (
        <span className={r.overdueCount > 0 ? 'font-medium text-rose-600' : ''}>
          {r.overdueCount}
        </span>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Teams" value={data.stats.teams} />
        <StatCard label="Users" value={data.stats.users} />
        <StatCard label="Projects" value={data.stats.projects} />
        <StatCard label="Tasks" value={data.stats.tasks} tone="info" />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="To do" value={data.stats.tasksTodo} />
        <StatCard label="In progress" value={data.stats.tasksInProgress} tone="info" />
        <StatCard label="Done" value={data.stats.tasksDone} tone="success" />
        <StatCard label="Overdue" value={data.stats.tasksOverdue} tone="danger" />
      </div>
      <Card title="By team">
        {data.byTeam.length === 0 ? (
          <EmptyState title="No teams yet" />
        ) : (
          <Table columns={columns} rows={data.byTeam} rowKey={(r) => r.teamId} />
        )}
      </Card>
    </div>
  );
}

function LeaderView({ data }: { data: LeaderDashboardResponseDto }): JSX.Element {
  const columns: TableColumn<LeaderDashboardResponseDto['projects'][number]>[] = [
    { key: 'title', header: 'Project', render: (p) => p.title },
    { key: 'status', header: 'Status', render: (p) => <Badge>{p.status}</Badge> },
    { key: 'tasks', header: 'Tasks', align: 'right', render: (p) => p.taskCount },
    {
      key: 'overdue',
      header: 'Overdue',
      align: 'right',
      render: (p) => (
        <span className={p.overdueCount > 0 ? 'font-medium text-rose-600' : ''}>
          {p.overdueCount}
        </span>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Team users" value={data.stats.users} />
        <StatCard label="Projects" value={data.stats.projects} />
        <StatCard label="Tasks" value={data.stats.tasks} tone="info" />
        <StatCard label="Overdue" value={data.stats.tasksOverdue} tone="danger" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="To do" value={data.stats.tasksTodo} />
        <StatCard label="In progress" value={data.stats.tasksInProgress} tone="info" />
        <StatCard label="Done" value={data.stats.tasksDone} tone="success" />
      </div>
      <Card title="Your projects">
        {data.projects.length === 0 ? (
          <EmptyState title="No projects yet" />
        ) : (
          <Table columns={columns} rows={data.projects} rowKey={(p) => p.id} />
        )}
      </Card>
    </div>
  );
}

function MemberView({ data }: { data: MemberDashboardResponseDto }): JSX.Element {
  const columns: TableColumn<MemberDashboardResponseDto['upcoming'][number]>[] = [
    { key: 'title', header: 'Title', render: (t) => t.title },
    { key: 'status', header: 'Status', render: (t) => <Badge>{t.status}</Badge> },
    { key: 'priority', header: 'Priority', render: (t) => <Badge>{t.priority}</Badge> },
    {
      key: 'due',
      header: 'Due',
      render: (t) => (
        <span className={t.overdue ? 'font-medium text-rose-600' : ''}>
          {t.dueDate !== null ? new Date(t.dueDate).toLocaleDateString() : '—'}
          {t.overdue ? ' • overdue' : ''}
        </span>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-5">
        <StatCard label="Assigned" value={data.stats.assignedTotal} />
        <StatCard label="To do" value={data.stats.assignedTodo} />
        <StatCard label="In progress" value={data.stats.assignedInProgress} tone="info" />
        <StatCard label="Done" value={data.stats.assignedDone} tone="success" />
        <StatCard label="Overdue" value={data.stats.assignedOverdue} tone="danger" />
      </div>
      <Card title="Upcoming work">
        {data.upcoming.length === 0 ? (
          <EmptyState title="Nothing on your plate" description="You're all caught up." />
        ) : (
          <Table columns={columns} rows={data.upcoming} rowKey={(t) => t.id} />
        )}
      </Card>
    </div>
  );
}
