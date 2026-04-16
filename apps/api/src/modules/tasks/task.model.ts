// Task model — scoped to project (which is scoped to team + org).
import { Schema, type Types, model, type HydratedDocument, type Model } from 'mongoose';
import type { TaskPriority, TaskStatus } from '@orgflow/shared-types';

export interface TaskDoc {
  organizationId: Types.ObjectId;
  teamId: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description: string | null;
  assignedTo: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDoc>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'done'],
      default: 'todo',
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      required: true,
    },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true },
);

taskSchema.index({ projectId: 1, status: 1 });

export const TaskModel: Model<TaskDoc> = model<TaskDoc>('Task', taskSchema);
export type TaskHydrated = HydratedDocument<TaskDoc>;

export interface TaskCommentDoc {
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<TaskCommentDoc>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const TaskCommentModel: Model<TaskCommentDoc> = model<TaskCommentDoc>(
  'TaskComment',
  commentSchema,
);
export type TaskCommentHydrated = HydratedDocument<TaskCommentDoc>;
