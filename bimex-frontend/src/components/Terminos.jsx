import { useTranslation } from "react-i18next";

export default function Terminos({ onVolver }) {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
      <button
        onClick={onVolver}
        className="btn btn-ghost"
        style={{ fontSize: "0.84rem", marginBottom: 24 }}
        aria-label={t("terminos.backAria")}
      >
        ← {t("terminos.back")}
      </button>

      <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--navy)", marginBottom: 8 }}>
        {t("terminos.title")}
      </h1>
      <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 32 }}>
        {t("terminos.updated")}
      </p>

      <Section title={t("terminos.s1Title")} text={t("terminos.s1Body")} />
      <Section title={t("terminos.s2Title")} text={t("terminos.s2Body")} />
      <Section title={t("terminos.s3Title")} text={t("terminos.s3Body")} />
      <Section title={t("terminos.s4Title")} text={t("terminos.s4Body")} />
      <Section title={t("terminos.s5Title")} text={t("terminos.s5Body")} />
      <Section title={t("terminos.s6Title")} text={t("terminos.s6Body")} />
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
