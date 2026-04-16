// Team model — scoped to an organization. Optional leaderId.
import { Schema, type Types, model, type HydratedDocument, type Model } from 'mongoose';

export interface TeamDoc {
  organizationId: Types.ObjectId;
  name: string;
  description: string | null;
  leaderId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<TeamDoc>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    leaderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

teamSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const TeamModel: Model<TeamDoc> = model<TeamDoc>('Team', teamSchema);
export type TeamHydrated = HydratedDocument<TeamDoc>;
