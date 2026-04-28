# Flujo Visual del Proyecto Piloto

> Diagrama paso a paso del proceso completo

## Vista general (9 semanas)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PROYECTO PILOTO BIMEX                            │
│                  Primer caso real en Mainnet                        │
└─────────────────────────────────────────────────────────────────────┘

Semana 1-2          Semana 3           Semana 4         Semana 5-8        Semana 9
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│          │      │          │      │          │      │          │      │          │
│SELECCIÓN │─────▶│PREPARACIÓN│─────▶│LANZAMIENTO│─────▶│  FONDEO  │─────▶│  CASO DE │
│          │      │          │      │          │      │  ACTIVO  │      │  ÉXITO   │
│          │      │          │      │          │      │          │      │          │
└──────────┘      └──────────┘      └──────────┘      └──────────┘      └──────────┘
    │                  │                  │                  │                  │
    │                  │                  │                  │                  │
    ▼                  ▼                  ▼                  ▼                  ▼
Contactar         Documentos         Crear en          Monitorear         Publicar
10 ONGs           + IPFS             Mainnet           contribuciones     artículo
```

## Fase 1: Selección (Semanas 1-2)

```
┌─────────────────────────────────────────────────────────────────┐
│                         SELECCIÓN                               │
└─────────────────────────────────────────────────────────────────┘

Día 1-3: Preparación
├── Crear lista de 10 organizaciones candidatas
├── Investigar contactos (email, teléfono)
├── Preparar materiales de presentación
└── Revisar criterios de selección

Día 4-7: Outreach inicial
├── Enviar email a 10 organizaciones
├── Hacer seguimiento telefónico
└── Responder preguntas iniciales

Día 8-14: Videollamadas
├── Agendar 3-5 videollamadas
├── Presentar Bimex (30 min c/u)
├── Evaluar interés y fit
└── Responder dudas técnicas

Día 15: Decisión
├── Evaluar candidatos con criterios
├── Seleccionar organización ganadora
├── Enviar email de confirmación
└── Agendar kickoff meeting

✅ Output: 1 organización seleccionada y comprometida
```

## Fase 2: Preparación (Semana 3)

```
┌─────────────────────────────────────────────────────────────────┐
│                       PREPARACIÓN                               │
└─────────────────────────────────────────────────────────────────┘

Día 1-2: Documentación
├── Enviar checklist de documentos
├── Explicar requisitos de cada documento
└── Establecer deadline (día 5)

Día 3-5: Recopilación
├── Recibir plan de proyecto
├── Recibir presupuesto
├── Recibir identificación oficial
├── Recibir comprobante de registro
└── Recibir carta de compromiso firmada

Día 6: IPFS
├── Revisar y aprobar documentos
├── Combinar en un solo PDF (opcional)
├── Subir a Pinata/IPFS
├── Obtener CID
├── Verificar acceso público
└── Calcular hash SHA-256
    └── bash scripts/calcular-hash-documento.sh documento.pdf

Día 7: Configuración técnica
├── Agendar sesión de capacitación (1 hora)
├── Guiar instalación de Freighter
├── Ayudar a crear cuenta Mainnet
├── Fondear cuenta con XLM (5+ XLM)
├── Configurar trustline a MXNe
├── Probar firma en Testnet
└── Explicar flujo de Bimex

✅ Output: Documentos en IPFS + Wallet configurada + Hash SHA-256
```

## Fase 3: Lanzamiento (Semana 4, Día D)

```
┌─────────────────────────────────────────────────────────────────┐
│                       LANZAMIENTO                               │
└─────────────────────────────────────────────────────────────────┘

Pre-lanzamiento (Día D-1)
├── Verificar Mainnet operativo
├── Verificar frontend apunta a Mainnet
├── Preparar anuncios para redes
├── Preparar email para lista
└── Coordinar hora de lanzamiento

