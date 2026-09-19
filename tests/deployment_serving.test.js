import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Deployment File Structure & Configuration Integrity", async (t) => {
  await t.test("Root package.json has deployment scripts (start, build, postinstall)", () => {
    const pkgPath = path.resolve(__dirname, "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    assert.equal(pkg.scripts.start, "node server/index.js");
    assert.equal(pkg.scripts.build, "npm run build --prefix client");
    assert.equal(pkg.scripts.postinstall, "npm install --prefix client");
  });

  await t.test("Client distribution exists and contains index.html", () => {
    const distPath = path.resolve(__dirname, "../client/dist");
    assert.ok(fs.existsSync(distPath), "client/dist should exist");
    assert.ok(fs.existsSync(path.join(distPath, "index.html")), "index.html should exist in client/dist");
  });

  await t.test("Vercel routing config exists for client SPA", () => {
    const vercelConfigPath = path.resolve(__dirname, "../client/vercel.json");
    assert.ok(fs.existsSync(vercelConfigPath), "client/vercel.json should exist");
    const vercel = JSON.parse(fs.readFileSync(vercelConfigPath, "utf-8"));
    assert.ok(Array.isArray(vercel.rewrites), "rewrites array should be defined");
    assert.equal(vercel.rewrites[0].destination, "/index.html");
  });

  await t.test("Dockerfile and .dockerignore exist and are valid", () => {
    const dockerfilePath = path.resolve(__dirname, "../Dockerfile");
    const dockerignorePath = path.resolve(__dirname, "../.dockerignore");

    assert.ok(fs.existsSync(dockerfilePath), "Dockerfile must exist");
    assert.ok(fs.existsSync(dockerignorePath), ".dockerignore must exist");

    const dockerfile = fs.readFileSync(dockerfilePath, "utf-8");
    assert.ok(dockerfile.includes("FROM node:20-alpine"), "Must use node:20-alpine base");
    assert.ok(dockerfile.includes("npm run build"), "Must build frontend in stage");
    assert.ok(dockerfile.includes("CMD [\"npm\", \"start\"]"), "Must start server with npm start");
  });

  await t.test("Render blueprint (render.yaml) exists with required environment variables", () => {
    const renderPath = path.resolve(__dirname, "../render.yaml");
    assert.ok(fs.existsSync(renderPath), "render.yaml must exist");
    const renderContent = fs.readFileSync(renderPath, "utf-8");
    assert.ok(renderContent.includes("buildCommand: npm install && npm run build"));
    assert.ok(renderContent.includes("startCommand: npm start"));
  });

  await t.test("Deployment documentation (DEPLOYMENT.md) exists", () => {
    const docPath = path.resolve(__dirname, "../DEPLOYMENT.md");
    assert.ok(fs.existsSync(docPath), "DEPLOYMENT.md must exist");
  });
});

