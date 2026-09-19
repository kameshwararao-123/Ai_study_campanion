import mongoose from "mongoose";

const persistentLearnerContextSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    projectId: { type: String, required: true, unique: true, ref: "Project", index: true },
    userId: { type: String, required: true, ref: "User", index: true },
    goals: { type: String, default: "[]" },
    preferences: { type: String, default: "{}" },
    strengths: { type: String, default: "[]" },
    weaknesses: { type: String, default: "[]" },
    repeatedMistakes: { type: String, default: "[]" },
    summary: { type: String, default: null },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
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

persistentLearnerContextSchema.index({ userId: 1, projectId: 1 });

persistentLearnerContextSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const PersistentLearnerContext =
  mongoose.models.PersistentLearnerContext ||
  mongoose.model("PersistentLearnerContext", persistentLearnerContextSchema);

