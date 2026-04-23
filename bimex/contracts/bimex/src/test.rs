use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::StellarAssetClient,
    BytesN, Env, String,
};

fn doc_hash_vacio(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[0u8; 32])
}

fn setup() -> (Env, BimexContratoClient<'static>, Address, Address, Address) {
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
    asset.mint(&backer, &1_000_000_000i128);

    let contrato_id = env.register(BimexContrato, ());
    let cliente     = BimexContratoClient::new(&env, &contrato_id);
    asset.mint(&contrato_id, &100_000_000_000i128);

    cliente.inicializar(&admin, &token_mxne, &5_000_000u32, &2_000_000u32);
    (env, cliente, admin, dueno, backer)
}

// ============================================================
//  EXISTING TESTS
// ============================================================

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
    asset.mint(&backer, &500_000_000i128);

    let contrato_id = env.register(BimexContrato, ());
    let cliente     = BimexContratoClient::new(&env, &contrato_id);
    asset.mint(&contrato_id, &100_000_000_000i128);

    cliente.inicializar(&admin, &token_mxne, &5_000_000u32, &2_000_000u32);

    let id = cliente.crear_proyecto(
        &dueno,
        &String::from_str(&env, "Huerto comunitario CDMX"),
        &200_000_000i128,
        &BytesN::from_array(&env, &[0u8; 32]),
    );
    assert_eq!(id, 0);
    assert_eq!(cliente.obtener_proyecto(&id).estado, EstadoProyecto::EnRevision);

    cliente.admin_aprobar(&id);
    assert_eq!(cliente.obtener_proyecto(&id).estado, EstadoProyecto::EtapaInicial);

    cliente.contribuir(&backer, &id, &100_000_000i128);
    let p = cliente.obtener_proyecto(&id);
    assert_eq!(p.total_aportado,   100_000_000i128);
    assert_eq!(p.estado,           EstadoProyecto::EnProgreso);
    assert_eq!(p.capital_en_cetes,  50_000_000i128);
    assert_eq!(p.capital_en_amm,    50_000_000i128);

    env.ledger().with_mut(|l| l.timestamp = 30 * 60);

    let detalle = cliente.calcular_yield_detallado(&id);
    assert!(detalle.cetes > 0);
    assert!(detalle.amm   > 0);
    assert_eq!(detalle.total, detalle.cetes + detalle.amm);

    let yield_reclamado = cliente.reclamar_yield(&id);
    assert_eq!(yield_reclamado, detalle.total);

    cliente.contribuir(&backer, &id, &100_000_000i128);
    assert_eq!(cliente.obtener_proyecto(&id).estado, EstadoProyecto::Liberado);

    let principal = cliente.retirar_principal(&backer, &id);
    assert_eq!(principal, 200_000_000i128);
    assert_eq!(cliente.obtener_proyecto(&id).total_aportado, 0);
}

#[test]
fn test_estado_capital() {
    let (env, cliente, _admin, dueno, backer) = setup();

    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test capital"), &10_000_000i128, &doc_hash_vacio(&env));
    cliente.admin_aprobar(&id);
    // Overfunding cap: only 10M accepted even though 200M sent
    cliente.contribuir(&backer, &id, &200_000_000i128);

    let estado = cliente.estado_capital(&id);
    assert_eq!(estado.en_cetes, 5_000_000i128);
    assert_eq!(estado.en_amm,   5_000_000i128);
    assert_eq!(estado.total,   10_000_000i128);
}

#[test]
fn test_abandonar_y_continuar() {
    let (env, cliente, _admin, dueno, backer) = setup();

    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Proyecto prueba"), &10_000_000i128, &doc_hash_vacio(&env));
    cliente.admin_aprobar(&id);
    cliente.abandonar_proyecto(&id);

    assert_eq!(cliente.obtener_proyecto(&id).estado, EstadoProyecto::Abandonado);

    cliente.solicitar_continuar(&backer, &id);

    let p = cliente.obtener_proyecto(&id);
    assert_eq!(p.estado, EstadoProyecto::EtapaInicial);
    assert_eq!(p.dueno,  backer);
}

#[test]
fn test_meta_alcanzada() {
    let (env, cliente, _admin, dueno, backer) = setup();

    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Meta exacta"), &100_000_000i128, &doc_hash_vacio(&env));
    cliente.admin_aprobar(&id);
    cliente.contribuir(&backer, &id, &100_000_000i128);

    assert_eq!(cliente.obtener_proyecto(&id).estado, EstadoProyecto::Liberado);
}

