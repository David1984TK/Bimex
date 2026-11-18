# Plan de Alianzas Estratégicas con ONGs y Empresas (2-5 Proyectos Siguientes)

> Marco de gobernanza, selección, onboarding y pipeline para escalar las asociaciones de impacto social en Bimex.

## 1. Introducción y Contexto

Tras el éxito del primer proyecto piloto cubierto en `docs/guia-proyecto-piloto.md`, Bimex requiere un marco estructurado y repetible para seleccionar, evaluar y asociarse con ONGs, cooperativas y empresas sociales para los próximos 2 a 5 proyectos en Stellar Mainnet.

Este plan establece los criterios objetivos para minimizar riesgos operativos, garantizar la transparencia en blockchain y asegurar que las organizaciones cumplan con los estándares técnicos y legales requeridos.

---

## 2. Perfil del Partner Ideal

Para calificar como socio estratégico en los siguientes ciclos de fondeo, las organizaciones deben cumplir con los siguientes cuatro pilares:

### A. Sector y Enfoque
- **Impacto Comunitario / Ambiental / Educativo / Salud**: Debe resolver una problemática social o ambiental verificable en México o América Latina.
- **Transparencia Institucional**: Historial comprobable de operaciones o respaldo formal de una red de incubación, Sistema B, Ashoka, o equivalente.

### B. Tamaño y Escala
- **Personal**: Organizaciones con un equipo operativo mínimo de 3 a 5 personas (para asegurar la ejecución del proyecto).
- **Meta de Fondeo (Capíal Requerido)**: Proyectos con metas de recaudación entre **$50,000 MXN y $300,000 MXN** (adecuado para la liquidez inicial de los pools de yield y mitigación de riesgo).

### C. Necesidad de Capital
- **Capital sin Deuda ni Dilución**: Requieren fondos para capital de trabajo, adquisición de insumos productivos, infraestructura comunitaria o expansión temporal sin comprometer el patrimonio de la organización.
- **Disposición de Bloqueo de Plazo**: Capacidad de operar bajo el esquema de crowdfunding sin pérdida (donde el principal se devuelve íntegro a los contribuyentes y solo se utiliza el rendimiento generado).

### D. Capacidad Técnica Mínima
- **Uso de Wallets Stellar**: Disposición de instalar y operar Freighter o una wallet compatible con Stellar.
- **Punto Focal Asignado**: Un responsable administrativo con disponibilidad para interactuar con el equipo técnico de Bimex, firmar transacciones y reportar avances a la comunidad.

---

## 3. Checklist de Onboarding Reutilizable

Antes de desplegar cualquier contrato o aprobar un proyecto en Bimex Mainnet, la organización debe completar y aprobar el siguiente checklist validado por el comité de admisiones de Bimex:

### Fase 1: Verificación Legal y Documental
- [ ] **Plan de Proyecto Detallado**: Documento en PDF (máximo 5 páginas) que incluya objetivos, hitos, cronograma y uso específico de los fondos.
- [ ] **Presupuesto Desglosado**: Desglose financiero transparente en formato PDF o Excel.
- [ ] **Identificación Oficial**: Copia de INE o pasaporte del representante legal y del responsable técnico.
- [ ] **Comprobante de Registro Legal**: Acta constitutiva, constancia de situación fiscal (RFC en México) o registro formal ante autoridad competente (si aplica).
- [ ] **Carta de Compromiso**: Carta firmada aceptando los términos y condiciones de publicación y reportes periódicos de Bimex.

### Fase 2: Configuración Técnica
- [ ] **Creación de Cuenta Stellar**: Cuenta principal generada y respaldada en Mainnet.
- [ ] **Fondendos de Gas**: Saldo mínimo de 10 XLM en la cuenta del dueño para cubrir comisiones de red.
- [ ] **Trustline de MXNe**: Configuración de la trustline para recibir y operar la stablecoin de pesos mexicanos.
- [ ] **Subida a IPFS**: Documentos oficiales subidos mediante Pinata o nodo IPFS local.
- [ ] **Cálculo de Hash SHA-256**: Generación del hash criptográfico de los documentos para vinculación en el smart contract.

### Fase 3: Aprobación y Lanzamiento
- [ ] **Validación del Admin**: Revisión final y llamada de alineación (30 mins).
- [ ] **Invocación del Contrato**: Despliegue de la función `crear_proyecto` en Mainnet.
- [ ] **Aprobación de Admin**: Firma de `admin_aprobar` para habilitar el fondeo público.

---

## 4. Pipeline de Candidatos (Próximos Proyectos 2-5)

A continuación se presenta el pipeline activo con 2 candidatos reales/hipotéticos seleccionados bajo el perfil ideal para los siguientes ciclos de Bimex:

### Candidato 1: Cooperativa Agroforestal "Tierra Viva" (Oaxaca)
- **Sector**: Agricultura sostenible y reforestación comunitaria.
- **Tamaño**: 25 familias productoras asociadas.
- **Meta de Fondeo**: $120,000 MXN.
- **Necesidad de Capital**: Compra adelantada de bio-insumos y herramientas para la temporada de siembra.
- **Justificación del Fit**: 
  - Excelente alineación con el impacto ambiental y social.
  - Cuentan con personería jurídica y experiencia previa en fondos concursables.
  - Alto potencial viral e interés de la comunidad cripto por proyectos de regeneración de suelo.
- **Estado en el Pipeline**: *En fase de validación documental y preparación de wallet Freighter.*

### Candidato 2: Red de Bibliotecas Infantiles "Saber sin Fronteras" (Estado de México)
- **Sector**: Educación y acceso tecnológico comunitario.
- **Tamaño**: 4 centros comunitarios activos, 8 colaboradores permanentes.
- **Meta de Fondeo**: $85,000 MXN.
- **Necesidad de Capital**: Adquisición de tabletas reacondicionadas y conectividad satelital para 2 comunidades rurales.
- **Justificación del Fit**: 
  - Caso de uso sumamente claro y fácil de comunicar a los contribuyentes urbanos.
  - Liderazgo comprometido con la transparencia y disposición total para publicar reportes de impacto.
  - Monto de meta moderado ($85k MXN), ideal para garantizar un cierre rápido del ciclo de fondeo.
- **Estado en el Pipeline**: *Primer contacto realizado, videollamada de presentación agendada.*

---

## 5. Métricas de Éxito del Plan de Alianzas

Para evaluar la efectividad de este plan en los próximos 2-5 proyectos, se medirán los siguientes indicadores:

1. **Tiempo de Onboarding**: Reducir el ciclo de selección a implementación a menos de 21 días por proyecto.
2. **Tasa de Fondeo Exitoso**: Lograr que al menos el 80% de los proyectos en el pipeline alcancen su meta o logren financiamiento parcial funcional.
3. **Cumplimiento de Reportes**: 100% de los partners entregando su reporte de hitos y uso de yield en tiempo y forma.

---

**Última actualización**: 2026-04-28  
**Responsable**: Equipo de Alianzas y Operaciones Bimex
