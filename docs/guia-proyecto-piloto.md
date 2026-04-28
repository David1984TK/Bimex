# Guía del Proyecto Piloto en Mainnet

> Primera implementación real de Bimex con una organización de impacto social en México

## ¿Por qué importa?

Un caso de uso real con datos y transacciones verificables en Mainnet es la prueba más poderosa de que Bimex funciona. Este primer proyecto piloto será el caso de éxito que impulse la adopción en la comunidad Stellar.

## Dependencias

- Issues #6, #7, #8, #9: Mainnet funcionando
- Issues #11/#20: Sistema de documentos en IPFS operativo

## Criterios de selección del proyecto piloto

El proyecto ideal debe cumplir con:

1. **Organización legítima**: ONG, cooperativa o startup social registrada en México
2. **Meta alcanzable**: Entre $50,000 y $200,000 MXN (evitar metas demasiado ambiciosas para el piloto)
3. **Documentación completa**:
   - Plan de proyecto detallado
   - Presupuesto desglosado
   - Identificación oficial del responsable
   - Comprobante de registro legal (si aplica)
4. **Compromiso público**: Disposición de aparecer como caso de éxito en comunicaciones de Bimex
5. **Capacidad técnica mínima**: Alguien en el equipo que pueda usar Freighter y entender el flujo básico

## Proceso de onboarding

### Paso 1: Selección (2 semanas)

**Actividades:**
- Contactar 5-10 organizaciones candidatas
- Presentar Bimex y el modelo de crowdfunding sin pérdida
- Evaluar con los criterios anteriores
- Seleccionar 1 proyecto piloto

**Organizaciones sugeridas para contactar:**
- Cooperativas agrícolas en Oaxaca o Chiapas
- Proyectos de vivienda social (ej. Techo México)
- Iniciativas de educación rural
- Fondos de emergencia comunitarios
- Organizaciones de la red Ashoka México

**Plantilla de contacto inicial:**
```
Asunto: Invitación a proyecto piloto — Crowdfunding sin pérdida en blockchain

Hola [Nombre],

Somos Bimex, una plataforma de crowdfunding sin pérdida construida sobre 
Stellar blockchain. Estamos buscando una organización de impacto social en 
México para nuestro primer proyecto piloto en Mainnet.

¿Qué significa "sin pérdida"?
Los contribuyentes bloquean pesos mexicanos (MXNe) en un contrato inteligente. 
El capital genera rendimiento (~13% anual) que va 100% a tu proyecto. Cuando 
el proyecto se completa, cada contribuyente recupera su capital íntegro.

Beneficios para tu organización:
- Fondeo sin deuda ni dilución
- Caso de éxito público con visibilidad en la comunidad Stellar
- Acompañamiento técnico completo de nuestro equipo

¿Te interesa conocer más? Podemos agendar una videollamada de 30 minutos.

Saludos,
[Tu nombre]
Equipo Bimex
```

### Paso 2: Preparación (1 semana)

**Actividades:**
- Acompañar al equipo para preparar los documentos
- Explicar el flujo de Bimex (cómo contribuir, cómo retirar)
- Configurar wallet Freighter para el dueño del proyecto
- Subir documentos a IPFS y obtener el hash

**Checklist de documentos:**
- [ ] Plan de proyecto (PDF, máx 5 páginas)
- [ ] Presupuesto detallado (Excel o PDF)
- [ ] Identificación oficial del responsable (INE/pasaporte)
- [ ] Comprobante de registro legal (acta constitutiva, RFC)
- [ ] Carta de compromiso firmada

**Configuración técnica:**
1. Instalar Freighter: https://www.freighter.app
2. Crear cuenta en Mainnet
3. Fondear con XLM (mínimo 5 XLM para fees)
4. Agregar trustline a MXNe (si es necesario)
5. Probar firma de transacción en Testnet primero

**Subir documentos a IPFS:**
```bash
# Opción 1: Pinata (recomendado)
# 1. Crear cuenta en https://pinata.cloud
# 2. Subir archivo desde dashboard
# 3. Copiar CID (ej. QmXxx...)

# Opción 2: IPFS CLI local
ipfs add documento-proyecto.pdf
# Retorna: added QmXxx... documento-proyecto.pdf

# Calcular hash SHA-256 para el contrato
sha256sum documento-proyecto.pdf
# o en macOS: shasum -a 256 documento-proyecto.pdf
```

### Paso 3: Lanzamiento (día D)

**Actividades:**
- Crear el proyecto en Bimex Mainnet con documentos reales en IPFS
- Admin aprueba el proyecto
- Anuncio público en redes sociales

**Crear proyecto (CLI):**
```bash
# Variables
export DUENO_SECRET=S...
export DUENO_ADDRESS=G...
export CONTRACT_ID=C...  # Contract ID de Mainnet
export NOMBRE="Escuela Rural Oaxaca"
export META=1000000000000  # 100,000 MXNe en stroops (7 decimales)
export DOC_HASH=0x...  # SHA-256 del documento (32 bytes hex)

# Crear proyecto
stellar contract invoke \
  --id $CONTRACT_ID \
  --source dueno \
  --network mainnet \
  -- crear_proyecto \
  --dueno $DUENO_ADDRESS \
  --nombre "$NOMBRE" \
  --meta $META \
  --doc_hash $DOC_HASH
```

**Aprobar proyecto (admin):**
```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network mainnet \
  -- admin_aprobar \
  --id_proyecto 0
```

