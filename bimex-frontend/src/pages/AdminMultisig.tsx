import { useState } from "react";
import { useMultisigProposal } from "../hooks/useMultisigProposal"; // se crea en el Paso 3

// Panel mínimo que guía el flujo 2-of-3 descrito en docs/runbook-admin-multisig.md:
// 1) crear propuesta -> 2) recolectar firmas -> 3) ejecutar
const REQUIRED_SIGNATURES = 2;
const TOTAL_SIGNERS = 3;

export default function AdminMultisig() {
  const {
    proposal,
    isLoading,
    error,
    createProposal,
    signProposal,
    executeProposal,
  } = useMultisigProposal();

  const [operationType, setOperationType] = useState("");
  const [operationParams, setOperationParams] = useState("");

  const signatureCount = proposal?.signatures.length ?? 0;
  const canExecute = signatureCount >= REQUIRED_SIGNATURES;

  return (
    <div data-testid="admin-multisig-panel" className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Operaciones Admin (Multi-firma 2-of-3)</h1>

      {error && (
        <div role="alert" className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!proposal && (
        <section data-testid="create-proposal-section" className="space-y-3">
          <h2 className="font-medium">1. Crear propuesta</h2>
          <select
            value={operationType}
            onChange={(e) => setOperationType(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            data-testid="operation-type-select"
          >
            <option value="">Selecciona una operación...</option>
            {/* Se llenará con las operaciones reales del runbook en el Paso 3 */}
          </select>
          <textarea
            value={operationParams}
            onChange={(e) => setOperationParams(e.target.value)}
            placeholder="Parámetros de la operación (según runbook)"
            className="border rounded px-2 py-1 w-full"
            data-testid="operation-params-input"
          />
          <button
            onClick={() => createProposal(operationType, operationParams)}
            disabled={!operationType || isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            data-testid="create-proposal-button"
          >
            {isLoading ? "Creando..." : "Crear propuesta"}
          </button>
        </section>
      )}

      {proposal && (
        <section data-testid="proposal-status-section" className="space-y-4">
          <h2 className="font-medium">2. Estado de firmas</h2>
          <div className="flex items-center gap-2" data-testid="signature-progress">
            {Array.from({ length: TOTAL_SIGNERS }).map((_, i) => (
              <span
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  i < signatureCount ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {i < signatureCount ? "✓" : i + 1}
              </span>
            ))}
            <span className="ml-2 text-sm text-gray-600" data-testid="signature-count-label">
              {signatureCount}/{REQUIRED_SIGNATURES} firmas requeridas
            </span>
          </div>

          <div className="text-sm text-gray-700">
            <p><strong>Operación:</strong> {proposal.operationType}</p>
            <p><strong>Propuesta por:</strong> {proposal.proposedBy}</p>
            <p><strong>ID:</strong> {proposal.id}</p>
          </div>

          <button
            onClick={() => signProposal(proposal.id)}
            disabled={isLoading || proposal.alreadySignedByMe}
            className="bg-yellow-600 text-white px-4 py-2 rounded disabled:opacity-50"
            data-testid="sign-proposal-button"
          >
            {proposal.alreadySignedByMe ? "Ya firmaste" : "Firmar propuesta"}
          </button>

          <div>
            <h2 className="font-medium mt-4">3. Ejecutar</h2>
            <button
              onClick={() => executeProposal(proposal.id)}
              disabled={!canExecute || isLoading}
              className="bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
              data-testid="execute-proposal-button"
            >
              {canExecute ? "Ejecutar operación" : `Faltan ${REQUIRED_SIGNATURES - signatureCount} firma(s)`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}