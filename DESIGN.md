---
name: 247 STUDIO
description: Panel de recepción para una academia de BJJ, de noche en el tatami; carril azul marino, un único acento rojo y lienzo arena.
colors:
  rail-navy-deep: "#111320"
  panel-navy: "#1A1D2E"
  panel-navy-light: "#252B44"
  accent-red: "#E11D2E"
  accent-red-dark: "#B91C1C"
  canvas-sand-light: "#F4F0E1"
  canvas-sand: "#DDD6B8"
  surface-white: "#FFFFFF"
  ink-navy: "#1A1D2E"
  text-muted: "#475569"
  status-ok: "#10B981"
  status-pending: "#F59E0B"
  status-info: "#3B82F6"
  status-error: "#E11D2E"
typography:
  headline:
    fontFamily: "Oswald, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
  kpi:
    fontFamily: "Oswald, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.05em"
rounded:
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent-red}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.accent-red-dark}"
  button-secondary:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "48px"
  rail-item:
    backgroundColor: "{colors.rail-navy-deep}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "48px"
  rail-item-active:
    backgroundColor: "{colors.accent-red}"
    textColor: "{colors.surface-white}"
  kpi-card:
    backgroundColor: "{colors.panel-navy}"
    textColor: "{colors.surface-white}"
    typography: "{typography.kpi}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  section-card:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.xl}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.lg}"
    height: "44px"
  badge-status:
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Design System: 247 STUDIO

## Overview

**Creative North Star: "Tatami de noche"**

El panel es una herramienta de recepción usada de pie, con una mano y a menudo en una tablet: contraste alto, objetivos táctiles generosos y una sola señal clara de acción. Un carril azul marino profundo ancla la navegación; sobre un lienzo arena cálido, las superficies blancas alojan el trabajo y los paneles azul marino alojan las cifras. El rojo `accent-red` es la única voz de acento.

La densidad es media y calmada: pocas cosas por pantalla, bien separadas, con jerarquía dada por el tamaño de las cifras (Oswald) y no por la decoración. Las cifras clave dominan; el texto de interfaz (Inter) se mantiene legible a 14-16 px.

El sistema rechaza los emojis como iconos y los degradados decorativos. Los iconos son siempre de lucide.

**Key Characteristics:**
- Carril azul marino + acento rojo único + lienzo arena + superficies blancas.
- Cifras grandes en Oswald con numerales tabulares.
- Objetivos táctiles de al menos 44 px.
- Plano: una sola elevación por superficie (borde o sombra, no ambos).
- Iconos lucide, sin emojis; sin degradados decorativos.

## Colors

Paleta de dos tintas (azul marino y rojo) sobre arena cálida; el color funcional solo aparece para estados.

