# Marco Legal México — Bimex

**Fecha de análisis:** Noviembre 2026  
**Descargo de responsabilidad:** Este documento es un análisis documentado de fuentes públicas, **NO constituye asesoría legal vinculante**. Bimex recomienda consultar con especialistas legales locales antes de participar o invertir.

---

## 1. Contexto de Bimex

Bimex es una plataforma de financiamiento participativo ("crowdfunding") en blockchain (Stellar/Soroban) que:

- **Captura capital** mediante la aportación de MXNe (stablecoin denominado en pesos mexicanos)
- **Promete rendimiento** del ~6.725% APY efectivo anual (50% CETES @ 9.45% + 50% AMM @ 4.00%, cada tasa aplicada solo a su mitad del capital)
- **Devolución de principal** garantizada ("zero-loss") cuando el proyecto se completa
- **Jurisdicción potencial:** México (considerando que usuarios serán mayoritariamente mexicanos)

---

## 2. Marco Regulatorio Aplicable

### 2.1 Ley Fintech (Ley para Regular Instituciones de Fondos de Garantía y Fomento para la Agricultura, 2018)

**Aplicabilidad:** POTENCIALMENTE APLICABLE

La Ley Fintech (publicada en DOF el 9 de enero de 2018) regula instituciones de crédito, fondos de garantía, y **actualmente NO regula crowdfunding de forma específica**. Sin embargo, establece dos categorías relevantes:

#### Instituciones de Fondos de Garantía y Fomento para la Agricultura
- Requieren autorización especial de CNBV
- Operan con fondos públicos o privados para garantizar créditos
- **No aplica directamente a Bimex** (Bimex no es institución de garantía)

#### Observación crítica
La Ley Fintech **no cubre actualmente crowdfunding de equity/deuda**. No hay marco específico federal que regule plataformas de crowdfunding como Bimex que captan capital y generan rendimiento.

