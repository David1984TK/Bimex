# Guía del Creador de Proyectos — Bimex

> Financia tu proyecto de impacto social con el rendimiento del capital de tus backers.

## ¿Qué tipo de proyectos acepta Bimex?

Bimex está diseñado para proyectos de **impacto social** en México y Latinoamérica. Ejemplos:

- Educación: escuelas rurales, becas, materiales didácticos
- Salud: clínicas comunitarias, campañas de vacunación
- Medio ambiente: reforestación, energía solar comunitaria
- Emprendimiento social: cooperativas, microempresas locales
- Cultura: preservación de lenguas indígenas, espacios culturales

**No se aceptan:** proyectos con fines de lucro privado, proyectos sin impacto social verificable, o proyectos que no puedan presentar documentación.

---

## Documentos necesarios

Antes de crear tu proyecto, prepara:

| Documento | Descripción |
|---|---|
| Identificación oficial | INE o pasaporte del responsable del proyecto |
| Plan del proyecto | Descripción, objetivos, beneficiarios, cronograma |
| Presupuesto detallado | Desglose de cómo se usará el yield recibido |
| Evidencia de impacto | Fotos, cartas de comunidad, registros previos (si existen) |

Estos documentos se combinan en un solo PDF, se genera su hash SHA-256, y ese hash se registra on-chain al crear el proyecto (campo `doc_hash`). Esto garantiza que el documento no puede modificarse después.

```bash
# Generar hash SHA-256 de tu documento
sha256sum mi-proyecto.pdf
# Ejemplo de salida: a3f2c1... (64 caracteres hex = 32 bytes)
```

---

## Proceso paso a paso

### 1. Prepara tu wallet

- Instala [Freighter](https://www.freighter.app) y crea una cuenta
- Necesitas una pequeña cantidad de XLM para las comisiones de red
- Conecta tu wallet en [bimex-frontend.vercel.app](https://bimex-frontend.vercel.app)

### 2. Crea tu proyecto

- Ve a **"Crear Proyecto"**
- Completa el formulario:
  - **Nombre**: nombre descriptivo del proyecto (máx. 64 caracteres)
  - **Meta**: cantidad de MXNe que necesitas recaudar como capital base
  - **Hash del documento**: los primeros 32 bytes del SHA-256 de tu PDF
- Haz clic en **"Crear"** y confirma en Freighter
- Tu proyecto queda en estado **EnRevision**

### 3. Revisión por el admin

El equipo de Bimex revisará tu proyecto en un plazo de **2-5 días hábiles**. Verificarán:

- Que el proyecto tenga impacto social real
- Que la documentación esté completa
- Que la meta sea razonable para el proyecto

Si es aprobado → estado **EtapaInicial** (listo para recibir backers)
Si es rechazado → recibirás el motivo de rechazo en el campo `motivo_rechazo`

### 4. Difunde tu proyecto

Una vez aprobado, comparte el link de tu proyecto con tu comunidad. Los backers pueden contribuir desde cualquier parte del mundo con MXNe.

### 5. Reclama el yield

Cuando tu proyecto tenga backers activos (estado **EnProgreso** o **Liberado**), puedes reclamar el yield acumulado:

- Ve al detalle de tu proyecto
- Haz clic en **"Reclamar yield"**
- Confirma en Freighter
- Los MXNe del rendimiento llegan a tu wallet

Puedes reclamar el yield **en cualquier momento** mientras el proyecto esté activo. El reloj de yield se reinicia con cada reclamación.

### 6. Cierre del proyecto

Cuando hayas completado los objetivos del proyecto:

- El admin puede marcar el proyecto como **Liberado** (o se marca automáticamente al alcanzar la meta)
- Los backers pueden retirar su principal
- Tú habrás recibido el yield total generado durante la vida del proyecto

Si necesitas cancelar el proyecto, usa **"Abandonar proyecto"** — esto permite a los backers recuperar su capital inmediatamente.

---

## Cálculo del yield que recibirás

```
yield_estimado = meta_mxne × 13.45% × (meses / 12)

Ejemplo:
  Meta: 50,000 MXNe
  Duración estimada: 12 meses
  Yield total: 50,000 × 0.1345 × 1 = 6,725 MXNe ≈ $6,725 MXN
```

> El yield real depende de cuánto capital esté efectivamente bloqueado y por cuánto tiempo.

---

## Recursos

- [Guía del contribuidor](guia-contribuidor.md)
- [Documentación técnica](../DOCUMENTACION.txt)
- [FAQ en español](faq-es.md)
- Soporte: [Stellar Discord](https://discord.gg/stellar-development-foundation)
