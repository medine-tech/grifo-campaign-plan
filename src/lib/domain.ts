export const islands = [
  {
    id: "cazadores",
    name: "Cazadores",
    tagline: "Encontrar y activar a nuestra gente",
    icon: "Radar",
    color: "#6a8a62",
    kinds: ["nuevo", "reactivacion"],
    description:
      "Descubre nuevos Grifos y reactiva a quienes ya están en la comunidad. Conserva su ficha, contexto y próxima acción.",
    actions: ["Explorar", "Contactar", "Activar"],
  },
  {
    id: "seguimiento",
    name: "Seguimiento",
    tagline: "Que ningún compromiso se pierda",
    icon: "Binoculars",
    color: "#5b829b",
    kinds: ["seguimiento", "logro", "racha"],
    description:
      "Acompaña compromisos, logros diarios y rachas semanales. Detecta bloqueos y pide la evidencia que falta.",
    actions: ["Observar", "Registrar", "Acompañar"],
  },
  {
    id: "ideas",
    name: "Ideas",
    tagline: "De una posibilidad a algo que funciona",
    icon: "Lightbulb",
    color: "#b28a3b",
    kinds: ["idea"],
    description:
      "Captura problemas y propuestas. Evalúa impacto y esfuerzo, prueba una solución y registra el resultado.",
    actions: ["Capturar", "Priorizar", "Probar"],
  },
  {
    id: "competencia",
    name: "Competencia",
    tagline: "Construir, demostrar y participar",
    icon: "Swords",
    color: "#9474a2",
    kinds: ["entrada", "observacion"],
    description:
      "Organiza entradas a concursos y observaciones del juego. Cada proyecto necesita impacto, proceso y prueba; una publicación no equivale a acreditación.",
    actions: ["Construir", "Publicar", "Demostrar"],
  },
  {
    id: "ventas",
    name: "Ventas",
    tagline: "Cada venta, con su comprobante",
    icon: "Store",
    color: "#b37455",
    kinds: ["venta"],
    description:
      "Registra ventas de sistemas o automatizaciones IA, su publicación y comprobante. Distingue una venta reportada de una acreditada.",
    actions: ["Conectar", "Cerrar", "Acreditar"],
  },
  {
    id: "administracion",
    name: "Administración",
    tagline: "Dar orden a la campaña",
    icon: "Landmark",
    color: "#6d7e94",
    kinds: ["tarea"],
    description:
      "Coordina responsabilidades, fechas y decisiones. Las asignaciones propuestas deben confirmarse con cada persona.",
    actions: ["Organizar", "Coordinar", "Sostener"],
  },
  {
    id: "referidos",
    name: "Referidos",
    tagline: "Crecer con relaciones reales",
    icon: "Handshake",
    color: "#578e86",
    kinds: ["referido"],
    description:
      "Sigue cada invitación hasta el ingreso y el pago. El referido se acredita cuando paga, con evidencia y sin confundir trial con conversión.",
    actions: ["Invitar", "Acompañar", "Confirmar pago"],
  },
] as const;

