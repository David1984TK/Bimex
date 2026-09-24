import { describe, it, expect } from 'vitest';
import { HITOS_FONDEO, hitosCruzados, porcentajeFondeo, payloadHito } from '../milestones.js';

describe('milestones.js — hitos de fondeo', () => {
  it('expone los umbrales 30/50/75/100', () => {
    expect(HITOS_FONDEO).toEqual([30, 50, 75, 100]);
  });

  describe('porcentajeFondeo', () => {
    it('calcula el porcentaje de la meta', () => {
      expect(porcentajeFondeo(30, 100)).toBeCloseTo(30);
      expect(porcentajeFondeo(50, 200)).toBeCloseTo(25);
    });

    it('devuelve 0 con meta inválida o cero', () => {
      expect(porcentajeFondeo(10, 0)).toBe(0);
      expect(porcentajeFondeo(10, -5)).toBe(0);
      expect(porcentajeFondeo(10, null)).toBe(0);
      expect(porcentajeFondeo(10, NaN)).toBe(0);
    });
  });

  describe('hitosCruzados', () => {
    it('notifica un hito al cruzarlo exactamente', () => {
      expect(hitosCruzados(29, 30, 100)).toEqual([30]);
      expect(hitosCruzados(99, 100, 100)).toEqual([100]);
    });

    it('no notifica cuando no se cruza ningún umbral', () => {
      expect(hitosCruzados(31, 39, 100)).toEqual([]);
      expect(hitosCruzados(10, 20, 100)).toEqual([]);
    });

    it('no notifica en el límite inferior (antes === hito)', () => {
      // 30 -> 40 no debe re-notificar el 30
      expect(hitosCruzados(30, 40, 100)).toEqual([]);
    });

    it('notifica varios hitos en un salto grande', () => {
      expect(hitosCruzados(20, 80, 100)).toEqual([30, 50, 75]);
      expect(hitosCruzados(0, 100, 100)).toEqual([30, 50, 75, 100]);
    });

    it('es idempotente por umbral: un hito ya cruzado no se repite al subir poco', () => {
      const primerSalto = hitosCruzados(25, 35, 100); // cruza 30
      const segundoSalto = hitosCruzados(35, 45, 100); // no cruza 30 ni 50
      expect(primerSalto).toEqual([30]);
      expect(segundoSalto).toEqual([]);
    });

    it('devuelve [] con datos inválidos', () => {
      expect(hitosCruzados(10, 20, 0)).toEqual([]);
      expect(hitosCruzados(10, 20, undefined)).toEqual([]);
      expect(hitosCruzados(20, 20, 100)).toEqual([]);
      expect(hitosCruzados(30, 20, 100)).toEqual([]);
    });
  });

  describe('payloadHito', () => {
    it('construye el payload con números', () => {
      expect(payloadHito(7, 50, '250', '500')).toEqual({
        proyectoId: 7,
        hito: 50,
        porcentaje: 50,
        totalAportado: 250,
        meta: 500,
      });
    });
  });
});