**Fuente:** [Ley para Regular Instituciones de Fondos de Garantía y Fomento para la Agricultura](https://www.diputados.gob.mx/LeyesBiblio/pdf/LRIFFFA.pdf)

---

### 2.2 Ley del Mercado de Valores (1975, reformada)

**Aplicabilidad:** PROBABLEMENTE APLICABLE (RIESGO ALTO)

La Ley del Mercado de Valores (LMV) regula la oferta pública de valores en México. Bimex PODRÍA caer bajo esta regulación porque:

1. **Definición de "valor"** (Art. 2, LMV):
   - Incluye obligaciones, bonos, papeles comerciales, certificados de participación
   - **Potencial clasificación:** Las "aportaciones a Bimex con promesa de rendimiento" podrían considerarse valores

2. **Oferta Pública** (Art. 4, LMV):
   - Aplica cuando se captan recursos del público ofreciendo rendimiento
   - La plataforma en internet es considerada oferta pública si es accesible a múltiples usuarios mexicanos

3. **Requisitos de Autorización** (Arts. 6-8, LMV):
   - Registro ante CNV (Comisión Nacional de Valores)
   - Prospecto de información
   - Auditorías financieras periódicas

**Conclusión:** Si Bimex captura capital mexicano y promete rendimiento, **probablemente requiere registro de valores ante CNV**, a menos que:
- Sea una excepción explícita (oferta privada restringida, montos menores, etc.)
- Se acoja a regulación de fintech de tecnologías de distribución descentralizada (pendiente reforma)

**Fuente:** [Ley del Mercado de Valores](https://www.gob.mx/cnbv/articulos/ley-del-mercado-de-valores)

---

### 2.3 Regulación de Criptoactivos y Stablecoins (PENDIENTE)

**Aplicabilidad:** INCIERTA (EN DESARROLLO)

A noviembre de 2026, México NO tiene regulación clara de criptoactivos ni stablecoins. El Banco de México y la CNBV están desarrollando:

- **CBDC Banxico:** Peso digital del Banco Central (proyecto en fase explorativa)
- **Regulación de stablecoins:** La CNBV está estudiando cómo clasificar y regular stablecoins como MXNe

**Riesgos potenciales:**
- MXNe (stablecoin) podría ser clasificado como "valor" si se comercializa como instrumento de inversión
- La promesa de rendimiento sobre MXNe intensifica este riesgo
- Futuras reformas podrían aplicar requisitos retrospectivos

**Fuente:** [Banco de México - Roadmap de Dinero Electrónico](https://www.banxico.gob.mx)

---

### 2.4 Regulación de Plataformas de Financiamiento Participativo (CROWDFUNDING)

**Aplicabilidad:** NO ESPECÍFICAMENTE (VACÍO LEGAL)

México NO tiene ley específica de crowdfunding. La CNBV ha emitido **circulares administrativas** sobre crowdfunding, pero:

- Aplican principalmente a plataformas de equity crowdfunding en empresas
- No regulan explícitamente "yield-bearing deposits" como Bimex
- **Vacío regulatorio:** Bimex podría caer bajo Ley del Mercado de Valores por defecto

**Fuente:** [CNBV - Circular sobre Plataformas de Financiamiento Participativo](https://www.cnbv.gob.mx)

---

### 2.5 Ley de Protección al Consumidor (LPDC)

**Aplicabilidad:** SIEMPRE APLICABLE

La Ley Federal de Protección al Consumidor (LPDC) aplica a todas las transacciones de bienes y servicios:

1. **Información clara y veraz** (Art. 6, LPDC)
   - Bimex debe informar explícitamente sobre:
     - Riesgos de la inversión
     - Ausencia de garantía estatal
     - Términos de liquidez y devolución de capital
     - Funcionamiento del protocolo blockchain

2. **Prohibición de publicidad engañosa** (Art. 34, LPDC)
   - No puede prometer "sin riesgo" o "garantizado" si existe riesgo
   - "Zero-loss" solo es cierto si el proyecto completa exitosamente

3. **Derecho a retracto** (Arts. 50-51, LPDC)
   - En transacciones electrónicas, usuario puede retractarse en 5 días hábiles

4. **CONDUSEF** (Comisión Nacional para la Protección y Defensa de los Usuarios de Servicios Financieros)
   - Tiene jurisdicción sobre servicios financieros
   - Usuarios pueden presentar reclamaciones ante CONDUSEF

**Fuente:** [LPDC](https://www.gob.mx/profeco/acciones-y-programas/ley-federal-de-proteccion-al-consumidor)

---

### 2.6 Ley de Dinero Electrónico (Instituciones de Dinero Electrónico)

**Aplicabilidad:** POSIBLEMENTE (SI SE MANTIENE MXNe EN CUSTODÍA)

Si Bimex mantuviera MXNe en custodía (lo cual no es el caso con blockchain), podría ser clasificado como "Institución de Dinero Electrónico" bajo la Ley de Instituciones de Crédito. Sin embargo:

- **Bimex no es custodio:** El capital se bloquea en smart contract (autoejecutable)
- **No hay intermediación de fondos:** Los usuarios retienen control de sus claves privadas
- **Conclusión:** Probablemente no aplica en el modelo actual

**Fuente:** [Ley de Instituciones de Crédito](https://www.gob.mx/cnbv)

---

### 2.7 Análisis Fiscal de Rendimientos

#### Impuesto sobre la Renta (ISR)

**Aplicabilidad:** SIEMPRE APLICABLE

El rendimiento generado en Bimex (~6.725% APY efectivo) es:

1. **Ingreso sujeto a ISR** (Ley del ISR, Art. 1)
   - El usuario debe declarar como "Otros ingresos"
   - Tasa: 24% de ISR + 10.63% de Aportaciones de Seguridad Social = ~34.63%
   - O integrado en actividad económica si es residente fiscal de México

2. **Retención de ISR** (Art. 106, Ley del ISR)
   - Aunque es incierto quién retiene si es blockchain descentralizado
   - **Recomendación:** Bimex debe clarificar tratamiento fiscal

3. **Beneficiarios extranjeros**
   - Si el usuario no es residente fiscal de México, **podría estar exento** de ISR mexicano
   - Pero sujeto a impuestos en su país de residencia

#### Impuesto al Valor Agregado (IVA)

**Aplicabilidad:** INCIERTA

- Los servicios de "financiamiento participativo" podrían estar sujetos a IVA
- O exentos si se clasifica como "servicio financiero" (típicamente exento)
- **Recomendación:** Consultar con SAT

**Fuente:** [Ley del Impuesto sobre la Renta](https://www.gob.mx/sat) | [SAT - Tratamiento de Criptoactivos](https://www.gob.mx/sat/que-es-el-registro-federal-de-contribuyentes)

---

## 3. Régimen Aplicable a Bimex — Conclusión

### Escenario más probable:

1. **Ley del Mercado de Valores** → Registro de valores ante CNV (si se solicita)
2. **Ley de Protección al Consumidor** → Divulgación exhaustiva de riesgos
3. **Ley del ISR** → Usuarios declaran rendimientos como ingresos

### Riesgos sin regulación clara:

- **Capacidad legal:** ¿Puede una entidad descentralizada (DAO/contrato) ser sujeto de derechos en México?
- **Responsabilidad:** ¿Quién es responsable si el contrato falla o es hackeado?
- **Arbitraje:** ¿Cómo se resuelven disputas entre usuario y plataforma?

---

## 4. Avisos Legales y Disclaimers Recomendados

### 4.1 Aviso General de Riesgo (Obligatorio)

```
AVISO DE RIESGO

Bimex es una plataforma de financiamiento participativo en blockchain 
(Stellar/Soroban). Este aviso es de carácter informativo y NO constituye 
asesoría legal, financiera o de inversión.

RIESGOS CRÍTICOS:

1. Riesgo de Pérdida Total:
   - Aunque la devolución de principal es "cero-pérdida", existe riesgo 
     de fracaso del proyecto, fallo del protocolo blockchain, o imposibilidad 
     de liquidación.
   - Bimex no garantiza ni respalda las aportaciones con fondos propios.

2. Riesgo de Mercado:
   - El rendimiento esperado (~6.725% APY efectivo) no es garantizado y puede variar.
   - Depende de tasas CETES (Banco de México) y liquidez de AMM.

3. Riesgo de Liquidez:
   - Las aportaciones están bloqueadas durante la duración del proyecto.
   - No es posible retirar fondos antes de que el proyecto se complete.

4. Riesgo Tecnológico:
   - Fallos en smart contract, ataques de seguridad, o vulnerabilidades.
   - Pérdida de acceso a wallet (pérdida de claves privadas = pérdida de fondos).

5. Riesgo Regulatorio:
   - Marco legal en México es incierto. Cambios regulatorios pueden afectar 
     operación de plataforma.
   - Bimex no es autorizado por CNBV, Banxico o autoridades financieras mexicanas.

6. Riesgo de Contraparte:
   - El proyecto que recibe capital podría incumplir o cerrar operaciones.

NO hay seguro de depósitos, garantía estatal, o protección de fondos.

AL PARTICIPAR EN BIMEX, ACEPTAS ESTOS RIESGOS.
```

---

### 4.2 Aviso de Regulación (Crítico)

```
AVISO DE CUMPLIMIENTO REGULATORIO

Bimex opera en México, con planes de expansión a Latinoamérica, y captura capital de usuarios mexicanos. 
El marco regulatorio es INCIERTO:

- NO está autorizado por la Comisión Nacional de Valores (CNV)
- NO está regulado por la Comisión Nacional Bancaria y de Valores (CNBV)
- NO está registrado ante CONDUSEF
- NO tiene licencia de Institución Financiera

La participación en Bimex es responsabilidad personal de cada usuario. 
México no tiene regulación clara de crowdfunding/stablecoins (a nov 2026).

Si tienes dudas, consulta con un asesor legal local.
```

---

### 4.3 Aviso de Impuestos (Obligatorio)

```
AVISO FISCAL

El rendimiento generado en Bimex constituye INGRESO sujeto a impuestos 
en tu país de residencia.

EN MÉXICO:
- Declarar como "Otros ingresos" en Declaración Anual (SAT)
- ISR aproximado: 24% + cuotas de seguridad social (~34.63%)
- Responsabilidad: Usuario debe consultar con contador público

EN OTROS PAÍSES:
- Consulta con asesor fiscal local

Bimex no retiene impuestos. Tú eres responsable de calcular y pagar 
impuestos según tu jurisdicción.
```

---

### 4.4 Aviso de Privacidad y Datos (Requerido por LPDC)

```
TRATAMIENTO DE DATOS PERSONALES

Bimex recopila:
- Dirección de wallet Stellar
- Transacciones en blockchain (públicas)
- Correo (si aplica)

DATOS NO RECOPILADOS:
- Bimex no requiere KYC/AML formal (debido a naturaleza descentralizada)
- Transacciones son pseudónimas en blockchain
- No compartimos datos con terceros

PRIVACIDAD:
- Datos almacenados en servidores seguros
- No vendemos información a marketing o terceros
- Cumplimos con LPDC (Ley de Protección al Consumidor)
```

---

### 4.5 Negación de Responsabilidad (Liability Disclaimer)

```
NEGACIÓN DE RESPONSABILIDAD

Bimex y sus operadores NO son responsables por:

1. Pérdida de fondos por fallo técnico, ataque de seguridad, o bug en smart contract
2. Incumplimiento de proyecto o incompetencia del gestor del proyecto
3. Fluctuaciones en CETES/AMM que afecten rendimiento
4. Cambios regulatorios que suspendan operación
5. Pérdida de acceso a wallet (pérdida de claves privadas)
6. Cambios en precio o liquidez de MXNe
7. Errores de usuario (envío incorrecto de fondos, confusión de direcciones)

ACCESO "TAL CUAL" (AS-IS):
Bimex se proporciona "en estado actual" sin garantías expresas o implícitas 
de funcionamiento, disponibilidad, o éxito financiero.
```

---

### 4.6 Consentimiento Informado (Para aceptar antes de participar)

```
✓ CONSENTIMIENTO Y ACEPTACIÓN

Al participar en Bimex, CONFIRMO que:

1. He leído y comprendido todos los avisos de riesgo
2. Entiendo que NO hay garantía de rendimiento ni devolución de capital
3. Aceptaré la pérdida total de mi inversión sin recurso legal
4. Soy responsable de mis impuestos según mi jurisdicción
5. Asumo responsabilidad por seguridad de mis claves privadas
6. No espero protección regulatoria ni seguro de depósitos
7. Soy mayor de edad y tengo capacidad legal para invertir
8. Esta es mi decisión informada y voluntaria

FIRMA DIGITAL: Al hacer clic en "Aceptar", confirmo lo anterior.
```

---

## 5. Fuentes Citadas

| Fuente | URL | Fecha consultada |
|--------|-----|------------------|
| Ley para Regular Instituciones de Fondos de Garantía y Fomento para la Agricultura | https://www.diputados.gob.mx/LeyesBiblio/pdf/LRIFFFA.pdf | Nov 2026 |
| Ley del Mercado de Valores | https://www.gob.mx/cnbv/articulos/ley-del-mercado-de-valores | Nov 2026 |
| Ley Federal de Protección al Consumidor (LPDC) | https://www.gob.mx/profeco/acciones-y-programas/ley-federal-de-proteccion-al-consumidor | Nov 2026 |
| Banco de México - Dinero Electrónico | https://www.banxico.gob.mx | Nov 2026 |
| CNBV - Comisión Nacional de Valores | https://www.cnbv.gob.mx | Nov 2026 |
| SAT - Tratamiento de Criptoactivos | https://www.gob.mx/sat | Nov 2026 |
| CONDUSEF - Comisión Nacional para la Protección de Usuarios Financieros | https://www.condusef.gob.mx | Nov 2026 |
| Ley del Impuesto sobre la Renta | https://www.gob.mx/sat | Nov 2026 |

---

## 6. Recomendaciones Finales

1. **Consultar abogado mexicano** especializado en fintech/valores antes de hacer cambios operacionales
2. **Monitorear reformas regulatorias** en CNBV y SAT (especialmente sobre stablecoins)
3. **Implementar avisos de riesgo claros** en todas las páginas de inversión
4. **Permitir opt-out regional** si la regulación cambia
5. **Documentar consentimiento** de usuarios (aceptación explícita de términos)
6. **Considerar seguro de responsabilidad civil** contra errores técnicos

---

**Documento preparado:** Noviembre 2026  
**Versión:** 1.0  
**Estado:** Análisis documentado (no asesoría legal)  
**Revisión recomendada:** Trimestral (cambios regulatorios frecuentes en México)
