import { z } from "zod";
import { islands, fields, kindLabels } from "./domain";
import {
  recordSchema,
  memberSchema,
  reviewSchema,
  loginSchema,
  registration,
} from "./validation";
type Schema = Record<string, unknown>;
const jsonSchema = (schema: z.ZodType) => {
  const value = z.toJSONSchema(schema, { io: "input" });
  delete value.$schema;
  return value;
};
const ref = (name: string) => ({ $ref: "#/components/schemas/" + name });
const uuid = { type: "string", format: "uuid" };
const date = { type: "string", format: "date" };
const datetime = { type: "string", format: "date-time" };
const response = (schema: Schema, description = "Operación completada") => ({
  description,
  content: { "application/json": { schema } },
});
const envelope = (schema: Schema) => ({
  type: "object",
  properties: { data: schema },
  required: ["data"],
});
const array = (schema: Schema) => envelope({ type: "array", items: schema });
const requestBody = (schema: Schema) => ({
  required: true,
  content: { "application/json": { schema } },
});
const errors = Object.fromEntries(
  Object.entries({
    "400": "JSON inválido",
    "401": "Sesión o token inválido, vencido o revocado",
    "403": "Permiso, propietario u origen no autorizado",
    "404": "Recurso no encontrado",
    "409": "Conflicto de versión, duplicación o tope de puntos",
    "413": "Cuerpo superior a 64 KB",
    "415": "Content-Type debe ser application/json",
    "422": "Datos inválidos o falta evidencia",
    "429": "Límite de solicitudes; consultar Retry-After",
    "500": "Error interno; incluye requestId",
  }).map(([code, description]) => [code, response(ref("Error"), description)]),
);
const idParameter = { name: "id", in: "path", required: true, schema: uuid };
const idem = {
  name: "Idempotency-Key",
  in: "header",
  required: false,
  schema: {
    type: "string",
    minLength: 8,
    maxLength: 128,
    pattern: "^[A-Za-z0-9._:-]+$",
  },
  description:
    "Recomendado en altas. Una clave por usuario y operación lógica. Repetir clave y cuerpo reproduce la respuesta; cambiar cuerpo o ruta devuelve 409. No reutilizar para otra acción.",
};
const security = [{ bearerAuth: [] }, { sessionCookie: [] }];
const operation = (
  summary: string,
  tag: string,
  scope: string,
  extra: Schema = {},
) => ({
  summary,
  tags: [tag],
  security,
  description: `Permiso requerido: ${scope}. Las escrituras se atribuyen al usuario y al token.`,
  responses: { "200": response({}), ...errors },
  "x-required-scopes": scope.split("+"),
  ...extra,
});

