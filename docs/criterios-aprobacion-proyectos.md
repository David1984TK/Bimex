# Criterios de aprobación de proyectos

El contrato no evalúa la calidad de un proyecto. `admin_aprobar` y `admin_rechazar` (`bimex/contracts/bimex/src/lib.rs`) solo verifican la firma del admin y que el proyecto esté `EnRevision`. Al crearlo, la única regla on-chain es `meta > 0`. Por eso la decisión depende del admin, y este documento fija con qué criterios se toma.

El panel de administración (`AdminPanel.jsx` → `TarjetaProyecto.jsx`) muestra estos criterios como checklist. **Aprobar** se habilita solo cuando están todos marcados. **Rechazar** está siempre disponible y pide un motivo. El motivo queda guardado on-chain en `motivo_rechazo`, así que conviene que diga qué corregir.

## Checklist

| Criterio (clave en `admin.criteria`) | Qué revisar | Motivo de rechazo típico |
|---|---|---|
| **Tipo de proyecto** (`tipo`) | Proyecto de impacto social de una organización identificable (ONG, cooperativa, startup social o colectivo con responsable). Encaja en una categoría de Bimex: Comunidad, Finanzas, Educación, Energía, Salud, Arte o Infraestructura. | Fines de lucro personal, actividad no identificable o fuera de las categorías. |
| **Monto** (`monto`) | La meta es proporcional al presupuesto adjunto. Para el piloto la referencia es de $50,000 a $200,000 MXN (`docs/guia-proyecto-piloto.md`); fuera de ese rango se pide justificarlo. | Meta sin relación con el presupuesto, o muy por encima de la referencia sin justificación. |
| **Plazo** (`plazo`) | El plazo está entre 1 y 120 meses (límite del formulario) y es coherente con el calendario del plan de trabajo. | Plazo que no alcanza para lo que promete el plan, o mayor de lo necesario. |
| **Evidencia** (`evidencia`) | Los tres documentos (INE del responsable, plan de trabajo y presupuesto desglosado) son legibles y corresponden a la misma persona y al mismo proyecto. Además coinciden con la huella documental de la tarjeta (ver abajo). | Documento ilegible o faltante, INE de otra persona, presupuesto sin desglose. |
| **Hitos** (`hitos`) | El plan define hitos verificables (fecha y entregable) para reportar avances a los contribuidores. | Plan sin entregables medibles. |

## Cómo verificar la huella documental

El proyecto guarda en `doc_cid` una de dos cosas:

- **Tres CIDs de IPFS separados por `|`** (`CID_INE|CID_PLAN|CID_PRESUPUESTO`), cuando la subida a IPFS funcionó. Cada documento se abre en `https://ipfs.io/ipfs/<CID>`.
- **Un hash SHA-256 en hex**, cuando IPFS no estaba disponible (fallback de `hashearDocumentos`). En ese caso se piden los tres archivos al creador y se confirma que su hash coincide. Para el hash de un archivo, ver `scripts/calcular-hash-documento.sh`.

Si los documentos no coinciden con la huella, el proyecto se rechaza aunque el resto cumpla.

## Cambiar los criterios

Las etiquetas del checklist viven en `bimex-frontend/src/i18n/es.json` y `en.json` (claves `admin.checklistTitle`, `admin.checklistHint` y `admin.criteria.*`), y la lista de criterios en la constante `CRITERIOS` de `TarjetaProyecto.jsx`. Al agregar o quitar un criterio hay que actualizar los tres lugares y este documento.
