#![no_std]

#[cfg(not(test))]
use soroban_sdk::ContractExecutable;
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, BytesN, Env, String, U256,
};

// ============================================================
//  TIPOS DE DATOS
// ============================================================

/// Estado del ciclo de vida de un proyecto.
///
/// Transiciones válidas:
///   EnRevision → EtapaInicial (admin_aprobar)
///   EnRevision → Rechazado    (admin_rechazar)
///   EtapaInicial → EnProgreso (primer contribuir)
///   EnProgreso → Liberado     (total_aportado >= meta)
///   EtapaInicial | EnProgreso | Liberado → Abandonado (abandonar_proyecto)
///   Abandonado → EtapaInicial | EnProgreso (solicitar_continuar)
#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum EstadoProyecto {
    EnRevision,   // pendiente de aprobación por el admin
    EtapaInicial, // aprobado, sin backers todavía
    EnProgreso,   // al menos un backer
    Abandonado,   // dueño lo marcó como abandonado
    Liberado,     // meta alcanzada; yield reclamable por el dueño
    Rechazado,    // rechazado por el admin
}

/// Datos completos de un proyecto de crowdfunding.
///
/// El capital se divide 50/50 entre CETES y AMM al momento de cada contribución.
/// `timestamp_inicio` se convierte en un checkpoint cada vez que cambia el
/// capital, el dueño reclama yield o un nuevo dueño toma el proyecto vía
/// `solicitar_continuar`.
/// `timestamp_vencimiento` marca cuándo expira el plazo de recaudación: si el
/// proyecto no alcanza la meta antes de esa fecha, los backers pueden retirar
/// su capital íntegro mediante `retirar_principal`.
#[contracttype]
#[derive(Clone)]
pub struct Proyecto {
    pub dueno: Address,
    pub nombre: String,
    pub meta: i128,
    pub total_aportado: i128,
    pub yield_entregado: i128,
    pub estado: EstadoProyecto,
    pub timestamp_inicio: u64,
    pub timestamp_vencimiento: u64,
    pub tiempo_meses: u32,
    pub capital_en_cetes: i128,
    pub yield_cetes_acumulado: i128,
    pub capital_en_amm: i128,
    pub yield_amm_acumulado: i128,
    pub doc_cid: String,
    pub motivo_rechazo: String,
}

