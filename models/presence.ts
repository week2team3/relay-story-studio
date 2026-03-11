import { Model, Schema, model, models, Types } from "mongoose";

export type PresenceDocument = {
  _id: Types.ObjectId;
  canvasId: Types.ObjectId;
  userId: Types.ObjectId;
  nickname: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const presenceSchema = new Schema<PresenceDocument>(
  {
    canvasId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Canvas",
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User"
    },
    nickname: {
      type: String,
      required: true,
      trim: true
    },
    lastSeenAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

presenceSchema.index({ canvasId: 1, userId: 1 }, { unique: true });
presenceSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 30 });

export const PresenceModel =
  (models.Presence as Model<PresenceDocument> | undefined) ??
  model<PresenceDocument>("Presence", presenceSchema);
