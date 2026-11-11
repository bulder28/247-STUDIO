# DESIGN.md — Sistema visual del panel de administración

## Dirección
"Tatami de noche": un carril de navegación azul marino profundo con un único acento rojo, sobre un lienzo arena cálido con superficies blancas. Cifras grandes en Oswald con numerales tabulares. Es una herramienta de recepción: contraste alto y objetivos táctiles generosos.

## Paleta (tokens de Tailwind existentes)
| Uso | Token | Valor |
|---|---|---|
| Carril y paneles de cifras | `studio-navy-deep` / `studio-navy` | `#111320` / `#1A1D2E` |
| Acento y acción principal | `studio-red` / `studio-red-dark` | `#E11D2E` / `#B91C1C` |
| Lienzo de la página | `brand-sand-light` | `#F4F0E1` |
| Superficies | `white` con borde `brand-text/10` | |
| Estados | emerald (ok), amber (pendiente), rose (error) | |

## Tipografía
- Titulares de página: Oswald (`font-headline`), mayúsculas, 28-36 px.
- Cifras clave (KPI): Oswald, 40-48 px, `tabular-nums`.
- Texto de interfaz: Inter, 14-16 px; etiquetas pequeñas nunca por debajo de 12 px.

## Estructura
- Carril lateral (≥768 px): iconos + etiqueta en ≥1024 px; solo iconos en tablet vertical. Ítem activo con relleno rojo.
- Móvil (<768 px): cabecera compacta y barra inferior con los 4 accesos principales y "Más".
- Contenido: cabecera de página (`PageHeader`), cifras (`KpiCard`) y bloques de trabajo (`SectionCard`).

## Componentes compartidos
`src/shared/ui/page-header.tsx`, `src/shared/ui/kpi-card.tsx`, `src/shared/ui/section-card.tsx`.

## Reglas
- Objetivos táctiles ≥44 px; foco visible con anillo rojo/azul marino.
- Radios 12-16 px; una sola elevación (borde o sombra, no ambos).
- Sin emojis como iconos; sin degradados decorativos.
