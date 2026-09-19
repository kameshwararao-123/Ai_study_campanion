import mongoose from "mongoose";

const learningMaterialSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    projectId: { type: String, required: true, ref: "Project", index: true },
    userId: { type: String, required: true, ref: "User", index: true },
    filename: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    fileHash: { type: String, default: null, index: true },
    pageCount: { type: Number, default: 0 },
    status: {
      type: String,
      default: "QUEUED",
      enum: ["QUEUED", "PROCESSING", "READY", "FAILED"],
    },
    errorMessage: { type: String, default: null },
    metadata: { type: String, default: null }, // JSON string with content counts & extraction stats
    retryCount: { type: Number, default: 0 },
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

learningMaterialSchema.index({ projectId: 1, userId: 1 });
learningMaterialSchema.index({ projectId: 1, fileHash: 1 });
learningMaterialSchema.index({ projectId: 1, status: 1 });

learningMaterialSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const LearningMaterial =
  mongoose.models.LearningMaterial || mongoose.model("LearningMaterial", learningMaterialSchema);
