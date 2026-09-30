import { useTranslation, Trans } from "react-i18next";

const SECTION_COLOR = {
  added: "var(--green)",
  improved: "var(--navy)",
  fixed: "var(--amber)",
  securityAudit: "var(--amber)",
  changed: "var(--muted)",
  upcoming: "var(--navy)",
};

export default function Changelog() {
  const { t } = useTranslation();
  const releases = t("changelog.releases", { returnObjects: true }) || [];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
        {t("changelog.title")}
      </h1>
      <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 36 }}>
        <Trans i18nKey="changelog.subtitle">
          Historial de cambios de Bimex. Formato{" "}
          <a href="https://keepachangelog.com/es/1.0.0/" target="_blank" rel="noreferrer" style={{ color: "var(--navy)" }}>
            Keep a Changelog
          </a>.
        </Trans>
      </p>

      {Array.isArray(releases) && releases.map((release) => (
        <section key={release.version || release.versionKey} style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>
              {release.versionKey === "upcoming" ? (
                <span style={{ background: "var(--navy-dim)", color: "var(--navy)", padding: "2px 10px", borderRadius: 99, fontSize: "0.82rem", fontWeight: 600 }}>
                  {t("changelog.upcoming")}
                </span>
              ) : (
                `v${release.version}`
              )}
            </h2>
            {release.date && (
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{release.date}</span>
            )}
          </div>

          {release.sections && Object.entries(release.sections).map(([sectionKey, items]) => (
            <div key={sectionKey} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: SECTION_COLOR[sectionKey] ?? "var(--muted)", marginBottom: 8 }}>
                {t(`changelog.sections.${sectionKey}`)}
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 5 }}>
                {Array.isArray(items) && items.map((item) => (
                  <li key={item} style={{ fontSize: "0.88rem", color: "var(--text2)", lineHeight: 1.6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
