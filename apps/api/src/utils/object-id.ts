import { Types } from 'mongoose';
import { errors } from './errors.js';

export function assertObjectId(value: string, fieldLabel: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw errors.validation(`${fieldLabel} is not a valid ObjectId`);
  }
  return new Types.ObjectId(value);
}