/// Aportación de un backer a un proyecto.
///
/// `timestamp` registra el momento de la primera contribución y NO se resetea
/// en top-ups posteriores, preservando el período de acumulación de yield.
#[contracttype]
#[derive(Clone)]
pub struct Aportacion {
    pub cantidad: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct YieldDetallado {
    pub cetes: i128,
    pub amm: i128,
    pub total: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct CapitalEstado {
    pub en_cetes: i128,
    pub en_amm: i128,
    pub total: i128,
}

/// Yield acumulado y aún no pagado para un proyecto.
///
/// Los residuos preservan fracciones de stroop al liquidar periodos de
/// capital distintos; así, cambios de capital frecuentes no pierden yield por
/// redondear cada tramo independientemente.
#[contracttype]
#[derive(Clone)]
pub struct YieldPendiente {
    pub cetes: i128,
    pub amm: i128,
    pub residuo_cetes: i128,
    pub residuo_amm: i128,
}

// ============================================================
//  CLAVES DE ALMACENAMIENTO
// ============================================================

#[contracttype]
pub enum Clave {
    Admin,
    TokenMXNe,
    YieldCetesBps,
    YieldAmmBps,
    ContadorProyectos,
    Proyecto(u32),
    Aportacion(u32, Address),
    Pausado,
    ContadorEnRevision(Address),
    PropuestaUpgrade,
    /// Reserva de MXNe fondeada explícitamente para pagos de yield.
    ReservaYield,
    /// Yield liquidado a una tasa/capital anteriores y aún no reclamado.
    YieldPendiente(u32),
}

// ============================================================
//  CONSTANTES DE TASAS
// ============================================================

// Tasas reales de producción en puntos base (bps).
// 10 000 bps = 100 % anual. Fórmula: capital × bps × minutos / 10_000 / 525_600
const DEFAULT_CETES_BPS: u32 = 945; // 9.45 % anual (CETES referencia)
const DEFAULT_AMM_BPS: u32 = 400; // 4.00 % anual (liquidez AMM)

// Segundos por mes (30 días)
const SEGUNDOS_POR_MES: u64 = 30 * 24 * 3_600;

// TTL en ledgers (~1 ledger = 5 segundos)
const INSTANCE_LIFETIME_THRESHOLD: u32 = 17_280; // ~1 día
const INSTANCE_BUMP_AMOUNT: u32 = 518_400; // ~30 días

const PERSISTENT_LIFETIME_THRESHOLD: u32 = 17_280; // ~1 día
                                                   // Máximo de la configuración de red de referencia (~1 año). El helper lo
                                                   // limita a `storage().max_ttl()` para no exceder el máximo efectivo de la red.
                                                   // Soroban no permite un TTL de 120 meses en un único bump: las entradas deben
                                                   // renovarse periódicamente con las funciones públicas `renovar_ttl_*`.
const PERSISTENT_BUMP_AMOUNT: u32 = 6_312_000;

const MAX_YIELD_BPS: u32 = 10_000_000;
const MINUTOS_POR_ANO: i128 = 525_600;
const DENOMINADOR_YIELD: i128 = 10_000 * MINUTOS_POR_ANO;

// Límites de input para prevenir spam
const MAX_NOMBRE_LEN: u32 = 200;
const MAX_DOC_CID_LEN: u32 = 200;
const MAX_EN_REVISION_POR_DUENO: u32 = 5;

// Timelock para actualizaciones de contrato
const TIMELOCK_UPGRADE_SEGUNDOS: u64 = 24 * 3_600; // 24 horas

// ============================================================
//  HELPERS
// ============================================================

fn extender_ttl_instancia(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}

fn persistent_ttl_threshold(env: &Env) -> u32 {
    PERSISTENT_LIFETIME_THRESHOLD.min(env.storage().max_ttl())
}

fn persistent_ttl_bump_amount(env: &Env) -> u32 {
    PERSISTENT_BUMP_AMOUNT.min(env.storage().max_ttl())
}

fn extender_ttl_persistente(env: &Env, clave: &Clave) {
    env.storage().persistent().extend_ttl(
        clave,
        persistent_ttl_threshold(env),
        persistent_ttl_bump_amount(env),
    );
}

fn extender_ttl_proyecto(env: &Env, id: u32) {
    extender_ttl_persistente(env, &Clave::Proyecto(id));
}

fn extender_ttl_aportacion(env: &Env, id: u32, backer: &Address) {
    extender_ttl_persistente(env, &Clave::Aportacion(id, backer.clone()));
}

fn extender_ttl_contador_en_revision(env: &Env, dueno: &Address) {
    extender_ttl_persistente(env, &Clave::ContadorEnRevision(dueno.clone()));
}

fn extender_ttl_yield_pendiente(env: &Env, id: u32) {
    extender_ttl_persistente(env, &Clave::YieldPendiente(id));
}

/// Retorna cociente y residuo de:
/// `(capital * bps * minutos + residuo) / (10_000 * MINUTOS_POR_ANO)`.
///
/// U256 conserva la fórmula exacta sin overflow intermedio de i128. El
/// residuo se transporta entre checkpoints para que el truncamiento sólo ocurra
/// al pagar stroops completos, no en cada cambio de capital.
fn calcular_yield_divmod(
    env: &Env,
    capital: i128,
    bps: i128,
    minutos: i128,
    residuo: i128,
) -> (i128, i128) {
    assert!(capital >= 0, "Capital invalido");
    assert!(
        (0..=MAX_YIELD_BPS as i128).contains(&bps),
        "Tasa de yield invalida"
    );
    assert!(minutos >= 0, "Tiempo invalido");
    assert!(
        (0..DENOMINADOR_YIELD).contains(&residuo),
        "Residuo de yield invalido"
    );

    let denominador = U256::from_u128(env, DENOMINADOR_YIELD as u128);
    let numerador = U256::from_u128(env, capital as u128)
        .mul(&U256::from_u128(env, bps as u128))
        .mul(&U256::from_u128(env, minutos as u128))
        .add(&U256::from_u128(env, residuo as u128));
    let yield_u128 = numerador
        .div(&denominador)
        .to_u128()
        .expect("Yield excede i128");
    assert!(yield_u128 <= i128::MAX as u128, "Yield excede i128");
    let residuo_u128 = numerador.rem_euclid(&denominador).to_u128().unwrap();

    (yield_u128 as i128, residuo_u128 as i128)
}

/// Cálculo exacto, redondeado hacia abajo a stroops completos.
fn calcular_yield_seguro(env: &Env, capital: i128, bps: i128, minutos: i128) -> i128 {
    calcular_yield_divmod(env, capital, bps, minutos, 0).0
}

fn yield_pendiente(env: &Env, id: u32) -> YieldPendiente {
    env.storage()
        .persistent()
        .get(&Clave::YieldPendiente(id))
        .unwrap_or(YieldPendiente {
            cetes: 0,
            amm: 0,
            residuo_cetes: 0,
            residuo_amm: 0,
        })
}

/// Liquida el yield que corresponde al capital anterior antes de mutarlo.
/// Esto impide que una contribución o un retiro afecte retroactivamente el
/// rendimiento de un periodo ya transcurrido.
fn acumular_yield_pendiente(env: &Env, id: u32, proyecto: &mut Proyecto) {
    let ahora = env.ledger().timestamp();
    let minutos = (ahora.saturating_sub(proyecto.timestamp_inicio) / 60) as i128;
    let mut pendiente = yield_pendiente(env, id);
    let cetes_bps = env
        .storage()
        .instance()
        .get::<_, u32>(&Clave::YieldCetesBps)
        .unwrap_or(DEFAULT_CETES_BPS) as i128;
    let amm_bps = env
        .storage()
        .instance()
        .get::<_, u32>(&Clave::YieldAmmBps)
        .unwrap_or(DEFAULT_AMM_BPS) as i128;

    let (cetes, residuo_cetes) = calcular_yield_divmod(
        env,
        proyecto.capital_en_cetes,
        cetes_bps,
        minutos,
        pendiente.residuo_cetes,
    );
    let (amm, residuo_amm) = calcular_yield_divmod(
        env,
        proyecto.capital_en_amm,
        amm_bps,
        minutos,
        pendiente.residuo_amm,
    );

    pendiente.cetes = pendiente
        .cetes
        .checked_add(cetes)
        .expect("Yield excede i128");
    pendiente.amm = pendiente.amm.checked_add(amm).expect("Yield excede i128");
    pendiente.residuo_cetes = residuo_cetes;
    pendiente.residuo_amm = residuo_amm;
    proyecto.timestamp_inicio = ahora;

    env.storage()
        .persistent()
        .set(&Clave::YieldPendiente(id), &pendiente);
    extender_ttl_yield_pendiente(env, id);
}

fn verificar_no_pausado(env: &Env) {
    let pausado: bool = env
        .storage()
        .instance()
        .get(&Clave::Pausado)
        .unwrap_or(false);
    assert!(!pausado, "Contrato pausado por el administrador");
}

// ============================================================
//  CONTRATO
// ============================================================

#[contract]
pub struct BimexContrato;

#[contractimpl]
impl BimexContrato {
    /// Inicializa el contrato. Solo puede llamarse una vez.
    ///
    /// Parámetros de producción:
    ///   yield_cetes_bps = 945  (9.45% APY — CETES / Etherfuse Stablebonds)
    ///   yield_amm_bps   = 400  (4.00% APY — AMM de Stellar)
    pub fn inicializar(
        env: Env,
        admin: Address,
        token_mxne: Address,
        yield_cetes_bps: u32,
        yield_amm_bps: u32,
    ) {
        if env.storage().instance().has(&Clave::Admin) {
            panic!("Ya inicializado");
        }
        assert!(
            yield_cetes_bps <= MAX_YIELD_BPS,
            "yield_cetes_bps excede el maximo"
        );
        assert!(
            yield_amm_bps <= MAX_YIELD_BPS,
            "yield_amm_bps excede el maximo"
        );
        env.storage().instance().set(&Clave::Admin, &admin);
        env.storage().instance().set(&Clave::TokenMXNe, &token_mxne);
        env.storage()
            .instance()
            .set(&Clave::YieldCetesBps, &yield_cetes_bps);
        env.storage()
            .instance()
            .set(&Clave::YieldAmmBps, &yield_amm_bps);
        env.storage()
            .instance()
            .set(&Clave::ContadorProyectos, &0u32);
        // El yield comienza sin fondeo. Nunca se usa principal como reserva.
        env.storage().instance().set(&Clave::ReservaYield, &0i128);
        extender_ttl_instancia(&env);
    }

    /// Crea un nuevo proyecto en estado EnRevision.
    ///
    /// `meta` se expresa en stroops (1 MXNe = 10_000_000 stroops).
    /// `doc_cid` es el CID de IPFS o el SHA-256 hex de los documentos del proyecto.
    /// `tiempo_meses` es el plazo máximo de recaudación (1–120 meses).
    /// Retorna el ID asignado al proyecto.
    pub fn crear_proyecto(
        env: Env,
        dueno: Address,
        nombre: String,
        meta: i128,
        doc_cid: String,
        tiempo_meses: u32,
    ) -> u32 {
        verificar_no_pausado(&env);
        dueno.require_auth();
        assert!(meta > 0, "La meta debe ser mayor a 0");
        assert!(
            (1..=120).contains(&tiempo_meses),
            "El tiempo debe estar entre 1 y 120 meses"
        );
        assert!(
            nombre.len() <= MAX_NOMBRE_LEN,
            "El nombre no puede exceder 200 caracteres"
        );
        assert!(
            doc_cid.len() <= MAX_DOC_CID_LEN,
            "doc_cid no puede exceder 200 caracteres"
        );

        let en_revision: u32 = env
            .storage()
            .persistent()
            .get(&Clave::ContadorEnRevision(dueno.clone()))
            .unwrap_or(0);
        assert!(
            en_revision < MAX_EN_REVISION_POR_DUENO,
            "Demasiados proyectos en revision (maximo 5)"
        );

        let id: u32 = env
            .storage()
            .instance()
            .get(&Clave::ContadorProyectos)
            .unwrap_or(0);

        let ahora = env.ledger().timestamp();
        let timestamp_vencimiento = ahora + (tiempo_meses as u64) * SEGUNDOS_POR_MES;

        let proyecto = Proyecto {
            dueno: dueno.clone(),
            nombre,
            meta,
            total_aportado: 0,
            yield_entregado: 0,
            estado: EstadoProyecto::EnRevision,
            timestamp_inicio: ahora,
            timestamp_vencimiento,
            tiempo_meses,
            capital_en_cetes: 0,
            yield_cetes_acumulado: 0,
            capital_en_amm: 0,
            yield_amm_acumulado: 0,
            doc_cid,
            motivo_rechazo: String::from_str(&env, ""),
        };

        env.storage()
            .persistent()
            .set(&Clave::Proyecto(id), &proyecto);
        env.storage()
            .instance()
            .set(&Clave::ContadorProyectos, &(id + 1));
        env.storage().persistent().set(
            &Clave::ContadorEnRevision(dueno.clone()),
            &(en_revision + 1),
        );
        extender_ttl_instancia(&env);
        extender_ttl_proyecto(&env, id);
        extender_ttl_contador_en_revision(&env, &dueno);
        id
    }

    /// Bloquea `cantidad` stroops de MXNe del backer en el contrato.
    ///
    /// - Solo acepta proyectos en EtapaInicial o EnProgreso.
    /// - La contribución se limita al capital restante para evitar overfunding.
    /// - El capital se divide 50/50 entre CETES y AMM.
    /// - Si total_aportado >= meta, el proyecto pasa a estado Liberado.
    /// - Top-ups preservan el timestamp original del backer.
    /// - No se aceptan contribuciones si el plazo de recaudación ya venció.
    pub fn contribuir(env: Env, backer: Address, id_proyecto: u32, cantidad: i128) {
        verificar_no_pausado(&env);
        // AUTH FIRST
        backer.require_auth();
        assert!(cantidad > 0, "Cantidad debe ser mayor a 0");

        let mut proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        assert!(
            proyecto.estado == EstadoProyecto::EtapaInicial
                || proyecto.estado == EstadoProyecto::EnProgreso,
            "El proyecto no acepta fondos"
        );

        // No contributions after deadline
        let ahora = env.ledger().timestamp();
        assert!(
            ahora < proyecto.timestamp_vencimiento,
            "El plazo de recaudacion ha vencido"
        );

        // Cap contribution to prevent overfunding
        let restante = proyecto.meta - proyecto.total_aportado;
        assert!(restante > 0, "El proyecto ya alcanzo su meta");
        let cantidad = cantidad.min(restante);

        let aportacion_existente: Option<Aportacion> = env
            .storage()
            .persistent()
            .get(&Clave::Aportacion(id_proyecto, backer.clone()));

        // Liquidar el tramo anterior antes de modificar el capital. Así el
        // nuevo aporte no cobra yield por tiempo anterior a su entrada.
        acumular_yield_pendiente(&env, id_proyecto, &mut proyecto);

        // Preserve original timestamp on top-up to avoid yield clock reset
        let nueva_aportacion = match aportacion_existente {
            Some(a) => Aportacion {
                cantidad: a.cantidad + cantidad,
                timestamp: a.timestamp,
            },
            None => Aportacion {
                cantidad,
                timestamp: ahora,
            },
        };

        let token_mxne: Address = env.storage().instance().get(&Clave::TokenMXNe).unwrap();
        let token = token::Client::new(&env, &token_mxne);

        // EFFECTS before interaction
        env.storage().persistent().set(
            &Clave::Aportacion(id_proyecto, backer.clone()),
            &nueva_aportacion,
        );
        proyecto.total_aportado += cantidad;

        let mitad = cantidad / 2;
        proyecto.capital_en_cetes += mitad;
        proyecto.capital_en_amm += cantidad - mitad;

        if proyecto.total_aportado >= proyecto.meta {
            proyecto.estado = EstadoProyecto::Liberado;
        } else {
            proyecto.estado = EstadoProyecto::EnProgreso;
        }

        env.storage()
            .persistent()
            .set(&Clave::Proyecto(id_proyecto), &proyecto);
        extender_ttl_instancia(&env);
        extender_ttl_proyecto(&env, id_proyecto);
        extender_ttl_aportacion(&env, id_proyecto, &backer);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("aportar"), backer.clone()),
            (id_proyecto, cantidad, ahora),
        );

        // INTERACTION last
        token.transfer(&backer, env.current_contract_address(), &cantidad);
    }

