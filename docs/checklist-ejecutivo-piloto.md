# Checklist Ejecutivo - Proyecto Piloto

> Lista de verificación paso a paso para lanzar el primer proyecto real en Mainnet

## Pre-requisitos técnicos

- [ ] Mainnet desplegado y funcionando (Issue #6)
- [ ] Sistema de IPFS operativo (Issue #11/#20)
- [ ] Frontend configurado para Mainnet
- [ ] Scripts de ayuda probados en Testnet
- [ ] Documentación completa revisada

## Semana 1-2: Selección

### Preparación
- [ ] Revisar y aprobar criterios de selección
- [ ] Crear hoja de cálculo con organizaciones candidatas (mínimo 10)
- [ ] Investigar contactos de cada organización
- [ ] Preparar materiales de presentación (deck, demo)

### Outreach
- [ ] Enviar email inicial a 10 organizaciones
- [ ] Hacer seguimiento a los 3 días (si no responden)
- [ ] Agendar primera videollamada con interesados
- [ ] Realizar 3-5 videollamadas de presentación

### Decisión
- [ ] Evaluar candidatos con criterios definidos
- [ ] Seleccionar organización ganadora
- [ ] Enviar email de confirmación
- [ ] Agendar kickoff meeting

## Semana 3: Preparación

### Documentación
- [ ] Enviar checklist de documentos a la organización
- [ ] Recibir plan de proyecto (máx 5 páginas)
- [ ] Recibir presupuesto detallado
- [ ] Recibir identificación oficial del responsable
- [ ] Recibir comprobante de registro legal
- [ ] Recibir carta de compromiso firmada
- [ ] Revisar y aprobar todos los documentos

### IPFS
- [ ] Crear cuenta en Pinata (si no existe)
- [ ] Combinar documentos en un solo PDF (opcional)
- [ ] Subir documentos a IPFS
- [ ] Obtener CID: `_________________`
- [ ] Verificar acceso público: `https://ipfs.io/ipfs/[CID]`
- [ ] Pin en Pinata para permanencia
- [ ] Calcular hash SHA-256: `bash scripts/calcular-hash-documento.sh`
- [ ] Guardar hash: `_________________`

### Configuración técnica
- [ ] Agendar sesión de capacitación técnica (1 hora)
- [ ] Guiar instalación de Freighter
- [ ] Ayudar a crear cuenta en Mainnet
- [ ] Verificar que la cuenta tiene XLM (mínimo 5 XLM)
- [ ] Configurar trustline a MXNe (si necesario)
- [ ] Obtener dirección pública: `_________________`
- [ ] Probar firma de transacción en Testnet
- [ ] Explicar flujo completo de Bimex

## Semana 4: Lanzamiento

### Pre-lanzamiento
- [ ] Verificar que Mainnet está operativo
- [ ] Verificar que frontend apunta a Mainnet
- [ ] Preparar anuncios para redes sociales
- [ ] Preparar email para lista de contactos
- [ ] Coordinar fecha y hora de lanzamiento
- [ ] Hacer prueba final en Testnet

### Día D - Creación del proyecto
- [ ] Exportar variables de entorno:
  ```bash
  export CONTRACT_ID=C...
  export DUENO_SECRET=S...
  export DOC_HASH=0x...
  ```
- [ ] Ejecutar script de creación:
  ```bash
  bash scripts/crear-proyecto-piloto.sh
  ```
- [ ] Guardar ID del proyecto: `_________________`
- [ ] Guardar TX hash de creación: `_________________`
- [ ] Verificar en Stellar Explorer
- [ ] Actualizar `docs/proyecto-piloto-tracking.md`

### Día D - Aprobación admin
- [ ] Exportar variables de entorno:
  ```bash
  export CONTRACT_ID=C...
  export ADMIN_SECRET=S...
  ```
- [ ] Ejecutar script de aprobación:
  ```bash
  bash scripts/aprobar-proyecto-piloto.sh
  ```
- [ ] Guardar TX hash de aprobación: `_________________`
- [ ] Verificar estado del proyecto en frontend
- [ ] Confirmar que acepta contribuciones

### Día D - Anuncios
- [ ] Publicar en Twitter/X
- [ ] Publicar en LinkedIn
- [ ] Publicar en Discord de Stellar
- [ ] Enviar email a lista de contactos
- [ ] Compartir en grupos de WhatsApp/Telegram
- [ ] Notificar a la organización

### Día D+1 - Primera contribución
- [ ] Hacer primera contribución desde equipo Bimex (opcional)
- [ ] Guardar TX hash: `_________________`
- [ ] Verificar que se refleja en frontend
- [ ] Tomar captura de pantalla
- [ ] Compartir en redes sociales

## Semana 5-8: Fondeo activo

### Monitoreo diario
- [ ] Revisar contribuciones nuevas
- [ ] Actualizar métricas en `proyecto-piloto-tracking.md`
- [ ] Responder preguntas en redes sociales
- [ ] Dar soporte técnico a contribuyentes

### Comunicación semanal
- [ ] Publicar update de progreso (cada lunes)
- [ ] Compartir milestone alcanzados (30%, 50%, 75%)
- [ ] Agradecer a contribuyentes públicamente
- [ ] Mantener engagement alto

### Hitos importantes
- [ ] Primera contribución de tercero (no equipo)
  - TX hash: `_________________`
  - Fecha: `_________________`
- [ ] 5 contribuyentes únicos alcanzados
  - Fecha: `_________________`
- [ ] 30% de la meta alcanzada
  - Fecha: `_________________`
- [ ] 50% de la meta alcanzada
  - Fecha: `_________________`
- [ ] 75% de la meta alcanzada
  - Fecha: `_________________`
- [ ] 100% de la meta alcanzada (si aplica)
  - Fecha: `_________________`

## Semana 9: Documentación

### Recopilación de datos
- [ ] Exportar todas las transacciones del proyecto
- [ ] Calcular métricas finales (fondeo, yield, contribuyentes)
- [ ] Tomar capturas de pantalla finales
- [ ] Recopilar testimonios de contribuyentes
- [ ] Agendar entrevista con dueño del proyecto

### Redacción del caso de éxito
- [ ] Usar template de `templates-comunicacion-piloto.md`
- [ ] Escribir borrador completo
- [ ] Incluir todas las transacciones verificables
- [ ] Agregar capturas de pantalla
- [ ] Incluir testimonios
- [ ] Revisar con el equipo
- [ ] Enviar a la organización para aprobación
- [ ] Incorporar feedback

### Publicación
- [ ] Publicar en Medium/blog
- [ ] Publicar en Stellar Community Forum
- [ ] Actualizar README.md con enlace
- [ ] Compartir en Twitter/X
- [ ] Compartir en LinkedIn
- [ ] Compartir en Discord
- [ ] Enviar email a lista de contactos
- [ ] Agregar a portfolio de Bimex

## Post-lanzamiento

### Análisis
- [ ] Revisar métricas de éxito
- [ ] Documentar aprendizajes
- [ ] Identificar mejoras para próximos proyectos
- [ ] Actualizar documentación según aprendizajes

### Seguimiento
- [ ] Mantener contacto con la organización
- [ ] Monitorear uso de los fondos
- [ ] Solicitar updates de impacto
- [ ] Considerar caso de estudio extendido

### Próximos pasos
- [ ] Identificar segundo proyecto piloto
- [ ] Aplicar aprendizajes del primero
- [ ] Escalar el proceso de onboarding

---

## Notas importantes

### Contactos de emergencia
- **Admin Mainnet**: [Nombre] - [Email] - [Teléfono]
- **Soporte técnico**: [Nombre] - [Email] - [Teléfono]
- **Contacto organización**: [Nombre] - [Email] - [Teléfono]

### Recursos críticos
- **Contract ID Mainnet**: `_________________`
- **Admin address**: `_________________`
- **RPC URL**: `https://soroban-mainnet.stellar.org`
- **Explorer**: `https://stellar.expert/explorer/public/`

### Troubleshooting común

**Problema**: La transacción falla con "insufficient balance"
- **Solución**: Verificar que la cuenta tiene suficiente XLM para fees

**Problema**: Freighter no se conecta
- **Solución**: Verificar que está en la red correcta (Mainnet)

**Problema**: El proyecto no aparece en el frontend
- **Solución**: Verificar que VITE_CONTRACT_ID apunta a Mainnet

**Problema**: No se puede subir a IPFS
- **Solución**: Usar Pinata como alternativa

---

**Última actualización**: 2026-04-28  
**Responsable**: [Asignar]  
**Estado**: Listo para ejecutar
