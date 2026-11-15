import datetime
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Cm, Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "screenshots"
LOGO_PATH = ROOT / "public" / "logo.png"
OUT_DOCX = ROOT / "docs" / "MANUAL_FUNCIONAL_247_STUDIO.docx"

NAVY = RGBColor(10, 17, 31)      # #0A111F
NAVY_MID = RGBColor(19, 28, 48)  # #131C30
RED = RGBColor(185, 28, 28)      # #B91C1C
SLATE = RGBColor(51, 65, 85)     # #334155
MUTED = RGBColor(100, 116, 139)  # #64748B
WHITE = RGBColor(255, 255, 255)


def set_cell_bg(cell, hex_color: str):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def set_cell_margins(cell, top=110, bottom=110, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for side, val in (("top", top), ("bottom", bottom), ("left", left), ("right", right)):
        node = OxmlElement(f"w:{side}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def add_bottom_border(paragraph, color_hex="B91C1C", sz="12"):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="{sz}" w:space="6" w:color="{color_hex}"/></w:pBdr>'
    )
    pPr.append(pBdr)


def add_callout(doc: Document, title: str, bullets: list[str], border_hex="B91C1C", bg_hex="FEF2F2"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_bg(cell, bg_hex)
    set_cell_margins(cell, top=130, bottom=130, left=200, right=180)
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/>'
        f'<w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/>'
        f"</w:tcBorders>"
    )
    tcPr.append(borders)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    r_title = p.add_run(title)
    r_title.bold = True
    r_title.font.size = Pt(10.5)
    r_title.font.color.rgb = RED if border_hex == "B91C1C" else NAVY

    for b in bullets:
        bp = cell.add_paragraph()
        bp.paragraph_format.space_before = Pt(2)
        bp.paragraph_format.space_after = Pt(2)
        bp.paragraph_format.left_indent = Cm(0.35)
        r = bp.add_run(f"• {b}")
        r.font.size = Pt(9.8)
        r.font.color.rgb = SLATE

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_before = Pt(0)
    spacer.paragraph_format.space_after = Pt(6)


def add_section_heading(doc: Document, num: str, title: str):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    r_num = p.add_run(f"{num}  ")
    r_num.bold = True
    r_num.font.size = Pt(15)
    r_num.font.color.rgb = RED
    r_t = p.add_run(title.upper())
    r_t.bold = True
    r_t.font.size = Pt(15)
    r_t.font.color.rgb = NAVY
    add_bottom_border(p, "CBD5E1", "6")


def add_sub_heading(doc: Document, title: str):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(title)
    r.bold = True
    r.font.size = Pt(12)
    r.font.color.rgb = NAVY_MID


def add_body(doc: Document, text: str, bold_prefix: str | None = None):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(5)
    if bold_prefix:
        rb = p.add_run(bold_prefix)
        rb.bold = True
        rb.font.size = Pt(10.5)
        rb.font.color.rgb = NAVY
    r = p.add_run(text)
    r.font.size = Pt(10.5)
    r.font.color.rgb = SLATE
    return p


def add_bullet(doc: Document, text: str, bold_prefix: str | None = None):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(3)
    if bold_prefix:
        rb = p.add_run(bold_prefix)
        rb.bold = True
        rb.font.size = Pt(10.2)
        rb.font.color.rgb = NAVY
    r = p.add_run(text)
    r.font.size = Pt(10.2)
    r.font.color.rgb = SLATE
    return p


def add_screenshot(doc: Document, filename: str, caption: str, width_in: float = 5.9):
    img_path = SHOTS / filename
    if not img_path.exists():
        add_body(doc, f"[Captura pendiente: {filename}] — {caption}")
        return
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(6)
    p_img.paragraph_format.space_after = Pt(3)
    p_img.paragraph_format.keep_with_next = True
    p_img.add_run().add_picture(str(img_path), width=Inches(width_in))

    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(0)
    p_cap.paragraph_format.space_after = Pt(10)
    rc = p_cap.add_run(caption)
    rc.italic = True
    rc.font.size = Pt(9)
    rc.font.color.rgb = MUTED


def add_styled_table(doc: Document, headers: list[str], rows: list[list[str]], col_widths=None):
    tbl = doc.add_table(rows=1 + len(rows), cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.style = "Table Grid"

    # Header row
    hdr_cells = tbl.rows[0].cells
    for idx, text in enumerate(headers):
        cell = hdr_cells[idx]
        if col_widths:
            cell.width = Inches(col_widths[idx])
        set_cell_bg(cell, "0A111F")
        set_cell_margins(cell, top=110, bottom=110, left=120, right=120)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = WHITE

    # Data rows
    for r_idx, row_vals in enumerate(rows):
        row_cells = tbl.rows[r_idx + 1].cells
        bg = "FFFFFF" if r_idx % 2 == 0 else "F8FAFC"
        for c_idx, val in enumerate(row_vals):
            cell = row_cells[c_idx]
            if col_widths:
                cell.width = Inches(col_widths[c_idx])
            set_cell_bg(cell, bg)
            set_cell_margins(cell, top=90, bottom=90, left=120, right=120)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(9.3)
            r.font.color.rgb = NAVY if c_idx == 0 else SLATE
            if c_idx == 0:
                r.bold = True

    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(6)


def add_page_number_field(paragraph):
    run = paragraph.add_run("Página ")
    run.font.size = Pt(8.5)
    run.font.color.rgb = MUTED
    fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls("w"))
    instrText = parse_xml(r'<w:instrText %s xml:space="preserve"> PAGE </w:instrText>' % nsdecls("w"))
    fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls("w"))
    fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls("w"))
    r_num = paragraph.add_run()
    r_num.font.size = Pt(8.5)
    r_num.font.color.rgb = MUTED
    r_num._r.append(fldChar1)
    r_num._r.append(instrText)
    r_num._r.append(fldChar2)
    r_num._r.append(fldChar3)


