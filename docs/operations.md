# Operación

## Entornos

- Local: PGlite persistente en `.data/grifo` si no existe `DATABASE_URL`.
- Pruebas: PGlite `memory://`; el runner elimina `DATABASE_URL` y `VERCEL` y no carga `.env`.
- Producción: proyecto Vercel `medine-tech/grifo-campaign-plan`, PostgreSQL Neon dedicado `grifo-campaign-plan-db`, integración existente de medine-tech, plan Free.
- Las variables de producción solo se conectaron al entorno production. Para habilitar previews funcionales, provisiona una base o rama aislada y configura sus variables; nunca conectes automáticamente las pruebas a producción.

Vercel publica el código conectado a la rama `main` del repositorio GitHub. El funcionamiento de los formularios requiere que `APP_URL` coincida exactamente con el origen utilizado (sin `/` final). Para cambiar dominio, actualiza esa variable y vuelve a desplegar.

## Migraciones

Las migraciones SQL están versionadas en `db/`. Para un entorno remoto utiliza la conexión directa/unpooled y ejecuta:

```sh
DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:migrate
```

Aplica una migración una sola vez, sin editar las ya aplicadas. Valida el cambio en una base o schema aislado antes de producción. `schema_migrations` registra la versión aplicada. El despliegue de Vercel no modifica el esquema durante el build ni las solicitudes.

## Arranque de cuentas

Configura `SETUP_TOKEN` con un valor aleatorio. La primera alta requiere ese token y crea el administrador, dentro de una transacción que serializa el arranque. Cuando existe un usuario, el token de configuración deja de ser aceptado. Puedes eliminarlo de las variables del despliegue después del alta inicial.

Cada invitación posterior es de un solo uso y vence a los siete días. La cuenta administradora creada para la entrega tiene sus credenciales en un archivo privado local, excluido de Git. Cambia la contraseña desde Configuración; la operación revoca las demás sesiones y los tokens de ese usuario.

No hay recuperación por correo en esta versión. Si se pierde el acceso, el operador de base de datos debe ejecutar una recuperación controlada y revocar sesiones/tokens; nunca incorporar contraseñas al repositorio ni abrir un issue con ellas.

## Copias y operación de datos

Los datos residen en Neon, no en el disco efímero de Vercel. Las opciones de restauración y retención dependen del plan activo del proveedor. Antes de cambios destructivos, crea un respaldo según la política de la organización. No se afirma que se haya configurado un plan de respaldo adicional.

La API tiene límites persistentes por usuario/IP, consultas parametrizadas, controles por propietario/responsable y hashes de tokens y sesiones. Los eventos de auditoría conservan autor, token y acción. Las eliminaciones de registros son lógicas; no eliminan auditoría. Los miembros con relaciones no pueden borrarse: se desactivan con `active=false`.

Revisión, edición y eliminación toman los bloqueos en el mismo orden para evitar interbloqueos y serializan las comprobaciones de puntuación. Esta elección prioriza consistencia para el tamaño de la campaña; una instalación con mucha escritura requeriría perfilar la contención antes de ampliar el diseño.

## Comprobar salud

`GET /api/v1/health` responde 200 con `status: ok` si la aplicación puede consultar el registro de migraciones. Verifica también login, un CRUD con un token de prueba y revocación. No uses un build correcto como sustituto de esa comprobación.

No guardes evidencia de pruebas que incluya tokens completos, contraseñas o URL de conexión. Los fallos públicos devuelven un identificador; los logs de producción registran clase/código, no cuerpo ni credenciales.
