// User model — scoped to organization + optional team. Holds role + status +
// hashed password. Invitations reuse the same doc with status='pending' and an
// invite token.
import type { UserRole, UserStatus } from '@orgflow/shared-types';
import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserDoc {
  organizationId: Types.ObjectId;
  teamId: Types.ObjectId | null;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  passwordHash: string | null;
  inviteTokenHash: string | null;
  inviteExpiresAt: Date | null;
  themePreference: ThemePreference;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    displayName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'leader', 'member'], required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'disabled'],
      default: 'pending',
      required: true,
    },
    passwordHash: { type: String, default: null },
    inviteTokenHash: { type: String, default: null, index: true },
    inviteExpiresAt: { type: Date, default: null },
    themePreference: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
      required: true,
    },
  },
  { timestamps: true },
);

userSchema.index({ organizationId: 1, email: 1 }, { unique: true });
userSchema.index({ organizationId: 1, teamId: 1 });
// H-010: auto-clear stale invite tokens once they expire so the
// inviteTokenHash index cannot be exhausted by abandoned invitations and
// so that an attacker who later steals the DB cannot replay old tokens.
userSchema.index(
  { inviteExpiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: 'pending', inviteExpiresAt: { $ne: null } },
  },
);

export const UserModel: Model<UserDoc> = model<UserDoc>('User', userSchema);
export type UserHydrated = HydratedDocument<UserDoc>;
