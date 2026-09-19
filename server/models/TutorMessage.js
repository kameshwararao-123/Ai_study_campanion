import mongoose from "mongoose";

const tutorMessageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    sessionId: { type: String, required: true, ref: "TutorSession", index: true },
    projectId: { type: String, required: true, ref: "Project" },
    userId: { type: String, required: true, ref: "User" },
    sender: { type: String, required: true, enum: ["USER", "ASSISTANT"] },
    content: { type: String, required: true },
    mode: {
      type: String,
      default: "NORMAL",
      enum: ["NORMAL", "EXPLAIN", "EXAMPLE", "EXPLORE", "TEST", "REVISION"],
    },
    citations: { type: String, default: null },
    metadata: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

tutorMessageSchema.index({ sessionId: 1, createdAt: 1 });

tutorMessageSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const TutorMessage =
  mongoose.models.TutorMessage || mongoose.model("TutorMessage", tutorMessageSchema);

