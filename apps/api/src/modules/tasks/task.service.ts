// Tasks service. Scope via project + team + org. Members see own tasks + team
// tasks in projects where they are a project member.
import { Types, type FilterQuery } from 'mongoose';
import type { TaskCommentResponseDto, TaskResponseDto } from '@orgflow/shared-types';
import {
  TaskCommentModel,
  TaskModel,
  type TaskCommentHydrated,
  type TaskDoc,
  type TaskHydrated,
} from './task.model.js';
import { ProjectModel } from '../projects/project.model.js';
import { errors } from '../../utils/errors.js';
import type { AuthContext } from '../../middleware/auth-context.js';
import type {
  CreateCommentInput,
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from './task.schema.js';

function assertObjectId(id: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw errors.validation(`Invalid ${label}`);
  return new Types.ObjectId(id);
}

function isOverdue(doc: TaskHydrated): boolean {
  if (doc.status === 'done') return false;
  if (doc.dueDate === null) return false;
  return doc.dueDate.getTime() < Date.now();
}

function toDto(doc: TaskHydrated): TaskResponseDto {
  return {
    id: doc.id as string,
    organizationId: doc.organizationId.toString(),
    teamId: doc.teamId.toString(),
    projectId: doc.projectId.toString(),
    title: doc.title,
    description: doc.description,
    assignedTo: doc.assignedTo !== null ? doc.assignedTo.toString() : null,
    createdBy: doc.createdBy.toString(),
    status: doc.status,
    priority: doc.priority,
    dueDate: doc.dueDate !== null ? doc.dueDate.toISOString() : null,
    overdue: isOverdue(doc),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toCommentDto(doc: TaskCommentHydrated): TaskCommentResponseDto {
  return {
    id: doc.id as string,
    taskId: doc.taskId.toString(),
    userId: doc.userId.toString(),
    body: doc.body,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

interface LoadedProject {
  _id: Types.ObjectId;
  teamId: Types.ObjectId;
  memberIds: Types.ObjectId[];
}

async function loadProjectForAuth(
  auth: AuthContext,
  projectId: Types.ObjectId,
): Promise<LoadedProject> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const project = await ProjectModel.findOne({ _id: projectId, organizationId: orgId });
  if (!project) throw errors.notFound('Project not found');

  if (
    auth.role === 'leader' &&
    (auth.teamId === null || auth.teamId !== project.teamId.toString())
  ) {
    throw errors.forbidden('Project is outside your team');
  }
  if (auth.role === 'member') {
    const belongs =
      auth.teamId !== null &&
      auth.teamId === project.teamId.toString() &&
      project.memberIds.some((m) => m.toString() === auth.userId);
    if (!belongs) throw errors.forbidden('Not a project member');
  }
  return {
    _id: project._id,
    teamId: project.teamId,
    memberIds: project.memberIds,
  };
}

function canMutateTask(auth: AuthContext, doc: TaskHydrated): boolean {
  if (auth.role === 'admin') return true;
  if (auth.role === 'leader') {
    return auth.teamId !== null && auth.teamId === doc.teamId.toString();
  }
  // member: only their own assigned tasks
  return doc.assignedTo !== null && doc.assignedTo.toString() === auth.userId;
}

export async function listTasks(
  auth: AuthContext,
  query: ListTasksQuery,
): Promise<TaskResponseDto[]> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const filter: FilterQuery<TaskDoc> = { organizationId: orgId };

  if (auth.role === 'admin') {
    if (query.teamId !== undefined) filter.teamId = assertObjectId(query.teamId, 'teamId');
  } else if (auth.role === 'leader') {
    if (auth.teamId === null) return [];
    filter.teamId = new Types.ObjectId(auth.teamId);
  } else {
    if (auth.teamId === null) return [];
    filter.teamId = new Types.ObjectId(auth.teamId);
    // members: narrow to tasks assigned to them OR in projects where they belong.
    const memberProjects = await ProjectModel.find(
      { organizationId: orgId, teamId: filter.teamId, memberIds: new Types.ObjectId(auth.userId) },
      { _id: 1 },
    );
    const projectIds = memberProjects.map((p) => p._id);
    filter.$or = [
      { assignedTo: new Types.ObjectId(auth.userId) },
      { projectId: { $in: projectIds } },
    ];
  }

  if (query.projectId !== undefined)
    filter.projectId = assertObjectId(query.projectId, 'projectId');
  if (query.status !== undefined) filter.status = query.status;
  if (query.priority !== undefined) filter.priority = query.priority;
  if (query.assignedTo !== undefined)
    filter.assignedTo = assertObjectId(query.assignedTo, 'assignedTo');
  if (query.mine) filter.assignedTo = new Types.ObjectId(auth.userId);

  const docs = await TaskModel.find(filter).sort({ updatedAt: -1 }).limit(500);
  return docs.map(toDto);
}

async function loadTaskForAuth(auth: AuthContext, id: string): Promise<TaskHydrated> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const doc = await TaskModel.findOne({ _id: assertObjectId(id, 'taskId'), organizationId: orgId });
  if (!doc) throw errors.notFound('Task not found');

  if (auth.role === 'leader' && (auth.teamId === null || auth.teamId !== doc.teamId.toString())) {
    throw errors.forbidden('Task outside your team');
  }
  if (auth.role === 'member') {
    const isAssignee = doc.assignedTo !== null && doc.assignedTo.toString() === auth.userId;
    if (!isAssignee) {
      const project = await ProjectModel.findOne({ _id: doc.projectId, organizationId: orgId });
      const belongs = project?.memberIds.some((m) => m.toString() === auth.userId) ?? false;
      if (!belongs) throw errors.forbidden('Not visible to you');
    }
  }
  return doc;
}

export async function getTask(auth: AuthContext, id: string): Promise<TaskResponseDto> {
  const doc = await loadTaskForAuth(auth, id);
  return toDto(doc);
}

export async function createTask(
  auth: AuthContext,
  input: CreateTaskInput,
): Promise<TaskResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const projectId = assertObjectId(input.projectId, 'projectId');
  const project = await loadProjectForAuth(auth, projectId);

  // Only admin/leader may create; members cannot.
  if (auth.role === 'member') throw errors.forbidden('Members cannot create tasks');

  let assignedTo: Types.ObjectId | null = null;
  if (input.assignedTo !== undefined) {
    const candidate = assertObjectId(input.assignedTo, 'assignedTo');
    const belongs = project.memberIds.some((m) => m.equals(candidate));
    if (!belongs) throw errors.validation('Assignee must be a project member');
    assignedTo = candidate;
  }

  const doc = await TaskModel.create({
    organizationId: orgId,
    teamId: project.teamId,
    projectId: project._id,
    title: input.title,
    description: input.description ?? null,
    assignedTo,
    createdBy: new Types.ObjectId(auth.userId),
    status: 'todo',
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate !== undefined ? new Date(input.dueDate) : null,
  });
  return toDto(doc);
}

export async function updateTask(
  auth: AuthContext,
  id: string,
  input: UpdateTaskInput,
): Promise<TaskResponseDto> {
  const doc = await loadTaskForAuth(auth, id);
  if (!canMutateTask(auth, doc)) throw errors.forbidden('Cannot modify this task');

  // members may only transition status on their own task.
  if (auth.role === 'member') {
    const onlyStatus = Object.keys(input).length === 1 && input.status !== undefined;
    if (!onlyStatus) throw errors.forbidden('Members may only change status');
  }

  if (input.title !== undefined) doc.title = input.title;
  if (input.description !== undefined) doc.description = input.description;
  if (input.status !== undefined) doc.status = input.status;
  if (input.priority !== undefined) doc.priority = input.priority;
  if (input.dueDate !== undefined) {
    doc.dueDate = input.dueDate === null ? null : new Date(input.dueDate);
  }
  if (input.assignedTo !== undefined) {
    if (input.assignedTo === null) {
      doc.assignedTo = null;
    } else {
      const candidate = assertObjectId(input.assignedTo, 'assignedTo');
      const project = await ProjectModel.findOne({
        _id: doc.projectId,
        organizationId: doc.organizationId,
      });
      if (!project) throw errors.notFound('Project not found');
      const belongs = project.memberIds.some((m) => m.equals(candidate));
      if (!belongs) throw errors.validation('Assignee must be a project member');
      doc.assignedTo = candidate;
    }
  }
  await doc.save();
  return toDto(doc);
}

export async function deleteTask(auth: AuthContext, id: string): Promise<void> {
  const doc = await loadTaskForAuth(auth, id);
  if (auth.role === 'admin') {
    // allowed
  } else if (auth.role === 'leader') {
    if (auth.teamId === null || auth.teamId !== doc.teamId.toString()) {
      throw errors.forbidden('Cannot delete task outside your team');
    }
  } else {
    throw errors.forbidden('Members cannot delete tasks');
  }
  await doc.deleteOne();
  await TaskCommentModel.deleteMany({ taskId: doc._id });
}

export async function listComments(
  auth: AuthContext,
  taskId: string,
): Promise<TaskCommentResponseDto[]> {
  const doc = await loadTaskForAuth(auth, taskId);
  const comments = await TaskCommentModel.find({ taskId: doc._id }).sort({ createdAt: 1 });
  return comments.map(toCommentDto);
}

export async function createComment(
  auth: AuthContext,
  taskId: string,
  input: CreateCommentInput,
): Promise<TaskCommentResponseDto> {
  const doc = await loadTaskForAuth(auth, taskId);
  const comment = await TaskCommentModel.create({
    taskId: doc._id,
    userId: new Types.ObjectId(auth.userId),
    body: input.body,
  });
  return toCommentDto(comment);
}
