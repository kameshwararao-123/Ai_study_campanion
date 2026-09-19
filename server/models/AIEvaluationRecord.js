import mongoose from "mongoose";

const aiEvaluationRecordSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    featureName: { type: String, required: true },
    metricName: { type: String, required: true, enum: ["GROUNDEDNESS", "CITATION_ACCURACY", "REFUSAL_RATE"] },
    score: { type: Number, required: true },
    details: { type: String, default: null },
    evaluatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
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

aiEvaluationRecordSchema.index({ featureName: 1, metricName: 1 });

aiEvaluationRecordSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const AIEvaluationRecord =
  mongoose.models.AIEvaluationRecord ||
  mongoose.model("AIEvaluationRecord", aiEvaluationRecordSchema);