Día D - Mañana (9:00 AM)
├── 1. Crear proyecto en Mainnet
│   ├── export CONTRACT_ID=C...
│   ├── export DUENO_SECRET=S...
│   ├── export DOC_HASH=0x...
│   └── bash scripts/crear-proyecto-piloto.sh
│       └── Guardar ID del proyecto: ___
│       └── Guardar TX hash: ___
│
├── 2. Aprobar proyecto (admin)
│   ├── export ADMIN_SECRET=S...
│   └── bash scripts/aprobar-proyecto-piloto.sh
│       └── Guardar TX hash: ___
│
└── 3. Verificar en frontend
    └── Proyecto visible y acepta contribuciones ✅

Día D - Tarde (3:00 PM)
├── Publicar en Twitter/X
├── Publicar en LinkedIn
├── Publicar en Discord (Stellar)
├── Enviar email a lista de contactos
└── Publicar artículo en Medium

Día D - Noche (8:00 PM)
├── Hacer primera contribución (equipo Bimex)
├── Compartir TX hash en redes
└── Recap del día en Twitter

✅ Output: Proyecto live en Mainnet + Anuncios publicados
```

## Fase 4: Fondeo activo (Semanas 5-8)

```
┌─────────────────────────────────────────────────────────────────┐
│                      FONDEO ACTIVO                              │
└─────────────────────────────────────────────────────────────────┘

Rutina diaria
├── Revisar contribuciones nuevas
├── Actualizar proyecto-piloto-tracking.md
├── Responder preguntas en redes
└── Dar soporte técnico

Rutina semanal (cada lunes)
├── Publicar update de progreso
├── Calcular métricas (fondeo, yield, contribuyentes)
├── Compartir en todas las redes
└── Enviar email quincenal (semanas 2, 4, 6, 8)

Hitos especiales
├── Primera contribución de tercero
│   └── Celebrar en redes + agradecer públicamente
│
├── 30% de la meta
│   └── Post de milestone + TX hash
│
├── 50% de la meta
│   └── Post de milestone + testimonial
│
├── 75% de la meta
│   └── Post de milestone + push final
│
└── 100% de la meta (si aplica)
    └── Celebración grande + caso de éxito anticipado

Calendario de contenido
├── Lunes: Update semanal de métricas
├── Miércoles: Contenido educativo o testimonial
└── Viernes: Recap de la semana

✅ Output: Fondeo progresivo + Engagement alto + Datos recopilados
```

## Fase 5: Caso de éxito (Semana 9)

```
┌─────────────────────────────────────────────────────────────────┐
│                      CASO DE ÉXITO                              │
└─────────────────────────────────────────────────────────────────┘

Día 1-2: Recopilación
├── Exportar todas las transacciones
├── Calcular métricas finales
│   ├── Fondeo total
│   ├── Yield generado
│   ├── Número de contribuyentes
│   └── Días activo
├── Tomar capturas de pantalla
├── Recopilar testimonios de contribuyentes
└── Agendar entrevista con dueño del proyecto

Día 3-4: Redacción
├── Usar template de templates-comunicacion-piloto.md
├── Escribir borrador completo
├── Incluir todas las TX verificables
├── Agregar capturas de pantalla
├── Incluir testimonios
└── Revisar con el equipo

Día 5: Aprobación
├── Enviar a la organización para aprobación
├── Incorporar feedback
└── Versión final aprobada

Día 6: Publicación
├── Publicar en Medium/blog
├── Publicar en Stellar Community Forum
├── Actualizar README.md con enlace
├── Compartir en Twitter/X (hilo largo)
├── Compartir en LinkedIn (artículo)
├── Compartir en Discord
└── Enviar email a lista de contactos

Día 7: Distribución
├── Contactar medios especializados
├── Compartir en grupos de WhatsApp/Telegram
├── Agregar a portfolio de Bimex
└── Planear próximo proyecto piloto

✅ Output: Caso de éxito publicado + Visibilidad máxima
```

## Flujo de transacciones en blockchain

```
┌─────────────────────────────────────────────────────────────────┐
│                  TRANSACCIONES VERIFICABLES                     │
└─────────────────────────────────────────────────────────────────┘

1. Crear proyecto
   ├── Dueño firma TX con Freighter
   ├── crear_proyecto(dueno, nombre, meta, doc_hash)
   ├── Estado: EnRevision
   └── TX hash: [guardar en tracking]

