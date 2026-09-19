import mongoose from "mongoose";

const quizSubmissionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    quizId: { type: String, required: true, ref: "Quiz", index: true },
    questionId: { type: String, required: true, ref: "QuizQuestion" },
    userId: { type: String, required: true, ref: "User", index: true },
    userAnswer: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    scoreEarned: { type: Number, required: true },
    evalFeedback: { type: String, default: null },
    answeredAt: { type: Date, default: Date.now },
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

quizSubmissionSchema.index({ quizId: 1, userId: 1 });

quizSubmissionSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

export const QuizSubmission =
  mongoose.models.QuizSubmission || mongoose.model("QuizSubmission", quizSubmissionSchema);

