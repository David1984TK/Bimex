# Resumen Ejecutivo - Proyecto Piloto

> Todo lo que necesitas saber para lanzar el primer proyecto real en Mainnet

## ¿Qué es esto?

El proyecto piloto es el primer caso de uso real de Bimex en Stellar Mainnet. Una organización de impacto social en México recaudará fondos usando el modelo de crowdfunding sin pérdida, con todas las transacciones verificables en blockchain.

## ¿Por qué importa?

- Demuestra que Bimex funciona con casos reales
- Genera credibilidad en la comunidad Stellar
- Crea un caso de éxito replicable
- Atrae más organizaciones y contribuyentes

## Documentos creados

| Documento | Propósito | Audiencia |
|-----------|-----------|-----------|
| [guia-proyecto-piloto.md](guia-proyecto-piloto.md) | Guía completa del proceso | Equipo Bimex |
| [proyecto-piloto-tracking.md](proyecto-piloto-tracking.md) | Tracking en tiempo real | Equipo Bimex |
| [templates-comunicacion-piloto.md](templates-comunicacion-piloto.md) | Templates listos para usar | Marketing |
| [checklist-ejecutivo-piloto.md](checklist-ejecutivo-piloto.md) | Checklist paso a paso | Project Manager |
| [plan-marketing-piloto.md](plan-marketing-piloto.md) | Estrategia de comunicación | Marketing |
| [scripts/README.md](../scripts/README.md) | Documentación de scripts | Técnico |

## Scripts creados

| Script | Propósito |
|--------|-----------|
| `calcular-hash-documento.sh` | Calcular SHA-256 de documentos |
| `crear-proyecto-piloto.sh` | Crear proyecto en Mainnet |
| `aprobar-proyecto-piloto.sh` | Aprobar proyecto (admin) |

## Flujo simplificado

```
1. Selección (2 semanas)
   └── Contactar organizaciones → Seleccionar 1

2. Preparación (1 semana)
   └── Documentos → IPFS → Hash SHA-256 → Configurar wallet

3. Lanzamiento (día D)
   └── Crear proyecto → Aprobar → Anunciar

4. Fondeo activo (4-8 semanas)
   └── Monitorear → Comunicar → Celebrar hitos

5. Documentación (1 semana)
   └── Caso de éxito → Publicar → Compartir
```

## Criterios de éxito

✅ 1 proyecto real en Mainnet con documentos en IPFS  
✅ 1+ contribución de tercero (no equipo Bimex)  
✅ Caso de éxito publicado y enlazado desde README  

## Recursos necesarios

- **Tiempo**: ~40 horas del equipo (4 semanas)
- **Presupuesto**: $15,000 MXN (marketing + incentivo)
- **Personas**: 1 PM + 1 técnico + 1 marketing

## Timeline

```
Semana 1-2:  Selección de organización
Semana 3:    Preparación de documentos
Semana 4:    Lanzamiento en Mainnet
Semana 5-8:  Fondeo activo
Semana 9:    Documentación y publicación
```

## Próximos pasos inmediatos

1. [ ] Revisar todos los documentos con el equipo
2. [ ] Asignar responsables (PM, técnico, marketing)
3. [ ] Crear lista de 10 organizaciones candidatas
4. [ ] Comenzar outreach esta semana
5. [ ] Preparar assets gráficos para marketing

## Contactos útiles

### Organizaciones sugeridas
- Ashoka México: https://www.ashoka.org/es-mx
- Techo México: https://www.techo.org/mexico/
- Sistema B México: https://sistemab.org/mexico/

### Medios a contactar
- Cointelegraph en Español
- CriptoNoticias
- Forbes México (tecnología)

## Preguntas frecuentes

### ¿Qué pasa si no alcanzamos la meta?

El proyecto sigue activo. Los contribuyentes pueden retirar su principal cuando el dueño marque el proyecto como "Liberado" o "Abandonado".

### ¿Cuánto tiempo debe estar activo el proyecto?

Recomendamos 4-8 semanas para dar tiempo suficiente de recaudar fondos y generar yield significativo.

### ¿Qué pasa si la organización se retira?

Tenemos 2-3 candidatos backup. Si se retira después del lanzamiento, el proyecto puede marcarse como "Abandonado" y los contribuyentes recuperan su capital.

### ¿Necesitamos aprobar cada contribución?

No. Una vez que el admin aprueba el proyecto, cualquiera puede contribuir sin aprobación adicional.

### ¿Cómo verificamos que los fondos se usan correctamente?

El yield va directamente al wallet del dueño del proyecto. La organización debe reportar el uso de fondos según lo acordado en la carta de compromiso.

## Riesgos principales

| Riesgo | Mitigación |
|--------|------------|
| Organización se retira | Tener 2-3 backups |
| No se alcanza la meta | Meta realista ($50k-$100k) |
| Falta de contribuyentes | Marketing agresivo + incentivo inicial |
| Problemas técnicos | Testing exhaustivo en Testnet |

## Métricas clave

- **Fondeo**: 30%+ de la meta en 30 días
- **Contribuyentes**: 5+ únicos
- **Visibilidad**: 10,000+ impresiones
- **Engagement**: 500+ interacciones
- **Cobertura**: 2+ medios especializados

## Herramientas necesarias

- Stellar CLI (instalado)
- Freighter wallet (instalado)
- Cuenta en Pinata (para IPFS)
- Hootsuite/Buffer (para redes sociales)
- Stellar Explorer (para verificación)

## Checklist rápido

- [ ] Documentos revisados
- [ ] Equipo asignado
- [ ] Presupuesto aprobado
- [ ] Lista de organizaciones creada
- [ ] Scripts probados en Testnet
- [ ] Assets gráficos preparados
- [ ] Calendario de contenido listo
- [ ] Mainnet desplegado y funcionando

## Soporte

Si tienes dudas sobre cualquier parte del proceso:

1. Revisa la documentación específica (links arriba)
2. Consulta los scripts en `scripts/README.md`
3. Revisa los templates en `templates-comunicacion-piloto.md`
4. Contacta al equipo técnico

---

## Siguiente paso

👉 **Abrir [checklist-ejecutivo-piloto.md](checklist-ejecutivo-piloto.md) y comenzar**

---

**Última actualización**: 2026-04-28  
**Estado**: Listo para ejecutar  
**Versión**: 1.0
