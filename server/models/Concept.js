import mongoose from "mongoose";

const conceptSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    projectId: { type: String, required: true, ref: "Project", index: true },
    userId: { type: String, required: true, ref: "User" },
    name: { type: String, required: true, trim: true },
    definition: { type: String, required: true, trim: true },
    sourceMaterialId: { type: String, default: null },
    sourcePage: { type: Number, default: null },
    importanceScore: { type: Number, default: 1.0 },
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

conceptSchema.index({ projectId: 1, name: 1 });

conceptSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const Concept = mongoose.models.Concept || mongoose.model("Concept", conceptSchema);

