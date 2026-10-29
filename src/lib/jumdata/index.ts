import { MockJumdataProvider } from "./mock";
import { LiveJumdataProvider } from "./live";
import type { JumdataProvider } from "./types";

let provider: JumdataProvider | null = null;

export function getJumdataProvider(): JumdataProvider {
  if (provider) return provider;

  const mode = (process.env.JUMDATA_MODE ?? "mock").toLowerCase();
  if (mode === "live") {
    provider = new LiveJumdataProvider();
  } else {
    provider = new MockJumdataProvider();
  }
  return provider;
}

export * from "./types";
