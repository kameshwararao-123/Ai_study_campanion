import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    projectId: { type: String, required: true, ref: "Project", index: true },
    userId: { type: String, required: true, ref: "User" },
    conceptId: { type: String, ref: "Concept", default: null },
    title: { type: String, required: true },
    message: { type: String, required: true },
    actionType: { type: String, required: true },
    actionTargetId: { type: String, default: null },
    status: {
      type: String,
      default: "ACTIVE",
      enum: ["ACTIVE", "COMPLETED", "DISMISSED"],
    },
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

recommendationSchema.index({ projectId: 1, status: 1 });

recommendationSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const Recommendation =
  mongoose.models.Recommendation || mongoose.model("Recommendation", recommendationSchema);