    /// Calcula el yield pendiente de un backer específico en stroops.
    /// No modifica el estado del contrato.
    pub fn calcular_yield(env: Env, id_proyecto: u32, backer: Address) -> i128 {
        let aportacion: Aportacion = env
            .storage()
            .persistent()
            .get(&Clave::Aportacion(id_proyecto, backer.clone()))
            .expect("Este backer no tiene aportacion en este proyecto");

        let cetes_bps = env
            .storage()
            .instance()
            .get::<_, u32>(&Clave::YieldCetesBps)
            .unwrap_or(DEFAULT_CETES_BPS) as i128;
        let amm_bps = env
            .storage()
            .instance()
            .get::<_, u32>(&Clave::YieldAmmBps)
            .unwrap_or(DEFAULT_AMM_BPS) as i128;

        let segundos = env
            .ledger()
            .timestamp()
            .saturating_sub(aportacion.timestamp);
        let minutos = (segundos / 60) as i128;

        let mitad = aportacion.cantidad / 2;
        let yield_cetes = calcular_yield_seguro(&env, mitad, cetes_bps, minutos);
        let yield_amm = calcular_yield_seguro(&env, aportacion.cantidad - mitad, amm_bps, minutos);

        // Read-only query: do not write storage solely to refresh TTL.
        yield_cetes + yield_amm
    }

