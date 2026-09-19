import mongoose from "mongoose";

const masteryHistoryLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    masteryId: { type: String, required: true, ref: "ConceptMastery", index: true },
    conceptId: { type: String, required: true, ref: "Concept" },
    projectId: { type: String, required: true, ref: "Project" },
    userId: { type: String, required: true, ref: "User" },
    previousScore: { type: Number, required: true },
    newScore: { type: Number, required: true },
    sourceType: { type: String, required: true, enum: ["QUIZ", "TUTOR", "ASSESSMENT"] },
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

masteryHistoryLogSchema.index({ masteryId: 1, createdAt: 1 });

masteryHistoryLogSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const MasteryHistoryLog =
  mongoose.models.MasteryHistoryLog ||
  mongoose.model("MasteryHistoryLog", masteryHistoryLogSchema);

