import { scanContent } from "./forbidden-patterns.mjs";
import fs from "fs";

const files = [
  "src/components/PageShell.tsx",
  "src/components/StateView.tsx",
  "src/lib/types.ts",
  "src/pages/__TdsGallery.tsx",
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const c = fs.readFileSync(f, "utf8");
  const hits = scanContent(c, f);
  if (hits.length) console.log(f, JSON.stringify(hits, null, 2));
}
console.log("done");
