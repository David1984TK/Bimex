import { useTranslation } from "react-i18next";

export default function Privacidad({ onVolver }) {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
      <button
        onClick={onVolver}
        className="btn btn-ghost"
        style={{ fontSize: "0.84rem", marginBottom: 24 }}
        aria-label={t("privacidad.backAria")}
      >
        ← {t("privacidad.back")}
      </button>

      <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--navy)", marginBottom: 8 }}>
        {t("privacidad.title")}
      </h1>
      <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 32 }}>
        {t("privacidad.updated")}
      </p>

      <Section title={t("privacidad.s1Title")} text={t("privacidad.s1Body")} />
      <Section title={t("privacidad.s2Title")} text={t("privacidad.s2Body")} />
      <Section title={t("privacidad.s3Title")} text={t("privacidad.s3Body")} />
      <Section title={t("privacidad.s4Title")} text={t("privacidad.s4Body")} />
      <Section title={t("privacidad.s5Title")} text={t("privacidad.s5Body")} />
    </div>
  );
}

function Section({ title, text }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
        {title}
      </h2>
      <p style={{ fontSize: "0.88rem", color: "var(--text2)", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>
        {text}
      </p>
    </section>
  );
}
