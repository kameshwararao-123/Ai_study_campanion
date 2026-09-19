import mongoose from "mongoose";

const conceptMasterySchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    conceptId: { type: String, required: true, ref: "Concept", index: true },
    projectId: { type: String, required: true, ref: "Project", index: true },
    userId: { type: String, required: true, ref: "User", index: true },
    masteryScore: { type: Number, default: 0.0 },
    confidenceScore: { type: Number, default: 0.0 },
    trend: {
      type: String,
      default: "REQUIRING_ATTENTION",
      enum: ["IMPROVING", "STABLE", "REQUIRING_ATTENTION"],
    },
    lastAssessedAt: { type: Date, default: null },
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

conceptMasterySchema.index({ projectId: 1, conceptId: 1, userId: 1 }, { unique: true });
conceptMasterySchema.index({ projectId: 1, trend: 1 });

conceptMasterySchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const ConceptMastery =
  mongoose.models.ConceptMastery || mongoose.model("ConceptMastery", conceptMasterySchema);

