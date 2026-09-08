import type { IslandId } from "./domain";

export const islandGuide: Record<
  IslandId,
  { when: string; result: string; example: string }
> = {
  cazadores: {
    when: "Quieres recibir a alguien nuevo o retomar el contacto con un miembro que se alejó.",
    result:
      "Contexto de la persona, etapa de contacto y próxima acción con responsable.",
    example:
      "Luis se incorporó. Ana lo ayudará a preparar su primera participación.",
  },
  seguimiento: {
    when: "Hay un compromiso que acompañar, un bloqueo, un logro diario o una racha semanal.",
    result:
      "Qué avanzó, qué falta y cuándo volver a revisarlo; evidencia cuando corresponda.",
    example:
      "Revisar la demo de Luis y ayudarlo a resolver el bloqueo que encontró.",
  },
  ideas: {
    when: "Identificaste un problema o tienes una propuesta que vale la pena probar.",
    result:
      "Problema, propuesta, impacto esperado, esfuerzo y resultado del experimento.",
    example:
      "Probar una automatización que organice las consultas de un negocio.",
  },
  competencia: {
    when: "Preparas una entrada a un concurso o registras un aprendizaje del juego.",
    result:
      "Proyecto, demo, proceso, impacto y enlace a la publicación para revisar.",
    example:
      "Documentar cómo Luis construyó su proyecto y dónde se puede probar.",
  },
  ventas: {
    when: "Un miembro reporta una venta y hay que reunir sus pruebas.",
    result: "Concepto, importe, moneda, publicación y comprobante del pago.",
    example:
      "Completar la evidencia de una automatización vendida antes de enviarla a revisión.",
  },
  administracion: {
    when: "Hace falta acordar una responsabilidad, coordinar una tarea o registrar una decisión.",
    result:
      "Acuerdo claro, responsable, fecha y confirmación de que aceptó la tarea.",
    example:
      "Acordar quién acompaña cada isla y confirmar las responsabilidades.",
  },
  referidos: {
    when: "Un miembro invita a alguien a la comunidad y acompaña su incorporación.",
    result:
      "Quién refiere, quién ingresa, etapa y evidencia del pago cuando ocurra.",
    example:
      "Actualizar una invitación cuando la persona ingresa y luego confirma su pago.",
  },
};

export const walkthrough = [
  {
    title: "Elige dónde ocurre la acción",
    instruction:
      "Luis está preparando una participación. Ana abre Competencia y pulsa Nuevo registro. Elige el tipo Entrada a concurso.",
    fields: [
      ["Isla", "Competencia"],
      ["Tipo", "Entrada a concurso"],
    ],
    takeaway:
      "Cada isla tiene su propio trabajo. Si luego necesitas un seguimiento, crea otro registro vinculado al mismo miembro.",
  },
  {
    title: "Vincula a las personas correctas",
    instruction:
      "Ana busca a Luis en Miembros para usar su ficha existente. Si todavía no está, crea su ficha una sola vez. Después selecciona a Luis como miembro y su propia cuenta como responsable.",
    fields: [
      ["Miembro vinculado", "Luis · a quien pertenece la participación"],
      ["Responsable", "Ana · quien la acompaña"],
    ],
    takeaway:
      "Tener una cuenta y tener una ficha en Miembros son cosas distintas. El registro de una cuenta no crea esa ficha automáticamente.",
  },
  {
    title: "Deja un próximo paso concreto",
    instruction:
      "Ana escribe qué van a construir, marca el trabajo En curso y acuerda una fecha con Luis. La fecha del evento indica cuándo ocurre la actividad; la fecha límite, para cuándo esperan terminarla.",
    fields: [
      ["Título", "Preparar la demo del proyecto de Luis"],
      ["Estado", "En curso"],
      ["Próxima acción", "Revisar con Luis la demo antes de publicarla"],
      ["Fecha límite", "La fecha acordada con Luis"],
    ],
    takeaway:
      "Una próxima acción útil dice qué sigue y con quién. El responsable mantiene el registro actualizado.",
  },
  {
    title: "Muestra lo que se hizo",
    instruction:
      "Cuando el proyecto está publicado, Ana añade los enlaces de demo y publicación, explica el proceso y registra el impacto demostrado. Puede marcar el trabajo Completado.",
    fields: [
      ["Trabajo", "Completado"],
      ["Evidencia", "Demo, proceso, impacto y publicación"],
      ["Revisión", "Sin enviar"],
    ],
    takeaway:
      "Completado describe el trabajo. Todavía falta enviar la evidencia a revisión; la app no publica el proyecto en Skool ni en X.",
  },
  {
    title: "Envía la evidencia a revisión",
    instruction:
      "Ana abre el detalle del registro y lo envía a revisión. Una cuenta administradora revisa las pruebas, puede pedir correcciones y acredita solo cuando existe respaldo oficial.",
    fields: [
      ["En revisión", "Ana ya envió la evidencia"],
      ["Validado internamente", "Administración revisó las pruebas"],
      ["Acreditado", "Existe respaldo oficial y se registró la acreditación"],
    ],
    takeaway:
      "Enviar y validar internamente no suman puntos acreditados. Publicar, demostrar y acreditar son pasos distintos.",
  },
  {
    title: "Comprueba que sabes cómo continuar",
    instruction:
      "Ana publicó el proyecto de Luis y marcó el trabajo Completado. ¿A quién corresponde la participación y qué falta para acreditar puntos?",
    fields: [
      ["Miembro vinculado", "Luis"],
      ["Responsable", "Ana"],
      ["Trabajo", "Completado"],
      ["Revisión", "Sin enviar"],
    ],
    takeaway:
      "Ahora puedes aplicar el recorrido a una actividad real de tu equipo.",
  },
] as const;

const destinations = new Set([
  "/dashboard",
  "/map",
  "/members",
  "/tokens",
  "/settings",
  "/onboarding",
  ...Object.keys(islandGuide).map((id) => `/islands/${id}`),
]);

/** Only known app destinations may be used after login. */
export function safeReturnPath(value: unknown): string {
  return typeof value === "string" && destinations.has(value)
    ? value
    : "/dashboard";
}

export function entryLink(path: string): string {
  return `/login?next=${encodeURIComponent(safeReturnPath(path))}`;
}

export function agentOnboardingPrompt(origin: string): string {
  return `Ayúdame a organizar mi trabajo en Operación Grifo.

Lee primero ${origin}/llms.txt y el contrato ${origin}/api/openapi.json. La documentación interactiva está en ${origin}/api/documentation.

Usa el token disponible en la variable privada GRIFO_TOKEN. No lo muestres en el chat, los logs, archivos públicos ni comandos compartidos. Si no está configurado, indícame cómo guardarlo de forma privada en tu entorno; no me pidas pegarlo aquí.

Primero consulta mi usuario y las islas, y ayúdame a elegir dónde registrar mi actividad. Antes de crear una ficha, busca si el miembro ya existe. Distingue el miembro vinculado del responsable. Pregúntame por los datos que falten; no inventes personas, fechas, resultados ni evidencias.

Muéstrame el registro propuesto antes de guardarlo. Usa Idempotency-Key para las altas y la versión actual para cambios o eliminaciones, según el contrato. Comprueba la respuesta y vuelve a consultar el resultado.

Respeta los permisos de mi cuenta y del token. Una tarea completada no equivale a puntos acreditados. No solicites permisos de acreditación para organizar tareas ni publiques mensajes fuera de Grifo.`;
}
