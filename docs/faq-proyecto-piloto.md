# FAQ - Proyecto Piloto

> Preguntas frecuentes sobre el primer proyecto real en Mainnet

## General

### ¿Qué es el proyecto piloto?

Es el primer caso de uso real de Bimex en Stellar Mainnet. Una organización de impacto social en México recaudará fondos usando el modelo de crowdfunding sin pérdida, con todas las transacciones verificables en blockchain.

### ¿Por qué es importante?

- Demuestra que Bimex funciona con casos reales (no solo demos)
- Genera credibilidad en la comunidad Stellar
- Crea un caso de éxito replicable para otras organizaciones
- Atrae más contribuyentes y proyectos a la plataforma

### ¿Cuánto tiempo tomará?

Aproximadamente 9 semanas:
- Semanas 1-2: Selección de organización
- Semana 3: Preparación de documentos
- Semana 4: Lanzamiento en Mainnet
- Semanas 5-8: Fondeo activo
- Semana 9: Documentación y publicación del caso de éxito

### ¿Cuánto cuesta?

Presupuesto estimado: $15,000 MXN
- $4,000 MXN: Diseño gráfico y marketing
- $10,000 MXN: Incentivo para primera contribución
- $1,000 MXN: Contingencias

## Selección de organización

### ¿Qué tipo de organización buscamos?

- ONG, cooperativa o startup social registrada en México
- Con una meta de fondeo clara y alcanzable ($50,000-$200,000 MXN)
- Que pueda generar documentos reales (plan, presupuesto, identificación)
- Con disposición de aparecer como caso de éxito público
- Con capacidad técnica mínima para usar Freighter

### ¿Cómo contactamos a las organizaciones?

1. Crear lista de 10 candidatos
2. Enviar email de contacto inicial (usar template)
3. Hacer seguimiento a los 3 días
4. Agendar videollamadas con interesados
5. Presentar Bimex y evaluar fit
6. Seleccionar 1 organización

### ¿Qué pasa si la organización seleccionada se retira?

Tenemos 2-3 candidatos backup. Si se retira después del lanzamiento, el proyecto puede marcarse como "Abandonado" y los contribuyentes recuperan su capital íntegro.

### ¿Cuántas organizaciones debemos contactar?

Recomendamos contactar al menos 10 organizaciones para tener 3-5 interesadas y poder seleccionar la mejor.

## Preparación técnica

### ¿Qué documentos necesita la organización?

- Plan de proyecto (máx 5 páginas)
- Presupuesto detallado
- Identificación oficial del responsable
- Comprobante de registro legal (si aplica)
- Carta de compromiso firmada

### ¿Cómo subimos los documentos a IPFS?

Opción 1 (recomendada): Pinata
1. Crear cuenta en https://pinata.cloud
2. Subir archivo desde dashboard
3. Copiar CID (ej. QmXxx...)

Opción 2: IPFS CLI local
```bash
ipfs add documento-proyecto.pdf
# Retorna: added QmXxx... documento-proyecto.pdf
```

### ¿Cómo calculamos el hash SHA-256?

Usar el script incluido:
```bash
bash scripts/calcular-hash-documento.sh documento-proyecto.pdf
```

O manualmente:
```bash
# Linux
sha256sum documento-proyecto.pdf

# macOS
shasum -a 256 documento-proyecto.pdf

# Windows (PowerShell)
Get-FileHash documento-proyecto.pdf -Algorithm SHA256
```

### ¿La organización necesita conocimientos técnicos?

Mínimos. Necesitan:
- Instalar Freighter (wallet de navegador)
- Crear una cuenta en Stellar
- Firmar transacciones (muy simple con Freighter)

Nosotros los acompañamos en todo el proceso con una sesión de capacitación de 1 hora.

### ¿Cuánto XLM necesita la cuenta de la organización?

Mínimo 5 XLM para cubrir fees de transacciones. Recomendamos 10 XLM para estar seguros.

## Lanzamiento

