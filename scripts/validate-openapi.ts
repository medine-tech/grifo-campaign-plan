import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3_1 } from "openapi-types";
import { openApiDocument } from "../src/lib/openapi";
const doc = openApiDocument();
await SwaggerParser.validate(doc as unknown as OpenAPIV3_1.Document);
const operations = Object.values(doc.paths).reduce(
  (count, path) =>
    count +
    Object.keys(path).filter((key) =>
      ["get", "post", "put", "delete"].includes(key),
    ).length,
  0,
);
console.log(
  `OpenAPI 3.1 valid: ${Object.keys(doc.paths).length} paths, ${operations} operations.`,
);
