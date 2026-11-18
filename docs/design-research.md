# Investigación de diseño: "make up" visual 247 STUDIO

Fecha: 2026-11-16. Búsquedas web (fuentes sobre todo blogs de agencias: úsense como orientación, no como autoridad).

## Fuentes consultadas
- Tendencias dashboards móviles 2026 (bento, personalización): https://speculativechic.com/modern-dashboard-design-trends-for-mobile-apps-in-2026/
- UX/UI trends 2026: https://ailleron.com/insights/ux-and-ui-trends-for-2026-design-in-the-age-of-ai/ y https://abp.io/community/articles/ui-ux-trends-that-will-shape-2026-bx4c2kow
- Apps de fitness 2026 (uso con una mano, poca luz, dedos sudados): https://weareaffective.com/learning-centre/fitness-app-trends-2026-what-users-really-want-from-their-workout-apps
- UX/UI para retener en apps de fitness: https://dataconomy.com/2025/11/11/best-ux-ui-practices-for-fitness-apps-retaining-and-re-engaging-users/
- Plantilla bento de salud (anillos, rachas, tarjetas de tamaño variable): https://enter.converge.ai/marketplace/templates/eb44b3d276494ef38c67caea7cea7903
- Barra inferior / zona de pulgar (3-5 destinos, objetivos de 44px): https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/ y https://uxdworld.com/2024/03/01/bottom-tab-bar-navigation-design-best-practices/
- Skeletons y estados vacíos (distinguir "sin datos aún" de "sin resultados", con acción): https://www.create.xyz/blog/mobile-app-design-best-practices
- Repos React+Tailwind con KPI cards: https://github.com/TailAdmin/free-react-tailwind-admin-dashboard, https://github.com/cruip/tailwind-dashboard-template (Mosaic), https://github.com/AdamsCode782/React-Admin-Dashboard (Recharts + Framer Motion)

Salvedades: las cifras de "-35% de espera percibida con skeletons" no tienen estudio primario; el mapa de calor de zona de pulgar está desautorizado por Hoober (usar solo como heurística). No se pudo abrir Glofox/Mindbody/Strava/Whoop directamente; su patrón común (tarjeta héroe + rejilla de métricas + CTA inferior) viene de las fuentes anteriores.

## Ideas que se aplican (marca intacta: rojo, Oswald, cemento)
1. Bento: la home de admin y alumno mezclan tarjetas de tamaños distintos (héroe ancho + métricas cuadradas) con ritmo de espaciado de 4/8 px.
2. Jerarquía tipográfica: cifras KPI grandes en Oswald con `tabular-nums`; etiquetas pequeñas pero con contraste AA (slate-300, no slate-500).
3. Una sola acción primaria en rojo por pantalla; el resto en superficies neutras.
4. Dock inferior móvil: objetivos de 48px mínimo, etiqueta visible, indicador activo rojo, safe-area.
5. Skeletons con la forma real del contenido (no solo "Cargando...") y `motion` suave, respetando `prefers-reduced-motion`.
6. Estados vacíos con icono, frase útil y, si procede, acción (componente `EmptyState` compartido).
7. Foco visible con anillo doble (claro + rojo) y contraste >= 4.5:1 en texto secundario.
8. Micro-interacciones sutiles: entrada escalonada de tarjetas (opacidad + translateY 8px), pulsación `scale(0.98)`; solo `transform`/`opacity`.
9. Tokens de superficie y sombra consistentes (nivel 1/2/3) en Tailwind y CSS en vez de valores sueltos.
10. Uso con una mano en el tatami: zonas táctiles grandes, acciones clave abajo, sin dependencia de hover.
