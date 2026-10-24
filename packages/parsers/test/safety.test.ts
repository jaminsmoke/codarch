import { describe, expect, it } from "vitest";
import { protectedRootReason } from "../src/safety";

const windows = { platform: "win32" as const, home: "C:\\Users\\ana" };
const linux = { platform: "linux" as const, home: "/home/ana" };
const mac = { platform: "darwin" as const, home: "/Users/ana" };

describe("las rutas que no se analizan", () => {
  it("rechaza el sistema de ficheros entero", () => {
    expect(protectedRootReason("C:\\", windows)).toBe(
      "la raíz del sistema de ficheros"
    );
    expect(protectedRootReason("/", linux)).toBe(
      "la raíz del sistema de ficheros"
    );
  });

  it("rechaza las carpetas del sistema en Windows", () => {
    for (const root of [
      "C:\\Windows",
      "C:\\Windows\\System32",
      "c:\\windows\\system32",
      "C:\\Program Files\\Algo",
      "C:\\ProgramData"
    ]) {
      expect(protectedRootReason(root, windows)).not.toBeNull();
    }
  });

  it("rechaza las carpetas del sistema en Linux y macOS", () => {
    for (const root of ["/etc", "/usr/lib", "/proc/1", "/var/log"]) {
      expect(protectedRootReason(root, linux)).not.toBeNull();
    }
    for (const root of ["/System", "/Library", "/private/var", "/Applications"]) {
      expect(protectedRootReason(root, mac)).not.toBeNull();
    }
  });

  it("rechaza la carpeta personal entera, pero no sus proyectos", () => {
    expect(protectedRootReason("C:\\Users\\ana", windows)).toBe(
      "tu carpeta personal entera"
    );
    expect(
      protectedRootReason("C:\\Users\\ana\\proyectos\\app", windows)
    ).toBeNull();
    expect(protectedRootReason("/home/ana", linux)).toBe(
      "tu carpeta personal entera"
    );
    expect(protectedRootReason("/home/ana/app", linux)).toBeNull();
  });

  it("deja trabajar en carpetas normales de cualquier volumen", () => {
    expect(protectedRootReason("D:\\repos\\app", windows)).toBeNull();
    expect(protectedRootReason("/srv/app", linux)).toBeNull();
    expect(protectedRootReason("/Users/ana/app", mac)).toBeNull();
  });

  it("acepta rutas protegidas extra", () => {
    expect(
      protectedRootReason("/datos/privado", {
        ...linux,
        protectedPaths: ["/datos/privado"]
      })
    ).toBe("/datos/privado");
  });
});