2. Aprobar proyecto
   ├── Admin firma TX
   ├── admin_aprobar(id_proyecto)
   ├── Estado: EtapaInicial → EnProgreso (con primera contribución)
   └── TX hash: [guardar en tracking]

3. Contribuir
   ├── Backer firma TX con Freighter
   ├── contribuir(backer, id_proyecto, cantidad)
   ├── Capital dividido 50/50 (CETES/AMM)
   ├── Si total >= meta → Estado: Liberado
   └── TX hash: [guardar en tracking]

4. Reclamar yield (periódico)
   ├── Dueño firma TX
   ├── reclamar_yield(id_proyecto)
   ├── Yield transferido al dueño
   └── TX hash: [guardar en tracking]

5. Retirar principal (al finalizar)
   ├── Backer firma TX
   ├── retirar_principal(backer, id_proyecto)
   ├── Principal devuelto íntegro
   └── TX hash: [guardar en tracking]

Todas las TX son verificables en:
https://stellar.expert/explorer/public/contract/[CONTRACT_ID]
```

## Checklist de verificación por fase

### ✅ Fase 1 completa cuando:
- [ ] 10 organizaciones contactadas
- [ ] 3-5 videollamadas realizadas
- [ ] 1 organización seleccionada
- [ ] Kickoff meeting agendado

### ✅ Fase 2 completa cuando:
- [ ] Todos los documentos recibidos y aprobados
- [ ] Documentos subidos a IPFS (CID obtenido)
- [ ] Hash SHA-256 calculado
- [ ] Wallet Freighter configurada
- [ ] Cuenta fondeada con XLM
- [ ] Prueba de firma exitosa

### ✅ Fase 3 completa cuando:
- [ ] Proyecto creado en Mainnet (ID obtenido)
- [ ] Proyecto aprobado por admin
- [ ] Proyecto visible en frontend
- [ ] Anuncios publicados en todas las redes
- [ ] Primera contribución realizada

### ✅ Fase 4 completa cuando:
- [ ] Al menos 1 contribución de tercero
- [ ] 5+ contribuyentes únicos
- [ ] 30%+ de la meta alcanzada
- [ ] Updates semanales publicados
- [ ] Engagement alto mantenido

### ✅ Fase 5 completa cuando:
- [ ] Caso de éxito redactado
- [ ] Aprobado por la organización
- [ ] Publicado en Medium/blog
- [ ] Compartido en todas las redes
- [ ] README.md actualizado
- [ ] Medios contactados

## Métricas de éxito

```
┌─────────────────────────────────────────────────────────────────┐
│                    MÉTRICAS OBJETIVO                            │
└─────────────────────────────────────────────────────────────────┘

Fondeo
├── Meta alcanzada: 30%+ en 30 días
├── Contribuyentes únicos: 5+
└── Contribución promedio: [calcular]

Visibilidad
├── Impresiones totales: 10,000+
├── Alcance único: 5,000+
└── Clicks al proyecto: 500+

Engagement
├── Likes: 200+
├── Shares/Retweets: 100+
├── Comentarios: 50+
└── Tasa de engagement: 5%+

Credibilidad
├── Menciones en medios: 2+
├── Testimonios recopilados: 3+
└── Preguntas respondidas: 20+

Conversión
├── Visitas al proyecto: 300+
├── Tasa de conversión: 2%+
└── Yield generado: [calcular]
```

## Recursos rápidos

| Necesito... | Documento |
|-------------|-----------|
| Ver el proceso completo | [guia-proyecto-piloto.md](guia-proyecto-piloto.md) |
| Checklist paso a paso | [checklist-ejecutivo-piloto.md](checklist-ejecutivo-piloto.md) |
| Tracking en tiempo real | [proyecto-piloto-tracking.md](proyecto-piloto-tracking.md) |
| Templates de comunicación | [templates-comunicacion-piloto.md](templates-comunicacion-piloto.md) |
| Plan de marketing | [plan-marketing-piloto.md](plan-marketing-piloto.md) |
| Usar los scripts | [../scripts/README.md](../scripts/README.md) |

---

**Última actualización**: 2026-04-28  
**Versión**: 1.0
