#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    token, Address, Env, String, BytesN,
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
    // Capa 1: CETES (Etherfuse)
    pub capital_en_cetes: i128,
    pub yield_cetes_acumulado: i128,
    // Capa 2: AMM Stellar
    pub capital_en_amm: i128,
    pub yield_amm_acumulado: i128,
    // Verificación documental: SHA-256 bundle de (hash_INE || hash_plan || hash_presupuesto)
    pub doc_hash: BytesN<32>,
    // Motivo de rechazo (solo cuando estado == Rechazado)
    pub motivo_rechazo: String,
}

#[contracttype]
#[derive(Clone)]
pub struct Aportacion {
    pub cantidad: i128,
    pub timestamp: u64,
}

/// Detalle del yield: (yield_cetes, yield_amm, total)
#[contracttype]
#[derive(Clone)]
pub struct YieldDetallado {
    pub cetes: i128,
    pub amm: i128,
    pub total: i128,
}

/// Estado del capital: (capital_en_cetes, capital_en_amm, total_aportado)
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
//  CONTRATO
// ============================================================

#[contract]
pub struct BimexContrato;

#[contractimpl]
impl BimexContrato {

    /// Inicializar con dos tasas de yield: CETES (Capa 1) y AMM (Capa 2)
    /// Para demo: yield_cetes_bps=25000, yield_amm_bps=10000
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
        env.storage().instance().set(&Clave::Admin, &admin);
        env.storage().instance().set(&Clave::TokenMXNe, &token_mxne);
        env.storage().instance().set(&Clave::YieldCetesBps, &yield_cetes_bps);
        env.storage().instance().set(&Clave::YieldAmmBps, &yield_amm_bps);
        env.storage().instance().set(&Clave::ContadorProyectos, &0u32);
    }

    /// Crea un proyecto con verificación documental.
    /// `doc_hash` es el SHA-256 del bundle de documentos oficiales (INE + plan + presupuesto).
    /// Los documentos permanecen en el dispositivo del creador; solo el hash queda en la cadena.
    pub fn crear_proyecto(
        env: Env,
        dueno: Address,
        nombre: String,
        meta: i128,
        doc_hash: BytesN<32>,
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
            estado: EstadoProyecto::EnRevision,  // inicia en revisión hasta que admin apruebe
            timestamp_inicio: env.ledger().timestamp(),
            capital_en_cetes: 0,
            yield_cetes_acumulado: 0,
            capital_en_amm: 0,
            yield_amm_acumulado: 0,
            doc_hash,
            motivo_rechazo: String::from_str(&env, ""),
        };

        env.storage().persistent().set(&Clave::Proyecto(id), &proyecto);
        env.storage().instance().set(&Clave::ContadorProyectos, &(id + 1));
        id
    }

    /// Al contribuir, el capital se divide 50/50 entre CETES y AMM
    pub fn contribuir(env: Env, backer: Address, id_proyecto: u32, cantidad: i128) {
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

        let aportacion_existente: Option<Aportacion> = env
            .storage().persistent().get(&Clave::Aportacion(id_proyecto, backer.clone()));

        let nueva_aportacion = match aportacion_existente {
            Some(a) => Aportacion { cantidad: a.cantidad + cantidad, timestamp: env.ledger().timestamp() },
            None => Aportacion { cantidad, timestamp: env.ledger().timestamp() },
        };

        let token_mxne: Address = env.storage().instance().get(&Clave::TokenMXNe).unwrap();
        let token = token::Client::new(&env, &token_mxne);
        token.transfer(&backer, &env.current_contract_address(), &cantidad);

        env.storage().persistent().set(&Clave::Aportacion(id_proyecto, backer), &nueva_aportacion);
        proyecto.total_aportado += cantidad;

        // Dividir capital 50/50: Capa 1 CETES / Capa 2 AMM
        let mitad = cantidad / 2;
        proyecto.capital_en_cetes += mitad;
        proyecto.capital_en_amm += cantidad - mitad; // el residuo va al AMM

        // Transición automática de estado
        if proyecto.total_aportado >= proyecto.meta {
            proyecto.estado = EstadoProyecto::Liberado;
        } else {
            proyecto.estado = EstadoProyecto::EnProgreso;
        }

        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);
    }

    /// Yield del backer en este proyecto (solo para consulta, no afecta al dueño)
    pub fn calcular_yield(env: Env, id_proyecto: u32, backer: Address) -> i128 {
        let aportacion: Aportacion = env
            .storage().persistent().get(&Clave::Aportacion(id_proyecto, backer))
            .expect("Este backer no tiene aportacion en este proyecto");

        let cetes_bps: u32 = env.storage().instance().get(&Clave::YieldCetesBps).unwrap_or(25000);
        let amm_bps: u32 = env.storage().instance().get(&Clave::YieldAmmBps).unwrap_or(10000);

        let ahora = env.ledger().timestamp();
        let segundos = ahora.saturating_sub(aportacion.timestamp);
        let minutos = (segundos / 60) as i128;

        const MINUTOS_ANO: i128 = 525_600;
        let mitad = aportacion.cantidad / 2;
        let yield_cetes = (mitad * cetes_bps as i128 * minutos) / 10_000 / MINUTOS_ANO;
        let yield_amm   = ((aportacion.cantidad - mitad) * amm_bps as i128 * minutos) / 10_000 / MINUTOS_ANO;

        yield_cetes + yield_amm
    }

    /// Yield detallado del proyecto para el dueño: (cetes, amm, total)
    pub fn calcular_yield_detallado(env: Env, id_proyecto: u32) -> YieldDetallado {
        let proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        let cetes_bps: u32 = env.storage().instance().get(&Clave::YieldCetesBps).unwrap_or(25000);
        let amm_bps: u32 = env.storage().instance().get(&Clave::YieldAmmBps).unwrap_or(10000);

        let ahora = env.ledger().timestamp();
        let segundos = ahora.saturating_sub(proyecto.timestamp_inicio);
        let minutos = (segundos / 60) as i128;

        const MINUTOS_ANO: i128 = 525_600;
        let yield_cetes = (proyecto.capital_en_cetes * cetes_bps as i128 * minutos) / 10_000 / MINUTOS_ANO;
        let yield_amm   = (proyecto.capital_en_amm   * amm_bps as i128   * minutos) / 10_000 / MINUTOS_ANO;

        YieldDetallado {
            cetes: yield_cetes,
            amm: yield_amm,
            total: yield_cetes + yield_amm,
        }
    }

    /// Estado del capital del proyecto: (capital_en_cetes, capital_en_amm, total)
    pub fn estado_capital(env: Env, id_proyecto: u32) -> CapitalEstado {
        let proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        CapitalEstado {
            en_cetes: proyecto.capital_en_cetes,
            en_amm: proyecto.capital_en_amm,
            total: proyecto.total_aportado,
        }
    }

    /// El dueño reclama el yield acumulado del proyecto (ambas capas)
    pub fn reclamar_yield(env: Env, id_proyecto: u32) -> i128 {
        let mut proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        proyecto.dueno.require_auth();
        assert!(proyecto.total_aportado > 0, "No hay fondos en el proyecto");

        let cetes_bps: u32 = env.storage().instance().get(&Clave::YieldCetesBps).unwrap_or(25000);
        let amm_bps: u32 = env.storage().instance().get(&Clave::YieldAmmBps).unwrap_or(10000);

        let ahora = env.ledger().timestamp();
        let segundos = ahora.saturating_sub(proyecto.timestamp_inicio);
        let minutos = (segundos / 60) as i128;

        const MINUTOS_ANO: i128 = 525_600;
        let yield_cetes = (proyecto.capital_en_cetes * cetes_bps as i128 * minutos) / 10_000 / MINUTOS_ANO;
        let yield_amm   = (proyecto.capital_en_amm   * amm_bps as i128   * minutos) / 10_000 / MINUTOS_ANO;
        let yield_monto = yield_cetes + yield_amm;

        assert!(yield_monto > 0, "Aun no hay yield suficiente acumulado");

        let token_mxne: Address = env.storage().instance().get(&Clave::TokenMXNe).unwrap();
        let token = token::Client::new(&env, &token_mxne);
        token.transfer(&env.current_contract_address(), &proyecto.dueno, &yield_monto);

        proyecto.yield_entregado += yield_monto;
        proyecto.yield_cetes_acumulado += yield_cetes;
        proyecto.yield_amm_acumulado   += yield_amm;
        proyecto.timestamp_inicio = ahora; // reset para próxima reclamación
        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);
        yield_monto
    }

    pub fn retirar_principal(env: Env, backer: Address, id_proyecto: u32) -> i128 {
        backer.require_auth();

        let proyecto: Proyecto = env
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

        let token_mxne: Address = env.storage().instance().get(&Clave::TokenMXNe).unwrap();
        let token = token::Client::new(&env, &token_mxne);
        token.transfer(&env.current_contract_address(), &backer, &aportacion.cantidad);

        let mut proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto)).unwrap();
        proyecto.total_aportado -= aportacion.cantidad;

        // Descontar del capital distribuido (proporcional 50/50)
        let mitad = aportacion.cantidad / 2;
        proyecto.capital_en_cetes = proyecto.capital_en_cetes.saturating_sub(mitad);
        proyecto.capital_en_amm   = proyecto.capital_en_amm.saturating_sub(aportacion.cantidad - mitad);

        // Si se retiran todos los fondos, volver a EtapaInicial
        if proyecto.total_aportado == 0 &&
           (proyecto.estado == EstadoProyecto::EnProgreso || proyecto.estado == EstadoProyecto::Liberado) {
            proyecto.estado = EstadoProyecto::EtapaInicial;
        }

        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);
        let monto = aportacion.cantidad;
        env.storage().persistent().remove(&Clave::Aportacion(id_proyecto, backer));
        monto
    }

    pub fn abandonar_proyecto(env: Env, id_proyecto: u32) {
        let mut proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        proyecto.dueno.require_auth();
        proyecto.estado = EstadoProyecto::Abandonado;
        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);
    }

    pub fn solicitar_continuar(env: Env, nuevo_dueno: Address, id_proyecto: u32) {
        nuevo_dueno.require_auth();

        let mut proyecto: Proyecto = env
            .storage().persistent().get(&Clave::Proyecto(id_proyecto))
            .expect("Proyecto no existe");

        assert!(
            proyecto.estado == EstadoProyecto::Abandonado,
            "Solo puedes continuar proyectos abandonados"
        );

        proyecto.dueno = nuevo_dueno;
        proyecto.estado = if proyecto.total_aportado > 0 {
            EstadoProyecto::EnProgreso
        } else {
            EstadoProyecto::EtapaInicial
        };

        env.storage().persistent().set(&Clave::Proyecto(id_proyecto), &proyecto);
    }

    /// El admin aprueba un proyecto en revisión → pasa a EtapaInicial (visible al público)
    pub fn admin_aprobar(env: Env, id_proyecto: u32) {
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

    /// El admin rechaza un proyecto en revisión con un motivo
    pub fn admin_rechazar(env: Env, id_proyecto: u32, motivo: String) {
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

// ============================================================
//  TESTS
// ============================================================

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::StellarAssetClient,
        BytesN, Env, String,
    };

    fn doc_hash_vacio(env: &Env) -> BytesN<32> {
        BytesN::from_array(env, &[0u8; 32])
    }

    fn crear_env_con_token() -> (Env, BimexContratoClient<'static>, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|l| l.timestamp = 0);

        let admin = Address::generate(&env);
        let dueno = Address::generate(&env);
        let backer = Address::generate(&env);

        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_mxne = token_id.address();

        let asset_client = StellarAssetClient::new(&env, &token_mxne);
        asset_client.mint(&backer, &1_000_000_000i128);

        let contrato_id = env.register(BimexContrato, ());
        let cliente = BimexContratoClient::new(&env, &contrato_id);
        // Fondos suficientes para cubrir el yield con tasas demo elevadas
        asset_client.mint(&contrato_id, &100_000_000_000i128);

        // yield_cetes_bps=5000000, yield_amm_bps=2000000 (~10 MXNe/min por cada 16K invertidos)
        cliente.inicializar(&admin, &token_mxne, &5000000u32, &2000000u32);
        (env, cliente, admin, dueno, backer, token_mxne)
    }

    #[test]
    fn test_flujo_completo() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|l| l.timestamp = 0);

        let admin  = Address::generate(&env);
        let dueno  = Address::generate(&env);
        let backer = Address::generate(&env);

        let token_admin = Address::generate(&env);
        let token_id    = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_mxne  = token_id.address();

        let asset = StellarAssetClient::new(&env, &token_mxne);
        // El backer tiene 500M; el contrato tiene 100B para cubrir yield elevado
        asset.mint(&backer, &500_000_000i128);

        let contrato_id = env.register(BimexContrato, ());
        let cliente = BimexContratoClient::new(&env, &contrato_id);
        asset.mint(&contrato_id, &100_000_000_000i128);

        cliente.inicializar(&admin, &token_mxne, &5000000u32, &2000000u32);

        // Paso 1 — crear proyecto con meta = 200M
        let doc_hash = BytesN::from_array(&env, &[0u8; 32]);
        let id = cliente.crear_proyecto(
            &dueno,
            &String::from_str(&env, "Huerto comunitario CDMX"),
            &200_000_000i128,
            &doc_hash,
        );
        assert_eq!(id, 0);
        assert_eq!(cliente.obtener_proyecto(&id).estado, EstadoProyecto::EnRevision);
        // Admin aprueba → EtapaInicial
        cliente.admin_aprobar(&id);
        assert_eq!(cliente.obtener_proyecto(&id).estado, EstadoProyecto::EtapaInicial);

        // Paso 2 — backer contribuye 100M → EnProgreso
        cliente.contribuir(&backer, &id, &100_000_000i128);
        let p = cliente.obtener_proyecto(&id);
        assert_eq!(p.total_aportado, 100_000_000i128);
        assert_eq!(p.estado, EstadoProyecto::EnProgreso);
        assert_eq!(p.capital_en_cetes, 50_000_000i128);
        assert_eq!(p.capital_en_amm,   50_000_000i128);

        // Paso 3 — avanzar 30 min y verificar yield_detallado
        env.ledger().with_mut(|l| l.timestamp = 30 * 60);

        // yield_cetes = 50M * 5000000 * 30 / 10_000 / 525_600 = 1_426_940
        // yield_amm   = 50M * 2000000 * 30 / 10_000 / 525_600 = 570_776
        let detalle = cliente.calcular_yield_detallado(&id);
        assert_eq!(detalle.cetes, 1_426_940i128);
        assert_eq!(detalle.amm,   570_776i128);
        assert_eq!(detalle.total, 1_997_716i128);

        let yield_reclamado = cliente.reclamar_yield(&id);
        assert_eq!(yield_reclamado, 1_997_716i128);

        // Paso 4 — backer contribuye 100M más → total 200M = meta → Liberado
        cliente.contribuir(&backer, &id, &100_000_000i128);
        let p = cliente.obtener_proyecto(&id);
        assert_eq!(p.estado, EstadoProyecto::Liberado);

        // Paso 5 — retirar todo el principal
        let principal = cliente.retirar_principal(&backer, &id);
        assert_eq!(principal, 200_000_000i128);
        assert_eq!(cliente.obtener_proyecto(&id).total_aportado, 0);
    }

    #[test]
    fn test_estado_capital() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test capital"), &10_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.contribuir(&backer, &id, &200_000_000i128);

        let estado = cliente.estado_capital(&id);
        assert_eq!(estado.en_cetes, 100_000_000i128);
        assert_eq!(estado.en_amm,   100_000_000i128);
        assert_eq!(estado.total,    200_000_000i128);
    }

    #[test]
    fn test_abandonar_y_continuar() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Proyecto prueba"), &10_000_000i128, &doc_hash_vacio(&env));
        // Aprobar primero antes de poder abandonar
        cliente.admin_aprobar(&id);
        cliente.abandonar_proyecto(&id);

        let p = cliente.obtener_proyecto(&id);
        assert_eq!(p.estado, EstadoProyecto::Abandonado);

        cliente.solicitar_continuar(&backer, &id);

        let p = cliente.obtener_proyecto(&id);
        assert_eq!(p.estado, EstadoProyecto::EtapaInicial);
        assert_eq!(p.dueno, backer);
    }

    #[test]
    fn test_meta_alcanzada() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Meta exacta"), &100_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.contribuir(&backer, &id, &100_000_000i128);

        let p = cliente.obtener_proyecto(&id);
        assert_eq!(p.estado, EstadoProyecto::Liberado);
    }

    #[test]
    fn test_crear_multiples_proyectos() {
        let (env, cliente, _admin, dueno, _backer, _token) = crear_env_con_token();

        let id0 = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Proyecto A"), &10_000_000i128, &doc_hash_vacio(&env));
        let id1 = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Proyecto B"), &20_000_000i128, &doc_hash_vacio(&env));

        assert_eq!(id0, 0);
        assert_eq!(id1, 1);
        assert_eq!(cliente.total_proyectos(), 2);
    }

    // ── Multi-user ────────────────────────────────────────────────────────────

    #[test]
    fn test_multiple_contributors_same_project() {
        let (env, cliente, _admin, dueno, backer1, token_mxne) = crear_env_con_token();
        let backer2 = Address::generate(&env);
        let asset = StellarAssetClient::new(&env, &token_mxne);
        asset.mint(&backer2, &500_000_000i128);

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Multi backer"), &300_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);

        cliente.contribuir(&backer1, &id, &100_000_000i128);
        cliente.contribuir(&backer2, &id, &200_000_000i128);

        let p = cliente.obtener_proyecto(&id);
        assert_eq!(p.total_aportado, 300_000_000i128);
        assert_eq!(p.estado, EstadoProyecto::Liberado);

        let a1 = cliente.obtener_aportacion(&id, &backer1);
        let a2 = cliente.obtener_aportacion(&id, &backer2);
        assert_eq!(a1.cantidad, 100_000_000i128);
        assert_eq!(a2.cantidad, 200_000_000i128);
    }

    #[test]
    fn test_multiple_contributions_same_backer_accumulate() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Acumulado"), &500_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);

        cliente.contribuir(&backer, &id, &100_000_000i128);
        cliente.contribuir(&backer, &id, &150_000_000i128);

        let a = cliente.obtener_aportacion(&id, &backer);
        assert_eq!(a.cantidad, 250_000_000i128);
        assert_eq!(cliente.obtener_proyecto(&id).total_aportado, 250_000_000i128);
    }

    // ── Lifecycle edge cases ──────────────────────────────────────────────────

    #[test]
    fn test_admin_rechazar_con_motivo() {
        let (env, cliente, _admin, dueno, _backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Proyecto malo"), &10_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_rechazar(&id, &String::from_str(&env, "Documentacion incompleta"));

        let p = cliente.obtener_proyecto(&id);
        assert_eq!(p.estado, EstadoProyecto::Rechazado);
        assert_eq!(p.motivo_rechazo, String::from_str(&env, "Documentacion incompleta"));
    }

    #[test]
    fn test_solicitar_continuar_con_fondos_existentes() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();
        let nuevo_dueno = Address::generate(&env);

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Con fondos"), &500_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.contribuir(&backer, &id, &100_000_000i128);
        cliente.abandonar_proyecto(&id);

        cliente.solicitar_continuar(&nuevo_dueno, &id);

        let p = cliente.obtener_proyecto(&id);
        assert_eq!(p.estado, EstadoProyecto::EnProgreso);
        assert_eq!(p.dueno, nuevo_dueno);
    }

    #[test]
    fn test_retirar_principal_proyecto_abandonado() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Abandonado"), &500_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.contribuir(&backer, &id, &100_000_000i128);
        cliente.abandonar_proyecto(&id);

        let monto = cliente.retirar_principal(&backer, &id);
        assert_eq!(monto, 100_000_000i128);
    }

    // ── Boundary conditions ───────────────────────────────────────────────────

    #[test]
    fn test_yield_cero_sin_tiempo_transcurrido() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Sin tiempo"), &500_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.contribuir(&backer, &id, &100_000_000i128);

        // timestamp = 0, no time elapsed → yield = 0
        let yield_backer = cliente.calcular_yield(&id, &backer);
        assert_eq!(yield_backer, 0i128);

        let detalle = cliente.calcular_yield_detallado(&id);
        assert_eq!(detalle.total, 0i128);
    }

    #[test]
    fn test_capital_distribucion_impar() {
        // Odd amount: 1 unit residue goes to AMM
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Impar"), &500_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.contribuir(&backer, &id, &101i128); // odd

        let p = cliente.obtener_proyecto(&id);
        assert_eq!(p.capital_en_cetes, 50i128);
        assert_eq!(p.capital_en_amm,   51i128); // residue goes to AMM
    }

    #[test]
    fn test_retirar_todos_los_fondos_vuelve_a_etapa_inicial() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Reset"), &500_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.contribuir(&backer, &id, &100_000_000i128);
        assert_eq!(cliente.obtener_proyecto(&id).estado, EstadoProyecto::EnProgreso);

        // Liberar manualmente para poder retirar
        cliente.abandonar_proyecto(&id);
        cliente.retirar_principal(&backer, &id);

        let p = cliente.obtener_proyecto(&id);
        assert_eq!(p.total_aportado, 0i128);
        assert_eq!(p.capital_en_cetes, 0i128);
        assert_eq!(p.capital_en_amm, 0i128);
    }

    // ── Error / invalid state transitions ────────────────────────────────────

    #[test]
    #[should_panic(expected = "El proyecto no acepta fondos")]
    fn test_contribuir_proyecto_en_revision_falla() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "En revision"), &100_000_000i128, &doc_hash_vacio(&env));
        // Not approved yet → should panic
        cliente.contribuir(&backer, &id, &10_000_000i128);
    }

    #[test]
    #[should_panic(expected = "El proyecto no acepta fondos")]
    fn test_contribuir_proyecto_rechazado_falla() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Rechazado"), &100_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_rechazar(&id, &String::from_str(&env, "Fraude"));
        cliente.contribuir(&backer, &id, &10_000_000i128);
    }

    #[test]
    #[should_panic(expected = "El proyecto no acepta fondos")]
    fn test_contribuir_proyecto_liberado_falla() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Liberado"), &100_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.contribuir(&backer, &id, &100_000_000i128); // reaches meta → Liberado
        cliente.contribuir(&backer, &id, &10_000_000i128);  // should panic
    }

    #[test]
    #[should_panic(expected = "Solo puedes retirar cuando el proyecto este liberado o abandonado")]
    fn test_retirar_principal_en_progreso_falla() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "En progreso"), &500_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.contribuir(&backer, &id, &100_000_000i128);
        cliente.retirar_principal(&backer, &id); // should panic
    }

    #[test]
    #[should_panic(expected = "Solo se pueden aprobar proyectos en revision")]
    fn test_admin_aprobar_proyecto_ya_aprobado_falla() {
        let (env, cliente, _admin, dueno, _backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Doble aprobacion"), &100_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.admin_aprobar(&id); // should panic
    }

    #[test]
    #[should_panic(expected = "Solo se pueden rechazar proyectos en revision")]
    fn test_admin_rechazar_proyecto_aprobado_falla() {
        let (env, cliente, _admin, dueno, _backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Rechazar aprobado"), &100_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.admin_rechazar(&id, &String::from_str(&env, "Tarde")); // should panic
    }

    #[test]
    #[should_panic(expected = "Solo puedes continuar proyectos abandonados")]
    fn test_solicitar_continuar_proyecto_activo_falla() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Activo"), &100_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.solicitar_continuar(&backer, &id); // should panic
    }

    #[test]
    #[should_panic(expected = "Ya inicializado")]
    fn test_inicializar_dos_veces_falla() {
        let (env, cliente, admin, _dueno, _backer, token_mxne) = crear_env_con_token();
        cliente.inicializar(&admin, &token_mxne, &100u32, &100u32); // should panic
    }

    #[test]
    #[should_panic(expected = "La meta debe ser mayor a 0")]
    fn test_crear_proyecto_meta_cero_falla() {
        let (env, cliente, _admin, dueno, _backer, _token) = crear_env_con_token();
        cliente.crear_proyecto(&dueno, &String::from_str(&env, "Meta cero"), &0i128, &doc_hash_vacio(&env));
    }

    #[test]
    #[should_panic(expected = "Cantidad debe ser mayor a 0")]
    fn test_contribuir_cantidad_cero_falla() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Cero"), &100_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.contribuir(&backer, &id, &0i128);
    }

    #[test]
    #[should_panic(expected = "Aun no hay yield suficiente acumulado")]
    fn test_reclamar_yield_cero_falla() {
        let (env, cliente, _admin, dueno, backer, _token) = crear_env_con_token();

        let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Sin yield"), &500_000_000i128, &doc_hash_vacio(&env));
        cliente.admin_aprobar(&id);
        cliente.contribuir(&backer, &id, &100_000_000i128);
        // timestamp = 0 → yield = 0 → should panic
        cliente.reclamar_yield(&id);
    }
}
