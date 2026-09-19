import mongoose from "mongoose";

const aiTelemetryLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userId: { type: String, ref: "User", default: null, index: true },
    projectId: { type: String, ref: "Project", default: null, index: true },
    featureName: { type: String, required: true },
    modelName: { type: String, required: true },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    estimatedCostUsd: { type: Number, default: 0.0 },
    status: { type: String, required: true, enum: ["SUCCESS", "FAILURE"] },
    errorMessage: { type: String, default: null },
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

aiTelemetryLogSchema.index({ featureName: 1, createdAt: 1 });
aiTelemetryLogSchema.index({ userId: 1, createdAt: 1 });

aiTelemetryLogSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const AITelemetryLog =
  mongoose.models.AITelemetryLog || mongoose.model("AITelemetryLog", aiTelemetryLogSchema);

