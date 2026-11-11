# PRODUCT.md — 247 STUDIO (panel de administración)

## Producto
247 STUDIO es la plataforma web y PWA de una academia de Brazilian Jiu-Jitsu, Grappling No-Gi, MMA y Lucha en Pinto (Madrid). Este documento describe el panel de administración (`/admin/*`).

## Usuarios y escena de uso
- Mario y David (fundadores y directores), en la recepción, con una **tablet** (820x1180 y 1024x768 son los tamaños de referencia), entre clase y clase.
- Uso rápido, con una mano, con luz de sala (ambiente claro). Tareas diarias: cobrar cuotas, dar de alta alumnos, consultar alumnos, pasar lista.
- Los entrenadores (rol coach) solo ven Asistencia y Horarios.

## Modo de superficie
Operar (herramienta de trabajo). Prima la legibilidad, la rapidez y los objetivos táctiles de al menos 44 px. La marca vive en la paleta, la tipografía y los detalles, no en la decoración.

## Marca
- Rojo de rango BJJ `#E11D2E` como único acento, tinta azul marino `#1A1D2E` y lienzo arena `#F4F0E1`.
- Titulares en Oswald (condensada, atlética); texto en Inter.
- Tono de voz: español neutro, directo, verbos de acción ("Cobrar", "Dar de alta").

## Principios
1. Lo más usado, primero: Caja, Alta, Alumnos, Asistencia.
2. Los números importan: cifras grandes, tabulares, con el estado (por cobrar, por aprobar) siempre visible.
3. Un solo acento (rojo) para la acción principal de cada pantalla.
4. Nada de emojis como iconos: iconos de `lucide-react` con trazo uniforme.
