import mongoose from "mongoose";

const tutorSessionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    projectId: { type: String, required: true, ref: "Project", index: true },
    userId: { type: String, required: true, ref: "User", index: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: null },
  },
  {
    timestamps: true,
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

tutorSessionSchema.index({ projectId: 1, userId: 1 });

tutorSessionSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const TutorSession =
  mongoose.models.TutorSession || mongoose.model("TutorSession", tutorSessionSchema);