export function openApiDocument() {
  const schemas: Record<string, Schema> = {
    Error: {
      type: "object",
      properties: {
        error: {
          type: "object",
          properties: {
            code: { type: "string" },
            message: { type: "string" },
            requestId: { type: "string" },
          },
          required: ["code", "message"],
        },
      },
    },
    User: {
      type: "object",
      properties: {
        id: uuid,
        name: { type: "string" },
        email: { type: "string", format: "email" },
        role: { type: "string", enum: ["admin", "member"] },
      },
    },
    MemberInput: jsonSchema(memberSchema),
    Member: {
      ...jsonSchema(memberSchema),
      properties: {
        ...jsonSchema(memberSchema).properties,
        id: uuid,
        createdBy: uuid,
        createdAt: datetime,
        updatedAt: datetime,
      },
    },
    Record: {
      type: "object",
      properties: {
        id: uuid,
        island: { type: "string", enum: islands.map((i) => i.id) },
        kind: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        memberId: { oneOf: [uuid, { type: "null" }] },
        assigneeId: { oneOf: [uuid, { type: "null" }] },
        dueDate: { oneOf: [date, { type: "null" }] },
        eventDate: date,
        status: {
          type: "string",
          enum: ["pending", "in_progress", "blocked", "done"],
        },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        nextAction: { type: "string" },
        evidenceUrl: { type: "string" },
        officialUrl: { type: "string" },
        verification: {
          type: "string",
          enum: ["pending", "submitted", "validated", "accredited", "rejected"],
        },
        reviewNote: { type: "string" },
        points: { type: "integer" },
        data: { type: "object" },
        version: { type: "integer" },
        createdBy: uuid,
        createdAt: datetime,
        updatedAt: datetime,
      },
    },
    ReviewInput: jsonSchema(reviewSchema),
    LoginInput: jsonSchema(loginSchema),
    RegisterInput: jsonSchema(registration),
    Token: {
      type: "object",
      properties: {
        id: uuid,
        name: { type: "string" },
        prefix: { type: "string" },
        scopes: {
          type: "array",
          items: { type: "string", enum: ["read", "write", "approve"] },
        },
        expiresAt: datetime,
        createdAt: datetime,
        lastUsedAt: { oneOf: [datetime, { type: "null" }] },
        revokedAt: { oneOf: [datetime, { type: "null" }] },
      },
    },
    TokenInput: {
      type: "object",
      additionalProperties: false,
      required: ["name", "scopes", "expiresInDays"],
      properties: {
        name: { type: "string", minLength: 2, maxLength: 80 },
        scopes: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: { type: "string", enum: ["read", "write", "approve"] },
        },
        expiresInDays: { type: "integer", minimum: 1, maximum: 90 },
      },
    },
  };
  const paths: Record<string, Schema> = {};
  for (const island of islands) {
    const variants = island.kinds.map((kind) => {
      const schema = jsonSchema(recordSchema);
      const properties = {
        ...(schema.properties as Schema),
        kind: { const: kind, type: "string" },
      };
      const dataProperties = Object.fromEntries(
        fields[kind].map((f) => [
          f.key,
          {
            type:
              f.type === "checkbox"
                ? "boolean"
                : f.type === "number"
                  ? "number"
                  : "string",
            ...(f.options ? { enum: ["", ...f.options] } : {}),
            ...(f.type === "number" ? { minimum: 0, maximum: 1e12 } : {}),
            ...(f.type === "url"
              ? {
                  description: "Enlace http(s) o cadena vacía",
                  maxLength: 2000,
                }
              : {}),
            description: f.label + (f.help ? ". " + f.help : ""),
          },
        ]),
      );
      schemas[kind + "Input"] = {
        ...schema,
        title: kindLabels[kind],
        properties: {
          ...properties,
          data: {
            type: "object",
            additionalProperties: false,
            properties: dataProperties,
          },
        },
      };
      return ref(kind + "Input");
    });
    const input = { oneOf: variants };
    const base = "/islands/" + island.id + "/records";
    paths[base] = {
      get: operation(
        "Listar registros de " + island.name,
        island.name,
        "read",
        {
          parameters: [
            {
              name: "page",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 10000,
                default: 1,
              },
            },
            {
              name: "perPage",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 100,
              },
            },
            ...["q", "status", "verification", "memberId", "assigneeId"].map(
              (name) => ({ name, in: "query", schema: { type: "string" } }),
            ),
          ],
          responses: {
            "200": response({
              type: "object",
              properties: {
                data: { type: "array", items: ref("Record") },
                pagination: {
                  type: "object",
                  properties: {
                    total: { type: "integer" },
                    page: { type: "integer" },
                    perPage: { type: "integer" },
                  },
                },
              },
            }),
            ...errors,
          },
        },
      ),
      post: operation(
        "Crear registro de " + island.name,
        island.name,
        "write",
        {
          parameters: [idem],
          requestBody: requestBody(input),
          responses: { "201": response(envelope(ref("Record"))), ...errors },
        },
      ),
    };
    paths[base + "/{id}"] = {
      parameters: [idParameter],
      get: operation("Consultar un registro", island.name, "read", {
        responses: { "200": response(envelope(ref("Record"))), ...errors },
      }),
      put: operation("Editar un registro completo", island.name, "write", {
        description:
          "Requiere version actual en el cuerpo. Solo autor, responsable o admin. Reemplaza los campos editables, conserva kind e island y reinicia la revisión. Retirar la acreditación antes de editar.",
        requestBody: requestBody(input),
        responses: { "200": response(envelope(ref("Record"))), ...errors },
      }),
      delete: operation(
        "Eliminar un registro de las listas",
        island.name,
        "write",
        {
          description:
            "Baja lógica, conserva auditoría. Solo autor, responsable o admin. Retirar la acreditación antes de eliminar.",
          parameters: [
            {
              name: "version",
              in: "query",
              required: true,
              schema: { type: "integer", minimum: 1 },
            },
          ],
          responses: { "204": { description: "Eliminado" }, ...errors },
        },
      ),
    };
    paths[base + "/{id}/review"] = {
      parameters: [idParameter],
      post: operation(
        "Enviar, validar o acreditar evidencia",
        island.name,
        "write+approve",
        {
          description:
            "write permite enviar a revisión (submitted) o volver a pending para registros propios/asignados sin validación. Validar, rechazar, acreditar o retirar acreditación requiere admin y scope approve además de write. Evidencia completa y miembro son obligatorios para eventos puntuables. accredited exige officialUrl; rechazos y cambios de una acreditación exigen reviewNote. El servidor calcula puntos y comprueba duplicados y topes.",
          requestBody: requestBody(ref("ReviewInput")),
          responses: { "200": response(envelope(ref("Record"))), ...errors },
        },
      ),
    };
  }
  paths["/health"] = {
    get: {
      summary: "Comprobar servicio y conexión a base de datos",
      tags: ["Sistema"],
      security: [],
      responses: {
        "200": response({
          type: "object",
          properties: {
            status: { const: "ok" },
            service: { type: "string" },
            version: { type: "string" },
          },
        }),
        "500": errors["500"],
      },
    },
  };
  paths["/islands"] = {
    get: operation("Consultar catálogo de islas", "Sistema", "read", {
      responses: {
        "200": response(
          array({
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              kinds: { type: "array", items: { type: "string" } },
            },
          }),
        ),
        ...errors,
      },
    }),
  };
  paths["/dashboard"] = {
    get: operation("Consultar métricas de campaña", "Sistema", "read", {
      responses: {
        "200": response(
          envelope({
            type: "object",
            properties: {
              total: { type: "integer" },
              accreditedPoints: { type: "integer" },
              pendingPoints: { type: "integer" },
              potentialPoints: { type: "integer" },
              pendingEvidence: { type: "integer" },
              blocked: { type: "integer" },
              overdue: { type: "integer" },
              members: { type: "object" },
              islands: { type: "array", items: { type: "object" } },
              upcoming: { type: "array", items: ref("Record") },
              review: { type: "array", items: ref("Record") },
            },
          }),
        ),
        ...errors,
      },
    }),
  };
  paths["/users"] = {
    get: operation("Consultar responsables disponibles", "Sistema", "read", {
      responses: {
        "200": response(
          array({
            type: "object",
            properties: {
              id: uuid,
              name: { type: "string" },
              role: { type: "string" },
            },
          }),
        ),
        ...errors,
      },
    }),
  };
  paths["/members"] = {
    get: operation("Listar miembros", "Miembros", "read", {
      responses: { "200": response(array(ref("Member"))), ...errors },
    }),
    post: operation("Crear miembro", "Miembros", "write", {
      parameters: [idem],
      requestBody: requestBody(ref("MemberInput")),
      responses: { "201": response(envelope(ref("Member"))), ...errors },
    }),
  };
  paths["/members/{id}"] = {
    parameters: [idParameter],
    get: operation("Consultar miembro", "Miembros", "read", {
      responses: { "200": response(envelope(ref("Member"))), ...errors },
    }),
    put: operation("Editar miembro", "Miembros", "write", {
      description:
        "Solo autor o admin. Conserva la identidad y relaciones del miembro.",
      requestBody: requestBody(ref("MemberInput")),
      responses: { "200": response(envelope(ref("Member"))), ...errors },
    }),
    delete: operation(
      "Eliminar miembro sin registros asociados",
      "Miembros",
      "write",
      {
        description:
          "Solo autor o admin. Devuelve 409 si existen registros, incluso retirados, para preservar historial. Puedes desactivar al miembro con PUT active=false.",
        responses: { "204": { description: "Eliminado" }, ...errors },
      },
    ),
  };
  for (const action of ["login", "register"])
    paths["/auth/" + action] = {
      post: {
        summary:
          action === "login"
            ? "Iniciar sesión con correo y contraseña"
            : "Registrarse con invitación de un solo uso",
        tags: ["Cuenta"],
        security: [],
        requestBody: requestBody(
          ref(action === "login" ? "LoginInput" : "RegisterInput"),
        ),
        responses: {
          [action === "login" ? "200" : "201"]: {
            ...response(envelope(ref("User"))),
            headers: {
              "Set-Cookie": {
                description:
                  "Sesión HttpOnly, SameSite=Lax; Secure en producción",
                schema: { type: "string" },
              },
            },
          },
          ...errors,
        },
      },
    };
  paths["/auth/me"] = {
    get: operation("Consultar mi usuario", "Cuenta", "read", {
      responses: { "200": response(envelope(ref("User"))), ...errors },
    }),
  };
  paths["/auth/logout"] = {
    post: operation("Cerrar sesión del navegador", "Cuenta", "write", {
      security: [{ sessionCookie: [] }],
      responses: {
        "200": response(
          envelope({ type: "object", properties: { ok: { type: "boolean" } } }),
        ),
        ...errors,
      },
    }),
  };
  paths["/auth/password"] = {
    put: operation("Cambiar mi contraseña", "Cuenta", "write", {
      security: [{ sessionCookie: [] }],
      description:
        "Solo sesión de navegador. Requiere contraseña actual. Revoca todos los tokens y las otras sesiones.",
      requestBody: requestBody({
        type: "object",
        required: ["currentPassword", "newPassword"],
        additionalProperties: false,
        properties: {
          currentPassword: { type: "string", maxLength: 128 },
          newPassword: { type: "string", minLength: 12, maxLength: 128 },
        },
      }),
      responses: { "200": response(envelope({ type: "object" })), ...errors },
    }),
  };
  paths["/tokens"] = {
    get: operation("Listar mis tokens (sin secretos)", "Agentes", "read", {
      security: [{ sessionCookie: [] }],
      responses: { "200": response(array(ref("Token"))), ...errors },
    }),
    post: operation("Generar un token personal", "Agentes", "write", {
      security: [{ sessionCookie: [] }],
      description:
        "Solo sesión del navegador. Token completo mostrado una sola vez, almacenado mediante hash. approve solo para admin. No puede generar tokens desde otro token.",
      requestBody: requestBody(ref("TokenInput")),
      responses: {
        "201": response(
          envelope({
            allOf: [
              ref("Token"),
              { type: "object", properties: { token: { type: "string" } } },
            ],
          }),
        ),
        ...errors,
      },
    }),
  };
  paths["/tokens/{id}"] = {
    parameters: [idParameter],
    delete: operation("Revocar un token propio", "Agentes", "write", {
      security: [{ sessionCookie: [] }],
      responses: {
        "204": { description: "Revocado inmediatamente" },
        ...errors,
      },
    }),
  };
  paths["/invitations"] = {
    get: operation("Listar invitaciones", "Administración de acceso", "read", {
      security: [{ sessionCookie: [] }],
      description: "Solo admin desde navegador. Nunca devuelve el código.",
      responses: {
        "200": response(
          array({
            type: "object",
            properties: {
              id: uuid,
              name: { type: "string" },
              expiresAt: datetime,
              usedAt: { oneOf: [datetime, { type: "null" }] },
            },
          }),
        ),
        ...errors,
      },
    }),
    post: operation(
      "Crear invitación para un miembro",
      "Administración de acceso",
      "write",
      {
        security: [{ sessionCookie: [] }],
        description:
          "Solo admin desde navegador. Código de un uso, vence en siete días. No envía mensajes automáticamente.",
        requestBody: requestBody({
          type: "object",
          required: ["name"],
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
          },
        }),
        responses: {
          "201": response(
            envelope({
              type: "object",
              properties: {
                id: uuid,
                code: { type: "string" },
                expiresInDays: { const: 7 },
              },
            }),
          ),
          ...errors,
        },
      },
    ),
  };
  paths["/audit"] = {
    get: operation(
      "Consultar las últimas 100 acciones",
      "Administración de acceso",
      "read",
      {
        description:
          "Solo admin. Incluye autor y nombre del token, nunca secretos.",
        responses: {
          "200": response(
            array({
              type: "object",
              properties: {
                id: uuid,
                action: { type: "string" },
                entityId: uuid,
                details: { type: "object" },
                createdAt: datetime,
                actor: { type: "string" },
                tokenName: { type: ["string", "null"] },
              },
            }),
          ),
          ...errors,
        },
      },
    ),
  };
  return {
    openapi: "3.1.0",
    info: {
      title: "Grifo · API de campaña",
      version: "1.0.0",
      description:
        "API para las siete islas de Operación Grifo. Usa Authorization: Bearer TU_TOKEN. Genera tokens desde /tokens. Todos los datos operativos pertenecen a una casa compartida: usuarios invitados pueden leerlos; solo autor, responsable o admin editan registros. Los tokens intersectan permisos de usuario con read/write/approve. Las sesiones de navegador deben enviar Origin en escrituras. Límite: 300 solicitudes por minuto y usuario; autenticación aplica límites adicionales. Cuerpo máximo: 64 KB. Fechas de eventos: YYYY-MM-DD; fechas del reto en America/Santiago. No hay puntuación automática por autorreporte: acreditar exige revisión administrativa y evidencia oficial. El marcador histórico es una referencia separada. Regla de cantidad de entradas por concurso pendiente de confirmación; no se inventa un tope.",
      license: { name: "MIT", identifier: "MIT" },
      contact: {
        name: "MedineTech",
        url: "https://github.com/medine-tech/grifo-campaign-plan/issues",
      },
    },
    servers: [{ url: "/api/v1", description: "Este despliegue" }],
    tags: [
      { name: "Sistema" },
      { name: "Cuenta" },
      { name: "Miembros" },
      ...islands.map((i) => ({ name: i.name, description: i.description })),
      { name: "Agentes" },
      { name: "Administración de acceso" },
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "grifo_<random token>",
        },
        sessionCookie: { type: "apiKey", in: "cookie", name: "grifo_session" },
      },
      schemas,
    },
  };
}
