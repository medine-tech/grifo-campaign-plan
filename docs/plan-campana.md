# Del mapa a una operación compartida

## Fuentes y alcance

Se leyó el artefacto completo **Operación Grifo**, versión 4 del lunes 7 de septiembre de 2026: https://claude.ai/code/artifact/c9869384-a403-45e0-8563-de7d9bb28cfb. El mapa aportado define las siete islas; el documento aporta contexto, prioridades, calendario y reglas. El anuncio del segundo concurso, aportado por el usuario el 8 de septiembre, actualiza la apertura, el cierre del domingo 13 a las 23:59 de Chile y el bonus X de +2.

El análisis distingue tres niveles:

- **Dato histórico:** cierre de semana 1, Grifo 375, Pegaso 519, Águila 308. Las categorías comparadas con Pegaso son concursos 95/205, racha 105/135, logros 135/154, referidos 10/20 y ventas 30/5. La brecha total es 144; 110 provienen de concursos. Esta instantánea no es una sincronización en vivo.
- **Plan propuesto:** objetivos de la semana 2 y delegaciones sugeridas en el artefacto. No demuestran que una persona haya aceptado un rol ni que se hayan obtenido puntos.
- **Estado operativo:** registros, responsables, evidencias y revisiones que los usuarios incorporen en esta aplicación.

La proyección del documento (620 puntos nuevos y un posible adelantamiento) depende de supuestos sobre participación y el ritmo rival. No se presenta como resultado ni pronóstico garantizado. La cuota de dos entradas depende de que las bases permitan más de una; el máximo no fue confirmado en el material aportado.

## Diseño de cada isla

### Cazadores

Dos recorridos sobre una única ficha: incorporación de nuevos miembros y reactivación de antiguos. Se registra presentación o última actividad conocida, contexto, etapa de contacto, responsable, fecha y próxima acción. El criterio G–O del primer apellido procede del reto y debe contrastarse con su padrón; no se usa como sustituto de identidad o autorización. “No contactar” permite cerrar el seguimiento sin insistencia automática.

No se importan prospectos comerciales de MedineTech: aquí las personas son integrantes de la comunidad. Las actividades no envían mensajes; el usuario decide las comunicaciones.

### Seguimiento

Contiene compromisos, logros diarios y rachas semanales. Una acción completada demuestra trabajo realizado, no puntuación. Las fechas y bloqueos permiten priorizar; el logro necesita un resultado demostrable y la racha una semana definida. Un mismo miembro enlaza seguimiento, captación y participaciones sin duplicar identidad.

### Ideas

Se captura el problema observado, propuesta, impacto esperado y esfuerzo. Después se registra el resultado del experimento. El estado de trabajo expresa ejecución; la prueba de que funcionó se registra aparte. La isla ayuda a quien aún no sabe qué construir, sin inventar logros para sumar puntos.

### Competencia

Distingue entradas a concursos y observaciones del juego. Una entrada recoge proyecto, miembro, demo, explicación del proceso, impacto y publicación. El bonus X se solicita con enlace y se revisa contra el hashtag, la frase requerida y el enlace desde Skool. Un puesto de podio solo produce puntos al registrar su acreditación oficial.

Las observaciones utilizan fuentes públicas y aprendizajes aplicables. No se diseñó una herramienta para exponer personas o apropiarse de proyectos de otras casas. La prioridad del documento es facilitar participaciones válidas y demostrables.

### Ventas

Registra concepto general, importe y moneda, miembro vendedor, publicación, pago confirmado y enlace al comprobante. El material dice que existían cinco ventas Grifo pendientes de prueba; esto se convierte en una tarea de revisión, no en cinco ventas ficticias ni en puntos ya obtenidos. Límite de cinco ventas acreditadas por persona en esta temporada.

Los enlaces a comprobantes requieren permisos en el servicio que los almacena. La aplicación no hace públicos los archivos ni los descarga para mostrarlos. La lectura operativa se comparte con usuarios invitados a la casa.

### Administración

Organiza tareas, decisiones, vencimientos y responsables. La aceptación de una responsabilidad es un campo explícito. Las delegaciones del artefacto son propuestas y no se convierten automáticamente en asignaciones aceptadas. Administración también gestiona invitaciones y consulta la auditoría desde Configuración.

### Referidos

Relaciona al miembro referente con la persona referida y el enlace de captación. Se distingue invitación, ingreso, trial y pago confirmado. La identidad del referido evita doble acreditación entre usuarios. El pago es condición para enviar a revisión; no se puntúan invitaciones ni trials por sí solos.

## Reglas implementadas

| Evento           | Puntos al acreditar      | Condición                                                          |
| ---------------- | ------------------------ | ------------------------------------------------------------------ |
| Entrada válida   | 5                        | Miembro, publicación, demo, proceso, impacto, acreditación oficial |
| Bonus X de Astra | 2 adicionales            | Enlace X y revisión humana de requisitos                           |
| Podio            | 30 / 20 / 10 adicionales | Puesto y respaldo oficial                                          |
| Venta            | 5                        | Pago demostrado; máximo 5 por miembro/temporada                    |
| Referido         | 10                       | Identidad única y pago demostrado                                  |
| Logro            | 1                        | Un logro por miembro y fecha                                       |
| Racha            | 5                        | Una acreditación por miembro y semana                              |

`pending → submitted → validated → accredited` expresa niveles diferentes de evidencia. Administración puede rechazar o retirar una acreditación con motivo. La puntuación se calcula en el servidor, nunca se recibe como un número libre del agente. Editar reinicia la revisión; antes de editar un registro acreditado se retira su acreditación.

Se bloquea evidencia duplicada incluso cuando cambian fragmentos o parámetros de seguimiento en el enlace, y se comprueba la repetición de comprobantes. La revisión sigue requiriendo criterio humano: no se afirma que dos URLs distintas jamás puedan representar el mismo documento.

## Cruce con la base de conocimiento

Se revisaron fuentes locales de `~/dev/knowledge-base` para extraer patrones, sin copiar información privada de clientes al repositorio público:

- `courses/imperio-agentico/live-systems-audit-construction-erp/live-systems-audit-construction-erp.md`: identidad persistente, responsables y decisiones trazables desde el origen.
- `projects/digital-agency/reto-imperial-ingrid/captacion-playbook.md`: observación concreta, contexto y próxima acción fechada; registrar actividades cuando ocurren.
- `courses/next-rocket/b2b-software-sales-process/b2b-software-sales-process.md`: una actividad no basta para demostrar avance; se registra qué cambió y el próximo paso.
- `courses/imperio-agentico/skool-community-harvest-2026-08-21/skool-community-harvest-2026-08-21.md`: diferenciar una intención verbal de cierre comprobado, subordinando la puntuación a las reglas de este concurso.
- `courses/imperio-agentico/skool-community-harvest-2026-09-07/skool-community-harvest-2026-09-07.md` y `courses/manager-pro-team/brag-document-impact-not-tasks/brag-document-impact-not-tasks.md`: logros por hitos con contribución, resultado y artefacto fechado.
- `courses/zalando/restful-api-guidelines/api-design-principles-and-meta-information.md` y `http-methods-and-status-codes.md`: contrato API publicado con el servicio, errores explícitos e idempotencia en altas.

## Límites deliberados

Una sola campaña/casa por instalación. Sin integración automática con Skool, X o el marcador oficial; sin envíos automáticos ni cargador de comprobantes. La documentación y el código son públicos, pero los registros requieren invitación. Los datos de semana 1 permanecen separados del marcador calculado para evitar doble conteo. La presentación al concurso y la publicación social corresponden al responsable del proyecto.