def build_manual():
    doc = Document()

    # Configuración general de página (A4)
    sec = doc.sections[0]
    sec.page_width = Cm(21.0)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(2.0)
    sec.bottom_margin = Cm(2.0)
    sec.left_margin = Cm(2.0)
    sec.right_margin = Cm(2.0)
    sec.different_first_page_header_footer = True

    # Fuente base
    normal_style = doc.styles["Normal"]
    normal_style.font.name = "Calibri"
    normal_style.font.size = Pt(10.5)

    # Cabecera y pie (desde página 2)
    hdr_p = sec.header.paragraphs[0]
    hdr_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    rh = hdr_p.add_run("247 STUDIO  ·  Manual Funcional de Operativa y Reglas de la App")
    rh.font.size = Pt(8.5)
    rh.font.color.rgb = MUTED

    ftr_p = sec.footer.paragraphs[0]
    ftr_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    rf = ftr_p.add_run("Guía de uso para Dirección, Profesores y Alumnos   |   ")
    rf.font.size = Pt(8.5)
    rf.font.color.rgb = MUTED
    add_page_number_field(ftr_p)

    # =========================================================================
    # PORTADA
    # =========================================================================
    if LOGO_PATH.exists():
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(35)
        p_logo.paragraph_format.space_after = Pt(18)
        p_logo.add_run().add_picture(str(LOGO_PATH), width=Inches(1.6))

    p_brand = doc.add_paragraph()
    p_brand.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_brand.paragraph_format.space_after = Pt(4)
    rb = p_brand.add_run("247 STUDIO · PINTO (MADRID)")
    rb.bold = True
    rb.font.size = Pt(11)
    rb.font.color.rgb = RED

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(8)
    rt = p_title.add_run("MANUAL FUNCIONAL DE LA APP")
    rt.bold = True
    rt.font.size = Pt(26)
    rt.font.color.rgb = NAVY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(24)
    rs = p_sub.add_run(
        "Guía operativa completa para Dirección (Mario & David), Profesores y Alumnos.\n"
        "Incluye pantallas reales, explicación de botones, flujos diarios y restricciones del sistema."
    )
    rs.font.size = Pt(11.5)
    rs.font.color.rgb = SLATE

    today_str = datetime.date.today().strftime("%d/%m/%Y")
    add_styled_table(
        doc,
        ["Campo del Documento", "Detalle"],
        [
            ["Academia / Producto", "247 STUDIO — App privada de gestión deportiva y alumnos"],
            ["Dirigido a", "Dirección (Admin), Profesores (Coach) y Alumnos"],
            ["Estado", "Documento vivo (se actualiza automáticamente con cada nueva función o regla)"],
            ["Última actualización", today_str],
            ["Idioma y Enfoque", "100% funcional y operativo (sin detalles técnicos internos)"],
        ],
        col_widths=[2.2, 4.3],
    )

    add_callout(
        doc,
        "¿Qué encontrarás en este manual?",
        [
            "Qué puede ver y hacer exactamente cada perfil (Dirección, Profesor y Alumno) y qué tiene bloqueado.",
            "Cómo dar de alta a un alumno en 30 segundos, cómo accede el primer día y cómo recupera su clave.",
            "Cómo instalar la app en el móvil y usarla como una aplicación más (sin menús del navegador).",
            "Cómo pasar lista en el tatami, previsualizar el próximo día con clase y registrar clases de prueba.",
            "Cómo cobrar en segundos aunque haya más de 150 alumnos: buscador, pendientes por urgencia y ficha de cada alumno (solo Efectivo y Bizum).",
            "Cómo saber cuánto gana o pierde la academia cada mes: gastos fijos y puntuales, resultado y punto de equilibrio.",
        ],
        border_hex="0A111F",
        bg_hex="F1F5F9",
    )

    doc.add_page_break()

    # =========================================================================
    # SECCIÓN 1: ROLES, PERMISOS Y RESTRICCIONES
    # =========================================================================
    add_section_heading(doc, "01", "Roles de Acceso y Permisos")
    add_body(
        doc,
        "La aplicación es totalmente privada: no existe registro abierto al público. Cada usuario entra con su correo y una contraseña personal, y la pantalla que ve se adapta automáticamente a su rol dentro de la escuela.",
    )

    add_styled_table(
        doc,
        ["Funcionalidad", "Dirección (Admin)", "Profesor (Coach)", "Alumno"],
        [
            ["Resumen mensual y Centro de Alertas", "Acceso total", "NO visible", "NO visible"],
            ["Pestaña KPIs tipo Power BI", "Acceso total", "NO visible", "NO visible"],
            ["Cobros: cuotas pendientes, cobrar y pagos adelantados", "Acceso total", "NO visible", "NO visible"],
            ["Finanzas: resultado del mes y gastos", "Acceso total", "NO visible", "NO visible"],
            ["Alta de alumnos, edición de cinturones y bajas", "Acceso total", "NO visible", "Solo edita su teléfono/emergencia/objetivos"],
            ["Pasar Lista y registrar Invitado / Clase Prueba", "Sí", "Sí (pantalla principal)", "NO visible"],
            ["Consultar horarios de la semana (filtro por día)", "Edita y avisa cambios", "Solo consulta", "Solo consulta"],
            ["Tablón / Foro interno", "Publica anuncios", "Publica anuncios", "Solo lectura (no publica)"],
            ["Chat privado Dirección ↔ Alumno", "Responde a todos", "NO visible", "Habla solo con Dirección"],
            ["Eventos, Avisos y FAQs", "Crea y elimina", "NO visible", "Solo consulta"],
            ["Tarifas y planes", "Crea, edita y desactiva", "NO visible", "Solo consulta tarifas activas"],
            ["Firmas digitales (RGPD / Normas)", "Consulta todas las firmas", "NO visible", "Firma con el dedo en su perfil"],
        ],
        col_widths=[2.5, 1.35, 1.3, 1.35],
    )

    add_callout(
        doc,
        "Restricciones clave de seguridad y privacidad",
        [
            "Los profesores NO tienen acceso a precios, tarifas cobradas, estado de pagos, gastos ni ningún dato económico de la academia o de los alumnos.",
            "Los alumnos nunca pueden cambiar por su cuenta su rol, su cinturón, sus grados ni el estado de su suscripción.",
            "Cuando un alumno se da de baja (estado Baja), pierde automáticamente el acceso a horarios, foro, eventos y avisos, conservando Dirección todo su historial.",
            "La app está pensada para el día a día interno; los vídeos de técnica y la captación comercial pública siguen viviendo en la web oficial (www.247studiobjj.com).",
        ],
    )

    # =========================================================================
    # SECCIÓN 2: INSTALAR Y USAR LA APP COMO APLICACIÓN
    # =========================================================================
    add_section_heading(doc, "02", "Instalar y Usar la App en el Móvil")
    add_body(
        doc,
        "La app de 247 STUDIO se abre desde el navegador, pero está preparada para instalarse en el móvil o la tablet y funcionar como una aplicación más: con su icono, a pantalla completa y sin las barras ni los menús del navegador.",
    )
    add_sub_heading(doc, "Cómo instalarla")
    add_bullet(doc, "Abre la dirección de la app en Chrome, toca el menú (⋮) y elige «Instalar aplicación» o «Añadir a pantalla de inicio».", "Android: ")
    add_bullet(doc, "Abre la dirección de la app en Safari, toca el botón Compartir y elige «Añadir a pantalla de inicio».", "iPhone / iPad: ")
    add_bullet(doc, "Abre la app en Chrome o Edge y pulsa el icono de instalar que aparece en la barra de direcciones.", "Ordenador: ")

    add_sub_heading(doc, "Comportamiento de aplicación")
    add_bullet(doc, "Mantener pulsado sobre un botón, una imagen o un texto ya no abre el menú del navegador ni permite abrir la app fuera de ella.", "Sin menú de pulsación larga: ")
    add_bullet(doc, "El texto de las pantallas no se selecciona por accidente al tocar. En los campos donde se escribe (buscadores, formularios, notas) se puede seguir copiando y pegando con normalidad.", "Sin selección accidental: ")
    add_bullet(doc, "La pantalla no se amplía al pellizcar ni rebota al llegar arriba o abajo, como en una app nativa.", "Sin zoom ni rebote: ")
    add_bullet(doc, "En el móvil de Dirección, la barra inferior da acceso directo a Lista, Cobros, Alumnos y Finanzas. El resto de pantallas (Resumen, KPIs, Horarios, Tarifas, Comunicación) están en «Más».", "Menú inferior: ")

    add_screenshot(
        doc,
        "18_mobile_finance.jpg",
        "App en el móvil de Dirección: pantalla Finanzas con el menú inferior (Lista, Cobros, Alumnos, Finanzas y Más).",
        width_in=2.6,
    )

    add_callout(
        doc,
        "Tablet fija en recepción (modo kiosco)",
        [
            "Si se deja una tablet fija en recepción, conviene activar el bloqueo en una sola app del propio dispositivo: «Fijar pantalla» en Android o «Acceso guiado» en iPad. Así nadie puede salir de la app ni abrir otras.",
            "Recomendación: en esa tablet, iniciar sesión con una cuenta de Profesor (para pasar lista) y no con la de Dirección, porque la sesión queda abierta para quien la toque.",
            "Tras una actualización de la app, si el móvil sigue mostrando la versión anterior, basta con cerrar la app por completo y volver a abrirla.",
        ],
        border_hex="0A111F",
        bg_hex="F1F5F9",
    )

    # =========================================================================
    # SECCIÓN 3: FLUJO DE ALTA, PRIMER ACCESO Y RECUPERACIÓN
    # =========================================================================
    add_section_heading(doc, "03", "Flujo Completo: Clase de Prueba, Alta y Acceso")

    add_sub_heading(doc, "Paso 0 · Si viene a probar antes de apuntarse")
    add_body(
        doc,
        "Cuando alguien llega a probar una clase por primera vez, NO se le crea ficha de alumno todavía para no ensuciar la base de datos ni las estadísticas.",
    )
    add_bullet(
        doc,
        "Desde Pasar Lista, el profesor o Dirección pulsa el botón «+ Invitado / Clase Prueba» y anota 5 datos estructurados: Nombre y apellidos, Teléfono, Email, Disciplina de prueba y Fecha en la que vino a probar.",
    )
    add_bullet(
        doc,
        "Si decide apuntarse ese mismo día o días después, Dirección verá al invitado en la parte superior de Alumnos con el botón «Dar de alta ahora» para rellenar automáticamente sus datos sin escribirlos dos veces.",
    )

    add_sub_heading(doc, "Paso 1 · Alta rápida en recepción (Panel Admin → Alumnos → + Nuevo Alumno)")
    add_body(
        doc,
        "Al pulsar «+ Nuevo Alumno», Dirección rellena únicamente los datos imprescindibles para no hacer esperar al alumno en recepción:",
    )
    add_bullet(doc, "Nombre y apellidos, Email de acceso, Teléfono y Fecha de nacimiento.", "Datos personales: ")
    add_bullet(doc, "Foto tomada al instante con la cámara del móvil/tablet o elegida de la galería (opcional; también puede subirla el alumno después).", "Foto de perfil: ")
    add_bullet(doc, "Rol (Alumno o Profesor), Cinturón inicial (Blanco por defecto) y Tarifa mensual.", "Plan y nivel: ")
    add_bullet(doc, "Casilla «¿Ha abonado ya el primer mes?». Si marca Sí, elige únicamente entre Efectivo o Bizum y el mes queda en Pago OK al instante. Si marca No, queda pendiente y la regla de 7 días arrancará cuando pise el tatami.", "Cobro inicial: ")

    add_screenshot(
        doc,
        "05_admin_new_student_modal.png",
        "Pantalla Alta Nuevo Usuario: captura rápida de datos, foto desde cámara/galería, selección de tarifa y cobro inicial (Efectivo / Bizum).",
    )

    add_body(
        doc,
        "Al pulsar «Crear Usuario», el sistema genera automáticamente una contraseña temporal única (por ejemplo 247-4821) y muestra una tarjeta en pantalla con un botón para copiarla o enviarla por WhatsApp al alumno en ese momento.",
    )

    add_sub_heading(doc, "Paso 2 · Primer acceso del alumno y cambio obligatorio de contraseña")
    add_body(
        doc,
        "El alumno abre la app, introduce su email y la clave temporal que le diste en recepción. Nada más entrar, por seguridad la app bloquea el resto de menús hasta que establezca su contraseña personal definitiva.",
    )
    add_screenshot(
        doc,
        "01_login.png",
        "Pantalla de acceso único para Dirección, Profesores y Alumnos. Incluye el acceso a «¿Olvidaste tu contraseña?».",
        width_in=4.8,
    )
    add_screenshot(
        doc,
        "02_set_password.png",
        "Pantalla obligatoria de primer acceso (y al abrir enlaces de recuperación): el alumno define su clave personal antes de ver su ficha.",
        width_in=4.8,
    )

    add_sub_heading(doc, "Paso 3 · Recuperación en caso de olvido")
    add_body(
        doc,
        "Si un alumno o profesor olvida su contraseña en cualquier momento, pulsa «¿Olvidaste tu contraseña?» en la pantalla de entrada, introduce su email y recibe un correo oficial con un enlace directo que abre de nuevo la pantalla «Establece tu Contraseña».",
    )

    # =========================================================================
    # SECCIÓN 3: PANEL DE DIRECCIÓN — RESUMEN, KPIs POWER BI Y ALUMNOS
    # =========================================================================
    add_section_heading(doc, "04", "Panel de Dirección: Resumen, KPIs Power BI y Alumnos")
    add_body(
        doc,
        "Al iniciar sesión, Dirección accede directamente al Resumen Mensual (con selector de mes) para controlar la operativa diaria de cobros, asistencias y alertas accionables.",
    )
    add_screenshot(
        doc,
        "03_admin_home.jpg",
        "Resumen Mensual (Dirección): cuotas cobradas del mes, pendiente, morosos, alumnos activos, cuotas por programa, quién está hoy en el tatami y Centro de Alertas.",
    )
    add_bullet(doc, "Muestra las cuotas del mes cobradas frente al mes anterior, el ticket medio por alumno, lo pendiente, los morosos con su deuda histórica y el porcentaje de cobro por programa. El botón «Ir a Cobros» lleva directamente a la pantalla de cobro.", "Cuotas y cobros del mes: ")
    add_bullet(doc, "Desglosa lo realmente cobrado en el mes (por la fecha en que entró el dinero) entre Efectivo y Bizum.", "Cobrado por método de pago: ")
    add_bullet(doc, "Incluye 4 pestañas rápidas: Inactivos (+15 días sin entrenar), Bonos por agotarse (≤2 créditos), Alumnos en gracia de 7 días / deuda y Alertas legales / menores sin datos de tutor.", "Centro de Alertas Unificado: ")
    add_bullet(doc, "Desde cualquier pantalla, Ctrl + K (o la lupa en el móvil) abre un buscador para saltar a un alumno o a cualquier sección.", "Buscador rápido: ")

    add_sub_heading(doc, "Pestaña «KPIs» tipo Power BI")
    add_body(
        doc,
        "Accesible desde el menú lateral justo debajo de Resumen, ofrece un cuadro de mando analítico interactivo con selectores por Mes y por Disciplina que recalculan los indicadores al momento:",
    )
    add_bullet(doc, "5 tarjetas superiores: «Cuotas del mes cobradas» (cuenta las cuotas de ese mes, aunque se hayan cobrado otro mes; lo que entró realmente en caja está en Finanzas), pendiente + deuda previa, tasa de cobro, asistencias del mes y captación/riesgo.", "Tarjetas KPI Ejecutivas: ")
    add_bullet(doc, "Gráfico combinado de los últimos 6 meses con barras de cuotas (cobrado vs pendiente) y línea superpuesta de asistencias con detalle al pasar el ratón.", "Tendencia Histórica 6 Meses: ")
    add_bullet(doc, "Dos gráficos circulares para el reparto por método de pago (Efectivo / Bizum / Otros) y el estado de las cuotas del mes (Pagado / En plazo / Vencido).", "Gráficos Circulares de Cobro y Cartera: ")
    add_bullet(doc, "Distribución de cinturones activos, conteo de Kids (≤14 años) y Socios Fundadores, % de firmas legales al día, pruebas vs altas y estado medio de bonos.", "Radiografía, Salud Legal y Bonos: ")
    add_bullet(doc, "Mapa de Calor Semanal (Día × Franja Mañana / Tarde) y tabla de ocupación por clase con media de alumnos por sesión.", "Matriz Semanal y Ocupación: ")
    add_bullet(doc, "Si alguna parte de los datos no se ha podido cargar, la pantalla lo avisa en vez de mostrar cifras incompletas como si fueran reales.", "Aviso de datos incompletos: ")

    add_body(
        doc,
        "En la pestaña Alumnos se gestiona toda la base de datos de socios activos, pausados y bajas, además de los invitados que vinieron a probar y están pendientes de alta definitiva.",
    )
    add_screenshot(
        doc,
        "04_admin_students.png",
        "Listado de Alumnos e Invitados: buscador, filtros por estado (Activos, Pausados, Bajas), acceso a ficha completa y botón «+ Nuevo Alumno».",
    )
    add_bullet(doc, "Al pulsar sobre cualquier alumno se puede editar su estado (Activo, Pausado o Baja), su foto, sus datos de contacto, su cinturón y grados (0 a 4), alias de tatami (útil si hay dos alumnos con el mismo nombre), fecha de nacimiento, su tarifa del mes y vincular hermanos menores con un tutor.", "Edición completa de ficha: ")
    add_bullet(doc, "Nunca se borra un alumno de forma destructiva para preservar el histórico contable y de asistencias; en su lugar se pasa a estado Baja, desactivando automáticamente su suscripción del mes en curso y mostrando un aviso claro si intenta entrar con sesión abierta.", "Restricción de borrado y Bajas: ")

    # =========================================================================
    # SECCIÓN 4: PASAR LISTA EN EL TATAMI
    # =========================================================================
    add_section_heading(doc, "05", "Pasar Lista en el Tatami (Profesores y Dirección)")
    add_body(
        doc,
        "Pensada para usarse en un móvil o tablet en 10 segundos antes o durante la clase. Como en el horario de 247 STUDIO nunca coinciden dos clases simultáneas a la misma hora, la selección de clase es directa y sin confusiones.",
    )
    add_screenshot(
        doc,
        "11_coach_attendance.png",
        "Pantalla Pasar Lista: selector Lunes a Viernes, selector automático de clase por hora actual y tarjetas visuales de alumnos por disciplina.",
    )
    add_bullet(doc, "De lunes a viernes selecciona automáticamente la clase que está en curso o a punto de empezar según el reloj.", "Detección automática de la clase actual: ")
    add_bullet(doc, "Si se entra en sábado, domingo o un día sin clases, la app salta automáticamente al próximo día con clase programada (por ejemplo, Lunes) mostrando el modo «Previsión de Clase» para ver quién debería asistir.", "Previsión en fin de semana: ")
    add_bullet(doc, "Solo permite validar asistencia en el día actual (en días de previsión futura queda bloqueado el toque para evitar marcar asistencias por error antes de tiempo).", "Restricción de validación: ")
    add_bullet(doc, "Únicamente aparecen alumnos Activos cuya tarifa incluye la disciplina de esa clase. Los alumnos Pausados o en Baja no aparecen en la lista.", "Filtro automático por tarifa y estado: ")
    add_bullet(doc, "Si un alumno tiene bono de clases sueltas, al validarle asistencia se descuenta automáticamente 1 crédito (y si se desmarca por error, se devuelve al instante); su tarjeta muestra cuántas clases le quedan o si el bono está agotado.", "Control real de bonos: ")
    add_bullet(doc, "La app bloquea toques repetidos accidentales en pantallas táctiles, separa el contador de alumnos del contador de invitados de prueba y muestra un buscador rápido en clases con más de 6 alumnos (incluyendo el alias por si hay homónimos).", "Protecciones en tatami: ")

    add_screenshot(
        doc,
        "12_coach_trial_modal.png",
        "Modal «+ Invitado / Clase Prueba»: permite anotar en el acto a cualquier persona nueva que viene a probar con su teléfono, email, disciplina y fecha.",
        width_in=4.8,
    )

    # =========================================================================
    # SECCIÓN 5: SEGUIMIENTO ECONÓMICO, FACTURAS PENDIENTES Y PAGOS ADELANTADOS
    # =========================================================================
    add_section_heading(doc, "06", "Cobros: Cuotas Pendientes, Cobrar y Pagos Adelantados")
    add_body(
        doc,
        "La pantalla Cobros (menú «Cobros») está pensada para el día a día con más de 150 alumnos: o se busca a un alumno concreto para cobrarle, o se trabaja la lista de pendientes empezando por lo más urgente. Incluye la regla automática de los 7 días y el cobro de atrasos y adelantos de varios meses.",
    )
    add_sub_heading(doc, "Estados de la cuota de cada alumno")

    add_styled_table(
        doc,
        ["Estado en la App", "Cuándo aparece", "Significado operativo"],
        [
            ["Pago OK", "Mes actual o pasado ya cobrado", "Cuota liquidada correctamente."],
            ["Pago adelantado", "Mes futuro ya cobrado por adelantado", "Mes ya cubierto de antemano; no generará deuda al llegar."],
            ["Próximo vencimiento", "Mes futuro aún no cobrado", "Informativo: todavía no vence ni cuenta como deuda ni morosidad."],
            ["En plazo 7 días", "Mes actual sin pagar, <7 días desde su 1ª asistencia", "El alumno ha venido a entrenar y está dentro del plazo de cortesía de 7 días."],
            ["Cuota pendiente", "Mes pasado sin pagar o mes actual pendiente sin asistencia", "Cuota pendiente de cobro."],
            ["Cuota pendiente (+7d)", "Mes actual sin pagar y >7 días desde su 1ª asistencia", "Alerta roja prioritaria: lleva más de 7 días entrenando este mes sin haber pagado."],
        ],
        col_widths=[1.75, 2.25, 2.5],
    )

    add_screenshot(
        doc,
        "06_admin_tracking.jpg",
        "Pantalla Cobros: progreso del mes, lo cobrado por fecha de cobro, buscador, pestañas Por cobrar / Cobrados / Todos / Por tarifa y pendientes agrupados por urgencia.",
    )

    add_sub_heading(doc, "Cómo cobrar a un alumno concreto")
    add_bullet(doc, "Escribe parte del nombre en «Buscar alumno para cobrar…». No hace falta poner tildes ni mayúsculas: «alvaro» encuentra a «Álvaro».", "1. Busca: ")
    add_bullet(doc, "Pulsa «Bizum» o «Efectivo» en su fila. El cobro queda registrado al instante con la fecha y hora de ese momento.", "2. Cobra con un toque: ")
    add_bullet(doc, "Aparece un aviso «Cobrado: … · Deshacer» durante 7 segundos. Si te has equivocado de alumno o de método, pulsa «Deshacer».", "3. Corrige si hace falta: ")

    add_sub_heading(doc, "Cómo trabajar la lista de pendientes")
    add_bullet(doc, "La barra superior indica cuántas cuotas del mes están cobradas, cuántas faltan y su importe, y lo cobrado en el mes con su reparto entre Bizum y Efectivo.", "Progreso del mes: ")
    add_bullet(doc, "La pestaña «Por cobrar» (la que se abre por defecto) agrupa a los pendientes por urgencia: «Más de 7 días sin pagar» (abierto), «En plazo» con los días de cortesía que le quedan a cada uno, y «Aún no han venido este mes» (estos dos plegados para no alargar la lista). Cada grupo muestra cuántos alumnos son y cuánto suman.", "Pendientes por urgencia: ")
    add_bullet(doc, "Cada fila avisa si el alumno «también debe» meses anteriores, si está «cubierto hasta» un mes porque pagó por adelantado, o si es Socio fundador (cuota con −10 %). Quien ya pagó este mes pero arrastra meses atrasados aparece en el grupo «Deben meses anteriores».", "Avisos en cada alumno: ")
    add_bullet(doc, "«Cobrados» lista lo ya pagado (con su botón «Deshacer»); «Todos» muestra a todos los alumnos del mes; «Por tarifa» muestra cuánto se ha cobrado de cada tarifa y, al tocar una, abre directamente sus pendientes.", "Otras pestañas: ")
    add_bullet(doc, "El selector «Todas las tarifas» permite cobrar, por ejemplo, a todo el grupo de Kids al terminar su clase.", "Filtro por tarifa: ")
    add_bullet(doc, "Con el selector de mes se pueden revisar meses pasados (lo que quedó sin pagar) o el mes siguiente (para cobrar por adelantado). «Generar mes» crea las cuotas de un mes nuevo copiando las del mes anterior.", "Otros meses: ")

    add_sub_heading(doc, "Ficha de cobros del alumno")
    add_body(
        doc,
        "Al tocar el nombre de cualquier alumno se abre su ficha de cobros: si está al corriente o cuánto debe y de qué meses, sus últimos 9 meses en colores (pagado, pendiente, sin pagar, adelantado), la lista de pagos con fecha, método e importe, y el historial de cambios: quién registró o deshizo cada cobro y cuándo. Desde la ficha se puede cobrar lo pendiente o meses por adelantado.",
    )
    add_screenshot(
        doc,
        "06b_admin_student_ledger.jpg",
        "Ficha de cobros del alumno: estado, últimos meses, pagos e historial de quién cobró o deshizo cada cobro.",
    )

    add_sub_heading(doc, "Cobro de varios meses de una vez (Atrasos y Adelantos)")
    add_body(
        doc,
        "Al pulsar «Cobrar varios meses» (arriba a la derecha, con el icono de calendario de cada fila o desde la ficha del alumno), se abre el gestor conjunto:",
    )
    add_bullet(doc, "Lista automáticamente todos los meses anteriores y el mes actual que el alumno tenga sin pagar, con un botón rápido «Seleccionar todos los vencidos».", "1. Cuotas pendientes: ")
    add_bullet(doc, "Muestra los siguientes 12 meses con accesos directos «+3 meses», «+6 meses» y «+12 meses» para cobrar trimestres, semestres o anualidades en segundos. Los meses ya pagados no se pueden volver a cobrar.", "2. Pagos futuros por adelantado: ")
    add_bullet(doc, "Calcula automáticamente «tarifa × meses seleccionados», pero el campo es editable por si Dirección aplica un descuento por pronto pago o trimestre.", "3. Importe editable: ")
    add_bullet(doc, "Por defecto es hoy, pero se puede cambiar para registrar un pago que se hizo otro día (por ejemplo, un Bizum recibido ayer). No admite fechas futuras.", "4. Fecha de cobro: ")
    add_bullet(doc, "Un pago adelantado de varios meses cuenta como dinero entrado el día que se cobra. En Cobros y en Finanzas se indica qué parte de lo cobrado corresponde a cuotas de meses siguientes, para no gastarlo antes de tiempo.", "5. Cuotas del mes y dinero cobrado: ")

    add_screenshot(
        doc,
        "07_admin_multi_month_modal.jpg",
        "Cobrar Varios Meses: cuotas pendientes y meses futuros (+3/+6/+12), método Efectivo o Bizum, importe editable y fecha de cobro.",
        width_in=5.2,
    )

    add_callout(
        doc,
        "Protecciones para que la caja cuadre",
        [
            "Las cuotas de los alumnos se cobran exclusivamente en Efectivo o Bizum.",
            "Un mes ya cobrado no se puede volver a cobrar ni cambiar de fecha o importe: para corregirlo, primero se deshace el cobro. Esto evita errores aunque dos personas estén cobrando a la vez desde pantallas distintas.",
            "Un doble toque accidental en «Bizum» o «Efectivo» registra un solo cobro.",
            "Deshacer un cobro no borra su rastro: queda en el historial del alumno quién lo cobró, quién lo deshizo y cuándo.",
            "Los pagos de un alumno no se pierden nunca: para dar de baja a alguien se marca como Baja, no se borra.",
            "Todo se calcula en hora de Madrid: un Bizum recibido a las 00:30 del día 1 cuenta en el mes nuevo.",
        ],
    )

    # =========================================================================
    # SECCIÓN 7: FINANZAS
    # =========================================================================
    add_section_heading(doc, "07", "Finanzas: Resultado del Mes y Gastos")
    add_body(
        doc,
        "Finanzas (solo Dirección) responde a la pregunta «¿cuánto hemos ganado o perdido este mes?». Tiene dos pestañas, Resumen y Gastos, y un selector de mes arriba a la derecha.",
    )
    add_callout(
        doc,
        "Cómo se calcula el resultado",
        [
            "Resultado del mes = dinero cobrado en el mes (por la fecha en que entró) − gastos pagados en el mes (por la fecha en que salió).",
            "Es el mismo criterio con el que se comprueba el banco y el efectivo. La contabilidad oficial, el IVA y los impuestos los lleva la gestoría.",
        ],
        border_hex="0A111F",
        bg_hex="F1F5F9",
    )

    add_sub_heading(doc, "Pestaña Resumen")
    add_screenshot(
        doc,
        "15_admin_finance_summary.jpg",
        "Finanzas · Resumen: resultado del mes, aviso de gastos fijos por confirmar con el resultado previsto, entrado frente a gastado y gastos por categoría.",
    )
    add_bullet(doc, "Cifra grande con signo y la palabra «Ganado» o «Perdido», y comparación con el mes anterior.", "Resultado del mes: ")
    add_bullet(doc, "Si quedan gastos fijos del mes sin confirmar (por ejemplo, las nóminas que se pagan a final de mes), un aviso indica cuántos son, cuánto suman y el «resultado previsto al pagarlos». Así el resultado no parece mejor de lo que será.", "Gastos fijos por confirmar: ")
    add_bullet(doc, "Dos barras a la misma escala con lo entrado y lo gastado. Si parte de lo entrado son cuotas de meses siguientes ya cobradas, se avisa para no gastarlas este mes.", "Entrado frente a gastado: ")
    add_bullet(doc, "Reparto del gasto de mayor a menor, con su porcentaje (los gastos fijos van marcados).", "Gastos por categoría: ")
    add_bullet(doc, "Cuántos alumnos al corriente hacen falta para cubrir los gastos fijos con la cuota media del mes, y cuántas cuotas se han pagado ya.", "Punto de equilibrio: ")
    add_bullet(doc, "Si un mes todavía no tiene gastos, se avisa de que el resultado no es real y se ofrece «Añadir el primer gasto».", "Mes sin gastos: ")

    add_sub_heading(doc, "Pestaña Gastos")
    add_screenshot(
        doc,
        "16_admin_finance_expenses.jpg",
        "Finanzas · Gastos: gastos fijos del mes (cubiertos o pendientes de confirmar) y resto de gastos, con buscador, filtro por categoría y exportación a Excel.",
    )
    add_bullet(doc, "Arriba, los gastos que se repiten cada mes (alquiler, nóminas, suministros, seguros, gestoría…) con «X de Y cubiertos». Los pendientes muestran el importe previsto y el botón «Confirmar pago».", "Fijos: ")
    add_bullet(doc, "Debajo, «Otros gastos del mes» (material, reparaciones, marketing…). Los anulados se pueden ver con la casilla «Ver anulados».", "Otros gastos: ")
    add_bullet(doc, "Buscador por concepto o categoría, filtro de categoría y «Exportar todo el mes» a Excel (útil para enviar a la gestoría).", "Buscar y exportar: ")

    add_sub_heading(doc, "Cómo registrar un gasto")
    add_screenshot(
        doc,
        "17_admin_new_expense.jpg",
        "Nuevo gasto: importe primero, categoría con un toque, fecha del pago, concepto y forma de pago opcionales, y la casilla «Se repite cada mes».",
        width_in=4.8,
    )
    add_bullet(doc, "Pulsa «+ Gasto» (en el móvil, el botón rojo flotante).", "Paso 1 · ")
    add_bullet(doc, "Escribe el importe (por ejemplo 45,90) y toca la categoría. La fecha es hoy por defecto; el concepto y la forma de pago (Banco, Efectivo, Tarjeta o Bizum) son opcionales.", "Paso 2 · ")
    add_bullet(doc, "Si es un gasto que se repite (alquiler, seguro, nómina…), marca «Se repite cada mes»: se guarda el de este mes y, en los siguientes, aparecerá en Fijos pendiente de confirmar.", "Paso 3 · ")
    add_bullet(doc, "Pulsa «Guardar gasto». El resultado del mes se actualiza al momento.", "Paso 4 · ")

    add_sub_heading(doc, "Gastos fijos de cada mes")
    add_bullet(doc, "Cuando se paga, pulsa «Confirmar pago» en su fila; el importe previsto viene rellenado y se puede ajustar (por ejemplo, la luz de ese mes).", "Confirmar: ")
    add_bullet(doc, "Para pagar por adelantado, por ejemplo el alquiler de diciembre el 30 de noviembre, ve con la flecha al mes siguiente y confírmalo allí: queda cubierto en diciembre y cuenta como gasto del día en que se pagó.", "Pagar por adelantado: ")
    add_bullet(doc, "Al editar un gasto fijo, la casilla «Usar este importe en los meses que falten por confirmar» actualiza también los meses siguientes; si no se marca, el cambio solo afecta a ese mes.", "Cambiar el importe: ")
    add_bullet(doc, "Si un gasto deja de existir (un seguro dado de baja), usa «Ya no se paga» en el pendiente o «Dejar de repetir» en uno confirmado. Los meses ya confirmados no cambian.", "Dejar de repetir: ")

    add_sub_heading(doc, "Corregir o anular un gasto")
    add_bullet(doc, "Toca el gasto para editar importe, categoría, fecha o concepto.", "Editar: ")
    add_bullet(doc, "Un gasto nunca se borra: se anula indicando el motivo (Duplicado, Importe erróneo, No se llegó a pagar u otro). Deja de contar en el resultado pero queda registrado quién lo anuló y cuándo.", "Anular: ")

    add_callout(
        doc,
        "Buenas prácticas en Finanzas",
        [
            "Da de alta los gastos fijos una sola vez y confírmalos cada mes al pagarlos: el aviso de fijos pendientes te recordará los que falten.",
            "Revisa el resultado del mes anterior una vez cerrado, cuando ya estén confirmados todos los fijos.",
            "Si alguna cifra no se puede cargar, la pantalla lo avisa y no muestra «0 €» para no confundirlo con un resultado real.",
        ],
        border_hex="0A111F",
        bg_hex="F1F5F9",
    )

    # =========================================================================
    # SECCIÓN 6: TARIFAS, DISCIPLINAS Y HORARIOS
    # =========================================================================
    add_section_heading(doc, "08", "Tarifas, Disciplinas y Horarios Semanales")
    add_body(
        doc,
        "Dirección gestiona desde el panel el catálogo oficial de tarifas de 247 STUDIO y su vinculación automática con las disciplinas (BJJ & Grappling, MMA, Lucha, BJJ Femenino y Kids).",
    )
    add_screenshot(
        doc,
        "08_admin_plans.png",
        "Gestión de Tarifas: alta de nuevas tarifas o bonos por clases, selección de disciplinas incluidas y aviso automático opcional a los alumnos.",
    )
    add_bullet(doc, "Cada tarifa define exactamente qué disciplinas habilita. Si un alumno tiene «BJJ & Grappling + MMA» o «Pack Unlimited», aparecerá automáticamente al pasar lista en todas esas clases.", "Vinculación directa con Pasar Lista: ")
    add_bullet(doc, "Las tarifas que ya tienen alumnos asignados no pueden eliminarse por error; se desactivan manteniendo intacto el histórico de cobros.", "Protección de historial: ")

    add_screenshot(
        doc,
        "09_admin_schedule.png",
        "Gestión de Horarios: franjas de lunes a sábado con selector de profesor registrado o sustituto puntual, edición directa de clases existentes (ideal para vacaciones o cambios de horario sin perder el historial de asistencias), icono o imagen de cada clase y aviso opcional a los alumnos.",
    )

    # =========================================================================
    # SECCIÓN 7: COMUNICACIÓN INTERNA
    # =========================================================================
    add_section_heading(doc, "09", "Comunicación Interna (Foro, Avisos, Eventos, Chat y Firmas)")
    add_body(
        doc,
        "Toda la comunicación oficial del gimnasio queda centralizada dentro de la app, evitando grupos de WhatsApp ruidosos o mensajes perdidos.",
    )
    add_screenshot(
        doc,
        "10_admin_communication.png",
        "Panel de Comunicación (Admin): pestañas para Foro/Tablón, Chats Privados, Firmas Digitales, Avisos (con borrado), Eventos/Seminarios y FAQs.",
    )
    add_bullet(doc, "Solo Dirección y Profesores pueden publicar comunicados; los alumnos únicamente pueden leerlos para mantener el tablón limpio.", "Tablón / Foro (solo lectura para alumnos): ")
    add_bullet(doc, "Los avisos generales, cambios de tarifa o cambios de horario se consultan en la sección Avisos y pueden eliminarse desde el listado de Dirección.", "Avisos internos dentro de la App: ")
    add_bullet(doc, "Nueva pestaña Eventos para publicar Seminarios, Competiciones, Graduaciones y Open Mats con fecha, hora, ubicación y descripción, visibles en la cartelera del alumno.", "Gestor de Eventos y Seminarios: ")
    add_bullet(doc, "Cada alumno dispone de un hilo privado directo con Dirección (Mario & David).", "Chat privado 1 a 1: ")
    add_bullet(doc, "Dirección puede consultar y verificar en cualquier momento los documentos firmados digitalmente por cada alumno (nombre, DNI y trazo de firma).", "Archivo de documentos firmados: ")

    # =========================================================================
    # SECCIÓN 8: PORTAL DEL ALUMNO Y FIRMA DIGITAL
    # =========================================================================
    add_section_heading(doc, "10", "Portal del Alumno y Firma en Pantalla")
    add_body(
        doc,
        "Cada alumno accede a una experiencia renovada con estética de tatami diseñada para móvil desde donde consulta su Carnet Oficial, su Radar de Combate, su progreso real, el horario semanal (con filtro rápido por día), sus avisos y los documentos pendientes de firma.",
    )
    add_screenshot(
        doc,
        "13_client_home.png",
        "Inicio del Portal del Alumno: Carnet de Tatami con cinturón tejido realista y grados, contador de Bonos, Mat Time, Radar de Combate SVG, eventos y diario técnico.",
    )
    add_bullet(doc, "Muestra el Carnet Oficial del Luchador con halo dinámico según su cinturón y representación tejida realista con punta y grados cosidos (0 a 4).", "Carnet de Tatami y Cinturón Visual: ")
    add_bullet(doc, "Sustituye las barras estáticas por un gráfico Radar SVG interactivo de 8 ejes (Técnica, Fuerza, Elasticidad, Guardia, Pase, Derribos, Leglocks y Finalización) con media global.", "Radar de Combate Interactivo: ")
    add_bullet(doc, "Contabiliza clases del mes, clases totales, horas estimadas de tatami (Mat Time), desglose por disciplina y las últimas 5 sesiones validadas en clase, además de casillas selladas para Bonos de clases.", "Mat Time y Contador Visual de Bonos: ")
    add_bullet(doc, "Muestra automáticamente los hijos/familiares vinculados a un tutor o los datos de contacto de padre/madre en menores (≤14 años), botones rápidos con fecha para el Diario Técnico y FAQs oficiales con respaldo automático.", "Modo Familia, Diario Técnico y FAQs: ")
    add_screenshot(
        doc,
        "14_client_profile.png",
        "Perfil del Alumno: subida/actualización de foto, teléfono de emergencia, notas médicas, cambio de contraseña y firma digital en pantalla para documentos de RGPD y normas.",
    )

    # =========================================================================
    # SECCIÓN 9: RESUMEN DE REGLAS Y RESTRICCIONES VIGENTES
    # =========================================================================
    add_section_heading(doc, "11", "Resumen de Reglas de Oro y Restricciones Vigentes")
    add_styled_table(
        doc,
        ["Área", "Regla / Restricción Aplicada"],
        [
            ["Altas y Claves", "Sin autorregistro público. Alta en recepción con clave temporal única y cambio obligatorio en el primer inicio de sesión."],
            ["Cobro de Cuotas", "Las cuotas de los alumnos se cobran exclusivamente en Efectivo o Bizum. (Los gastos de la academia sí pueden registrarse como pagados por Banco, Efectivo, Tarjeta o Bizum.)"],
            ["Regla de los 7 Días", "Si un alumno entrena sin haber pagado el mes actual, la app concede 7 días naturales desde su primera asistencia del mes antes de marcarlo en rojo como Cuota pendiente (+7d)."],
            ["Pagos Adelantados", "Pagar meses futuros no genera alerta ni doble cobro; al alumno le figura «Cubierto hasta [Mes]» y al Admin «Pago adelantado»."],
            ["Clases Simultáneas", "El horario no contempla dos clases simultáneas; Pasar Lista selecciona la sesión actual o el próximo día previsto y bloquea doble-toques accidentales y cambios de día a medianoche."],
            ["Bonos y Firmas", "Los Bonos descuentan/devuelven créditos automáticamente al pasar lista y la firma digital impide enviar formularios con el recuadro en blanco."],
            ["Analítica y KPIs", "La pestaña KPIs tipo Power BI y el Centro de Alertas son exclusivos de Dirección y calculan métricas en tiempo real sobre cobros, asistencias y fichas legales."],
            ["Roles y Visibilidad", "Los Profesores no ven precios, cobros ni Finanzas; los Alumnos no publican en el foro ni editan su cinturón o estado."],
            ["Bajas de Alumnos", "Un alumno en estado Baja ve una pantalla de cuenta desactivada y pierde acceso al contenido interno, conservando intacto su historial de pagos y asistencias."],
            ["Cobros y Caja", "Lo cobrado en el mes se cuenta por la fecha real del cobro, en hora de Madrid. Un mes ya cobrado no se puede volver a cobrar ni modificar (hay que deshacerlo antes) y cada cobro o corrección queda registrado con quién lo hizo y cuándo."],
            ["Finanzas y Gastos", "Exclusivo de Dirección. Resultado = cobrado en el mes − gastos pagados en el mes. Los gastos no se borran: se anulan con motivo y quedan registrados. Un gasto fijo solo se puede confirmar una vez por mes."],
            ["Recibos y Facturas", "La app no emite facturas: las facturas oficiales, el IVA y los impuestos los gestiona la gestoría."],
            ["Modo Aplicación", "Instalada en el móvil funciona a pantalla completa, sin menú de pulsación larga, sin zoom y sin selección accidental de texto (los campos de escritura permiten copiar y pegar)."],
        ],
        col_widths=[1.7, 4.8],
    )

    OUT_DOCX.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUT_DOCX))
    print(f"Manual generado correctamente en: {OUT_DOCX}")


if __name__ == "__main__":
    build_manual()

