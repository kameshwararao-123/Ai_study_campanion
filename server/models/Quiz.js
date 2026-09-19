import mongoose from "mongoose";

const quizSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    projectId: { type: String, required: true, ref: "Project", index: true },
    userId: { type: String, required: true, ref: "User", index: true },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      default: "IN_PROGRESS",
      enum: ["IN_PROGRESS", "COMPLETED"],
    },
    score: { type: Number, default: null },
    totalQuestions: { type: Number, required: true },
    completedAt: { type: Date, default: null },
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

quizSchema.index({ projectId: 1, userId: 1 });

quizSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);

