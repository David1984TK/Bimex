#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    token, Address, Env, String,
};

// ============================================================
//  TIPOS DE DATOS
// ============================================================

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum EstadoProyecto {
    EnRevision,    // pendiente de aprobación por el admin
    EtapaInicial,  // aprobado, sin backers todavía
    EnProgreso,    // al menos un backer
    Abandonado,    // dueño lo marcó como abandonado
    Liberado,      // meta alcanzada
    Rechazado,     // rechazado por el admin
}

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
    pub capital_en_cetes: i128,
    pub yield_cetes_acumulado: i128,
    pub capital_en_amm: i128,
    pub yield_amm_acumulado: i128,
    pub doc_cid: String,
    pub motivo_rechazo: String,
}

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
}

// ============================================================
//  CONSTANTES DE TASAS
// ============================================================

// Tasas reales de producción en puntos base (bps).
// 10 000 bps = 100 % anual. Fórmula: capital × bps × minutos / 10_000 / 525_600
const DEFAULT_CETES_BPS: u32 = 945;  // 9.45 % anual (CETES referencia)
const DEFAULT_AMM_BPS:   u32 = 400;  // 4.00 % anual (liquidez AMM)

// ============================================================
//  HELPERS
// ============================================================

/// Overflow-safe yield calculation.
/// Uses i128 max ~1.7e38; with capital up to ~1e18 stroops and bps up to 10_000_000,
/// we divide early to stay within bounds.
fn calcular_yield_seguro(capital: i128, bps: i128, minutos: i128) -> i128 {
    const MINUTOS_ANO: i128 = 525_600;
    // Divide before multiply to prevent overflow: (capital / MINUTOS_ANO) * bps * minutos / 10_000
    // Order chosen to keep intermediate values small while preserving precision
    (capital / MINUTOS_ANO) * bps / 10_000 * minutos
        + (capital % MINUTOS_ANO) * bps / 10_000 * minutos / MINUTOS_ANO
}

// ============================================================
//  CONTRATO
// ============================================================

#[contract]
pub struct BimexContrato;

