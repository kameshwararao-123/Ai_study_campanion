import mongoose from "mongoose";

const quizQuestionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    quizId: { type: String, required: true, ref: "Quiz", index: true },
    conceptId: { type: String, ref: "Concept", default: null },
    questionType: { type: String, required: true, enum: ["MCQ", "OPEN_ENDED"] },
    prompt: { type: String, required: true },
    options: { type: String, default: null },
    correctAnswer: { type: String, required: true },
    explanation: { type: String, required: true },
    difficultyScore: { type: Number, default: 0.5 },
    sortOrder: { type: Number, required: true },
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

quizQuestionSchema.index({ quizId: 1, sortOrder: 1 });

quizQuestionSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const QuizQuestion =
  mongoose.models.QuizQuestion || mongoose.model("QuizQuestion", quizQuestionSchema);

