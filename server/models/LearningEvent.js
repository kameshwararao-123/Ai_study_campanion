import mongoose from "mongoose";

const learningEventSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userId: { type: String, required: true, ref: "User" },
    projectId: { type: String, required: true, ref: "Project", index: true },
    eventType: { type: String, required: true },
    payload: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
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

learningEventSchema.index({ projectId: 1, eventType: 1, timestamp: 1 });

learningEventSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const LearningEvent =
  mongoose.models.LearningEvent || mongoose.model("LearningEvent", learningEventSchema);

