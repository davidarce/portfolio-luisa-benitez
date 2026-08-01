# Checklist de iPhone — visor de galería

Ninguna comprobación automática cubre Safari de iOS ni VoiceOver; en este
proyecto el iPhone ya ha cazado dos bugs que las automáticas no vieron
(ver .sdd/visor-galeria/plan.md, sección Risks). Rellenar en un iPhone real.

1. [ ] El visor ocupa el alto real con la barra de Safari desplegada **y** replegada (valida `100dvh`).
2. [ ] Deslizar horizontalmente **en el centro** de la pantalla pasa de foto con inercia nativa.
3. [ ] Deslizar **desde el borde izquierdo** hace el gesto de volver atrás del sistema (aceptado, no se pelea con Safari).
4. [ ] Con el visor abierto, la página de detrás no se mueve al arrastrar en vertical.
5. [ ] Un vídeo se reproduce **dentro** del carril, no en el reproductor a pantalla completa de iOS (valida `playsinline`).
6. [ ] El botón «Volver» del navegador sale de la ficha de una sola pulsación: no hay una entrada de historial por diapositiva.
7. [ ] La barra inferior del visor no queda bajo el indicador de inicio (valida `env(safe-area-inset-bottom)`).
8. [ ] VoiceOver: con el visor abierto, deslizar hacia delante **no alcanza nunca** contenido del fondo.
9. [ ] VoiceOver: un gesto rápido que atraviesa 5-6 diapositivas produce **un** anuncio de posición, no una ristra.
10. [ ] El pinch-zoom funciona dentro del visor (si no amplía, hay `touch-action`/`user-scalable=no` que quitar).
11. [ ] Teclado Bluetooth: `Tab` alcanza el carril con anillo de foco visible y completo; el foco no se pierde en los extremos.
