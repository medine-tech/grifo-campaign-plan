#!/usr/bin/env python3
"""Rebuild the Grifo illustrated onboarding video on macOS.

Requirements: Python 3.12+, Pillow, /usr/bin/say with Paulina, ffmpeg + ffprobe.
Run: python3 -m venv .venv && .venv/bin/pip install Pillow
     .venv/bin/python generate_onboarding.py
No network services, credentials, real campaign records, or recorded UI are used.
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import textwrap
import wave

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build"
BUILD.mkdir(exist_ok=True)
FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
FFPROBE = shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe"
W, H, SCALE = 1280, 720, 2
NAVY = "#142d33"
CREAM = "#f7f5ef"
GOLD = "#b69b63"
MUTED = "#617276"
PALE = "#e7e7de"
WHITE = "#ffffff"
ISLAND_COLORS = ["#6a8a62", "#5b829b", "#b28a3b", "#9474a2", "#b37455", "#6d7e94", "#578e86"]
FONTROOT = Path("/System/Library/Fonts/Supplemental")

# Copy is intentionally date-independent. Ana and Luis are fictional examples.
SLIDES = [
    {
        "kind": "cover", "chapter": "BIENVENIDA", "title": "De la intención\na la acción.",
        "voice": [
            "Bienvenido a Grifo. Esta guía ilustrada te ayudará a convertir una intención en una acción clara, con una persona responsable y evidencia.",
            "Usaremos dos ejemplos ficticios: Ana, una persona con cuenta, y Luis, un miembro de la comunidad. No son registros reales."
        ],
    },
    {
        "kind": "access", "chapter": "TU ACCESO", "title": "Un código. Tu propia cuenta.",
        "voice": [
            "Para entrar necesitas un código de invitación de administración. Solo puede usarse una vez y vence a los siete días.",
            "Abre Crear cuenta, introduce el código y elige tu propia contraseña de al menos doce caracteres. Al registrarte llegarás a Empieza aquí."
        ],
    },
    {
        "kind": "identity", "chapter": "DOS IDENTIDADES", "title": "Cuenta y miembro cumplen roles distintos.",
        "voice": [
            "Una cuenta permite entrar y hacerse responsable del trabajo. Una ficha de miembro identifica a la persona de la comunidad relacionada con ese trabajo.",
            "En nuestro ejemplo, Ana tiene cuenta y acompaña a Luis. Luis es el miembro del registro. Tener ficha de miembro no crea una cuenta."
        ],
    },
    {
        "kind": "islands_a", "chapter": "LAS SIETE ISLAS · 1 DE 3", "title": "Encontrar, acompañar y probar.",
        "voice": [
            "Cazadores reúne miembros nuevos y reactivaciones. Conserva contexto, etapa de contacto y próxima acción. Respeta el estado No contactar.",
            "Seguimiento reúne compromisos, logros diarios y rachas semanales. Ideas sirve para describir un problema, proponer una solución y registrar el resultado del experimento."
        ],
    },
    {
        "kind": "islands_b", "chapter": "LAS SIETE ISLAS · 2 DE 3", "title": "Participar y demostrar resultados.",
        "voice": [
            "Competencia distingue entradas a concursos de observaciones con fuentes públicas. Una entrada documenta proyecto, demo, proceso, impacto y publicación.",
            "Ventas registra concepto, importe, moneda y evidencia del pago. Referidos sigue la invitación hasta el pago confirmado. Un trial, por sí solo, no acredita un referido."
        ],
    },
    {
        "kind": "admin", "chapter": "LAS SIETE ISLAS · 3 DE 3", "title": "Coordinar también es trabajo.",
        "voice": [
            "Administración organiza tareas, decisiones, fechas y responsables. Una responsabilidad propuesta debe ser aceptada por la persona.",
            "Esta isla es un espacio de coordinación. Trabajar en ella no convierte tu cuenta en administradora ni te concede permiso para acreditar puntos."
        ],
    },
    {
        "kind": "record", "chapter": "PRIMER REGISTRO · PASO 1 DE 6", "title": "Elige la isla y el tipo de registro.",
        "voice": [
            "Vamos con un ejemplo. Ana acompaña a Luis para preparar la demo de su proyecto. Entra en Competencia y crea una Entrada a concurso.",
            "Usa un título concreto: Preparar la demo del proyecto de Luis. Describe el proyecto y el resultado que quieren demostrar."
        ],
    },
    {
        "kind": "people", "chapter": "PRIMER REGISTRO · PASO 2 DE 6", "title": "Una identidad. Un responsable claro.",
        "voice": [
            "Busca primero la ficha de Luis y reutilízala. Si no existe, crea una sola ficha con la información necesaria para identificarlo.",
            "Relaciona el registro con Luis y asigna a Ana como responsable. Esa misma ficha de miembro puede relacionarse con registros de otras islas, sin duplicar a la persona."
        ],
    },
    {
        "kind": "next", "chapter": "PRIMER REGISTRO · PASO 3 DE 6", "title": "Escribe qué sigue y para cuándo.",
        "voice": [
            "Añade una próxima acción observable: por ejemplo, revisar con Luis el enlace de la demo. Elige un vencimiento acordado y una prioridad realista.",
            "Mantén el estado del trabajo al día: Por hacer, En curso, Bloqueado o Completado. Si hay un bloqueo, explica qué necesitan para avanzar."
        ],
    },
    {
        "kind": "evidence", "chapter": "PRIMER REGISTRO · PASO 4 DE 6", "title": "Vincula evidencia que se pueda revisar.",
        "voice": [
            "Cuando haya un resultado, añade la evidencia y completa los campos que pide ese tipo de registro. La prueba debe corresponder a lo que ocurrió.",
            "Para pagos, usa enlaces con permisos adecuados en el servicio que guarda el comprobante. Pegar el enlace en Grifo no vuelve público el archivo."
        ],
    },
    {
        "kind": "review", "chapter": "PRIMER REGISTRO · PASO 5 DE 6", "title": "Envía a revisión cuando corresponda.",
        "voice": [
            "Los registros que pueden puntuar tienen una revisión separada. Sin enviar pasa a En revisión; después puede quedar Validado internamente y finalmente Acreditado.",
            "Solo una cuenta administradora puede acreditar, con respaldo oficial y las comprobaciones de evidencia, duplicados y límites. El sistema calcula los puntos según las reglas."
        ],
    },
    {
        "kind": "states", "chapter": "PRIMER REGISTRO · PASO 6 DE 6", "title": "Completar trabajo no acredita puntos.",
        "voice": [
            "Completado significa que el trabajo terminó. Validado internamente indica una revisión; Acreditado confirma la acreditación. Son estados diferentes.",
            "En esta entrada, completar el proyecto no acredita puntos. Necesita evidencia del resultado y respaldo oficial. Editar el registro reinicia su revisión."
        ],
    },
    {
        "kind": "limits", "chapter": "TRABAJO COMPARTIDO", "title": "Cada paso necesita una acción consciente.",
        "voice": [
            "Grifo conecta el trabajo mediante miembros, responsables y evidencias. No mueve registros automáticamente entre islas.",
            "Tampoco publica ni envía mensajes automáticamente en Skool o en X. La persona responsable realiza esas acciones y registra el resultado. La aplicación no sustituye el marcador oficial."
        ],
    },
    {
        "kind": "agents", "chapter": "OPCIONAL · AGENTES", "title": "Da a tu agente solo los permisos necesarios.",
        "voice": [
            "Si usas un agente, crea un token vinculado a tu cuenta y elige su vencimiento. Read permite leer; write permite escribir. Approve requiere una cuenta administradora.",
            "Guarda el secreto en una variable privada llamada GRIFO, guion bajo, TOKEN. Nunca lo pegues en publicaciones, capturas o archivos públicos. Los agentes respetan las mismas reglas de revisión."
        ],
    },
    {
        "kind": "api", "chapter": "OPCIONAL · AGENTES", "title": "El contrato de la API está disponible.",
        "voice": [
            "La documentación de la API está en la ruta api, barra, documentation. El contrato Open API está en api, barra, openapi punto json.",
            "En Mis agentes puedes gestionar y revocar tus tokens. Las operaciones sobre registros requieren autenticación, aunque la documentación sea pública."
        ],
    },
    {
        "kind": "close", "chapter": "TU PRIMERA ACCIÓN", "title": "Empieza con algo real y pequeño.",
        "voice": [
            "Ahora elige una isla y registra una acción real. Identifica al miembro cuando corresponda, acuerda una persona responsable y define el siguiente paso con su fecha.",
            "Aporta evidencia cuando exista y revisa el avance. Puedes volver a esta guía desde Empieza aquí. El objetivo es que todos sepan qué sigue."
        ],
    },
]


def run(args):
    subprocess.run([str(a) for a in args], check=True)


def duration(path):
    return float(subprocess.check_output([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)], text=True).strip())


class Canvas:
    def __init__(self, dark=False):
        self.dark = dark
        self.im = Image.new("RGB", (W*SCALE, H*SCALE), NAVY if dark else CREAM)
        self.d = ImageDraw.Draw(self.im)

    def font(self, size, bold=False, serif=False):
        name = "Georgia.ttf" if serif else ("Arial Bold.ttf" if bold else "Arial.ttf")
        return ImageFont.truetype(str(FONTROOT/name), int(size*SCALE))

    def text(self, xy, text, size=26, fill=None, bold=False, serif=False, spacing=10):
        x,y=xy
        self.d.multiline_text((int(x*SCALE),int(y*SCALE)), text, font=self.font(size,bold,serif), fill=fill or (CREAM if self.dark else NAVY), spacing=int(spacing*SCALE))

    def wrap(self, value, size, width, bold=False, serif=False):
        out=[]
        for para in value.split("\n"):
            line=""
            for word in para.split():
                candidate=f"{line} {word}".strip()
                if self.d.textlength(candidate,font=self.font(size,bold,serif)) > width*SCALE and line:
                    out.append(line);line=word
                else:line=candidate
            out.append(line)
        return "\n".join(out)

    def box(self, xy, fill=WHITE, outline=None, radius=22, width=1):
        self.d.rounded_rectangle(tuple(int(v*SCALE) for v in xy), radius=radius*SCALE, fill=fill, outline=outline, width=width*SCALE)

    def line(self, xy, fill=GOLD, width=2):
        self.d.line(tuple(int(v*SCALE) for v in xy), fill=fill, width=width*SCALE)

    def circle(self,x,y,r,fill,outline=None,width=1):
        self.d.ellipse(((x-r)*SCALE,(y-r)*SCALE,(x+r)*SCALE,(y+r)*SCALE),fill=fill,outline=outline,width=width*SCALE)

    def arrow(self, x1,y1,x2,y2,fill=GOLD):
        self.line((x1,y1,x2,y2),fill,3)
        ang=math.atan2(y2-y1,x2-x1)
        points=[(x2,y2),(x2-12*math.cos(ang-.5),y2-12*math.sin(ang-.5)),(x2-12*math.cos(ang+.5),y2-12*math.sin(ang+.5))]
        self.d.polygon([(x*SCALE,y*SCALE) for x,y in points],fill=fill)

    def centered(self,x,y,label,size=26,fill=None,bold=False):
        tw=self.d.textlength(label,font=self.font(size,bold)) / SCALE
        self.text((x-tw/2,y),label,size,fill,bold)

    def pill(self,x,y,text,color=GOLD,width=None):
        width=width or self.d.textlength(text,font=self.font(18,True))/SCALE+32
        self.box((x,y,x+width,y+38),fill=color,radius=19)
        self.centered(x+width/2,y+9,text,18,NAVY,True)

    def header(self,slide,i):
        self.text((64,31),"GRIFO",25,GOLD,True)
        self.text((169,37),"GUÍA DE INICIO",14,CREAM if self.dark else MUTED,True)
        chapter=slide["chapter"]
        width=self.d.textlength(chapter,font=self.font(14,True))/SCALE
        self.text((1216-width,37),chapter,14,CREAM if self.dark else MUTED,True)
        self.line((64,79,1216,79),"#345057" if self.dark else "#dedfd5",1)
        self.line((64,669,1216,669),"#345057" if self.dark else "#dedfd5",1)
        self.line((64,669,64+1152*(i+1)/len(SLIDES),669),GOLD,3)
        self.text((64,686),"GUÍA ILUSTRADA · EJEMPLOS FICTICIOS",12,"#aebbb8" if self.dark else MUTED)
        self.text((1141,682),f"{i+1:02d} / {len(SLIDES):02d}",16,GOLD,True)

    def title(self,title,size=52):
        self.text((64,115),self.wrap(title,size,1120,serif=True),size,serif=True,spacing=8)

    def card(self,x,y,w,h,label,title,body,color=GOLD):
        self.box((x,y,x+w,y+h),WHITE,PALE,18)
        self.box((x+22,y+24,x+72,y+74),color,radius=14)
        self.centered(x+47,y+38,label,20,WHITE,True)
        self.text((x+22,y+97),title,30,NAVY,True)
        self.text((x+22,y+147),self.wrap(body,24,w-44),24,MUTED,spacing=10)

    def save(self,path):
        self.im.resize((W,H),Image.Resampling.LANCZOS).save(path)


def make_slide(slide,i):
    k=slide["kind"]
    c=Canvas(k in ("cover","close"))
    c.header(slide,i)
    if k=="cover":
        c.text((64,144),slide["title"],75,serif=True,spacing=5)
        c.text((68,355),"Una acción clara. Una persona responsable.\nEvidencia para avanzar juntos.",27,"#dce2d9",spacing=14)
        c.pill(68,493,"EMPIEZA POR LO QUE SIGUE",width=348)
        c.text((68,570),"Ana y Luis son ejemplos ficticios.\nNarración sintética en español · Sin datos reales",19,"#b7c4bf",spacing=9)
        cx,cy=995,351
        c.circle(cx,cy,177,None,"#345057",2)
        for j in range(7):
            ang=-math.pi/2 + j*2*math.pi/7
            x,y=cx+177*math.cos(ang),cy+177*math.sin(ang)
            c.line((cx,cy,x,y),"#345057",2)
            c.circle(x,y,23,ISLAND_COLORS[j])
            c.centered(x,y-10,str(j+1),19,CREAM,True)
        c.circle(cx,cy,93,GOLD)
        c.centered(cx,cy-52,"G",85,NAVY,True)
        c.centered(cx,586,"7 ISLAS · UNA OPERACIÓN",17,GOLD,True)
    else:
        c.title(slide["title"],48 if len(slide["title"])>46 else 53)
        if k=="access":
            c.card(64,259,352,278,"01","Recibe tu código","Un solo uso\nVigencia: 7 días",ISLAND_COLORS[0])
            c.card(464,259,352,278,"02","Abre Crear cuenta","Código de invitación\nContraseña propia\nMínimo 12 caracteres",ISLAND_COLORS[1])
            c.card(864,259,352,278,"03","Empieza aquí","Al registrarte llegas\ndirectamente a la guía",GOLD)
            c.arrow(426,396,453,396);c.arrow(826,396,853,396)
            c.centered(640,588,"El acceso a los registros requiere una cuenta invitada.",24,MUTED)
        elif k=="identity":
            c.box((64,270,555,544),WHITE,PALE)
            c.box((725,270,1216,544),WHITE,PALE)
            c.circle(130,333,31,NAVY);c.centered(130,314,"A",29,CREAM,True)
            c.text((181,303),"Ana",35,bold=True);c.text((181,350),"Cuenta · responsable",22,MUTED)
            c.text((94,421),"Entra, registra y acompaña.\nTiene permisos según su rol.",25,MUTED,spacing=12)
            c.circle(790,333,31,GOLD);c.centered(790,314,"L",29,CREAM,True)
            c.text((842,303),"Luis",35,bold=True);c.text((842,350),"Miembro de la comunidad",22,MUTED)
            c.text((755,421),"Una ficha para relacionar\nsu trabajo entre las islas.",25,MUTED,spacing=12)
            c.arrow(576,391,704,391)
            c.centered(640,584,"EJEMPLO FICTICIO · Tener ficha de miembro no crea una cuenta.",22,MUTED)
        elif k.startswith("islands_"):
            rows=([
                ("01","Cazadores","Miembro nuevo\nReactivación",0),
                ("02","Seguimiento","Compromiso · Logro diario\nRacha semanal",1),
                ("03","Ideas","Problema · Propuesta\nExperimento · Resultado",2),
            ] if k=="islands_a" else [
                ("04","Competencia","Entrada a concurso\nObservación pública",3),
                ("05","Ventas","Concepto · Importe\nPublicación · Prueba de pago",4),
                ("06","Referidos","Invitado · Ingresó · Trial\nPago confirmado",6),
            ])
            for j,(num,title,body,col) in enumerate(rows):c.card(64+j*392,259,368,310,num,title,body,ISLAND_COLORS[col])
            c.centered(640,606,"Elige la isla por el trabajo que vas a realizar.",24,MUTED)
        elif k=="admin":
            c.card(64,268,509,324,"07","Administración","Tareas · Decisiones · Fechas\nResponsabilidades aceptadas",ISLAND_COLORS[5])
            c.box((629,268,1216,592),NAVY)
            c.text((665,303),"ISLA DE COORDINACIÓN",18,GOLD,True)
            c.text((665,352),"Trabajar aquí",33,CREAM,True)
            c.text((665,410),"no cambia los permisos\nde tu cuenta.",34,CREAM,serif=True,spacing=11)
            c.text((665,530),"Acreditar exige un rol administrador.",23,"#c7d0c9")
        elif k=="record":
            c.box((64,272,454,582),NAVY)
            c.text((94,309),"COMPETENCIA",19,GOLD,True)
            c.text((94,366),"Entrada a concurso",32,CREAM,serif=True)
            c.text((94,433),"Proyecto · Demo · Proceso\nImpacto · Publicación",24,"#c7d0c9",spacing=12)
            c.arrow(474,427,529,427)
            c.box((550,272,1216,582),WHITE,PALE)
            c.text((583,310),"EJEMPLO FICTICIO",16,GOLD,True)
            c.text((583,352),"Preparar la demo\ndel proyecto de Luis",34,bold=True,spacing=8)
            c.text((583,452),"Resultado esperado",18,MUTED,True)
            c.text((583,488),"Tener una demo lista para revisar\ncon Luis.",26,spacing=12)
        elif k=="people":
            c.box((64,264,555,589),WHITE,PALE)
            c.text((96,303),"MIEMBRO",18,MUTED,True)
            c.text((96,350),"Luis",49,serif=True)
            c.text((96,431),"Buscar antes de crear.\nReutilizar la misma ficha.",28,spacing=12)
            c.pill(96,529,"UNA IDENTIDAD",width=207)
            c.box((601,264,1216,589),WHITE,PALE)
            c.text((637,303),"RESPONSABLE",18,MUTED,True)
            c.text((637,350),"Ana",49,serif=True)
            c.text((637,431),"La persona con cuenta que\nacompaña la próxima acción.",28,spacing=12)
            c.pill(637,529,"RESPONSABILIDAD CLARA",width=310)
            c.centered(640,620,"EJEMPLO FICTICIO",16,MUTED,True)
        elif k=="next":
            c.box((64,260,1216,422),NAVY)
            c.text((96,287),"PRÓXIMA ACCIÓN · EJEMPLO FICTICIO",17,GOLD,True)
            c.text((96,337),"Revisar con Luis el enlace de la demo.",35,CREAM,bold=True)
            for j,(a,b) in enumerate([("VENCIMIENTO","Fecha acordada"),("PRIORIDAD","Según la necesidad"),("ESTADO","Mantén el avance al día")]):
                x=64+j*392;c.box((x,454,x+368,590),WHITE,PALE);c.text((x+24,478),a,17,MUTED,True);c.text((x+24,522),b,26,bold=True)
        elif k=="evidence":
            c.card(64,269,546,309,"01","Resultado demostrable","Enlace y contexto que expliquen\nqué ocurrió y cómo comprobarlo.",ISLAND_COLORS[1])
            c.card(654,269,562,309,"02","Acceso al comprobante","El servicio que guarda el archivo\ncontrola sus permisos.",ISLAND_COLORS[4])
            c.centered(640,614,"Completa los campos del tipo de registro elegido.",24,MUTED)
        elif k=="review":
            stages=[("Sin enviar","Evidencia pendiente"),("En revisión","Solicitud enviada"),("Validado","internamente"),("Acreditado","Respaldo oficial")]
            for j,(a,b) in enumerate(stages):
                x=64+j*299;c.box((x,284,x+255,419),NAVY if j==3 else WHITE,None if j==3 else PALE)
                c.centered(x+127.5,311,a,27,CREAM if j==3 else NAVY,True)
                c.centered(x+127.5,360,b,18,"#d2d9d1" if j==3 else MUTED)
                if j<3:c.arrow(x+267,351,x+287,351)
            c.box((64,459,1216,597),"#e9e3d6")
            c.text((94,485),"ACREDITACIÓN: SOLO UNA CUENTA ADMINISTRADORA",18,NAVY,True)
            c.text((94,531),"Evidencia oficial · Duplicados · Límites · Puntos según las reglas",26)
        elif k=="states":
            c.box((64,267,610,570),WHITE,PALE)
            c.text((96,302),"ESTADO DEL TRABAJO",18,MUTED,True)
            for j,lab in enumerate(["Por hacer","En curso","Bloqueado","Completado"]):
                y=349+j*45;c.circle(110,y+12,6,ISLAND_COLORS[1]);c.text((132,y),lab,27,bold=j==3)
            c.box((654,267,1216,570),NAVY)
            c.text((688,302),"ESTADO DE REVISIÓN",18,GOLD,True)
            c.text((688,358),"Entrada a concurso",30,CREAM,True)
            c.text((688,427),"La entrada necesita evidencia\ny respaldo oficial.",26,"#d2d9d1",spacing=13)
            c.centered(640,612,"Editar reinicia la revisión. Antes de editar lo acreditado, se retira la acreditación.",21,MUTED)
        elif k=="limits":
            for j,(n,title,body) in enumerate([
                ("01","Entre islas","Los registros no se mueven\nautomáticamente."),
                ("02","En Skool y X","La persona responsable\npublica y comunica."),
                ("03","En el marcador","La acreditación requiere\nrespaldo oficial."),
            ]):c.card(64+j*392,266,368,327,n,title,body,ISLAND_COLORS[j])
        elif k=="agents":
            for j,(scope,desc,color) in enumerate([("read","Leer",ISLAND_COLORS[1]),("write","Escribir",ISLAND_COLORS[0]),("approve","Solo administradores",GOLD)]):
                x=64+j*392;c.box((x,276,x+368,418),WHITE,PALE);c.text((x+28,304),scope,34,color,True);c.text((x+28,365),desc,25)
            c.box((64,452,1216,599),NAVY)
            c.text((96,477),"VARIABLE PRIVADA · TOKEN VINCULADO A TU CUENTA",17,GOLD,True)
            c.text((96,528),"GRIFO_TOKEN",37,CREAM,True)
            c.text((571,511),"Elige un vencimiento.",22,"#d2d9d1")
            c.text((571,550),"Puedes revocarlo en Mis agentes.",22,"#d2d9d1")
        elif k=="api":
            c.text((64,243),"grifo-campaign-plan.vercel.app",30,MUTED)
            for j,(p,desc) in enumerate([("/api/documentation","Documentación de uso"),("/api/openapi.json","Contrato OpenAPI"),("/tokens","Mis agentes · Gestionar y revocar")]):
                y=311+j*89;c.box((64,y,1216,y+68),WHITE,PALE,12);c.text((89,y+18),p,26,bold=True);c.text((632,y+21),desc,23,MUTED)
            c.centered(640,612,"Los registros operativos requieren autenticación.",24,MUTED)
        elif k=="close":
            steps=["Elige una isla", "Registra una acción", "Acuerda responsable y fecha"]
            for j,s in enumerate(steps):
                y=285+j*86;c.circle(90,y+24,24,GOLD);c.centered(90,y+10,str(j+1),23,NAVY,True);c.text((139,y+6),s,34,CREAM,bold=True)
            c.box((839,270,1216,560),"#203d43")
            c.text((868,305),"TU PUNTO DE PARTIDA",16,GOLD,True)
            c.text((868,363),"Algo real.\nUn siguiente paso.",35,CREAM,serif=True,spacing=14)
            c.text((868,493),"Menú: Empieza aquí",22,"#d2d9d1")
            c.text((64,602),"La evidencia y la revisión acompañan el avance.",24,"#c7d0c9")
    path=BUILD/f"slide-{i+1:02d}.png"
    c.save(path)
    return path


def stamp(seconds):
    ms=round(seconds*1000); h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def caption_lines(text, limit=48):
    # Individual caption utterances are rendered through say, so timing matches
    # actual audio instead of assuming a reading speed.
    return textwrap.fill(text, width=limit)


def speech_chunks(text):
    words=text.split()
    # Balance the chunks to avoid a one-word caption flashing at the end of a
    # long sentence. Limit reading load to about two display lines per cue.
    count=max(1,math.ceil(len(words)/12),math.ceil(len(text)/88))
    size,remainder=divmod(len(words),count)
    chunks=[];cursor=0
    for i in range(count):
        end=cursor+size+(1 if i<remainder else 0)
        chunks.append(" ".join(words[cursor:end]));cursor=end
    return chunks


def make_audio_and_captions(write_audio=True):
    # Every spoken chunk is cached separately, permitting inexpensive visual edits.
    timeline=[]; captions=[]; time=0.0; raw_parts=[]; sentence_index=0
    silence_short=bytes(int(24000*.11)*2)
    silence_slide=bytes(int(24000*.65)*2)
    for i,slide in enumerate(SLIDES):
        start=time; parts=[]; local=0.0
        for para in slide["voice"]:
            # Speak complete sentences for a natural cadence. VTT uses the same
            # utterance boundaries and can wrap to 2-3 lines at player discretion.
            sentences=[s.strip()+"." for s in para.split(". ") if s.strip()]
            for sentence in sentences:
                sentence=sentence.replace("..",".")
                sentence_index+=1
                text_path=BUILD/f"voice-{sentence_index:03d}.txt"
                aiff=BUILD/f"voice-{sentence_index:03d}.aiff"
                wav=BUILD/f"voice-{sentence_index:03d}.wav"
                if not text_path.exists() or text_path.read_text()!=sentence or not wav.exists():
                    text_path.write_text(sentence)
                    run(["/usr/bin/say","-v","Paulina","-r","171","-f",text_path,"-o",aiff])
                    run([FFMPEG,"-hide_banner","-loglevel","error","-y","-i",aiff,"-ar","24000","-ac","1","-c:a","pcm_s16le",wav])
                with wave.open(str(wav),"rb") as w:
                    data=w.readframes(w.getnframes()); dur=w.getnframes()/w.getframerate()
                parts.append(data)
                # Divide each sentence into readable caption units, proportional
                # to word count within the exact measured utterance duration.
                chunks=speech_chunks(sentence);total=sum(len(x.split()) for x in chunks);cursor=time
                for chunk in chunks:
                    end=cursor+dur*len(chunk.split())/total
                    captions.append((cursor,end,chunk));cursor=end
                time+=dur;local+=dur
                parts.append(silence_short);time+=.11;local+=.11
        parts.append(silence_slide);time+=.65;local+=.65
        pcm=b"".join(parts);raw_parts.append(pcm)
        timeline.append({"index":i+1,"title":slide["title"].replace("\n"," "),"start":round(start,3),"end":round(time,3),"duration":round(local,3),"image":f"build/slide-{i+1:02d}.png"})
        print(f"Slide {i+1:02d}: {local:.1f}s — {slide['title'].replace(chr(10),' ')}",flush=True)
    raw=BUILD/"narration-original.wav"
    if write_audio:
        with wave.open(str(raw),"wb") as w:
            w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(b"".join(raw_parts))
    full=ROOT/"grifo-onboarding-narration.wav"
    # Keep the guide under five minutes if the installed voice version has a
    # slower cadence. A small pitch-preserving tempo adjustment applies to the
    # full narration, with matching scaling for slides and captions.
    tempo=time/285 if time>294 else 1.0
    if tempo>1.0:
        if write_audio:
            run([FFMPEG,"-hide_banner","-loglevel","error","-y","-i",raw,"-af",f"atempo={tempo:.10f}","-c:a","pcm_s16le",full])
        for item in timeline:
            for key in ("start","end","duration"):item[key]=round(item[key]/tempo,3)
        captions=[(a/tempo,b/tempo,s) for a,b,s in captions]
    elif write_audio:
        shutil.copy2(raw,full)
    (ROOT/"grifo-onboarding.es.vtt").write_text("WEBVTT\n\n"+"\n\n".join(f"{j+1}\n{stamp(a)} --> {stamp(b)}\n{caption_lines(s)}" for j,(a,b,s) in enumerate(captions))+"\n")
    (ROOT/"timeline.json").write_text(json.dumps(timeline,ensure_ascii=False,indent=2)+"\n")
    return timeline,full


def make_transcript(timeline):
    text=["# Grifo: de la intención a la acción", "", "Guía ilustrada en español. Ana y Luis son ejemplos ficticios; no se usan registros reales. Narración sintética: voz integrada Paulina (es_MX), sin clonación de voz y sin música.", "", "Fuentes de contenido: `docs/plan-campana.md` y `src/lib/domain.ts` del proyecto. Acceso e integración API según el flujo de onboarding del proyecto. No se narran cifras de puntuación ni fechas de campaña.", "", "El video es una explicación ilustrada, no una grabación de pantallas. Las ilustraciones resumen campos y reglas, sin simular interacciones que hayan ocurrido.", ""]
    for slide,item in zip(SLIDES,timeline):
        text.extend([f"## {item['index']:02d}. {item['title']}", "", f"{stamp(item['start'])} → {stamp(item['end'])}", "", *[p+"\n" for p in slide["voice"]]])
    text.extend(["## Recursos", "", "- Empieza aquí: https://grifo-campaign-plan.vercel.app/onboarding", "- Documentación: https://grifo-campaign-plan.vercel.app/api/documentation", "- OpenAPI: https://grifo-campaign-plan.vercel.app/api/openapi.json", "- Mis agentes: https://grifo-campaign-plan.vercel.app/tokens", "", "Variable privada para el agente: `GRIFO_TOKEN`. Los permisos disponibles son `read`, `write` y `approve`; este último requiere una cuenta administradora. Elige un vencimiento al crear el token; puedes revocarlo desde Mis agentes.", "", "## Reproducir", "", "En macOS, instala Pillow en un entorno virtual y ejecuta `generate_onboarding.py`. El script usa la voz integrada Paulina y ffmpeg/ffprobe. Cada audio generado queda en caché para poder volver a renderizar las ilustraciones; cambiar el texto invalida el audio correspondiente. El resultado incluye MP4 H.264/AAC, WebVTT, póster JPEG, narración WAV y un índice temporal JSON.", ""])
    (ROOT/"grifo-onboarding-guion.md").write_text("\n".join(text))


def main():
    paths=[make_slide(s,i) for i,s in enumerate(SLIDES)]
    timeline,audio=make_audio_and_captions()
    # Concat stills; 24 fps preserves broad playback support and allows the
    # player to seek accurately. H.264 encodes static artwork efficiently.
    concat=BUILD/"slides.ffconcat"
    content=["ffconcat version 1.0"]
    for p,t in zip(paths,timeline):content.extend([f"file '{p}'",f"duration {t['duration']:.3f}"])
    content.append(f"file '{paths[-1]}'")
    concat.write_text("\n".join(content)+"\n")
    out=ROOT/"grifo-onboarding.mp4"
    run([FFMPEG,"-hide_banner","-loglevel","warning","-y","-safe","0","-f","concat","-i",concat,"-i",audio,"-map","0:v:0","-map","1:a:0","-r","24","-c:v","libx264","-preset","slow","-tune","stillimage","-crf","24","-pix_fmt","yuv420p","-c:a","aac","-b:a","72k","-ar","48000","-ac","1","-movflags","+faststart","-t",f"{duration(audio):.5f}",out])
    Image.open(paths[0]).save(ROOT/"grifo-onboarding-poster.jpg",quality=94,subsampling=0)
    make_transcript(timeline)
    metadata=json.loads(subprocess.check_output([FFPROBE,"-v","error","-show_format","-show_streams","-of","json",out],text=True))
    (ROOT/"ffprobe.json").write_text(json.dumps(metadata,indent=2)+"\n")
    print(f"Finished: {out}\nDuration: {duration(out):.2f}s\nSize: {out.stat().st_size/1024/1024:.2f} MiB",flush=True)


if __name__=="__main__":main()
