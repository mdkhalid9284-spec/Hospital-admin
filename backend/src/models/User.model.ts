
import mongoose, { Schema } from 'mongoose';
import { IUser } from './types.js';

const userSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    firebaseUid: { type: String, unique: true, sparse: true, index: true },
    role: {
      type: String,
      enum: ['admin', 'doctor', 'patient', 'billing'],
      required: true,
    },
    fullName: { type: String, required: true },
    phone: String,
    avatarUrl: String,
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: String, default: null },
    lastLoginAt: { type: String, default: null },
    resetPasswordToken: { type: String, default: null, select: false },
    resetPasswordExpires: { type: String, default: null, select: false },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    versionKey: false,
    collection: 'users',
  }
);

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
