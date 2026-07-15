import { describe, it, expect } from "vitest";
import {
  QrStylePolicy,
  DEFAULT_QR_STYLE,
  QR_DOT_STYLES,
  QR_CORNER_STYLES,
} from "@/domain/restaurant/QrStylePolicy";

const validInput = {
  darkColor: "#0f2a44",
  lightColor: "#fdf6ef",
  dotsStyle: "rounded",
  cornersStyle: "square",
};

describe("QrStylePolicy.normalize", () => {
  it("normalise et lowercase les couleurs d'un style valide", () => {
    const style = QrStylePolicy.normalize({ ...validInput, darkColor: "#0F2A44" });
    expect(style).toEqual({
      darkColor: "#0f2a44",
      lightColor: "#fdf6ef",
      dotsStyle: "rounded",
      cornersStyle: "square",
    });
  });

  it("accepte le style par défaut (noir sur blanc, carré)", () => {
    expect(QrStylePolicy.normalize({ ...DEFAULT_QR_STYLE })).toEqual(DEFAULT_QR_STYLE);
  });

  it("throw invalid_brand_color sur un hex malformé", () => {
    expect(() => QrStylePolicy.normalize({ ...validInput, darkColor: "#zzz" })).toThrowError(
      expect.objectContaining({ name: "DomainError", code: "invalid_brand_color" }),
    );
  });

  it("throw invalid_qr_style sur un style de points hors énumération", () => {
    expect(() => QrStylePolicy.normalize({ ...validInput, dotsStyle: "sparkles" })).toThrowError(
      expect.objectContaining({ name: "DomainError", code: "invalid_qr_style" }),
    );
  });

  it("throw invalid_qr_style sur un style de coins hors énumération", () => {
    expect(() => QrStylePolicy.normalize({ ...validInput, cornersStyle: "triangle" })).toThrowError(
      expect.objectContaining({ name: "DomainError", code: "invalid_qr_style" }),
    );
  });

  it("rejette un code inversé (modules plus clairs que le fond) même à fort contraste", () => {
    expect(() =>
      QrStylePolicy.normalize({ ...validInput, darkColor: "#ffffff", lightColor: "#000000" }),
    ).toThrowError(expect.objectContaining({ name: "DomainError", code: "invalid_qr_style" }));
  });

  it("throw qr_low_contrast quand modules/fond sont trop proches", () => {
    // cuivre (#b87333) sur blanc ≈ 2.8:1 < 4.5:1
    expect(() =>
      QrStylePolicy.normalize({ ...validInput, darkColor: "#b87333", lightColor: "#ffffff" }),
    ).toThrowError(expect.objectContaining({ name: "DomainError", code: "qr_low_contrast" }));
  });

  it("accepte tous les styles curés énumérés", () => {
    for (const dotsStyle of QR_DOT_STYLES) {
      for (const cornersStyle of QR_CORNER_STYLES) {
        expect(() =>
          QrStylePolicy.normalize({ ...validInput, dotsStyle, cornersStyle }),
        ).not.toThrow();
      }
    }
  });
});

describe("QrStylePolicy.isScannable", () => {
  it("true pour un couple sombre-sur-clair contrasté", () => {
    expect(QrStylePolicy.isScannable("#0f2a44", "#fdf6ef")).toBe(true);
  });

  it("false sur un hex partiel/malformé (saisie en cours)", () => {
    expect(QrStylePolicy.isScannable("#0f", "#ffffff")).toBe(false);
  });

  it("false sur un code inversé", () => {
    expect(QrStylePolicy.isScannable("#ffffff", "#000000")).toBe(false);
  });

  it("false sous le plancher de contraste", () => {
    expect(QrStylePolicy.isScannable("#b87333", "#ffffff")).toBe(false);
  });
});
