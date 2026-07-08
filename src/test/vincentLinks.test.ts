import { describe, expect, it } from "vitest";
import { linkifyVincentAnswer } from "@/lib/vincentLinks";

describe("VINcent automatic answer links", () => {
  const context = {
    todos: {
      items: [{
        id: "TD-1",
        title: "Inserat veröffentlichen",
        url: "/todos?todo=TD-1",
        vehicle: "VW Golf (2021)",
        vehicleUrl: "/bestand/V-1",
        process: "P-100",
        processUrl: "/vorgaenge/P-100",
      }],
    },
    stock: [{ id: "V-1", make: "VW", model: "Golf", year: 2021, url: "/bestand/V-1" }],
  };

  it("turns mentioned VINflow data into internal Markdown links", () => {
    expect(linkifyVincentAnswer("Bitte zuerst Inserat veröffentlichen für VW Golf (2021).", context))
      .toBe("Bitte zuerst [Inserat veröffentlichen](/todos?todo=TD-1) für [VW Golf (2021)](/bestand/V-1).");
  });

  it("does not wrap text that is already a Markdown link", () => {
    expect(linkifyVincentAnswer("Schon verlinkt: [Inserat veröffentlichen](/todos?todo=TD-1)", context))
      .toBe("Schon verlinkt: [Inserat veröffentlichen](/todos?todo=TD-1)");
  });
});
