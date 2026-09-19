import mongoose from "mongoose";

const backgroundJobSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    queueName: { type: String, default: "default", index: true },
    jobType: { type: String, required: true },
    payload: { type: String, required: true },
    status: {
      type: String,
      default: "QUEUED",
      enum: ["QUEUED", "RUNNING", "COMPLETED", "FAILED"],
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    errorMessage: { type: String, default: null },
    scheduledAt: { type: Date, default: Date.now },
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

backgroundJobSchema.index({ status: 1, queueName: 1 });

backgroundJobSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const BackgroundJob =
  mongoose.models.BackgroundJob || mongoose.model("BackgroundJob", backgroundJobSchema);

