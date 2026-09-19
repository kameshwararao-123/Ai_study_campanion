import mongoose from "mongoose";

const spaceSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userId: { type: String, required: true, ref: "User", index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    visualConfig: { type: String, default: null },
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

spaceSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const Space = mongoose.models.Space || mongoose.model("Space", spaceSchema);

