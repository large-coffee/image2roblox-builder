import type { Provider, ProviderConfig, StageGenerationRequest, StageGenerationResult } from "../types.js";

export class RealProvider implements Provider {
  readonly name = "RealProvider";

  readonly mode = "real" as const;

  constructor(private readonly config: ProviderConfig) {}

  async generate<TInput, TOutput>(
    _request: StageGenerationRequest<TInput, TOutput>
  ): Promise<StageGenerationResult<TOutput>> {
    const key = this.config.apiKey ?? process.env.OPENAI_API_KEY;

    if (!key) {
      throw new Error("Real provider is not configured. Add an API key and model settings.");
    }

    throw new Error("Real provider integration is scaffolded but not yet implemented.");
  }
}
