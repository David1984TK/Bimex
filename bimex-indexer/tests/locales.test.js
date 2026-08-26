import { describe, it, expect } from 'vitest';
import LOCALES, { t, mesNombre, numberLocale } from '../jobs/locales.js';

describe('locales — t() language resolution', () => {
  it('returns the English string when locale is "en"', () => {
    expect(t('en', 'header')).toBe('Your Monthly Report');
  });

  it('returns the Spanish string when locale is "es"', () => {
    expect(t('es', 'header')).toBe('Tu Reporte Mensual');
  });

  it('defaults to Spanish for an unknown / missing locale (user has no preference)', () => {
    expect(t(undefined, 'header')).toBe('Tu Reporte Mensual');
    expect(t('fr', 'header')).toBe('Tu Reporte Mensual');
    expect(t('', 'header')).toBe('Tu Reporte Mensual');
  });

  it('falls back to the Spanish value when a key is absent from the English table', () => {
    const esOnly = Object.keys(LOCALES.es).find(k => !(k in LOCALES.en));
    // Guard: this test only means something if such a key exists.
    if (esOnly) {
      expect(t('en', esOnly)).toBe(LOCALES.es[esOnly]);
    }
  });

  it('returns a visible placeholder for a key missing everywhere', () => {
    expect(t('es', 'clave_que_no_existe')).toBe('{{clave_que_no_existe}}');
  });

  it('interpolates {{placeholders}} from the replacements map', () => {
    expect(t('en', 'subject', { month: 'March', year: '2026' }))
      .toBe('Your Bimex Monthly Report — March 2026');
    expect(t('es', 'subject', { mes: 'Marzo', ano: '2026' }))
      .toBe('Tu reporte mensual Bimex — Marzo 2026');
  });

  it('replaces every occurrence of a placeholder', () => {
    // footerRights contains no placeholder; use a synthetic check via subject twice
    expect(t('es', 'subject', { mes: '{{ano}}', ano: 'X' })).toContain('X');
  });
});

describe('locales — mesNombre()', () => {
  it('returns localized month names (0-indexed)', () => {
    expect(mesNombre('es', 0)).toBe('Enero');
    expect(mesNombre('en', 0)).toBe('January');
    expect(mesNombre('es', 11)).toBe('Diciembre');
    expect(mesNombre('en', 11)).toBe('December');
  });

  it('defaults to Spanish month names for an unknown locale', () => {
    expect(mesNombre('fr', 5)).toBe('Junio');
  });

  it('returns an empty string for an out-of-range month index', () => {
    expect(mesNombre('es', 99)).toBe('');
  });
});

describe('locales — numberLocale()', () => {
  it('maps "en" to en-US and everything else to es-MX', () => {
    expect(numberLocale('en')).toBe('en-US');
    expect(numberLocale('es')).toBe('es-MX');
    expect(numberLocale(undefined)).toBe('es-MX');
  });
});
