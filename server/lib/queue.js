import { prisma } from "./db.js";
import { getAIProvider } from "./ai.js";
import { extractPdfContent, chunkDocumentPages } from "./pdf.js";

class BackgroundQueue {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Dispatches a job to the queue with duplicate-job protection
   */
  async enqueue(jobType, payload, queueName = "default") {
    // Duplicate-job protection: check if an identical job is already queued or running
    if (jobType === "PROCESS_MATERIAL" && payload.materialId) {
      const activeJob = await prisma.backgroundJob.findFirst({
        where: {
          jobType: "PROCESS_MATERIAL",
          status: { in: ["QUEUED", "RUNNING"] },
        },
      });
      if (activeJob) {
        try {
          const parsedPayload = JSON.parse(activeJob.payload);
          if (parsedPayload.materialId === payload.materialId) {
            console.log(`[Queue] Duplicate job suppressed for materialId: ${payload.materialId}`);
            return activeJob;
          }
        } catch (_) {}
      }
    }

    const job = await prisma.backgroundJob.create({
      data: {
        queueName,
        jobType,
        payload: JSON.stringify(payload),
        status: "QUEUED",
      },
    });

    // Asynchronously trigger processing without blocking caller
    setImmediate(() => this.processNext());

    return job;
  }

  /**
   * Processes queued jobs
   */
  async processNext() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    let currentJob = null;
    try {
      currentJob = await prisma.backgroundJob.findFirst({
        where: { status: "QUEUED" },
        orderBy: { createdAt: "asc" },
      });

      if (!currentJob) {
        this.isProcessing = false;
        return;
      }

      await prisma.backgroundJob.update({
        where: { id: currentJob.id },
        data: { status: "RUNNING", attempts: { increment: 1 } },
      });

      const payload = JSON.parse(currentJob.payload);

      if (currentJob.jobType === "PROCESS_MATERIAL") {
        await this.handleMaterialProcessing(payload);
      } else if (currentJob.jobType === "EVALUATE_ASSESSMENT") {
        await this.handleAssessmentEvaluation(payload);
      } else if (currentJob.jobType === "REPEATED_MISTAKE_ANALYSIS") {
        await this.handleMistakeAnalysis(payload);
      }

      await prisma.backgroundJob.update({
        where: { id: currentJob.id },
        data: { status: "COMPLETED", errorMessage: null },
      });
    } catch (err) {
      console.error("Job processing error:", err);
      if (currentJob) {
        await prisma.backgroundJob.update({
          where: { id: currentJob.id },
          data: {
            status: "FAILED",
            errorMessage: err.message || "Job processing failed",
          },
        });
      }
    } finally {
      this.isProcessing = false;
      // Check if more jobs are queued
      const remaining = await prisma.backgroundJob.count({ where: { status: "QUEUED" } });
      if (remaining > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  async handleMaterialProcessing({ materialId, projectId, userId, filePath }) {
    try {
      const material = await prisma.learningMaterial.findFirst({
        where: { id: materialId },
      });
      if (!material) {
        throw new Error(`LearningMaterial ${materialId} not found`);
      }

      await prisma.learningMaterial.update({
        where: { id: materialId },
        data: { status: "PROCESSING", errorMessage: null },
      });

      console.log(`\n==================== [PIPELINE INGESTION TRACE] ====================`);
      console.log(`[Pipeline] PDF received: ${material.filename} (${material.fileSizeBytes || 0} bytes)`);

      // 1. Multi-modal extraction: Text, Table, Image, Diagram, Scanned Page (OCR)
      const parsed = await extractPdfContent(filePath);

      const totalChars = (parsed.pages || []).reduce((acc, p) => acc + (p.text?.length || 0), 0);
      const ocrPagesCount = (parsed.pages || []).filter((p) => p.isOcr).length;
      const tablesCount = parsed.tables?.length || 0;
      const imagesCount = parsed.images?.length || 0;
      const diagramsCount = parsed.diagrams?.length || 0;
      const chartsCount = parsed.charts?.length || 0;

      console.log(`[Pipeline] Pages detected: ${parsed.numPages}`);
      console.log(`[Pipeline] Text extracted: ${totalChars} characters`);
      console.log(`[Pipeline] Tables detected: ${tablesCount}`);
      console.log(`[Pipeline] Images detected: ${imagesCount} (and ${diagramsCount} diagrams, ${chartsCount} charts)`);
      console.log(`[Pipeline] OCR performed: ${ocrPagesCount} pages`);
      console.log(`[Pipeline] Total extracted characters: ${totalChars}`);

      // 2. Normalization into structured Knowledge Items
      const chunks = chunkDocumentPages(parsed, {
        projectId,
        documentId: materialId,
        userId,
        filename: material.filename,
      });

      console.log(`[Pipeline] Total chunks created: ${chunks.length}`);

      // Fail-safe: Never mark READY if 0 chunks were created (REQ-019, Section 13)
      if (!chunks || chunks.length === 0) {
        throw new Error("Zero chunks created: PDF did not yield any readable text, tables, images, or OCR content.");
      }

      // 3. Clean up previous chunks & concepts for idempotency (REQ-022)
      await prisma.documentChunk.deleteMany({ where: { materialId } });
      await prisma.concept.deleteMany({ where: { sourceMaterialId: materialId } });

      const ai = getAIProvider();

      // 4. Generate embeddings for all knowledge item chunks (with multimodal context)
      const texts = chunks.map((c) => {
        if (c.contentType === "TABLE" || c.contentType === "IMAGE" || c.contentType === "DIAGRAM" || c.contentType === "CHART" || c.contentType === "OCR") {
          let extra = "";
          try {
            const pd = typeof c.structuredData === "string" ? JSON.parse(c.structuredData) : c.structuredData;
            if (pd) {
              if (pd.headers) extra += ` ${pd.headers.join(" ")} ${JSON.stringify(pd.rows || [])}`;
              if (pd.visualDescription) extra += ` ${pd.visualDescription}`;
              if (pd.surroundingText) extra += ` ${pd.surroundingText}`;
              if (pd.ocrText) extra += ` ${pd.ocrText}`;
            }
          } catch (e) {}
          return `${c.content} ${extra}`.trim();
        }
        return c.content;
      });
      const embeddings = await ai.generateEmbeddings(texts);

      console.log(`[Pipeline] Total embeddings created: ${embeddings.length}`);

      if (embeddings.length !== chunks.length) {
        throw new Error(`Embedding count mismatch: generated ${embeddings.length} embeddings for ${chunks.length} chunks.`);
      }

      // 5. Save chunks preserving all metadata and structured data.
      // metadata is stored as a JSON string (its documented schema type) and content
      // is never left empty, which `required: true` would reject.
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        await prisma.documentChunk.create({
          data: {
            materialId,
            projectId,
            userId,
            chunkIndex: c.chunkIndex,
            startPage: c.startPage,
            endPage: c.endPage,
            contentType: c.contentType || "TEXT",
            content: c.content || " ",
            tokenCount: c.tokenCount,
            embedding: JSON.stringify(embeddings[i] || []),
            metadata: typeof c.metadata === "string" ? c.metadata : JSON.stringify(c.metadata || {}),
            structuredData: c.structuredData,
            sourceMetadata: c.sourceMetadata,
          },
        });
      }

      // Verify what is ACTUALLY in the database instead of trusting the write loop.
      // A silently unpersisted chunk set is indistinguishable from an empty document
      // to retrieval, so it must never be reported as a successful index.
      const storedChunksCount = await prisma.documentChunk.count({ where: { materialId } });
      if (storedChunksCount === 0) {
        throw new Error(
          `Chunk persistence failed: 0 of ${chunks.length} chunks were stored for this material.`
        );
      }

      console.log(`[Pipeline] Total chunks stored: ${storedChunksCount}/${chunks.length}`);
      console.log(`[Pipeline] Total chunks: ${chunks.length}`);
      console.log(`[Pipeline] Embeddings generated: ${embeddings.length}`);
      console.log(`[Pipeline] Embeddings stored: ${storedChunksCount}`);
      console.log(`====================================================================\n`);

      // 6. Extract core concepts
      const sampleText = parsed.fullText.substring(0, 4000) || material.filename;
      const conceptsResult = await ai.generateStructured(
        `Extract key concepts and definitions from this learning material:\n${sampleText}`
      );

      const conceptsList = Array.isArray(conceptsResult.data) ? conceptsResult.data : [];
      for (const item of conceptsList) {
        const concept = await prisma.concept.create({
          data: {
            projectId,
            userId,
            name: item.name || "Core Concept",
            definition: item.definition || "Concept definition",
            sourceMaterialId: materialId,
            sourcePage: item.sourcePage || 1,
            importanceScore: item.importanceScore || 0.8,
          },
        });

        // Initialize baseline concept mastery (REQ-050)
        await prisma.conceptMastery.upsert({
          where: {
            projectId_conceptId_userId: {
              projectId,
              conceptId: concept.id,
              userId,
            },
          },
          create: {
            conceptId: concept.id,
            projectId,
            userId,
            masteryScore: 40.0,
            confidenceScore: 0.5,
            trend: "REQUIRING_ATTENTION",
          },
          update: {},
        });
      }

      // 7. Calculate content breakdown
      const breakdown = {
        totalChunks: chunks.length,
        text: chunks.filter((c) => c.contentType === "TEXT").length,
        tables: chunks.filter((c) => c.contentType === "TABLE").length,
        images: chunks.filter((c) => c.contentType === "IMAGE").length,
        diagrams: chunks.filter((c) => c.contentType === "DIAGRAM").length,
        charts: chunks.filter((c) => c.contentType === "CHART").length,
        ocr: chunks.filter((c) => c.contentType === "OCR").length,
      };

      // 8. Mark material as ready with metadata breakdown
      await prisma.learningMaterial.update({
        where: { id: materialId },
        data: {
          status: "READY",
          pageCount: parsed.numPages,
          errorMessage: null,
          metadata: JSON.stringify(breakdown),
        },
      });

      // 9. Emit event (REQ-063)
      await prisma.learningEvent.create({
        data: {
          userId,
          projectId,
          eventType: "MATERIAL_PROCESSED",
          payload: JSON.stringify({
            materialId,
            pageCount: parsed.numPages,
            chunksCount: chunks.length,
            breakdown,
          }),
        },
      });
    } catch (err) {
      // Guaranteed failure state: Never allow a failed processing job to appear as READY
      await prisma.learningMaterial.update({
        where: { id: materialId },
        data: {
          status: "FAILED",
          errorMessage: err.message || "Failed to process PDF",
        },
      });
      throw err;
    }
  }

  async handleAssessmentEvaluation({ quizId, projectId, userId }) {
    // Assessment background completion handler (REQ-070)
    const submissions = await prisma.quizSubmission.findMany({
      where: { quizId, userId },
      include: { question: true },
    });

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    const total = quiz?.totalQuestions || submissions.length;
    const correct = submissions.filter((s) => s.isCorrect).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        status: "COMPLETED",
        score,
        completedAt: new Date(),
      },
    });

    // Update concept mastery based on quiz performance (REQ-049, REQ-051).
    // Questions are grouped per topic so a topic assessed by several questions is
    // judged once on its average score, rather than compounding one delta per
    // question (which inflated or tanked mastery depending on question count).
    const submissionsByConcept = new Map();
    for (const sub of submissions) {
      const conceptId = sub.question?.conceptId;
      if (!conceptId) continue;
      if (!submissionsByConcept.has(conceptId)) submissionsByConcept.set(conceptId, []);
      submissionsByConcept.get(conceptId).push(sub);
    }

    for (const [conceptId, conceptSubmissions] of submissionsByConcept) {
      const answeredCount = conceptSubmissions.filter(
        (s) => s.userAnswer && s.userAnswer !== "Unanswered"
      ).length;
      const averageScore = Math.round(
        conceptSubmissions.reduce((acc, s) => acc + (s.scoreEarned || 0), 0) /
          conceptSubmissions.length
      );

      const existing = await prisma.conceptMastery.findFirst({
        where: { conceptId, userId, projectId },
      });
      if (!existing) continue;

      // Partial credit counts: a nearly-mastered topic is not penalised as harshly
      // as one that is clearly unresolved.
      const delta = averageScore >= 70 ? 15.0 : averageScore >= 40 ? -5.0 : -10.0;
      const newScore = Math.max(0, Math.min(100, existing.masteryScore + delta));
      const trend = newScore >= 75 ? "IMPROVING" : newScore >= 50 ? "STABLE" : "REQUIRING_ATTENTION";

      await prisma.conceptMastery.update({
        where: { id: existing.id },
        data: {
          masteryScore: newScore,
          confidenceScore: Number((answeredCount / conceptSubmissions.length).toFixed(2)),
          trend,
          lastAssessedAt: new Date(),
        },
      });

      await prisma.masteryHistoryLog.create({
        data: {
          masteryId: existing.id,
          conceptId,
          projectId,
          userId,
          previousScore: existing.masteryScore,
          newScore,
          sourceType: "QUIZ",
        },
      });
    }

    // Generate targeted recommendation (REQ-055, REQ-056)
    const weakConcept = await prisma.conceptMastery.findFirst({
      where: { projectId, userId, trend: "REQUIRING_ATTENTION" },
      include: { concept: true },
    });

    if (weakConcept) {
      await prisma.recommendation.create({
        data: {
          projectId,
          userId,
          conceptId: weakConcept.conceptId,
          title: `Reinforce ${weakConcept.concept.name}`,
          message: `Your current mastery of ${weakConcept.concept.name} is ${weakConcept.masteryScore.toFixed(0)}%. Review the source material and take another short quiz.`,
          actionType: "TAKE_QUIZ",
          actionTargetId: weakConcept.conceptId,
          status: "ACTIVE",
        },
      });
    } else {
      // If no weak concepts, recommend advancing to in-depth tutor or exploring next topics
      const anyConcept = await prisma.conceptMastery.findFirst({
        where: { projectId, userId },
        include: { concept: true },
      });
      await prisma.recommendation.create({
        data: {
          projectId,
          userId,
          conceptId: anyConcept ? anyConcept.conceptId : null,
          title: anyConcept ? `Advance Mastery of ${anyConcept.concept.name}` : "Continue Learning Journey",
          message: "You're making strong progress! Explore in-depth concepts with the AI Tutor or review project notes.",
          actionType: "EXPLORE_TOPIC",
          actionTargetId: anyConcept ? anyConcept.conceptId : null,
          status: "ACTIVE",
        },
      });
    }
  }

  async handleMistakeAnalysis({ projectId, userId, conceptId, mistake }) {
    // REQ-071: Repeated mistake background workflow
    const context = await prisma.persistentLearnerContext.findFirst({
      where: { projectId, userId },
    });

    if (context) {
      const mistakes = JSON.parse(context.repeatedMistakes || "[]");
      const existing = mistakes.find((m) => m.conceptId === conceptId);

      if (existing) {
        existing.count += 1;
        existing.lastOccurred = new Date().toISOString();
      } else {
        mistakes.push({ conceptId, mistake, count: 1, lastOccurred: new Date().toISOString() });
      }

      await prisma.persistentLearnerContext.update({
        where: { id: context.id },
        data: { repeatedMistakes: JSON.stringify(mistakes) },
      });
    }
  }
}

export const backgroundQueue = new BackgroundQueue();

