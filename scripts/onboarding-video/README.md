# Grifo: paquete de onboarding

Este generador es una herramienta de mantenimiento; no se ejecuta durante el build de la aplicación. Sus resultados y caché están excluidos de Git en esta carpeta.

La publicación web utiliza `public/onboarding/grifo-en-4-minutos.mp4`, `subtitulos.vtt`, `poster.jpg` y `guion.txt`. Después de regenerar y validar, actualiza esos cuatro archivos juntos; la transcripción pública contiene los capítulos narrados, sin las instrucciones de mantenimiento. El video publicado dura 4:45.

Guía ilustrada narrada en español. El contenido usa únicamente a Ana (cuenta y responsable) y Luis (miembro) como ejemplos ficticios. No representa una grabación de la interfaz ni incluye registros de campaña, credenciales o comprobantes reales. No se utiliza música.

## Entregables

- `grifo-onboarding.mp4`: H.264, 1280 × 720, 24 fps, yuv420p, AAC mono y faststart.
- `grifo-onboarding.es.vtt`: subtítulos en español para una pista HTML `<track kind="captions" srclang="es">`.
- `grifo-onboarding-poster.jpg`: póster 1280 × 720.
- `grifo-onboarding-guion.md`: transcripción, capítulos y enlaces.
- `timeline.json`: tiempos de las 16 escenas.
- `generate_onboarding.py`: generación reproducible.
- `validate_onboarding.py`: validación de duración, formatos, decodificación, faststart y subtítulos.
- `validation.json`: resultados de validación.

La narración usa la voz sintética incorporada Paulina (es_MX) de macOS mediante `say`; no hay clonación de voz ni servicios externos. El script aplica, si es necesario, un pequeño ajuste global de tempo sin cambiar el tono para mantener el video por debajo de cinco minutos. Los tiempos de escenas y subtítulos se ajustan juntos.

Los subtítulos están alineados a las frases sintetizadas. Cuando una frase se divide en varias unidades legibles, el tiempo de esas unidades se distribuye según su cantidad de palabras; no se afirma una alineación palabra por palabra.

## Reproducir en macOS

Requiere Python 3.12 o posterior, la voz Paulina instalada, ffmpeg y ffprobe. El script usa las fuentes Arial y Georgia incorporadas en macOS. Los resultados se generan junto al script y el caché queda en `build/`.

```sh
python3 -m venv .venv
.venv/bin/pip install 'Pillow==12.3.0'
.venv/bin/python generate_onboarding.py
.venv/bin/python validate_onboarding.py
```

Los archivos `build/`, `.venv/`, `grifo-onboarding-narration.wav` y `ffprobe.json` son auxiliares; la publicación web solo necesita MP4, VTT, póster y, opcionalmente, el guion.

## Fuentes y contenido

Las reglas de islas, fichas, estados, revisión y acreditación se contrastaron con `docs/plan-campana.md` y `src/lib/domain.ts`. Acceso y rutas de integración corresponden al onboarding del proyecto. Las puntuaciones y fechas de campaña se omiten deliberadamente para que la guía siga siendo útil.

La guía cubre un código de invitación de un uso y siete días, registro desde Crear cuenta, contraseña propia con mínimo doce caracteres y llegada directa a Empieza aquí después del registro. El ejemplo sigue una Entrada a concurso en Competencia: Preparar la demo del proyecto de Luis. También explica cuenta frente a miembro, las siete islas, identidad única, responsable, próxima acción y vencimiento, evidencia, revisión y acreditación. Trabajar en la isla Administración no concede permisos administrativos. No hay movimientos entre islas ni publicaciones o mensajes automáticos en Skool o X.

La sección opcional de agentes incluye tokens vinculados a la cuenta, elección de vencimiento, revocación desde Mis agentes, permisos `read`, `write` y `approve` (solo cuentas administradoras), la variable privada `GRIFO_TOKEN` y las rutas `/tokens`, `/api/documentation` y `/api/openapi.json`.