#[test]
fn test_crear_multiples_proyectos() {
    let (env, cliente, _admin, dueno, _backer) = setup();

    let id0 = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Proyecto A"), &10_000_000i128, &doc_hash_vacio(&env));
    let id1 = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Proyecto B"), &20_000_000i128, &doc_hash_vacio(&env));

    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
    assert_eq!(cliente.total_proyectos(), 2);
}

// ============================================================
//  VULNERABILITY-SPECIFIC TESTS
// ============================================================

/// VUL-01: reclamar_yield must be blocked on non-active states
#[test]
#[should_panic(expected = "El proyecto no esta activo")]
fn test_vul01_yield_bloqueado_en_revision() {
    let (env, cliente, _admin, dueno, _backer) = setup();
    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test"), &10_000_000i128, &doc_hash_vacio(&env));
    // Project is EnRevision — yield claim must panic
    env.ledger().with_mut(|l| l.timestamp = 525_600 * 60); // 1 year
    cliente.reclamar_yield(&id);
}

/// VUL-01b: reclamar_yield must be blocked on Rechazado state
#[test]
#[should_panic(expected = "El proyecto no esta activo")]
fn test_vul01b_yield_bloqueado_rechazado() {
    let (env, cliente, admin, dueno, _backer) = setup();
    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test"), &10_000_000i128, &doc_hash_vacio(&env));
    cliente.admin_rechazar(&id, &String::from_str(&env, "Documentos invalidos"));
    env.ledger().with_mut(|l| l.timestamp = 525_600 * 60);
    let _ = admin; // suppress unused warning
    cliente.reclamar_yield(&id);
}

/// VUL-01c: reclamar_yield must be blocked on Abandonado state
#[test]
#[should_panic(expected = "El proyecto no esta activo")]
fn test_vul01c_yield_bloqueado_abandonado() {
    let (env, cliente, _admin, dueno, _backer) = setup();
    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test"), &10_000_000i128, &doc_hash_vacio(&env));
    cliente.admin_aprobar(&id);
    cliente.abandonar_proyecto(&id);
    env.ledger().with_mut(|l| l.timestamp = 525_600 * 60);
    cliente.reclamar_yield(&id);
}

/// VUL-02: abandonar_proyecto must be blocked on Rechazado/EnRevision states
#[test]
#[should_panic(expected = "El proyecto no puede ser abandonado en su estado actual")]
fn test_vul02_no_abandonar_rechazado() {
    let (env, cliente, _admin, dueno, _backer) = setup();
    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test"), &10_000_000i128, &doc_hash_vacio(&env));
    cliente.admin_rechazar(&id, &String::from_str(&env, "Motivo"));
    cliente.abandonar_proyecto(&id);
}

/// VUL-02b: abandonar_proyecto must be blocked on EnRevision state
#[test]
#[should_panic(expected = "El proyecto no puede ser abandonado en su estado actual")]
fn test_vul02b_no_abandonar_en_revision() {
    let (env, cliente, _admin, dueno, _backer) = setup();
    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test"), &10_000_000i128, &doc_hash_vacio(&env));
    // Still EnRevision — must not be abandonable
    cliente.abandonar_proyecto(&id);
}

/// VUL-03: overfunding cap — contribution must be capped at meta
#[test]
fn test_vul03_overfunding_cap() {
    let (env, cliente, _admin, dueno, backer) = setup();
    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test"), &50_000_000i128, &doc_hash_vacio(&env));
    cliente.admin_aprobar(&id);
    // Send 3x the meta
    cliente.contribuir(&backer, &id, &150_000_000i128);

    let p = cliente.obtener_proyecto(&id);
    assert_eq!(p.total_aportado, 50_000_000i128); // capped at meta
    assert_eq!(p.estado, EstadoProyecto::Liberado);
}

/// VUL-04: yield clock must not reset on top-up contribution
#[test]
fn test_vul04_timestamp_preservado_en_topup() {
    let (env, cliente, _admin, dueno, backer) = setup();
    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test"), &200_000_000i128, &doc_hash_vacio(&env));
    cliente.admin_aprobar(&id);

    // First contribution at t=0
    cliente.contribuir(&backer, &id, &50_000_000i128);
    let ts_original = cliente.obtener_aportacion(&id, &backer).timestamp;
    assert_eq!(ts_original, 0);

    // Top-up at t=60s — timestamp must remain 0
    env.ledger().with_mut(|l| l.timestamp = 60);
    cliente.contribuir(&backer, &id, &50_000_000i128);
    let ts_despues = cliente.obtener_aportacion(&id, &backer).timestamp;
    assert_eq!(ts_despues, 0); // must not have been reset to 60
}