export type IslandId = (typeof islands)[number]["id"];
export const kindLabels: Record<string, string> = {
  nuevo: "Miembro nuevo",
  reactivacion: "Reactivación",
  seguimiento: "Compromiso",
  logro: "Logro diario",
  racha: "Racha semanal",
  idea: "Idea",
  entrada: "Entrada a concurso",
  observacion: "Observación",
  venta: "Venta",
  tarea: "Tarea de coordinación",
  referido: "Referido",
};
export const statusLabels: Record<string, string> = {
  pending: "Por hacer",
  in_progress: "En curso",
  blocked: "Bloqueado",
  done: "Completado",
};
export const verificationLabels: Record<string, string> = {
  pending: "Sin enviar",
  submitted: "En revisión",
  validated: "Validado internamente",
  accredited: "Acreditado",
  rejected: "Rechazado",
};
export const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};
export const scopes = ["read", "write", "approve"] as const;
export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
};
export type Member = {
  id: string;
  name: string;
  surname: string;
  profileUrl: string;
  cohort: "new" | "existing";
  active: boolean;
  notes: string;
  createdAt: string;
  createdBy: string;
};
export type CampaignRecord = {
  id: string;
  island: IslandId;
  kind: string;
  title: string;
  description: string;
  memberId: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  eventDate: string;
  status: string;
  priority: string;
  nextAction: string;
  evidenceUrl: string;
  officialUrl: string;
  verification: string;
  reviewNote: string;
  points: number;
  data: Record<string, string | number | boolean>;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ApiToken = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type Field = {
  key: string;
  label: string;
  type?: "text" | "url" | "textarea" | "number" | "select" | "checkbox";
  options?: string[];
  help?: string;
};
export const fields: Record<string, Field[]> = {
  nuevo: [
    { key: "sourceUrl", label: "Presentación en la comunidad", type: "url" },
    {
      key: "contactStage",
      label: "Etapa de contacto",
      type: "select",
      options: [
        "Detectado",
        "Contactado",
        "Respondió",
        "Activado",
        "No contactar",
      ],
    },
  ],
  reactivacion: [
    { key: "lastActivity", label: "Última actividad conocida" },
    {
      key: "contactStage",
      label: "Etapa de contacto",
      type: "select",
      options: [
        "Detectado",
        "Contactado",
        "Respondió",
        "Reactivado",
        "No contactar",
      ],
    },
  ],
  seguimiento: [
    { key: "blocker", label: "Qué necesita para avanzar", type: "textarea" },
  ],
  logro: [
    {
      key: "impact",
      label: "Qué cambió y cómo lo comprobaste",
      type: "textarea",
    },
  ],
  racha: [
    {
      key: "week",
      label: "Semana de la temporada",
      type: "select",
      options: ["1", "2", "3", "4"],
    },
  ],
  idea: [
    { key: "problem", label: "Problema observado", type: "textarea" },
    { key: "impact", label: "Impacto esperado", type: "textarea" },
    {
      key: "effort",
      label: "Esfuerzo",
      type: "select",
      options: ["Pequeño", "Medio", "Grande"],
    },
    { key: "result", label: "Resultado del experimento", type: "textarea" },
  ],
  entrada: [
    { key: "demoUrl", label: "Enlace a la demo", type: "url" },
    {
      key: "process",
      label: "Cómo lo construiste: prompt, proceso y sistema",
      type: "textarea",
    },
    { key: "impact", label: "Impacto y resultados medidos", type: "textarea" },
    {
      key: "xUrl",
      label: "Publicación en X",
      type: "url",
      help: "La entrada de Skool debe incluir este enlace. El post lleva #AstraImperial y “GPT-6 Astra”.",
    },
    {
      key: "xBonus",
      label: "Solicitar revisión del bonus en X",
      type: "checkbox",
    },
    {
      key: "podium",
      label: "Puesto de podio acreditado",
      type: "select",
      options: ["Sin podio", "1", "2", "3"],
    },
  ],
  observacion: [
    { key: "sourceUrl", label: "Fuente pública", type: "url" },
    { key: "insight", label: "Aprendizaje aplicable", type: "textarea" },
  ],
  venta: [
    { key: "amount", label: "Importe", type: "number" },
    {
      key: "currency",
      label: "Moneda",
      type: "select",
      options: ["USD", "CLP", "VES", "EUR", "Otra"],
    },
    {
      key: "paymentConfirmed",
      label: "Pago confirmado con comprobante",
      type: "checkbox",
    },
    {
      key: "paymentProofUrl",
      label: "Comprobante (enlace de acceso restringido)",
      type: "url",
      help: "El enlace no hace público el archivo. Usa un destino con permisos propios.",
    },
  ],
  tarea: [
    { key: "decision", label: "Decisión o acuerdo", type: "textarea" },
    {
      key: "assignmentAccepted",
      label: "Responsabilidad aceptada por la persona",
      type: "checkbox",
    },
  ],
  referido: [
    {
      key: "referredPerson",
      label: "Identificador de la persona referida",
      help: "Usa el mismo perfil o identificador para evitar duplicados.",
    },
    { key: "referralUrl", label: "Enlace de referido", type: "url" },
    {
      key: "referralStage",
      label: "Etapa",
      type: "select",
      options: ["Invitado", "Ingresó", "Trial", "Pago confirmado"],
    },
    { key: "paymentConfirmed", label: "Pago confirmado", type: "checkbox" },
    { key: "paymentProofUrl", label: "Prueba del pago", type: "url" },
  ],
};
export function getIsland(id: string) {
  return islands.find((i) => i.id === id);
}
export function potentialPoints(record: Pick<CampaignRecord, "kind" | "data">) {
  switch (record.kind) {
    case "entrada":
      return (
        5 +
        (record.data.xBonus ? 2 : 0) +
        ({ "1": 30, "2": 20, "3": 10 }[String(record.data.podium) as "1"] || 0)
      );
    case "venta":
      return 5;
    case "referido":
      return 10;
    case "logro":
      return 1;
    case "racha":
      return 5;
    default:
      return 0;
  }
}
export const officialSnapshot = {
  date: "2026-09-07",
  week: 1,
  grifo: 375,
  pegaso: 519,
  aguila: 308,
  source: "https://juegosimperiales.com",
  label: "Cierre de semana 1 · aportado en el reto",
};
