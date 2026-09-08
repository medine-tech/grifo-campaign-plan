import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/vendor", { recursive: true });
await copyFile(
  "node_modules/swagger-ui-dist/swagger-ui-bundle.js",
  "public/vendor/swagger-ui-bundle.js",
);
