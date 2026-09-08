# Grifo · Plan de campaña

Centro de operaciones de la Casa del Grifo: siete islas para coordinar personas, ideas, concursos, ventas y referidos. Interfaz en español, cuentas con contraseña y una API documentada para agentes.

- **Aplicación:** https://grifo-campaign-plan.vercel.app
- **Empieza aquí:** https://grifo-campaign-plan.vercel.app/onboarding
- **API interactiva:** https://grifo-campaign-plan.vercel.app/api/documentation
- **OpenAPI 3.1:** https://grifo-campaign-plan.vercel.app/api/openapi.json
- **Guía para agentes:** https://grifo-campaign-plan.vercel.app/llms.txt
- **Plan y decisiones:** [docs/plan-campana.md](docs/plan-campana.md)
- **Operación y despliegue:** [docs/operations.md](docs/operations.md)

## Áreas

| Isla           | Registros                   | Propósito                                  |
| -------------- | --------------------------- | ------------------------------------------ |
| Cazadores      | Nuevos y reactivaciones     | Incorporar y activar miembros              |
| Seguimiento    | Compromisos, logros, rachas | Dar continuidad y detectar bloqueos        |
| Ideas          | Problemas y experimentos    | Convertir propuestas en resultados         |
| Competencia    | Entradas y observaciones    | Construir, publicar y demostrar            |
| Ventas         | Ventas y comprobantes       | Seguir la evidencia hasta la acreditación  |
| Administración | Acciones y acuerdos         | Coordinar responsabilidades y fechas       |
| Referidos      | Invitaciones y pagos        | Acompañar una relación hasta su conversión |

Cada registro comparte miembro, responsable, fecha, próxima acción, estado y evidencia. La revisión interna y la acreditación oficial son estados distintos. Los dashboards muestran datos persistidos; no contienen actividad ficticia.

## Onboarding

La guía pública `/onboarding` explica las siete islas, cuenta/miembro/responsable, estados de trabajo y acreditación, e incluye un recorrido ilustrativo de seis pasos. Sus controles no crean actividad ni consultan los registros de campaña. Las cuentas nuevas llegan a la guía después del registro; las demás pueden abrirla desde el menú, el dashboard y las páginas de acceso.

Los enlaces de la guía conservan la isla elegida al iniciar sesión. El destino se limita a rutas conocidas para impedir redirecciones externas. La sección opcional para agentes ofrece instrucciones copiables sin credenciales y enlaces al contrato API.

El video ilustrado, subtítulos en español y transcripción están en `public/onboarding/`. Se reproduce a petición, sin autoplay; puede descargarse para compartir. Ana y Luis son personajes ficticios del ejemplo. No hay progreso obligatorio ni cambios de permisos por completar el recorrido.

## Ejecutar localmente

Requiere Node.js 24 y npm.

```sh
npm ci
cp .env.example .env.local
# Cambia SETUP_TOKEN por un secreto aleatorio.
npm run dev
```

Abre http://localhost:3000/register. La primera cuenta utiliza `SETUP_TOKEN` y será administradora. Después, administración crea invitaciones de un solo uso desde Configuración. El servidor guarda los datos locales en `.data/grifo`; nunca se suben a Git.

No se incluye una contraseña predeterminada. Las credenciales y tokens se almacenan como hashes; las sesiones son HttpOnly, SameSite=Lax y Secure en producción. Cambiar contraseña revoca otras sesiones y todos los tokens del usuario.

## Conectar un agente

Genera un token en **Mis agentes** con los permisos y vencimiento que necesites. Entrégale el contrato OpenAPI y usa:

```sh
export GRIFO_TOKEN='TU_TOKEN_PRIVADO'
curl https://grifo-campaign-plan.vercel.app/api/v1/islands \
  -H "Authorization: Bearer $GRIFO_TOKEN"
```

`read` permite consultar; `write`, modificar registros autorizados; `approve`, junto con `write` y una cuenta administradora, acreditar puntos. Los tokens no administran credenciales ni invitaciones. Usa `Idempotency-Key` en las altas y `version` en actualizaciones y eliminaciones.

Los usuarios invitados comparten la campaña. Autor, responsable y administrador pueden editar un registro; los demás tienen lectura. No existe registro abierto sin invitación.

## Verificación

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

La suite de integración usa PGlite **en memoria**, elimina la configuración de base remota y no carga archivos `.env`. Verifica permisos, CRUD de los once tipos, idempotencia, acreditación, límites y duplicados. Su concurrencia de solicitudes no sustituye una prueba de múltiples conexiones PostgreSQL.

## Stack y despliegue

Next.js **16.3.4**, React 19, TypeScript, PostgreSQL en Neon, Vercel, Zod, Swagger UI y Lucide. PGlite se usa solo en desarrollo/pruebas. Las migraciones versionadas se ejecutan explícitamente antes de publicar; nunca durante una solicitud en producción.

El repositorio público contiene código y documentación. La base, las credenciales y los comprobantes no forman parte del repositorio. Los comprobantes se referencian mediante enlaces a archivos con permisos propios; esta versión no aloja archivos.

## Colaborar

Puedes [abrir un issue](https://github.com/medine-tech/grifo-campaign-plan/issues) con un problema o propuesta. Incluye pasos para reproducir y el resultado esperado. No compartas tokens, contraseñas, datos personales ni comprobantes privados. Para vulnerabilidades, utiliza el reporte privado de seguridad del repositorio.

Licencia MIT para el código. El mapa de campaña fue aportado por el responsable del proyecto; no se afirma autoría propia ni se concede una licencia independiente sobre ese recurso.
