import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    spaceId: { type: String, required: true, ref: "Space", index: true },
    userId: { type: String, required: true, ref: "User", index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    learningGoal: { type: String, required: true, trim: true },
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

projectSchema.index({ userId: 1, spaceId: 1 });

projectSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);

