import { useTranslation } from "react-i18next";

export default function AvisosLegalesMexico({ onVolver }) {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
      <button
        onClick={onVolver}
        className="btn btn-ghost"
        style={{ fontSize: "0.84rem", marginBottom: 24 }}
        aria-label={t("avisosLegalesMexico.backAria")}
      >
        {t("avisosLegalesMexico.back")}
      </button>

      <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--navy)", marginBottom: 8 }}>
        {t("avisosLegalesMexico.title")}
      </h1>
      <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 32 }}>
        {t("avisosLegalesMexico.updated")}
      </p>

      <WarningBox
        title={t("avisosLegalesMexico.riskWarningTitle")}
        content={t("avisosLegalesMexico.riskWarningBody")}
        color="#DC2626"
      />

      <WarningBox
        title={t("avisosLegalesMexico.regulatoryTitle")}
        content={t("avisosLegalesMexico.regulatoryBody")}
        color="#D97706"
      />

      <WarningBox
        title={t("avisosLegalesMexico.taxTitle")}
        content={t("avisosLegalesMexico.taxBody")}
        color="#1E40AF"
      />

      {/* SECCIONES ADICIONALES */}
      <Section
        title={t("avisosLegalesMexico.s1Title")}
        text={t("avisosLegalesMexico.s1Body")}
      />

      <Section
        title={t("avisosLegalesMexico.s2Title")}
        text={t("avisosLegalesMexico.s2Body")}
      />

      <Section
        title={t("avisosLegalesMexico.s3Title")}
        text={t("avisosLegalesMexico.s3Body")}
      />

      <Section
        title={t("avisosLegalesMexico.s4Title")}
        text={t("avisosLegalesMexico.s4Body")}
      />

      <Section
        title={t("avisosLegalesMexico.s5Title")}
        text={t("avisosLegalesMexico.s5Body")}
      />

      {/* FOOTER LEGAL */}
      <div
        style={{
          marginTop: 48,
          padding: 24,
          background: "rgba(30,58,95,0.04)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          fontSize: "0.79rem",
          color: "var(--text2)",
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: 0, marginBottom: 12 }}>
          <strong>{t("avisosLegalesMexico.disclaimerTitle")}</strong>
        </p>
        <p style={{ margin: 0 }}>
          {t("avisosLegalesMexico.disclaimerBody")}
        </p>
      </div>
    </div>
  );
}

function WarningBox({ title, content, color }) {
  return (
    <div
      role="group"
      aria-label={title}
      style={{
        marginBottom: 24,
        padding: "16px 16px",
        background: `${color}08`,
        border: `2px solid ${color}30`,
        borderRadius: "var(--radius-md)",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <h2
        style={{
          fontSize: "0.95rem",
          fontWeight: 700,
          color: color,
          margin: "0 0 8px 0",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: "0.84rem",
          color: "var(--text2)",
          margin: 0,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        {content}
      </p>
    </div>
  );
}

function Section({ title, text }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h3
        style={{
          fontSize: "0.95rem",
          fontWeight: 600,
          color: "var(--text)",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "0.84rem",
          color: "var(--text2)",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          margin: 0,
        }}
      >
        {text}
      </p>
    </section>
  );
}