### Primary
- **Rojo de rango** (`accent-red`, #E11D2E): acción principal, ítem activo del carril, selección de texto y anillo de foco global. Su rareza es el punto.
- **Rojo profundo** (`accent-red-dark`, #B91C1C): estado hover del rojo de acción.

### Neutral
- **Azul marino de carril** (`rail-navy-deep`, #111320): carril lateral y cabecera móvil.
- **Azul marino de panel** (`panel-navy`, #1A1D2E): paneles de cifras, texto principal (tinta) y bordes al 10-15 % de opacidad.
- **Azul marino claro** (`panel-navy-light`, #252B44): variante de panel disponible en la configuración.
- **Arena clara** (`canvas-sand-light`, #F4F0E1): lienzo de las páginas de administración.
- **Arena tatami** (`canvas-sand`, #DDD6B8): fondo base del documento y marca.
- **Blanco** (`surface-white`, #FFFFFF): superficies de trabajo, campos y diálogos.
- **Gris pizarra** (`text-muted`, #475569): descripciones y texto secundario (slate-600).

### Estados
- **Esmeralda** (`status-ok`, #10B981): pagado, aprobado.
- **Ámbar** (`status-pending`, #F59E0B): pendiente, avisos.
- **Azul** (`status-info`, #3B82F6): periodo de gracia, información.
- **Rosa/rojo** (`status-error`, #E11D2E): error, impago.

### Named Rules
**La Regla de la Voz Única.** El rojo es la única voz de acento: acción principal y elemento activo. No se usa como decoración ni como segundo color de marca.
**La Regla del Estado.** Esmeralda, ámbar, azul y rosa significan solo estado (ok, pendiente, información, error); nunca adornan.

## Typography

**Display Font:** Oswald (con system-ui, sans-serif)
**Body Font:** Inter (con system-ui, -apple-system, Segoe UI, sans-serif)

**Character:** Oswald aporta un tono atlético y condensado para titulares y cifras; Inter mantiene la lectura limpia en la interfaz.

### Hierarchy
- **Headline** (900, 1.875-2.25rem, 1): titular de página en mayúsculas, `tracking-tight` (`PageHeader`).
- **KPI** (700, 2.25-3rem, 1, `tabular-nums`): cifras clave sobre panel azul marino; 3rem para la cifra principal.
- **Title** (700, 1.125rem, 1.25): título de bloque de trabajo (`SectionCard`).
- **Body** (500-600, 0.875-1rem, 1.5): texto de interfaz y descripciones.
- **Label** (600, 0.75rem, 0.05em, mayúsculas): etiquetas de KPI y de grupo de navegación; nunca por debajo de 12 px.

### Named Rules
**La Regla de la Cifra Tabular.** Todo importe, contador o cifra comparable usa `tabular-nums` para que las columnas no bailen.
**La Regla de los 12 px.** Ninguna etiqueta de interfaz baja de 12 px.

## Layout

Carril lateral fijo desde 768 px: 80 px (solo iconos) en tablet vertical y 256 px (iconos y etiqueta) desde 1024 px; el usuario puede minimizarlo (Ctrl/Cmd+B). Por debajo de 768 px hay una cabecera compacta y un lanzador a pantalla completa con rejilla de 2 columnas. El contenido se compone de cabecera de página, panel de cifras y bloques de trabajo apilados con ritmo vertical de 20 px (`space-y-5`). Los bloques usan relleno de 20 px; las cabeceras de página pasan a fila desde 1280 px. Los objetivos táctiles miden al menos 44 px (ítems del carril 48 px).

## Elevation & Depth

Sistema plano y tonal: la profundidad la dan el contraste entre el lienzo arena, las superficies blancas y los paneles azul marino. Las superficies de trabajo llevan un borde fino azul marino al 10 % y ninguna sombra; los botones de acción llevan como mucho `shadow-sm`. Los diálogos son la única superficie elevada, con sombra amplia y un velo negro al 60 % con desenfoque.

### Named Rules
**La Regla de una Sola Elevación.** Una superficie usa borde o sombra, nunca ambos. La sombra solo aparece en diálogos y como respuesta a estado.

## Shapes

Radios suaves y consistentes: 12 px en botones, campos, ítems de carril y tarjetas de cifra; 16 px en bloques de trabajo y paneles; 24 px en diálogos; píldoras completas para insignias, chips y avatares. Los bordes son de 1 px, en azul marino al 10-15 %.

## Components

### Botones
- **Forma:** esquinas de 12 px; altura mínima 48 px en pantallas de recepción (44 px mínimo absoluto).
- **Primario:** fondo rojo, texto blanco en negrita, `shadow-sm`; hover a rojo profundo y pulsación con escala 0.98.
- **Secundario:** blanco con borde azul marino al 15 %, texto azul marino; hover blanco al 60 %.
- **Foco:** anillo de 2 px azul marino con separación de 2 px (rojo en el foco global; blanco sobre fondos oscuros).

### Insignias (chips de estado)
- **Estilo:** píldora con borde y fondo suaves (esmeralda, ámbar, azul, rosa) y texto oscuro del mismo matiz.
- **Estado:** informan, no son interactivas.

### Tarjetas y bloques (`SectionCard`)
- **Esquina:** 16 px. **Fondo:** blanco. **Borde:** azul marino al 10 %. **Sombra:** ninguna.
- **Relleno:** 20 px; cabecera con separador inferior y `flush` para listas a sangre.

### Cifras (`KpiCard`)
- Pieza oscura: texto blanco sobre panel azul marino; etiqueta en mayúsculas al 70 % de opacidad y cifra Oswald tabular. Tonos de cifra: blanco, esmeralda, ámbar y rosa claros. Si es pulsable, actúa como acceso directo con hover blanco al 10 %.

### Campos (`Input`)
- **Estilo:** 44 px de alto, fondo blanco, borde de 1 px y radio 12 px.
- **Foco:** borde azul marino más halo suave de 2 px.

### Navegación (carril)
- Fondo azul marino profundo; ítems de 48 px con icono lucide de 20 px y etiqueta Inter semibold. Reposo al 75 % de blanco, hover blanco al 10 %, activo relleno rojo con texto blanco. En móvil, lanzador a pantalla completa con teselas de 56 px.

### Pestañas de vista (Caja)
- Selector segmentado: pista azul marino al 10 %, radio 16 px, segmentos de 48 px; el activo se eleva a blanco.

## Do's and Don'ts

### Do:
- **Do** usar el rojo solo para la acción principal y el elemento activo.
- **Do** mantener objetivos táctiles de al menos 44 px y foco visible en todo control.
- **Do** poner las cifras clave en Oswald con `tabular-nums` sobre panel azul marino.
- **Do** usar iconos de lucide con `aria-hidden` cuando acompañen texto.
- **Do** componer páginas con `PageHeader`, `KpiCard` y `SectionCard`.

### Don't:
- **Don't** usar emojis como iconos.
- **Don't** usar degradados decorativos.
- **Don't** combinar borde y sombra en una misma superficie.
- **Don't** usar etiquetas por debajo de 12 px.
- **Don't** usar color de estado como decoración.
