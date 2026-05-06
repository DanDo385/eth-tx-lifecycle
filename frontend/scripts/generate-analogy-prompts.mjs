import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const outputDir = path.join(frontendRoot, "public", "analogy");
const outputJson = path.join(outputDir, "prompts.json");
const outputMd = path.join(outputDir, "prompts.md");
const visualsPath = path.join(frontendRoot, "app", "content", "postOfficeAnalogyVisuals.json");

const model = {
  provider: "Google",
  model: "Nano Banana",
  usageNote:
    "These prompts are optimized for Google Nano Banana. Keep one scene per image, avoid text overlays, and preserve style consistency across all six outputs.",
};

const style =
  "Clean educational illustration, cinematic but simple, no text in image, high contrast, dark-theme compatible, 16:9 composition, warm post office lighting.";

const compositionRules =
  "One clear scene, medium-wide framing, coherent perspective, strong foreground subject, subtle depth cues, and consistent visual language across the full 1-6 set.";

const visualsRaw = await readFile(visualsPath, "utf8");
const visuals = JSON.parse(visualsRaw);
const steps = visuals.map((item) => ({
  id: item.id,
  ethStep: item.ethStep,
  imageSrc: item.imageSrc,
  prompt: item.imagePrompt,
}));

const buildPrompt = (stepPrompt) =>
  [
    `Model target: ${model.provider} ${model.model}.`,
    model.usageNote,
    `Style baseline: ${style}`,
    `Composition rules: ${compositionRules}`,
    stepPrompt,
  ].join(" ");

const payload = {
  generatedAt: new Date().toISOString(),
  model,
  style,
  compositionRules,
  steps: steps.map((step) => ({
    ...step,
    fullPrompt: buildPrompt(step.prompt),
  })),
};

const markdownLines = [
  "# Post Office Analogy Image Prompts",
  "",
  `Model target: ${model.provider} ${model.model}`,
  "",
  model.usageNote,
  "",
  `Style baseline: ${style}`,
  "",
  `Composition rules: ${compositionRules}`,
  "",
  ...steps.flatMap((step) => [
    `## Step ${step.id} - ${step.ethStep}`,
    "",
    buildPrompt(step.prompt),
    "",
  ]),
];

await mkdir(outputDir, { recursive: true });
await writeFile(outputJson, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await writeFile(outputMd, `${markdownLines.join("\n")}\n`, "utf8");

console.log(`Wrote ${outputJson}`);
console.log(`Wrote ${outputMd}`);