#[contractimpl]
impl BimexContrato {

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
        assert!(yield_cetes_bps <= 10_000_000, "yield_cetes_bps excede el maximo");
        assert!(yield_amm_bps   <= 10_000_000, "yield_amm_bps excede el maximo");
        env.storage().instance().set(&Clave::Admin, &admin);
        env.storage().instance().set(&Clave::TokenMXNe, &token_mxne);
        env.storage().instance().set(&Clave::YieldCetesBps, &yield_cetes_bps);
        env.storage().instance().set(&Clave::YieldAmmBps, &yield_amm_bps);
        env.storage().instance().set(&Clave::ContadorProyectos, &0u32);
    }

    pub fn crear_proyecto(
        env: Env,
        dueno: Address,
        nombre: String,
        meta: i128,
        doc_cid: String,
    ) -> u32 {
        dueno.require_auth();
        assert!(meta > 0, "La meta debe ser mayor a 0");

        let id: u32 = env.storage().instance().get(&Clave::ContadorProyectos).unwrap_or(0);

        let proyecto = Proyecto {
            dueno,
            nombre,
            meta,
            total_aportado: 0,
            yield_entregado: 0,
            estado: EstadoProyecto::EnRevision,
            timestamp_inicio: env.ledger().timestamp(),
            capital_en_cetes: 0,
            yield_cetes_acumulado: 0,
            capital_en_amm: 0,
            yield_amm_acumulado: 0,
            doc_cid,
            motivo_rechazo: String::from_str(&env, ""),
        };

        env.storage().persistent().set(&Clave::Proyecto(id), &proyecto);
        env.storage().instance().set(&Clave::ContadorProyectos, &(id + 1));
        id
    }

    pub fn contribuir(env: Env, backer: Address, id_proyecto: u32, cantidad: i128) {
        // AUTH FIRST
        backer.require_auth();
        assert!(cantidad > 0, "Cantidad debe ser mayor a 0");

        let mut proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        assert!(
            proyecto.estado == EstadoProyecto::EtapaInicial ||
            proyecto.estado == EstadoProyecto::EnProgreso,
            "El proyecto no acepta fondos"
        );

        // Cap contribution to prevent overfunding
        let restante = proyecto.meta - proyecto.total_aportado;
        assert!(restante > 0, "El proyecto ya alcanzo su meta");
        let cantidad = cantidad.min(restante);

        let aportacion_existente: Option<Aportacion> = env
            .storage().persistent().get(&Clave::Aportacion(id_proyecto, backer.clone()));

        let ahora = env.ledger().timestamp();
        // Preserve original timestamp on top-up to avoid yield clock reset
        let nueva_aportacion = match aportacion_existente {
            Some(a) => Aportacion { cantidad: a.cantidad + cantidad, timestamp: a.timestamp },
            None    => Aportacion { cantidad, timestamp: ahora },
        };

        let token_mxne: Address = env.storage().instance().get(&Clave::TokenMXNe).unwrap();
        let token = token::Client::new(&env, &token_mxne);

        // EFFECTS before interaction
        env.storage().persistent().set(&Clave::Aportacion(id_proyecto, backer.clone()), &nueva_aportacion);
        proyecto.total_aportado += cantidad;

        let mitad = cantidad / 2;
        proyecto.capital_en_cetes += mitad;
        proyecto.capital_en_amm   += cantidad - mitad;

        if proyecto.total_aportado >= proyecto.meta {
            proyecto.estado = EstadoProyecto::Liberado;
        } else {
            proyecto.estado = EstadoProyecto::EnProgreso;
        }

        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);

        // INTERACTION last
        token.transfer(&backer, &env.current_contract_address(), &cantidad);
    }

    pub fn calcular_yield(env: Env, id_proyecto: u32, backer: Address) -> i128 {
        let aportacion: Aportacion = env
            .storage().persistent().get(&Clave::Aportacion(id_proyecto, backer))
            .expect("Este backer no tiene aportacion en este proyecto");

        let cetes_bps = env.storage().instance().get::<_, u32>(&Clave::YieldCetesBps).unwrap_or(DEFAULT_CETES_BPS) as i128;
        let amm_bps   = env.storage().instance().get::<_, u32>(&Clave::YieldAmmBps).unwrap_or(DEFAULT_AMM_BPS) as i128;

        let segundos = env.ledger().timestamp().saturating_sub(aportacion.timestamp);
        let minutos  = (segundos / 60) as i128;

        let mitad       = aportacion.cantidad / 2;
        let yield_cetes = calcular_yield_seguro(mitad, cetes_bps, minutos);
        let yield_amm   = calcular_yield_seguro(aportacion.cantidad - mitad, amm_bps, minutos);

        yield_cetes + yield_amm
    }

    pub fn calcular_yield_detallado(env: Env, id_proyecto: u32) -> YieldDetallado {
        let proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        let cetes_bps = env.storage().instance().get::<_, u32>(&Clave::YieldCetesBps).unwrap_or(DEFAULT_CETES_BPS) as i128;
        let amm_bps   = env.storage().instance().get::<_, u32>(&Clave::YieldAmmBps).unwrap_or(DEFAULT_AMM_BPS) as i128;

        let segundos = env.ledger().timestamp().saturating_sub(proyecto.timestamp_inicio);
        let minutos  = (segundos / 60) as i128;

        let yield_cetes = calcular_yield_seguro(proyecto.capital_en_cetes, cetes_bps, minutos);
        let yield_amm   = calcular_yield_seguro(proyecto.capital_en_amm,   amm_bps,   minutos);

        YieldDetallado { cetes: yield_cetes, amm: yield_amm, total: yield_cetes + yield_amm }
    }

    pub fn estado_capital(env: Env, id_proyecto: u32) -> CapitalEstado {
        let proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        CapitalEstado {
            en_cetes: proyecto.capital_en_cetes,
            en_amm:   proyecto.capital_en_amm,
            total:    proyecto.total_aportado,
        }
    }

    pub fn reclamar_yield(env: Env, id_proyecto: u32) -> i128 {
        let mut proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        // AUTH FIRST — before any other logic
        proyecto.dueno.require_auth();

        // Only active projects with funds can yield
        assert!(
            proyecto.estado == EstadoProyecto::EnProgreso ||
            proyecto.estado == EstadoProyecto::Liberado,
            "El proyecto no esta activo"
        );
        assert!(proyecto.total_aportado > 0, "No hay fondos en el proyecto");

        let cetes_bps = env.storage().instance().get::<_, u32>(&Clave::YieldCetesBps).unwrap_or(DEFAULT_CETES_BPS) as i128;
        let amm_bps   = env.storage().instance().get::<_, u32>(&Clave::YieldAmmBps).unwrap_or(DEFAULT_AMM_BPS) as i128;

        let ahora    = env.ledger().timestamp();
        let segundos = ahora.saturating_sub(proyecto.timestamp_inicio);
        let minutos  = (segundos / 60) as i128;

        let yield_cetes = calcular_yield_seguro(proyecto.capital_en_cetes, cetes_bps, minutos);
        let yield_amm   = calcular_yield_seguro(proyecto.capital_en_amm,   amm_bps,   minutos);
        let yield_monto = yield_cetes + yield_amm;

        assert!(yield_monto > 0, "Aun no hay yield suficiente acumulado");

        // EFFECTS first
        proyecto.yield_entregado       += yield_monto;
        proyecto.yield_cetes_acumulado += yield_cetes;
        proyecto.yield_amm_acumulado   += yield_amm;
        proyecto.timestamp_inicio       = ahora;
        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);

        // INTERACTION last
        let token_mxne: Address = env.storage().instance().get(&Clave::TokenMXNe).unwrap();
        let token = token::Client::new(&env, &token_mxne);
        token.transfer(&env.current_contract_address(), &proyecto.dueno, &yield_monto);

        yield_monto
    }

    pub fn retirar_principal(env: Env, backer: Address, id_proyecto: u32) -> i128 {
        // AUTH FIRST
        backer.require_auth();

        let mut proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        assert!(
            proyecto.estado == EstadoProyecto::Liberado ||
            proyecto.estado == EstadoProyecto::Abandonado,
            "Solo puedes retirar cuando el proyecto este liberado o abandonado"
        );

        let aportacion: Aportacion = env
            .storage().persistent().get(&Clave::Aportacion(id_proyecto, backer.clone()))
            .expect("No tienes aportacion en este proyecto");

        assert!(aportacion.cantidad > 0, "Principal ya retirado");

        let monto = aportacion.cantidad;

        // EFFECTS first
        env.storage().persistent().remove(&Clave::Aportacion(id_proyecto, backer.clone()));
        proyecto.total_aportado -= monto;

        let mitad = monto / 2;
        proyecto.capital_en_cetes = proyecto.capital_en_cetes.saturating_sub(mitad);
        proyecto.capital_en_amm   = proyecto.capital_en_amm.saturating_sub(monto - mitad);

        if proyecto.total_aportado == 0 &&
           (proyecto.estado == EstadoProyecto::EnProgreso || proyecto.estado == EstadoProyecto::Liberado) {
            proyecto.estado = EstadoProyecto::EtapaInicial;
        }

        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);

        // INTERACTION last
        let token_mxne: Address = env.storage().instance().get(&Clave::TokenMXNe).unwrap();
        let token = token::Client::new(&env, &token_mxne);
        token.transfer(&env.current_contract_address(), &backer, &monto);

        monto
    }

    pub fn abandonar_proyecto(env: Env, id_proyecto: u32) {
        let mut proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        // AUTH FIRST
        proyecto.dueno.require_auth();

        // Only active projects can be abandoned
        assert!(
            proyecto.estado == EstadoProyecto::EtapaInicial ||
            proyecto.estado == EstadoProyecto::EnProgreso   ||
            proyecto.estado == EstadoProyecto::Liberado,
            "El proyecto no puede ser abandonado en su estado actual"
        );

        proyecto.estado = EstadoProyecto::Abandonado;
        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);
    }

    pub fn solicitar_continuar(env: Env, nuevo_dueno: Address, id_proyecto: u32) {
        // AUTH FIRST
        nuevo_dueno.require_auth();

        let mut proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        assert!(
            proyecto.estado == EstadoProyecto::Abandonado,
            "Solo puedes continuar proyectos abandonados"
        );

        proyecto.dueno = nuevo_dueno;
        // Reset yield clock so new owner doesn't inherit stale yield period
        proyecto.timestamp_inicio = env.ledger().timestamp();
        proyecto.estado = if proyecto.total_aportado > 0 {
            EstadoProyecto::EnProgreso
        } else {
            EstadoProyecto::EtapaInicial
        };

        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);
    }

    pub fn admin_aprobar(env: Env, id_proyecto: u32) {
        // AUTH FIRST
        let admin: Address = env.storage().instance().get(&Clave::Admin).expect("No inicializado");
        admin.require_auth();

        let mut proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        assert!(
            proyecto.estado == EstadoProyecto::EnRevision,
            "Solo se pueden aprobar proyectos en revision"
        );

        proyecto.estado = EstadoProyecto::EtapaInicial;
        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);
    }

    pub fn admin_rechazar(env: Env, id_proyecto: u32, motivo: String) {
        // AUTH FIRST
        let admin: Address = env.storage().instance().get(&Clave::Admin).expect("No inicializado");
        admin.require_auth();

        let mut proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        assert!(
            proyecto.estado == EstadoProyecto::EnRevision,
            "Solo se pueden rechazar proyectos en revision"
        );

        proyecto.estado = EstadoProyecto::Rechazado;
        proyecto.motivo_rechazo = motivo;
        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);
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
}

#[cfg(test)]
mod test;
