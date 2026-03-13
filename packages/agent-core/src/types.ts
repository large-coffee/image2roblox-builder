import type { z } from "zod";
import type { Warning } from "@image2roblox/schemas";

export type ProviderMode = "mock" | "real";

export interface ProviderAttemptLog {
  stage: string;
  attempt: number;
  raw: string;
  parsed: boolean;
  parseError?: string;
  repairedFromError?: string;
}

export interface StageGenerationRequest<TInput, TOutput> {
  stage: string;
  prompt: string;
  input: TInput;
  schema: z.ZodType<TOutput>;
  maxRetries?: number;
}

export interface StageGenerationResult<TOutput> {
  data: TOutput;
  raw: string;
  confidence: number;
  warnings: Warning[];
  attempts: number;
  repairAttempts: number;
  logs: ProviderAttemptLog[];
}

export interface Provider {
  readonly name: string;
  readonly mode: ProviderMode;
  generate<TInput, TOutput>(request: StageGenerationRequest<TInput, TOutput>): Promise<StageGenerationResult<TOutput>>;
}

export interface ProviderConfig {
  mode: ProviderMode;
  apiKey?: string;
  model?: string;
}