    /// Retorna el yield total del proyecto desglosado por fuente (CETES y AMM).
    pub fn calcular_yield_detallado(env: Env, id_proyecto: u32) -> YieldDetallado {
        let proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        let cetes_bps = env
            .storage()
            .instance()
            .get::<_, u32>(&Clave::YieldCetesBps)
            .unwrap_or(DEFAULT_CETES_BPS) as i128;
        let amm_bps = env
            .storage()
            .instance()
            .get::<_, u32>(&Clave::YieldAmmBps)
            .unwrap_or(DEFAULT_AMM_BPS) as i128;

        let segundos = env
            .ledger()
            .timestamp()
            .saturating_sub(proyecto.timestamp_inicio);
        let minutos = (segundos / 60) as i128;
        let pendiente = yield_pendiente(&env, id_proyecto);

        let (yield_cetes_actual, _) = calcular_yield_divmod(
            &env,
            proyecto.capital_en_cetes,
            cetes_bps,
            minutos,
            pendiente.residuo_cetes,
        );
        let (yield_amm_actual, _) = calcular_yield_divmod(
            &env,
            proyecto.capital_en_amm,
            amm_bps,
            minutos,
            pendiente.residuo_amm,
        );
        let yield_cetes = pendiente
            .cetes
            .checked_add(yield_cetes_actual)
            .expect("Yield excede i128");
        let yield_amm = pendiente
            .amm
            .checked_add(yield_amm_actual)
            .expect("Yield excede i128");

        // Read-only query: do not write storage solely to refresh TTL.

        YieldDetallado {
            cetes: yield_cetes,
            amm: yield_amm,
            total: yield_cetes
                .checked_add(yield_amm)
                .expect("Yield excede i128"),
        }
    }

    /// Retorna la distribución actual del capital entre CETES y AMM.
    pub fn estado_capital(env: Env, id_proyecto: u32) -> CapitalEstado {
        let proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        // Read-only query: do not write storage solely to refresh TTL.

        CapitalEstado {
            en_cetes: proyecto.capital_en_cetes,
            en_amm: proyecto.capital_en_amm,
            total: proyecto.total_aportado,
        }
    }

