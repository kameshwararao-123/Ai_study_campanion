import fs from "node:fs/promises";
import path from "node:path";
import { prisma, connectDB } from "../server/lib/db.js";
import { backgroundQueue } from "../server/lib/queue.js";
import { extractPdfContent, chunkDocumentPages } from "../server/lib/pdf.js";

async function run() {
  await connectDB();

  console.log("=== VERIFYING REAL PDF INGESTION PIPELINE ===");
  const pdfPath = path.resolve("./uploads/1789787580102-971831615-DBMSLAB.pdf");
  const stats = await fs.stat(pdfPath);
  console.log(`Target PDF: ${pdfPath} (${stats.size} bytes)`);

  const user = await prisma.user.create({
    data: {
      email: `real_pdf_tester_${Date.now()}@example.com`,
      name: "Real PDF Tester",
      passwordHash: "hash123",
      role: "STUDENT",
    },
  });

  const space = await prisma.space.create({
    data: {
      userId: user.id,
      name: "DBMS Lab Space",
    },
  });

  const project = await prisma.project.create({
    data: {
      spaceId: space.id,
      userId: user.id,
      name: "Database Systems Lab",
    },
  });

  const material = await prisma.learningMaterial.create({
    data: {
      projectId: project.id,
      userId: user.id,
      title: "DBMS Lab Manual",
      fileType: "PDF",
      fileUrl: pdfPath,
      status: "QUEUED",
    },
  });

  console.log(`Created test material ${material.id}. Launching backgroundQueue.processMaterial...`);
  await backgroundQueue.processMaterial({
    materialId: material.id,
    projectId: project.id,
    userId: user.id,
    filePath: pdfPath,
    fileType: "PDF",
    filename: "DBMSLAB.pdf",
  });

  const updatedMaterial = await prisma.learningMaterial.findUnique({
    where: { id: material.id },
  });
  console.log(`Material status after processing: ${updatedMaterial.status}`);

  const storedChunks = await prisma.documentChunk.findMany({
    where: { materialId: material.id },
    orderBy: { chunkIndex: "asc" },
  });

  console.log(`Total chunks in DB: ${storedChunks.length}`);
  const typeCounts = {};
  for (const c of storedChunks) {
    typeCounts[c.contentType] = (typeCounts[c.contentType] || 0) + 1;
  }
  console.log("Chunk Content Types breakdown:", typeCounts);

  if (storedChunks.length > 0) {
    console.log("\nSample chunk 0 preview:");
    console.log(`Type: ${storedChunks[0].contentType}, Page: ${storedChunks[0].startPage}, Content snippet:\n${storedChunks[0].content.substring(0, 200)}...`);
    
    // Check if there are table or diagram chunks
    const tableChunk = storedChunks.find(c => c.contentType === "TABLE");
    if (tableChunk) {
      console.log(`\nSample TABLE chunk on page ${tableChunk.startPage}:`);
      console.log(tableChunk.content.substring(0, 250));
    }
    const diagChunk = storedChunks.find(c => c.contentType === "DIAGRAM" || c.contentType === "IMAGE");
    if (diagChunk) {
      console.log(`\nSample DIAGRAM/IMAGE chunk on page ${diagChunk.startPage}:`);
      console.log(diagChunk.content.substring(0, 250));
    }
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

