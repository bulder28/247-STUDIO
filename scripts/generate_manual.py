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
            "Cómo pasar lista en el tatami, previsualizar el próximo día con clase y registrar clases de prueba.",
            "Cómo funciona la regla automática de los 7 días, las facturas pendientes y los cobros de varios meses por adelantado (solo Efectivo y Bizum).",
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
            ["Resumen mensual y métricas de ingresos", "Acceso total", "NO visible", "NO visible"],
            ["Seguimiento de cuotas, facturas pendientes y cobros", "Acceso total", "NO visible", "NO visible"],
            ["Alta de alumnos, edición de cinturones y bajas", "Acceso total", "NO visible", "Solo edita su teléfono/emergencia/objetivos"],
            ["Pasar Lista y registrar Invitado / Clase Prueba", "Sí", "Sí (pantalla principal)", "NO visible"],
            ["Consultar horarios de la semana", "Edita y avisa cambios", "Solo consulta", "Solo consulta"],
            ["Tablón / Foro interno", "Publica anuncios", "Publica anuncios", "Solo lectura (no publica)"],
            ["Chat privado Dirección ↔ Alumno", "Responde a todos", "NO visible", "Habla solo con Dirección"],
            ["Tarifas y planes", "Crea, edita y desactiva", "NO visible", "Solo consulta tarifas activas"],
            ["Firmas digitales (RGPD / Normas)", "Consulta todas las firmas", "NO visible", "Firma con el dedo en su perfil"],
        ],
        col_widths=[2.5, 1.35, 1.3, 1.35],
    )

    add_callout(
        doc,
        "Restricciones clave de seguridad y privacidad",
        [
            "Los profesores NO tienen acceso a precios, tarifas cobradas, estado de pagos ni datos económicos de ningún alumno.",
            "Los alumnos nunca pueden cambiar por su cuenta su rol, su cinturón, sus grados ni el estado de su suscripción.",
            "Cuando un alumno se da de baja (estado Baja), pierde automáticamente el acceso a horarios, foro, eventos y avisos, conservando Dirección todo su historial.",
            "La app está pensada para el día a día interno; los vídeos de técnica y la captación comercial pública siguen viviendo en la web oficial (www.247studiobjj.com).",
        ],
    )

    # =========================================================================
    # SECCIÓN 2: FLUJO DE ALTA, PRIMER ACCESO Y RECUPERACIÓN
    # =========================================================================
    add_section_heading(doc, "02", "Flujo Completo: Clase de Prueba, Alta y Acceso")

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
    # SECCIÓN 3: PANEL DE DIRECCIÓN — RESUMEN Y ALUMNOS
    # =========================================================================
    add_section_heading(doc, "03", "Panel de Dirección: Resumen y Gestión de Alumnos")
    add_body(
        doc,
        "Al iniciar sesión, Dirección accede directamente al Resumen Mensual con los 4 indicadores clave de la escuela y el listado de quién ha entrenado hoy.",
    )
    add_screenshot(
        doc,
        "03_admin_home.png",
        "Resumen Mensual (Admin): ingresos cobrados del mes, cuotas pendientes, alertas de facturas pendientes (+7 días), alumnos activos y asistencias del día.",
    )

    add_body(
        doc,
        "En la pestaña Alumnos se gestiona toda la base de datos de socios activos, pausados y bajas, además de los invitados que vinieron a probar y están pendientes de alta definitiva.",
    )
    add_screenshot(
        doc,
        "04_admin_students.png",
        "Listado de Alumnos e Invitados: buscador, filtros por estado (Activos, Pausados, Bajas), acceso a ficha completa y botón «+ Nuevo Alumno».",
    )
    add_bullet(doc, "Al pulsar sobre cualquier alumno se puede editar su estado (Activo, Pausado o Baja), su foto, sus datos de contacto, su cinturón/grados, sus 8 atributos físicos del gráfico de rendimiento, su tarifa del mes y vincular hermanos menores con un tutor.", "Edición de ficha: ")
    add_bullet(doc, "Nunca se borra un alumno de forma destructiva para preservar el histórico contable y de asistencias; en su lugar se pasa a estado Baja.", "Restricción de borrado: ")

    # =========================================================================
    # SECCIÓN 4: PASAR LISTA EN EL TATAMI
    # =========================================================================
    add_section_heading(doc, "04", "Pasar Lista en el Tatami (Profesores y Dirección)")
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
    add_bullet(doc, "Si un alumno tiene bono de clases sueltas, al validarle asistencia se descuenta automáticamente 1 crédito.", "Descuento automático de bonos: ")

    add_screenshot(
        doc,
        "12_coach_trial_modal.png",
        "Modal «+ Invitado / Clase Prueba»: permite anotar en el acto a cualquier persona nueva que viene a probar con su teléfono, email, disciplina y fecha.",
        width_in=4.8,
    )

    # =========================================================================
    # SECCIÓN 5: SEGUIMIENTO ECONÓMICO, FACTURAS PENDIENTES Y PAGOS ADELANTADOS
    # =========================================================================
    add_section_heading(doc, "05", "Seguimiento Económico, Vencidos y Pagos Adelantados")
    add_body(
        doc,
        "Esta sección centraliza el control de pagos por persona y por tarifa, incorporando la regla automática de los 7 días y el soporte para atrasos y pagos adelantados de varios meses.",
    )

    add_styled_table(
        doc,
        ["Estado en la App", "Cuándo aparece", "Significado operativo"],
        [
            ["Pago OK", "Mes actual o pasado ya cobrado", "Cuota liquidada correctamente."],
            ["Pago adelantado", "Mes futuro ya cobrado por adelantado", "Mes ya cubierto de antemano; no generará deuda al llegar."],
            ["Próximo vencimiento", "Mes futuro aún no cobrado", "Informativo: todavía no vence ni cuenta como deuda ni morosidad."],
            ["En plazo 7 días", "Mes actual sin pagar, <7 días desde su 1ª asistencia", "El alumno ha venido a entrenar y está dentro del plazo de cortesía de 7 días."],
            ["Factura pendiente", "Mes pasado sin pagar o mes actual pendiente sin asistencia", "Deuda pendiente de cobro."],
            ["Factura pendiente (+7d)", "Mes actual sin pagar y >7 días desde su 1ª asistencia", "Alerta roja prioritaria: lleva más de 7 días entrenando este mes sin haber pagado."],
        ],
        col_widths=[1.75, 2.25, 2.5],
    )

    add_screenshot(
        doc,
        "06_admin_tracking.png",
        "Seguimiento Mensual: tarjetas de Cuotas del mes vs Caja Real (Bizum/Efectivo), filtros rápidos y botones por alumno.",
    )

    add_sub_heading(doc, "Cobro de varios meses de una vez (Atrasos y Adelantos)")
    add_body(
        doc,
        "Al pulsar «Cobrar varios meses» (arriba a la derecha o en la fila de cualquier alumno), se abre el gestor conjunto dividido en dos bloques:",
    )
    add_bullet(doc, "Lista automáticamente todos los meses anteriores y el mes actual que el alumno tenga sin pagar, con un botón rápido «Seleccionar todos los vencidos».", "1. Facturas pendientes: ")
    add_bullet(doc, "Muestra los siguientes 12 meses con accesos directos «+3 meses», «+6 meses» y «+12 meses» para cobrar trimestres, semestres o anualidades en segundos. Los meses ya pagados aparecen bloqueados para evitar cobros duplicados.", "2. Pagos futuros por adelantado: ")
    add_bullet(doc, "Calcula automáticamente «tarifa × meses seleccionados», pero el campo es editable por si Dirección aplica un descuento por pronto pago o trimestre.", "3. Importe editable y cuadre de caja: ")
    add_bullet(doc, "Cada mes cubierto guarda la fecha real en que entró el dinero, permitiendo que la tarjeta «Caja real entrada en el mes» sume exactamente el Efectivo y el Bizum cobrados ese mes (incluyendo atrasos y adelantos), separado de las cuotas propias del mes.", "4. Diferencia entre Cuotas del Mes y Caja Real: ")

    add_screenshot(
        doc,
        "07_admin_multi_month_modal.png",
        "Modal Cobrar Varios Meses: selección múltiple de facturas pendientes y pagos futuros (+3/+6/+12 meses), método solo Efectivo/Bizum e importe total editable.",
        width_in=5.2,
    )

    add_callout(
        doc,
        "Restricción permanente en métodos de cobro",
        [
            "La aplicación acepta exclusivamente dos formas de pago: Efectivo y Bizum.",
            "Se han eliminado por completo las opciones de Tarjeta y Transferencia bancaria para evitar errores de caja.",
        ],
    )

    # =========================================================================
    # SECCIÓN 6: TARIFAS, DISCIPLINAS Y HORARIOS
    # =========================================================================
    add_section_heading(doc, "06", "Tarifas, Disciplinas y Horarios Semanales")
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
        "Gestión de Horarios: franjas de lunes a viernes con fotografía oficial de cada disciplina, profesor asignado y botón de aviso de cambio de horario.",
    )

    # =========================================================================
    # SECCIÓN 7: COMUNICACIÓN INTERNA
    # =========================================================================
    add_section_heading(doc, "07", "Comunicación Interna (Foro, Avisos, Chat y Firmas)")
    add_body(
        doc,
        "Toda la comunicación oficial del gimnasio queda centralizada dentro de la app, evitando grupos de WhatsApp ruidosos o mensajes perdidos.",
    )
    add_screenshot(
        doc,
        "10_admin_communication.png",
        "Panel de Comunicación (Admin): pestañas para publicar en el Foro/Tablón, enviar Avisos internos, responder Chats Privados, revisar Firmas Digitales y editar FAQs.",
    )
    add_bullet(doc, "Solo Dirección y Profesores pueden publicar comunicados; los alumnos únicamente pueden leerlos para mantener el tablón limpio.", "Tablón / Foro (solo lectura para alumnos): ")
    add_bullet(doc, "Los avisos sobre cambios de tarifa, cambios de horario o recordatorios se consultan en la sección Avisos de la propia app.", "Avisos internos dentro de la App: ")
    add_bullet(doc, "Cada alumno dispone de un hilo privado directo con Dirección (Mario & David).", "Chat privado 1 a 1: ")
    add_bullet(doc, "Dirección puede consultar y verificar en cualquier momento los documentos firmados digitalmente por cada alumno (nombre, DNI y trazo de firma).", "Archivo de documentos firmados: ")

    # =========================================================================
    # SECCIÓN 8: PORTAL DEL ALUMNO Y FIRMA DIGITAL
    # =========================================================================
    add_section_heading(doc, "08", "Portal del Alumno y Firma en Pantalla")
    add_body(
        doc,
        "Cada alumno accede a una experiencia limpia diseñada para móvil desde donde consulta su estado de cuota, su ficha física, el horario de la semana, sus avisos y los documentos pendientes de firma.",
    )
    add_screenshot(
        doc,
        "13_client_home.png",
        "Inicio del Portal del Alumno: indicador de cuota (incluye alerta de facturas pendientes o aviso «Cubierto hasta [Mes]» si pagó por adelantado), objetivos personales, ficha del luchador y eventos.",
    )
    add_screenshot(
        doc,
        "14_client_profile.png",
        "Perfil del Alumno: subida/actualización de foto, teléfono de emergencia, notas médicas, cambio de contraseña y firma digital en pantalla para documentos de RGPD y normas.",
    )

    # =========================================================================
    # SECCIÓN 9: RESUMEN DE REGLAS Y RESTRICCIONES VIGENTES
    # =========================================================================
    add_section_heading(doc, "09", "Resumen de Reglas de Oro y Restricciones Vigentes")
    add_styled_table(
        doc,
        ["Área", "Regla / Restricción Aplicada"],
        [
            ["Altas y Claves", "Sin autorregistro público. Alta en recepción con clave temporal única y cambio obligatorio en el primer inicio de sesión."],
            ["Métodos de Pago", "Exclusivamente Efectivo y Bizum. No existen Tarjeta ni Transferencia en ningún formulario."],
            ["Regla de los 7 Días", "Si un alumno entrena sin haber pagado el mes actual, la app concede 7 días naturales desde su primera asistencia del mes antes de marcarlo en rojo como Factura pendiente (+7d)."],
            ["Pagos Adelantados", "Pagar meses futuros no genera alerta ni doble cobro; al alumno le figura «Cubierto hasta [Mes]» y al Admin «Pago adelantado»."],
            ["Clases Simultáneas", "El horario no contempla dos clases simultáneas; Pasar Lista selecciona la sesión actual o el próximo día previsto de forma directa."],
            ["Roles y Visibilidad", "Los Profesores no ven precios ni facturas; los Alumnos no publican en el foro ni editan su cinturón o estado."],
            ["Bajas de Alumnos", "Un alumno en estado Baja pierde inmediatamente acceso al contenido interno, pero su historial contable y asistencias se conservan intactos."],
        ],
        col_widths=[1.7, 4.8],
    )

    OUT_DOCX.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUT_DOCX))
    print(f"Manual generado correctamente en: {OUT_DOCX}")


if __name__ == "__main__":
    build_manual()

