// tasks-agent — Kanban board powered by @dnd-kit.
import { useMemo, useState, type JSX } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Select, Skeleton } from '@orgflow/ui';
import type { TaskResponseDto, TaskStatus } from '@orgflow/shared-types';
import { useProjects } from '../projects/useProjects.js';
import { useTasks, useUpdateTask, type ListTasksFilters } from './useTasks.js';

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

export function KanbanPage(): JSX.Element {
  const [projectId, setProjectId] = useState<string>('');
  const filters: ListTasksFilters = projectId === '' ? {} : { projectId };

  const projectsQuery = useProjects();
  const tasksQuery = useTasks(filters);
  const updateTask = useUpdateTask();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const grouped = useMemo(() => {
    const groups: Record<TaskStatus, TaskResponseDto[]> = {
      todo: [],
      'in-progress': [],
      done: [],
    };
    for (const task of tasksQuery.data ?? []) {
      groups[task.status].push(task);
    }
    return groups;
  }, [tasksQuery.data]);

  const projectOptions = useMemo(() => {
    const items = projectsQuery.data ?? [];
    return [
      { value: '', label: 'All projects' },
      ...items.map((p) => ({ value: p.id, label: p.title })),
    ];
  }, [projectsQuery.data]);

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over === null) return;
    const targetStatus = over.id as TaskStatus;
    const taskId = String(active.id);
    const task = (tasksQuery.data ?? []).find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;
    updateTask.mutate({ id: taskId, input: { status: targetStatus } });
  };

  if (tasksQuery.isLoading) return <Skeleton className="h-64" />;
  if (tasksQuery.isError) {
    return (
      <ErrorState
        title="Failed to load tasks"
        description={tasksQuery.error.message}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void tasksQuery.refetch();
            }}
          >
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Kanban</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Drag cards to update status.</p>
        </div>
        <div className="w-64">
          <Field label="Project" htmlFor="kanban-project">
            <Select
              id="kanban-project"
              value={projectId}
              options={projectOptions}
              onChange={(e) => {
                setProjectId(e.target.value);
              }}
            />
          </Field>
        </div>
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <Column key={col.id} status={col.id} label={col.label} tasks={grouped[col.id]} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

interface ColumnProps {
  status: TaskStatus;
  label: string;
  tasks: TaskResponseDto[];
}

function Column({ status, label, tasks }: ColumnProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${label} column`}
      className={`flex min-h-[200px] flex-col gap-2 rounded-lg border p-3 transition-colors ${
        isOver
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
          : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
      }`}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{label}</h2>
        <Badge>{tasks.length}</Badge>
      </header>
      {tasks.length === 0 ? (
        <EmptyState title="No tasks" />
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <DraggableTaskCard task={task} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DraggableTaskCard({ task }: { task: TaskResponseDto }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{task.title}</span>
            <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {task.dueDate !== null ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
            </span>
            {task.overdue ? <span className="font-medium text-rose-600">Overdue</span> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

function priorityTone(p: 'low' | 'medium' | 'high'): 'default' | 'info' | 'warning' | 'danger' {
  if (p === 'high') return 'danger';
  if (p === 'medium') return 'warning';
  return 'info';
}