**Anuncio en redes sociales (plantilla):**
```
🚀 ¡Primer proyecto piloto de Bimex en Mainnet!

Presentamos: [Nombre del Proyecto]
Meta: $[X] MXN
Organización: [Nombre]

¿Cómo funciona?
✅ Contribuyes con MXNe (stablecoin peso mexicano)
✅ Tu capital genera ~13% APY
✅ El rendimiento va 100% al proyecto
✅ Recuperas tu capital íntegro al finalizar

👉 Contribuye ahora: [URL]
📄 Documentos verificables en IPFS: [CID]
🔗 Transacciones en Stellar Explorer: [TX_HASH]

#Bimex #Stellar #CrowdfundingSinPerdida #ImpactoSocial
```

### Paso 4: Documentación del caso de éxito

**Actividades:**
- Escribir el caso de éxito con capturas y transacciones verificables
- Publicar en blog/Medium y foro de Stellar Community Fund

**Estructura del caso de éxito:**

```markdown
# Caso de Éxito: [Nombre del Proyecto]

## Resumen
- Organización: [Nombre]
- Meta: $[X] MXN
- Fondeo alcanzado: $[Y] MXN ([Z]%)
- Número de contribuyentes: [N]
- Yield generado: $[W] MXN
- Duración: [D] días

## El problema
[Descripción del problema que el proyecto busca resolver]

## La solución
[Cómo el proyecto aborda el problema]

## Por qué Bimex
[Por qué eligieron Bimex vs crowdfunding tradicional]

## Resultados
- [Métrica 1]
- [Métrica 2]
- [Métrica 3]

## Transacciones verificables
- Creación del proyecto: [TX_HASH_1]
- Primera contribución: [TX_HASH_2]
- Reclamación de yield: [TX_HASH_3]
- Documentos en IPFS: [CID]

## Testimonios
> "[Cita del dueño del proyecto]"
> — [Nombre], [Cargo]

## Impacto
[Descripción del impacto social logrado]

## Próximos pasos
[Qué sigue para el proyecto y para Bimex]
```

**Capturas requeridas:**
1. Proyecto en ListaProyectos.jsx
2. DetalleProyecto.jsx con contribuciones
3. Transacción en Stellar Explorer
4. Documento en IPFS gateway
5. Wallet del dueño mostrando yield recibido

## Tareas (checklist)

- [ ] Definir y aprobar los criterios de selección del proyecto piloto
- [ ] Crear lista de 10 organizaciones candidatas con contactos
- [ ] Enviar emails de contacto inicial
- [ ] Realizar 3-5 videollamadas de presentación
- [ ] Seleccionar la organización ganadora
- [ ] Firmar acuerdo de colaboración
- [ ] Acompañar preparación de documentos
- [ ] Configurar wallet Freighter del dueño
- [ ] Subir documentos a IPFS y obtener CID
- [ ] Calcular hash SHA-256 de documentos
- [ ] Crear proyecto en Mainnet
- [ ] Admin aprobar proyecto
- [ ] Publicar anuncio en Twitter/X
- [ ] Publicar anuncio en Discord de Stellar
- [ ] Monitorear primeras contribuciones
- [ ] Documentar transacciones y capturas
- [ ] Escribir caso de éxito completo
- [ ] Publicar en Medium/blog
- [ ] Compartir en Stellar Community Forum
- [ ] Actualizar README.md con enlace al caso de éxito

## Criterios de aceptación

✅ Al menos 1 proyecto real de impacto social en Mainnet con documentos verificables en IPFS

✅ El proyecto ha recibido al menos 1 contribución real de un tercero (no del equipo Bimex)

✅ Caso de éxito publicado y enlazado desde el README

## Métricas de éxito

- **Fondeo**: Al menos 30% de la meta alcanzada en los primeros 30 días
- **Contribuyentes**: Mínimo 5 contribuyentes únicos
- **Visibilidad**: Al menos 1,000 impresiones en redes sociales
- **Engagement**: Al menos 50 interacciones (likes, shares, comentarios)
- **Cobertura**: Mención en al menos 1 medio especializado en blockchain o impacto social

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Organización se retira | Media | Alto | Tener 2-3 candidatos backup |
| No se alcanza la meta | Media | Medio | Establecer meta realista ($50k-$100k) |
| Problemas técnicos en Mainnet | Baja | Alto | Testing exhaustivo en Testnet primero |
| Falta de contribuyentes | Alta | Alto | Campaña de marketing previa al lanzamiento |
| Documentos incompletos | Media | Medio | Checklist claro y acompañamiento cercano |

## Timeline estimado

```
Semana 1-2:  Contacto y selección
Semana 3:    Preparación de documentos
Semana 4:    Configuración técnica y lanzamiento
Semana 5-8:  Período de fondeo activo
Semana 9:    Documentación y publicación del caso de éxito
```

## Recursos necesarios

- **Tiempo del equipo**: ~40 horas (10h/semana durante 4 semanas)
- **Presupuesto marketing**: $5,000 MXN para promoción en redes
- **Incentivo inicial**: Considerar hacer la primera contribución desde el equipo Bimex ($10,000 MXN) para dar confianza

## Contactos útiles

- **Ashoka México**: https://www.ashoka.org/es-mx
- **Techo México**: https://www.techo.org/mexico/
- **New Ventures México**: https://www.nv.org.mx/
- **Sistema B México**: https://sistemab.org/mexico/
- **Red de Innovación Social**: https://www.innovacionsocial.org/

## Próximos pasos inmediatos

1. Revisar y aprobar esta guía con el equipo
2. Crear hoja de cálculo con organizaciones candidatas
3. Redactar email de contacto personalizado
4. Comenzar outreach esta semana

---

**Última actualización**: 2026-04-28  
**Responsable**: [Asignar]  
**Estado**: Pendiente de inicio