/// VUL-05: yield bps bounds enforced
#[test]
#[should_panic(expected = "yield_cetes_bps excede el maximo")]
fn test_vul05_yield_bps_cetes_excede_maximo() {
    let env = Env::default();
    env.mock_all_auths();

    let admin      = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_id   = env.register_stellar_asset_contract_v2(token_admin);
    let token_mxne = token_id.address();

    let contrato_id = env.register(BimexContrato, ());
    let cliente     = BimexContratoClient::new(&env, &contrato_id);

    cliente.inicializar(&admin, &token_mxne, &10_000_001u32, &1000u32);
}

/// VUL-05b: yield amm bps bounds enforced
#[test]
#[should_panic(expected = "yield_amm_bps excede el maximo")]
fn test_vul05b_yield_bps_amm_excede_maximo() {
    let env = Env::default();
    env.mock_all_auths();

    let admin      = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_id   = env.register_stellar_asset_contract_v2(token_admin);
    let token_mxne = token_id.address();

    let contrato_id = env.register(BimexContrato, ());
    let cliente     = BimexContratoClient::new(&env, &contrato_id);

    cliente.inicializar(&admin, &token_mxne, &1000u32, &10_000_001u32);
}

/// VUL-06: solicitar_continuar resets yield clock for new owner
#[test]
fn test_vul06_continuar_resetea_timestamp() {
    let (env, cliente, _admin, dueno, backer) = setup();
    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test"), &10_000_000i128, &doc_hash_vacio(&env));
    cliente.admin_aprobar(&id);

    // Advance time significantly before takeover
    env.ledger().with_mut(|l| l.timestamp = 525_600 * 60); // 1 year
    cliente.abandonar_proyecto(&id);

    let nuevo_dueno = Address::generate(&env);
    cliente.solicitar_continuar(&nuevo_dueno, &id);

    // timestamp_inicio must be reset to now (1 year mark), not original 0
    let p = cliente.obtener_proyecto(&id);
    assert_eq!(p.timestamp_inicio, 525_600 * 60);
}

/// VUL-07: double withdrawal prevented — second retirar_principal must panic
#[test]
#[should_panic(expected = "No tienes aportacion en este proyecto")]
fn test_vul07_no_doble_retiro() {
    let (env, cliente, _admin, dueno, backer) = setup();
    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test"), &100_000_000i128, &doc_hash_vacio(&env));
    cliente.admin_aprobar(&id);
    cliente.contribuir(&backer, &id, &100_000_000i128);

    assert_eq!(cliente.obtener_proyecto(&id).estado, EstadoProyecto::Liberado);

    cliente.retirar_principal(&backer, &id);
    // Second call must panic — aportacion was removed
    cliente.retirar_principal(&backer, &id);
}

/// VUL-08: contribuir rejected on non-active states (EnRevision)
#[test]
#[should_panic(expected = "El proyecto no acepta fondos")]
fn test_vul08_no_contribuir_en_revision() {
    let (env, cliente, _admin, dueno, backer) = setup();
    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test"), &100_000_000i128, &doc_hash_vacio(&env));
    // Not approved yet — must reject contribution
    cliente.contribuir(&backer, &id, &10_000_000i128);
}

/// VUL-09: retirar_principal rejected on EnProgreso state
#[test]
#[should_panic(expected = "Solo puedes retirar cuando el proyecto este liberado o abandonado")]
fn test_vul09_no_retirar_en_progreso() {
    let (env, cliente, _admin, dueno, backer) = setup();
    let id = cliente.crear_proyecto(&dueno, &String::from_str(&env, "Test"), &200_000_000i128, &doc_hash_vacio(&env));
    cliente.admin_aprobar(&id);
    cliente.contribuir(&backer, &id, &50_000_000i128);

    assert_eq!(cliente.obtener_proyecto(&id).estado, EstadoProyecto::EnProgreso);
    // Must not allow withdrawal while project is still in progress
    cliente.retirar_principal(&backer, &id);
}
