import { z } from "zod";
import { ApiError } from "./http";
import { getIsland, fields } from "./domain";
const text = (max = 500) => z.string().trim().max(max);
const url = z.union([
  z.literal(""),
  z
    .url()
    .max(2000)
    .refine(
      (s) => ["https:", "http:"].includes(new URL(s).protocol),
      "Usa un enlace HTTP o HTTPS",
    ),
]);
const uuid = z.uuid();
const date = z.iso.date();
export const registration = z
  .object({
    name: text(100).min(2),
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(12).max(128),
    inviteCode: z.string().min(1).max(200),
  })
  .strict();
export const loginSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();
export const memberSchema = z
  .object({
    name: text(100).min(2),
    surname: text(100).default(""),
    profileUrl: url.default(""),
    cohort: z.enum(["new", "existing"]).default("new"),
    active: z.boolean().default(true),
    notes: text(2000).default(""),
  })
  .strict();
export const recordSchema = z
  .object({
    kind: text(30),
    title: text(180).min(3),
    description: text(5000).default(""),
    memberId: uuid.nullable().default(null),
    assigneeId: uuid.nullable().default(null),
    dueDate: date.nullable().default(null),
    eventDate: date,
    status: z
      .enum(["pending", "in_progress", "blocked", "done"])
      .default("pending"),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    nextAction: text(1000).default(""),
    evidenceUrl: url.default(""),
    data: z
      .record(
        z.string(),
        z.union([text(5000), z.number().finite().nonnegative(), z.boolean()]),
      )
      .default({}),
    version: z.number().int().positive().optional(),
  })
  .strict();
export const reviewSchema = z
  .object({
    verification: z.enum([
      "pending",
      "submitted",
      "validated",
      "accredited",
      "rejected",
    ]),
    officialUrl: url.default(""),
    reviewNote: text(2000).default(""),
    version: z.number().int().positive(),
  })
  .strict();
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ApiError(
      422,
      result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
      "validation_error",
    );
  return result.data;
}
export function validateKind(
  island: string,
  record: z.infer<typeof recordSchema>,
) {
  const area = getIsland(island);
  if (!area) throw new ApiError(404, "Isla no encontrada.");
  if (!(area.kinds as readonly string[]).includes(record.kind))
    throw new ApiError(422, "El tipo de registro no corresponde a esta isla.");
  const definitions = fields[record.kind];
  for (const [key, value] of Object.entries(record.data)) {
    const field = definitions.find((f) => f.key === key);
    if (!field) throw new ApiError(422, `Campo desconocido: ${key}`);
    if (field.type === "checkbox" && typeof value !== "boolean")
      throw new ApiError(422, `${key} debe ser booleano.`);
    if (
      field.type === "number" &&
      (typeof value !== "number" || value < 0 || value > 1e12)
    )
      throw new ApiError(422, `${key} debe ser un importe válido.`);
    if (
      !["number", "checkbox"].includes(field.type || "text") &&
      typeof value !== "string"
    )
      throw new ApiError(422, `${key} debe ser texto.`);
    if (field.type === "url") parse(url, value);
    if (field.options && value !== "" && !field.options.includes(String(value)))
      throw new ApiError(422, `${key} no tiene un valor permitido.`);
  }
}
