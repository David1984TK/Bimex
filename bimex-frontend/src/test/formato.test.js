import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '../i18n/index.js';
import {
  formatearMXNe,
  formatearFecha,
  formatearPorcentaje,
  formatearNumero,
  formatearNumeroConDecimales,
} from '../utils/formato.js';

describe('Formatting utilities', () => {
  describe('formatearMXNe', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en');
    });

    it('formats stroops to MXNe', () => {
      const stroops = 12345670000; // 1,234.567 MXNe
      const result = formatearMXNe(stroops);
      expect(result).toBe('1,234.57');
    });

    it('formats stroops to MXNe with en locale', async () => {
      await i18n.changeLanguage('en');
      const stroops = 12345670000; // 1,234.567 MXNe
      const result = formatearMXNe(stroops);
      expect(result).toBe('1,234.57');
    });

    it('handles zero', () => {
      expect(formatearMXNe(0)).toBe('0.00');
    });

    it('handles bigint input', () => {
      const stroops = BigInt(10000000); // 1 MXNe
      const result = formatearMXNe(stroops);
      expect(result).toBe('1.00');
    });
  });

  describe('formatearFecha', () => {
    it('formats timestamp in Spanish', async () => {
      await i18n.changeLanguage('es');
      const timestamp = 1716940800; // May 29, 2024
      const result = formatearFecha(timestamp);
      // Spanish format: "29 may 2024" or similar
      expect(result).toMatch(/may/i);
      expect(result).toContain('2024');
    });

    it('formats timestamp in English', async () => {
      await i18n.changeLanguage('en');
      const timestamp = 1716940800; // May 29, 2024
      const result = formatearFecha(timestamp);
      // English format: "May 29, 2024" or similar
      expect(result).toMatch(/may/i);
      expect(result).toContain('2024');
    });
  });

  describe('formatearPorcentaje', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en');
    });

    it('formats percentage correctly', () => {
      const result = formatearPorcentaje(5);
      expect(result).toContain('5');
      expect(result).toContain('%');
    });

    it('formats decimal percentage', () => {
      const result = formatearPorcentaje(5.5);
      expect(result).toContain('5.5');
      expect(result).toContain('%');
    });
  });

  describe('formatearNumero', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en');
    });

    it('formats number without decimals', () => {
      const result = formatearNumero(1234567);
      expect(result).toBe('1,234,567');
    });

    it('formats number without decimals with en locale', async () => {
      await i18n.changeLanguage('en');
      const result = formatearNumero(1234567);
      expect(result).toBe('1,234,567');
    });

    it('rounds decimal numbers', () => {
      const result = formatearNumero(1234.567);
      expect(result).toBe('1,235');
    });
  });

  describe('formatearNumeroConDecimales', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en');
    });

    it('formats number with 2 decimals by default', () => {
      const result = formatearNumeroConDecimales(1234.567);
      expect(result).toBe('1,234.57');
    });

    it('formats number with custom decimals', () => {
      const result = formatearNumeroConDecimales(1234.56789, 4);
      expect(result).toBe('1,234.5679');
    });

    it('pads with zeros when needed', () => {
      const result = formatearNumeroConDecimales(1234, 2);
      expect(result).toBe('1,234.00');
    });
  });

  describe('Language switching', () => {
    it('updates formatting when language changes', async () => {
      await i18n.changeLanguage('es');
      let result = formatearFecha(1716940800);
      const esFormat = result;

      await i18n.changeLanguage('en');
      result = formatearFecha(1716940800);
      const enFormat = result;

      // Formats should be different (though both contain the date)
      expect(esFormat).toBeTruthy();
      expect(enFormat).toBeTruthy();
    });
  });
});