    /// Fondea explícitamente la reserva desde la que se pagan los yields.
    ///
    /// El admin debe transferir MXNe nuevos al contrato; los aportes de los
    /// backers jamás incrementan esta reserva. Puede usarse aun pausado para
    /// recuperar la solvencia operativa durante un incidente.
    pub fn fondear_yield(env: Env, admin: Address, cantidad: i128) {
        admin.require_auth();
        let admin_guardado: Address = env
            .storage()
            .instance()
            .get(&Clave::Admin)
            .expect("No inicializado");
        assert!(admin == admin_guardado, "Solo el admin puede fondear yield");
        assert!(cantidad > 0, "Cantidad de fondeo debe ser mayor a 0");

        let reserva: i128 = env
            .storage()
            .instance()
            .get(&Clave::ReservaYield)
            .unwrap_or(0);
        let nueva_reserva = reserva
            .checked_add(cantidad)
            .expect("Reserva de yield excede i128");

        // EFFECTS before interaction. Si el token rechaza la transferencia,
        // Soroban revierte toda la invocación y la reserva no cambia.
        env.storage()
            .instance()
            .set(&Clave::ReservaYield, &nueva_reserva);
        extender_ttl_instancia(&env);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("fon_yield"), admin.clone()),
            (cantidad, nueva_reserva, env.ledger().timestamp()),
        );

        let token_mxne: Address = env.storage().instance().get(&Clave::TokenMXNe).unwrap();
        let token = token::Client::new(&env, &token_mxne);
        token.transfer(&admin, env.current_contract_address(), &cantidad);
    }

    /// Retorna la reserva disponible para pagos de yield, en stroops.
    pub fn reserva_yield(env: Env) -> i128 {
        let reserva = env
            .storage()
            .instance()
            .get(&Clave::ReservaYield)
            .unwrap_or(0);
        extender_ttl_instancia(&env);
        reserva
    }

    /// Renueva el TTL de un proyecto y, si sigue en revisión, su contador por dueño.
    /// Es permissionless para que un keeper o indexer pueda operar sin custodiar claves.
    pub fn renovar_ttl_proyecto(env: Env, id_proyecto: u32) {
        let proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");
        extender_ttl_instancia(&env);
        extender_ttl_proyecto(&env, id_proyecto);
        if proyecto.estado == EstadoProyecto::EnRevision {
            extender_ttl_contador_en_revision(&env, &proyecto.dueno);
        }
    }

    /// Renueva el TTL de la aportación indicada y de su proyecto padre.
    /// Es permissionless; no transfiere fondos ni modifica contabilidad.
    pub fn renovar_ttl_aportacion(env: Env, id_proyecto: u32, backer: Address) {
        let proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");
        let _: Aportacion = env
            .storage()
            .persistent()
            .get(&Clave::Aportacion(id_proyecto, backer.clone()))
            .expect("Sin aportacion");
        extender_ttl_instancia(&env);
        extender_ttl_proyecto(&env, id_proyecto);
        extender_ttl_aportacion(&env, id_proyecto, &backer);
        if proyecto.estado == EstadoProyecto::EnRevision {
            extender_ttl_contador_en_revision(&env, &proyecto.dueno);
        }
    }

    /// Transfiere el yield acumulado al dueño del proyecto.
    ///
    /// Solo el dueño puede llamar esta función (require_auth).
    /// Solo válido en estado EnProgreso o Liberado.
    /// Resetea `timestamp_inicio` al momento actual para el próximo período.
    /// Retorna el monto de yield transferido en stroops.
    pub fn reclamar_yield(env: Env, id_proyecto: u32) -> i128 {
        verificar_no_pausado(&env);
        let mut proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        // AUTH FIRST — before any other logic
        proyecto.dueno.require_auth();

        assert!(
            proyecto.estado == EstadoProyecto::EnProgreso
                || proyecto.estado == EstadoProyecto::Liberado,
            "El proyecto no esta activo"
        );
        assert!(proyecto.total_aportado > 0, "No hay fondos en el proyecto");

        // Primero liquidamos el periodo con su capital histórico. Esto evita
        // aplicar el capital actual de manera retroactiva.
        acumular_yield_pendiente(&env, id_proyecto, &mut proyecto);
        let ahora = env.ledger().timestamp();
        let mut pendiente = yield_pendiente(&env, id_proyecto);
        let yield_cetes = pendiente.cetes;
        let yield_amm = pendiente.amm;
        let yield_monto = yield_cetes
            .checked_add(yield_amm)
            .expect("Yield excede i128");

        assert!(yield_monto > 0, "Aun no hay yield suficiente acumulado");
        let reserva: i128 = env
            .storage()
            .instance()
            .get(&Clave::ReservaYield)
            .unwrap_or(0);
        assert!(
            reserva >= yield_monto,
            "Reserva de yield insuficiente; el principal no se usa para pagar yield"
        );

        // EFFECTS first. Se conserva el residuo fraccional para el siguiente
        // periodo, mientras que los stroops pagables salen de la reserva.
        proyecto.yield_entregado = proyecto
            .yield_entregado
            .checked_add(yield_monto)
            .expect("Yield excede i128");
        proyecto.yield_cetes_acumulado = proyecto
            .yield_cetes_acumulado
            .checked_add(yield_cetes)
            .expect("Yield excede i128");
        proyecto.yield_amm_acumulado = proyecto
            .yield_amm_acumulado
            .checked_add(yield_amm)
            .expect("Yield excede i128");
        pendiente.cetes = 0;
        pendiente.amm = 0;
        env.storage()
            .persistent()
            .set(&Clave::YieldPendiente(id_proyecto), &pendiente);
        env.storage()
            .instance()
            .set(&Clave::ReservaYield, &(reserva - yield_monto));
        env.storage()
            .persistent()
            .set(&Clave::Proyecto(id_proyecto), &proyecto);
        extender_ttl_instancia(&env);
        extender_ttl_proyecto(&env, id_proyecto);
        extender_ttl_yield_pendiente(&env, id_proyecto);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("yield"), proyecto.dueno.clone()),
            (id_proyecto, yield_monto, ahora),
        );

        // INTERACTION last
        let token_mxne: Address = env.storage().instance().get(&Clave::TokenMXNe).unwrap();
        let token = token::Client::new(&env, &token_mxne);
        token.transfer(
            &env.current_contract_address(),
            &proyecto.dueno,
            &yield_monto,
        );

        yield_monto
    }

    /// Devuelve el principal íntegro al backer.
    ///
    /// Válido cuando:
    ///   - El proyecto está en estado Liberado o Abandonado, O
    ///   - El plazo de recaudación ha vencido (timestamp >= timestamp_vencimiento)
    ///     aunque el proyecto no haya alcanzado la meta.
    ///
    /// En el caso de vencimiento sin meta, el yield acumulado hasta ese momento
    /// ya fue o puede ser reclamado por el dueño vía `reclamar_yield`.
    /// Retorna el monto retirado en stroops.
    pub fn retirar_principal(env: Env, backer: Address, id_proyecto: u32) -> i128 {
        verificar_no_pausado(&env);
        // AUTH FIRST
        backer.require_auth();

        let mut proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        let ahora = env.ledger().timestamp();
        let plazo_vencido = ahora >= proyecto.timestamp_vencimiento
            && (proyecto.estado == EstadoProyecto::EtapaInicial
                || proyecto.estado == EstadoProyecto::EnProgreso);

        assert!(
            proyecto.estado == EstadoProyecto::EtapaInicial ||
            proyecto.estado == EstadoProyecto::EnProgreso   ||
            proyecto.estado == EstadoProyecto::Liberado     ||
            proyecto.estado == EstadoProyecto::Abandonado   ||
            plazo_vencido,
            "Solo puedes retirar cuando el proyecto este activo, liberado, abandonado o haya vencido el plazo"
        );

        let aportacion: Aportacion = env
            .storage()
            .persistent()
            .get(&Clave::Aportacion(id_proyecto, backer.clone()))
            .expect("No tienes aportacion en este proyecto");

        assert!(aportacion.cantidad > 0, "Principal ya retirado");

        let monto = aportacion.cantidad;

        // El capital deja de estar expuesto a partir de ahora; guardar antes
        // el rendimiento del tramo que sí estuvo bloqueado.
        acumular_yield_pendiente(&env, id_proyecto, &mut proyecto);

        // EFFECTS first
        // remove() elimina la entrada; extender su TTL antes del borrado es inútil.
        extender_ttl_instancia(&env);
        extender_ttl_proyecto(&env, id_proyecto);
        env.storage().persistent().remove(&Clave::Aportacion(id_proyecto, backer.clone()));
        proyecto.total_aportado -= monto;

        let mitad = monto / 2;
        proyecto.capital_en_cetes = proyecto.capital_en_cetes.saturating_sub(mitad);
        proyecto.capital_en_amm = proyecto.capital_en_amm.saturating_sub(monto - mitad);

        if proyecto.total_aportado == 0
            && (proyecto.estado == EstadoProyecto::EnProgreso
                || proyecto.estado == EstadoProyecto::Liberado)
        {
            proyecto.estado = EstadoProyecto::EtapaInicial;
        }

        env.storage()
            .persistent()
            .set(&Clave::Proyecto(id_proyecto), &proyecto);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("retiro"), backer.clone()),
            (id_proyecto, monto, ahora),
        );

        // INTERACTION last
        let token_mxne: Address = env.storage().instance().get(&Clave::TokenMXNe).unwrap();
        let token = token::Client::new(&env, &token_mxne);
        token.transfer(&env.current_contract_address(), &backer, &monto);

        monto
    }

    /// Retiro anticipado — el backer sale antes del vencimiento y antes de que
    /// el proyecto sea Liberado.
    ///
    /// Devuelve el 100 % del capital aportado. El yield que el backer habría
    /// generado durante el tiempo restante se queda en el proyecto para que
    /// el dueño lo reclame vía `reclamar_yield`.
    ///
    /// No es posible llamar esta función si el plazo ya venció (usa
    /// `retirar_principal` en ese caso) ni si el proyecto ya está Liberado
    /// o Abandonado.
    pub fn retiro_anticipado(env: Env, backer: Address, id_proyecto: u32) -> i128 {
        verificar_no_pausado(&env);
        // AUTH FIRST
        backer.require_auth();

        let mut proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        assert!(
            proyecto.estado == EstadoProyecto::EtapaInicial
                || proyecto.estado == EstadoProyecto::EnProgreso,
            "El retiro anticipado solo aplica a proyectos activos"
        );

        let ahora = env.ledger().timestamp();
        assert!(
            ahora < proyecto.timestamp_vencimiento,
            "El plazo ya vencio, usa retirar_principal"
        );

        let aportacion: Aportacion = env
            .storage()
            .persistent()
            .get(&Clave::Aportacion(id_proyecto, backer.clone()))
            .expect("No tienes aportacion en este proyecto");

        assert!(aportacion.cantidad > 0, "Principal ya retirado");

        let monto = aportacion.cantidad;

        // El rendimiento ya devengado se conserva para el dueño; el retiro no
        // puede reducir retroactivamente el capital de ese periodo.
        acumular_yield_pendiente(&env, id_proyecto, &mut proyecto);

        // EFFECTS first — yield acumulado se queda en el proyecto
        // remove() elimina la entrada; extender su TTL antes del borrado es inútil.
        extender_ttl_instancia(&env);
        extender_ttl_proyecto(&env, id_proyecto);
        env.storage().persistent().remove(&Clave::Aportacion(id_proyecto, backer.clone()));
        proyecto.total_aportado -= monto;

        let mitad = monto / 2;
        proyecto.capital_en_cetes = proyecto.capital_en_cetes.saturating_sub(mitad);
        proyecto.capital_en_amm = proyecto.capital_en_amm.saturating_sub(monto - mitad);

        if proyecto.total_aportado == 0 {
            proyecto.estado = EstadoProyecto::EtapaInicial;
        }

        env.storage()
            .persistent()
            .set(&Clave::Proyecto(id_proyecto), &proyecto);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("retiro"), backer.clone()),
            (id_proyecto, monto, ahora),
        );

        // INTERACTION last — devolver solo capital
        let token_mxne: Address = env.storage().instance().get(&Clave::TokenMXNe).unwrap();
        let token = token::Client::new(&env, &token_mxne);
        token.transfer(&env.current_contract_address(), &backer, &monto);

        monto
    }

    /// Marca el proyecto como Abandonado. Solo el dueño puede llamarlo.
    /// Válido en EtapaInicial, EnProgreso o Liberado.
    /// Tras esto, los backers pueden retirar su principal.
    pub fn abandonar_proyecto(env: Env, id_proyecto: u32) {
        verificar_no_pausado(&env);
        let mut proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        // AUTH FIRST
        proyecto.dueno.require_auth();

        assert!(
            proyecto.estado == EstadoProyecto::EtapaInicial
                || proyecto.estado == EstadoProyecto::EnProgreso
                || proyecto.estado == EstadoProyecto::Liberado,
            "El proyecto no puede ser abandonado en su estado actual"
        );

        proyecto.estado = EstadoProyecto::Abandonado;
        env.storage()
            .persistent()
            .set(&Clave::Proyecto(id_proyecto), &proyecto);
        extender_ttl_instancia(&env);
        extender_ttl_proyecto(&env, id_proyecto);
    }

    /// Permite a un nuevo dueño retomar un proyecto Abandonado.
    ///
    /// Transfiere la propiedad a `nuevo_dueno` y reactiva el proyecto.
    /// Resetea `timestamp_inicio` para que el nuevo dueño no herede
    /// yield acumulado del período anterior.
    pub fn solicitar_continuar(env: Env, nuevo_dueno: Address, id_proyecto: u32) {
        verificar_no_pausado(&env);
        // AUTH FIRST
        nuevo_dueno.require_auth();

        let mut proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        assert!(
            proyecto.estado == EstadoProyecto::Abandonado,
            "Solo puedes continuar proyectos abandonados"
        );

        proyecto.dueno = nuevo_dueno;
        // Reset yield clock so new owner doesn't inherit stale yield period.
        // También se elimina el yield/residuo pendiente del dueño anterior.
        proyecto.timestamp_inicio = env.ledger().timestamp();
        env.storage()
            .persistent()
            .remove(&Clave::YieldPendiente(id_proyecto));
        proyecto.estado = if proyecto.total_aportado > 0 {
            EstadoProyecto::EnProgreso
        } else {
            EstadoProyecto::EtapaInicial
        };

        env.storage()
            .persistent()
            .set(&Clave::Proyecto(id_proyecto), &proyecto);
        extender_ttl_instancia(&env);
        extender_ttl_proyecto(&env, id_proyecto);
    }

    /// Aprueba un proyecto en revisión. Solo el admin puede llamarlo.
    /// Mueve el estado EnRevision → EtapaInicial.
    pub fn admin_aprobar(env: Env, id_proyecto: u32) {
        // AUTH FIRST
        let admin: Address = env
            .storage()
            .instance()
            .get(&Clave::Admin)
            .expect("No inicializado");
        admin.require_auth();

        let mut proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        assert!(
            proyecto.estado == EstadoProyecto::EnRevision,
            "Solo se pueden aprobar proyectos en revision"
        );

        let prev: u32 = env
            .storage()
            .persistent()
            .get(&Clave::ContadorEnRevision(proyecto.dueno.clone()))
            .unwrap_or(0);
        env.storage().persistent().set(
            &Clave::ContadorEnRevision(proyecto.dueno.clone()),
            &prev.saturating_sub(1),
        );

        proyecto.estado = EstadoProyecto::EtapaInicial;
        env.storage()
            .persistent()
            .set(&Clave::Proyecto(id_proyecto), &proyecto);
        extender_ttl_instancia(&env);
        extender_ttl_proyecto(&env, id_proyecto);
        extender_ttl_contador_en_revision(&env, &proyecto.dueno);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("aprobar"), admin.clone()),
            (id_proyecto, env.ledger().timestamp()),
        );
    }

    /// Rechaza un proyecto en revisión. Solo el admin puede llamarlo.
    /// Mueve el estado EnRevision → Rechazado y guarda el motivo.
    pub fn admin_rechazar(env: Env, id_proyecto: u32, motivo: String) {
        // AUTH FIRST
        let admin: Address = env
            .storage()
            .instance()
            .get(&Clave::Admin)
            .expect("No inicializado");
        admin.require_auth();

        let mut proyecto: Proyecto = env
            .storage()
            .persistent()
            .get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        assert!(
            proyecto.estado == EstadoProyecto::EnRevision,
            "Solo se pueden rechazar proyectos en revision"
        );

        let prev: u32 = env
            .storage()
            .persistent()
            .get(&Clave::ContadorEnRevision(proyecto.dueno.clone()))
            .unwrap_or(0);
        env.storage().persistent().set(
            &Clave::ContadorEnRevision(proyecto.dueno.clone()),
            &prev.saturating_sub(1),
        );

        let motivo_event = motivo.clone();
        proyecto.estado = EstadoProyecto::Rechazado;
        proyecto.motivo_rechazo = motivo;
        env.storage()
            .persistent()
            .set(&Clave::Proyecto(id_proyecto), &proyecto);
        extender_ttl_instancia(&env);
        extender_ttl_proyecto(&env, id_proyecto);
        extender_ttl_contador_en_revision(&env, &proyecto.dueno);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("rechazar"), admin.clone()),
            (id_proyecto, motivo_event, env.ledger().timestamp()),
        );
    }

    /// Transfiere el rol de administrador a una nueva dirección.
    /// Solo el admin actual puede llamar esta función.
    pub fn admin_cambiar_admin(env: Env, admin_actual: Address, nuevo_admin: Address) {
        admin_actual.require_auth();
        let guardado: Address = env
            .storage()
            .instance()
            .get(&Clave::Admin)
            .expect("No inicializado");
        assert!(
            admin_actual == guardado,
            "Solo el admin actual puede transferir el rol"
        );
        assert!(
            nuevo_admin != admin_actual,
            "El nuevo admin debe ser diferente"
        );

        env.storage().instance().set(&Clave::Admin, &nuevo_admin);

        #[allow(deprecated)]
        env.events().publish(
            (
                soroban_sdk::symbol_short!("adm_chg"),
                admin_actual,
                nuevo_admin.clone(),
            ),
            nuevo_admin,
        );

        extender_ttl_instancia(&env);
    }

    pub fn obtener_proyecto(env: Env, id: u32) -> Proyecto {
        env.storage().persistent().get(&Clave::Proyecto(id)).expect("Proyecto no existe")
    }

    pub fn obtener_aportacion(env: Env, id_proyecto: u32, backer: Address) -> Aportacion {
        env.storage().persistent().get(&Clave::Aportacion(id_proyecto, backer)).expect("Sin aportacion")
    }

    pub fn total_proyectos(env: Env) -> u32 {
        env.storage().instance().get(&Clave::ContadorProyectos).unwrap_or(0)
    }

    pub fn admin_pausar(env: Env, admin: Address) {
        admin.require_auth();
        let admin_guardado: Address = env
            .storage()
            .instance()
            .get(&Clave::Admin)
            .expect("No inicializado");
        assert!(admin == admin_guardado, "Solo el admin puede pausar");
        env.storage().instance().set(&Clave::Pausado, &true);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("pausar"), admin.clone()),
            env.ledger().timestamp(),
        );
        extender_ttl_instancia(&env);
    }

    pub fn admin_reanudar(env: Env, admin: Address) {
        admin.require_auth();
        let admin_guardado: Address = env
            .storage()
            .instance()
            .get(&Clave::Admin)
            .expect("No inicializado");
        assert!(admin == admin_guardado, "Solo el admin puede reanudar");
        env.storage().instance().set(&Clave::Pausado, &false);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("reanudar"), admin.clone()),
            env.ledger().timestamp(),
        );
        extender_ttl_instancia(&env);
    }

    /// Propone una actualización del WASM del contrato.
    pub fn admin_upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) {
        admin.require_auth();
        let admin_guardado: Address = env
            .storage()
            .instance()
            .get(&Clave::Admin)
            .expect("No inicializado");
        assert!(
            admin == admin_guardado,
            "Solo el admin puede actualizar el contrato"
        );

        let timestamp = env.ledger().timestamp();
        env.storage().instance().set(
            &Clave::PropuestaUpgrade,
            &(new_wasm_hash.clone(), timestamp),
        );

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("prop_upg"), admin.clone()),
            (new_wasm_hash, timestamp),
        );
        extender_ttl_instancia(&env);
    }

    /// Ejecuta una actualización del WASM del contrato previamente propuesta y cuyo timelock ha expirado.
    pub fn admin_execute_upgrade(env: Env, admin: Address) {
        admin.require_auth();
        let admin_guardado: Address = env
            .storage()
            .instance()
            .get(&Clave::Admin)
            .expect("No inicializado");
        assert!(
            admin == admin_guardado,
            "Solo el admin puede actualizar el contrato"
        );

        let propuesta: (BytesN<32>, u64) = env
            .storage()
            .instance()
            .get(&Clave::PropuestaUpgrade)
            .expect("No hay propuesta de upgrade");
        let (new_wasm_hash, timestamp_propuesta) = propuesta;

        let ahora = env.ledger().timestamp();
        assert!(
            ahora >= timestamp_propuesta + TIMELOCK_UPGRADE_SEGUNDOS,
            "Timelock no ha expirado"
        );

        // Limpiar propuesta
        env.storage().instance().remove(&Clave::PropuestaUpgrade);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("upgrade"), admin.clone()),
            (new_wasm_hash.clone(), ahora),
        );

        // In tests, update_current_contract_wasm cannot be called because no real
        // WASM is stored in the test ledger (contracts are registered as Rust structs).
        // The auth check above is still fully verified.
        #[cfg(not(test))]
        env.deployer()
            .update_current_contract(ContractExecutable::Wasm(new_wasm_hash));
        #[cfg(test)]
        let _ = new_wasm_hash;

        extender_ttl_instancia(&env);
    }
}

#[cfg(test)]
mod test;
