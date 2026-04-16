// Organization model — tenant root.
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export interface OrganizationAttrs {
  name: string;
  slug: string;
}

export interface OrganizationDoc extends OrganizationAttrs {
  createdAt: Date;
  updatedAt: Date;
}

type OrganizationHydrated = HydratedDocument<OrganizationDoc>;

const organizationSchema = new Schema<OrganizationDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  },
  { timestamps: true },
);

export const OrganizationModel: Model<OrganizationDoc> = model<OrganizationDoc>(
  'Organization',
  organizationSchema,
);

export type { OrganizationHydrated };