### ¿Cómo creamos el proyecto en Mainnet?

Usar el script incluido:
```bash
export CONTRACT_ID=C...
export DUENO_SECRET=S...
bash scripts/crear-proyecto-piloto.sh
```

El script es interactivo y te guía paso a paso.

### ¿Quién aprueba el proyecto?

El admin de Bimex. Usar el script:
```bash
export CONTRACT_ID=C...
export ADMIN_SECRET=S...
bash scripts/aprobar-proyecto-piloto.sh
```

### ¿Cuánto tiempo toma crear y aprobar el proyecto?

Menos de 5 minutos en total. Las transacciones en Stellar son muy rápidas (3-5 segundos).

### ¿Qué pasa si algo sale mal en el lanzamiento?

Tenemos un plan B:
1. Si falla la creación: revisar logs, corregir y reintentar
2. Si falla la aprobación: verificar que el admin tiene fondos
3. Si el frontend no muestra el proyecto: verificar variables de entorno

Siempre probamos todo en Testnet primero.

## Fondeo activo

### ¿Cómo monitoreamos las contribuciones?

1. Revisar el frontend diariamente
2. Actualizar `proyecto-piloto-tracking.md`
3. Verificar transacciones en Stellar Explorer
4. Calcular métricas (fondeo, yield, contribuyentes)

### ¿Qué hacemos si no hay contribuciones?

Plan de acción:
1. Aumentar frecuencia de posts en redes
2. Contactar directamente a posibles contribuyentes
3. Hacer la primera contribución desde el equipo Bimex
4. Ofrecer incentivos (ej. match de contribuciones)
5. Contactar medios para cobertura

### ¿Cuándo publicamos updates?

- Diario: Responder preguntas en redes
- Semanal: Update de progreso (cada lunes)
- Hitos: Inmediatamente (30%, 50%, 75%, 100%)
- Quincenal: Email a lista de contactos

### ¿Qué pasa si no alcanzamos la meta?

No hay problema. El proyecto sigue activo y:
- Los contribuyentes pueden retirar su principal cuando el dueño marque el proyecto como "Liberado" o "Abandonado"
- El yield generado hasta ese momento va al proyecto
- Documentamos el caso de éxito con los resultados reales

### ¿Cuándo puede el dueño reclamar el yield?

En cualquier momento después de que haya al menos una contribución. El yield se calcula desde el último reclamo hasta el momento actual.

## Marketing

### ¿En qué redes sociales publicamos?

- Twitter/X (diario)
- LinkedIn (2-3 veces por semana)
- Discord de Stellar (diario, responder preguntas)
- Medium/blog (2 artículos: lanzamiento y caso de éxito)
- Email (3 envíos: lanzamiento, update, caso de éxito)

### ¿Qué hashtags usamos?

- #Bimex
- #Stellar
- #Blockchain
- #ImpactoSocial
- #México
- #DeFi
- #Crowdfunding
- #ZeroLoss

### ¿A quién mencionamos en Twitter?

- @StellarOrg
- @StellarDevs
- @FreighterWallet
- Influencers cripto mexicanos
- La organización (si tiene cuenta)

### ¿Contactamos medios?

Sí, al menos:
- Cointelegraph en Español
- CriptoNoticias
- Forbes México (sección tecnología)
- Expansión (sección innovación)

Usar el template de pitch en `templates-comunicacion-piloto.md`.

### ¿Qué métricas de éxito buscamos?

- Impresiones: 10,000+
- Interacciones: 500+
- Clicks al proyecto: 500+
- Contribuyentes: 5+
- Fondeo: 30%+ de la meta
- Cobertura: 2+ medios

## Caso de éxito

### ¿Cuándo escribimos el caso de éxito?

En la semana 9, después de que el proyecto haya estado activo por 4-8 semanas. No necesita estar 100% fondeado.

### ¿Qué incluimos en el caso de éxito?

