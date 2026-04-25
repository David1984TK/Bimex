# Guión del Video Demo — Bimex

**Duración total:** 5-7 minutos  
**Idioma principal:** Español  
**Subtítulos:** Inglés

---

## Parte 1 — El Problema (1-2 min)

### Escena 1: Introducción
**[Pantalla: Logo de Bimex + Stellar]**

> "Hola, soy [nombre] y hoy les voy a mostrar Bimex, una plataforma de crowdfunding revolucionaria construida en Stellar Mainnet."

### Escena 2: El problema del crowdfunding tradicional
**[Pantalla: Gráficos mostrando riesgos del crowdfunding]**

> "El crowdfunding tradicional tiene un problema fundamental: los contribuidores arriesgan su capital. Si donas $100 a un proyecto, pierdes esos $100 para siempre."

> "¿Qué pasaría si pudieras apoyar proyectos de impacto social SIN perder tu dinero?"

### Escena 3: La solución
**[Pantalla: Diagrama simple de Bimex]**

> "Bimex resuelve esto con el concepto de 'zero-loss crowdfunding'. Tú contribuyes capital, ese capital genera rendimientos a través de CETES digitales en Stellar, y el yield va al proyecto. Al final, recuperas tu capital completo."

> "Es como si tu dinero trabajara para causas sociales mientras tú mantienes el control total."

---

## Parte 2 — Demo Técnica en Mainnet (3-4 min)

### Escena 4: Acceder a la plataforma
**[Pantalla: Navegador abriendo https://bimex-frontend.vercel.app]**

> "Vamos a ver cómo funciona en vivo. Estoy en bimex-frontend.vercel.app, nuestra aplicación en producción conectada a Stellar Mainnet."

### Escena 5: Conectar wallet
**[Pantalla: Click en 'Conectar Wallet' → Freighter popup]**

> "Primero, conecto mi wallet Freighter. Bimex funciona con cualquier wallet compatible con Stellar."

**[Mostrar conexión exitosa]**

### Escena 6: Crear un proyecto
**[Pantalla: Navegar a 'Crear Proyecto']**

> "Ahora voy a crear un proyecto de ejemplo. Supongamos que quiero financiar un programa de educación ambiental."

**[Llenar formulario:]**
- Nombre: "Educación Ambiental Comunitaria"
- Descripción: "Programa de talleres sobre sustentabilidad para comunidades rurales"
- Meta: 10,000 MXNe
- Duración: 90 días

> "Envío la transacción a Mainnet... y listo. El proyecto está creado pero necesita aprobación del admin."

### Escena 7: Panel de administración
**[Pantalla: Cambiar a cuenta admin → Panel Admin]**

> "Como administrador, puedo revisar y aprobar proyectos. Esto asegura que solo proyectos legítimos reciban fondos."

**[Aprobar el proyecto]**

> "Apruebo el proyecto y ahora está visible para todos los contribuidores."

### Escena 8: Contribuir al proyecto
**[Pantalla: Volver a cuenta de contribuidor → Ver proyecto aprobado]**

> "Ahora como contribuidor, voy a aportar 1,000 MXNe a este proyecto."

**[Mostrar:]**
- Balance actual de MXNe
- Ingresar cantidad: 1,000
- Confirmar transacción en Freighter

> "La transacción se confirma en segundos. Mi capital ahora está generando yield a través de CETES digitales."

### Escena 9: Yield acumulándose
**[Pantalla: Dashboard mostrando yield en tiempo real]**

> "Aquí puedo ver mi contribución y el yield que se está acumulando. Este yield va directamente al proyecto de educación ambiental."

**[Mostrar métricas:]**
- Capital contribuido: 1,000 MXNe
- Yield generado: X MXNe
- Tasa anual estimada: ~10% (basada en CETES)

### Escena 10: Retirar el principal
**[Pantalla: Opción de 'Retirar Capital']**

> "En cualquier momento, puedo retirar mi capital original. El proyecto se queda con el yield generado hasta ese momento."

**[Ejecutar retiro]**

> "Confirmo el retiro y... listo. Recupero mis 1,000 MXNe completos. El proyecto recibió el yield, y yo no perdí nada."

---

## Parte 3 — Arquitectura (1 min)

### Escena 11: Diagrama técnico
**[Pantalla: Diagrama de arquitectura]**

> "¿Cómo funciona esto por dentro?"

**[Mostrar flujo:]**
```
Contribuidores → Bimex (Soroban Smart Contract)
                      ↓
              CETES Layer (MXNe → yield)
                      ↓
              AMM Layer (liquidez)
                      ↓
              Yield → Proyecto
```

> "Los contribuidores depositan MXNe en el contrato inteligente Bimex, escrito en Soroban. El contrato invierte automáticamente en CETES digitales que generan rendimientos. Ese yield se distribuye al proyecto, mientras el capital permanece seguro."

### Escena 12: Seguridad y transparencia
**[Pantalla: Stellar Explorer mostrando transacciones]**

> "Todo está en blockchain. Cada transacción es verificable en Stellar. El contrato está auditado y desplegado en Mainnet."

---

## Parte 4 — Cierre (30 seg)

### Escena 13: Call to action
**[Pantalla: Logo Bimex + enlaces]**

> "Bimex hace posible el crowdfunding sin riesgo. Apoya proyectos de impacto social sin perder tu capital."

> "Visita bimex-frontend.vercel.app para empezar. El código es open source en GitHub."

> "Si te gustó este proyecto, considera apoyarnos en el Stellar Community Fund."

**[Pantalla final:]**
- URL: https://bimex-frontend.vercel.app
- GitHub: [agregar link]
- Twitter: [agregar handle]
- Stellar Community Fund: [agregar link]

---

## Notas de Producción

### Audio
- Usar micrófono de calidad
- Grabar en ambiente silencioso
- Normalizar audio en post-producción

### Video
- Resolución: 1920x1080 (1080p)
- Frame rate: 30fps mínimo
- Formato: MP4 (H.264)

### Edición
- Agregar música de fondo sutil (libre de derechos)
- Transiciones suaves entre escenas
- Destacar elementos importantes con zoom o círculos
- Agregar texto en pantalla para conceptos clave

### Subtítulos
- Generar SRT en español
- Traducir a inglés
- Subir ambos a YouTube

### Timestamps para descripción de YouTube
```
0:00 - Introducción
0:30 - El problema del crowdfunding tradicional
1:15 - La solución: Zero-loss crowdfunding
2:00 - Demo en vivo: Conectar wallet
2:30 - Crear un proyecto
3:15 - Aprobar proyecto (admin)
3:45 - Contribuir al proyecto
4:30 - Ver yield acumulándose
5:15 - Retirar capital
5:45 - Arquitectura técnica
6:30 - Cierre y call to action
```
