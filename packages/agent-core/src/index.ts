import { MockProvider } from "./providers/mock-provider.js";
import { RealProvider } from "./providers/real-provider.js";
import type { Provider, ProviderConfig } from "./types.js";

export function createProvider(config: ProviderConfig): Provider {
  if (config.mode === "real") {
    return new RealProvider(config);
  }
  return new MockProvider();
}

export * from "./types.js";
export * from "./pipeline/pipeline.js";
export * from "./pipeline/heuristics.js";
