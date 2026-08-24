import { describe, expect, it } from "vitest";
import { EMPTY_SLOT_TEXT, isEmptySlot } from "./emptySlot";

describe("isEmptySlot", () => {
  // Estas tres frases las escribe el adaptador y tres vistas distintas las
  // reconocen para no darles el mismo espacio que a un plan de verdad.
  it("reconoce las tres franjas vacías que genera el adaptador", () => {
    for (const texto of Object.values(EMPTY_SLOT_TEXT)) {
      expect(isEmptySlot(texto), texto).toBe(true);
    }
  });

  it("un plan de verdad no es una franja vacía", () => {
    expect(isEmptySlot("Museo Nazionale Etrusco · Mercato Italia")).toBe(false);
    expect(isEmptySlot("Llegada y traslado al alojamiento · Registro en Hotel Roma Plaza")).toBe(false);
  });

  // Si alguien se ha molestado en escribir su plan, merece verse entero
  // aunque diga poco.
  it("una edición del usuario cuenta como plan", () => {
    expect(isEmptySlot("Descansar")).toBe(false);
    expect(isEmptySlot("Nada")).toBe(false);
  });

  // El texto llega de localStorage y puede traer espacios de más.
  it("no se despista por espacios alrededor", () => {
    expect(isEmptySlot(`  ${EMPTY_SLOT_TEXT.afternoon}  `)).toBe(true);
  });

  // La trampa: alguien escribe un plan que MENCIONA la frase. Solo cuenta
  // como vacía si la frase es el final del texto, no si aparece por medio.
  it("un plan que habla de actividades programadas no es una franja vacía", () => {
    expect(isEmptySlot("Tarde sin actividades programadas. Buscar algo por el barrio")).toBe(false);
  });
});