- Resumen del proyecto y la organización
- Métricas finales (fondeo, yield, contribuyentes)
- Todas las transacciones verificables (TX hashes)
- Capturas de pantalla
- Testimonios del dueño y contribuyentes
- Aprendizajes y próximos pasos

### ¿Dónde publicamos el caso de éxito?

- Medium/blog (artículo largo)
- Stellar Community Forum
- README.md de Bimex (enlace destacado)
- Twitter/X (hilo largo)
- LinkedIn (artículo)
- Discord (post en #showcase)
- Email a lista de contactos

### ¿La organización debe aprobar el caso de éxito?

Sí, siempre. Enviamos el borrador para su revisión y aprobación antes de publicar.

## Técnico

### ¿Qué pasa si el storage expira?

El indexer (bimex-indexer) extiende el TTL automáticamente. Si por alguna razón expira, podemos recuperar los datos del historial de transacciones.

### ¿Cómo verificamos que todo funciona?

1. Verificar proyecto en frontend
2. Verificar transacciones en Stellar Explorer
3. Verificar documentos en IPFS gateway
4. Probar contribución de prueba (pequeña)
5. Verificar cálculo de yield

### ¿Qué hacemos si hay un bug en producción?

1. Evaluar severidad (crítico vs menor)
2. Si es crítico: pausar comunicación, investigar, fix
3. Si es menor: documentar, fix en próxima versión
4. Comunicar transparentemente a la comunidad

### ¿Necesitamos auditoría de seguridad?

El contrato ya fue auditado internamente. Para Mainnet, recomendamos una auditoría externa antes del lanzamiento oficial, pero para el piloto con montos pequeños es aceptable.

## Después del piloto

### ¿Qué sigue después del primer piloto?

1. Analizar métricas y aprendizajes
2. Documentar mejoras para próximos proyectos
3. Identificar segundo proyecto piloto
4. Escalar el proceso de onboarding
5. Considerar automatizaciones

### ¿Cuántos proyectos piloto haremos?

Recomendamos 3-5 proyectos piloto antes del lanzamiento oficial a gran escala. Cada uno nos enseñará algo nuevo.

### ¿Cómo medimos el éxito del piloto?

Criterios de aceptación:
- ✅ 1 proyecto real en Mainnet con documentos en IPFS
- ✅ 1+ contribución de tercero (no equipo Bimex)
- ✅ Caso de éxito publicado y enlazado desde README

Métricas adicionales:
- Fondeo alcanzado (objetivo: 30%+)
- Contribuyentes únicos (objetivo: 5+)
- Visibilidad (objetivo: 10,000+ impresiones)
- Cobertura (objetivo: 2+ medios)

## Recursos

### ¿Dónde encuentro toda la documentación?

- [RESUMEN EJECUTIVO](RESUMEN-PROYECTO-PILOTO.md) - Empieza aquí
- [Flujo visual](FLUJO-VISUAL-PILOTO.md) - Diagrama paso a paso
- [Guía completa](guia-proyecto-piloto.md) - Proceso detallado
- [Checklist ejecutivo](checklist-ejecutivo-piloto.md) - Lista de verificación
- [Templates](templates-comunicacion-piloto.md) - Emails y posts listos
- [Plan de marketing](plan-marketing-piloto.md) - Estrategia completa
- [Scripts](../scripts/README.md) - Herramientas técnicas

### ¿A quién contacto si tengo dudas?

- Dudas técnicas: [Responsable técnico]
- Dudas de proceso: [Project Manager]
- Dudas de marketing: [Responsable marketing]
- Dudas generales: [Email del equipo]

### ¿Puedo contribuir a mejorar el proceso?

¡Sí! Si encuentras formas de mejorar el proceso:
1. Documenta tu sugerencia
2. Abre un issue en GitHub
3. Propón cambios vía pull request
4. Comparte en el canal del equipo

---

**Última actualización**: 2026-04-28  
**¿Más preguntas?** Abre un issue en GitHub o contacta al equipo.
