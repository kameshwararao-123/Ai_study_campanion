import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    materialId: { type: String, required: true, ref: "LearningMaterial", index: true },
    projectId: { type: String, required: true, ref: "Project", index: true },
    userId: { type: String, required: true, ref: "User" },
    chunkIndex: { type: Number, required: true },
    startPage: { type: Number, required: true },
    endPage: { type: Number, required: true },
    contentType: {
      type: String,
      default: "TEXT",
      enum: ["TEXT", "TABLE", "IMAGE", "DIAGRAM", "OCR", "CHART"],
      index: true,
    },
    content: { type: String, required: true },
    tokenCount: { type: Number, default: 0 },
    embedding: { type: String, default: null },
    // Mixed, not String: the chunker emits metadata as an object. Declaring it as
    // String made Mongoose reject every chunk ("Cast to string failed for value
    // \"{...}\" at path \"metadata\""), so ingestion stored zero chunks while the
    // material was still marked READY. Mixed also accepts the legacy JSON-string form.
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    structuredData: { type: String, default: null }, // JSON string with type-specific details (headers, rows, etc.)
    sourceMetadata: { type: String, default: null }, // JSON string with full provenance
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.chunkId = ret.id;
        ret.documentId = ret.materialId;
        ret.textContent = ret.content;
        ret.pageNumber = ret.startPage;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.chunkId = ret.id;
        ret.documentId = ret.materialId;
        ret.textContent = ret.content;
        ret.pageNumber = ret.startPage;
        delete ret.__v;
        return ret;
      },
    },
  }
);

documentChunkSchema.index({ projectId: 1, materialId: 1 });
documentChunkSchema.index({ materialId: 1, chunkIndex: 1 });
documentChunkSchema.index({ projectId: 1, contentType: 1 });

documentChunkSchema.virtual("id").get(function () {
  return this._id ? this._id.toString() : null;
});

documentChunkSchema.virtual("chunkId").get(function () {
  return this._id ? this._id.toString() : null;
});

documentChunkSchema.virtual("documentId").get(function () {
  return this.materialId;
});

documentChunkSchema.virtual("textContent").get(function () {
  return this.content;
});

documentChunkSchema.virtual("pageNumber").get(function () {
  return this.startPage;
});

documentChunkSchema.virtual("tableData").get(function () {
  if (this.contentType !== "TABLE" || !this.structuredData) return null;
  try {
    return typeof this.structuredData === "string" ? JSON.parse(this.structuredData) : this.structuredData;
  } catch (e) {
    return null;
  }
});

documentChunkSchema.virtual("imageReference").get(function () {
  if (!this.structuredData) return null;
  try {
    const data = typeof this.structuredData === "string" ? JSON.parse(this.structuredData) : this.structuredData;
    return data?.originalImage || data?.originalDiagram || data?.imageReference || null;
  } catch (e) {
    return null;
  }
});

documentChunkSchema.virtual("imageDescription").get(function () {
  if (!this.structuredData) return null;
  try {
    const data = typeof this.structuredData === "string" ? JSON.parse(this.structuredData) : this.structuredData;
    return data?.visualDescription || data?.caption || null;
  } catch (e) {
    return null;
  }
});

documentChunkSchema.virtual("ocrText").get(function () {
  if (this.contentType !== "OCR" || !this.structuredData) return null;
  try {
    const data = typeof this.structuredData === "string" ? JSON.parse(this.structuredData) : this.structuredData;
    return data?.ocrText || this.content;
  } catch (e) {
    return this.content;
  }
});

export const DocumentChunk =
  mongoose.models.DocumentChunk || mongoose.model("DocumentChunk", documentChunkSchema);

export const KnowledgeChunk = DocumentChunk;
