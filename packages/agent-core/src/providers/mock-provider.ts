import type { Warning } from "@image2roblox/schemas";
import {
  buildAssetPlan,
  buildBuildPlan,
  buildGameplayPlan,
  buildImageAnalysis,
  buildScriptPlan,
  buildValidationReport,
  buildWorldBible
} from "../pipeline/stages.js";
import type { Provider, ProviderAttemptLog, StageGenerationRequest, StageGenerationResult } from "../types.js";

function confidenceFromPayload(payload: unknown): number {
  if (payload && typeof payload === "object" && "confidence" in payload) {
    const value = (payload as { confidence?: number }).confidence;
    if (typeof value === "number") return value;
  }
  return 0.75;
}

function warningsFromPayload(payload: unknown): Warning[] {
  if (payload && typeof payload === "object" && "warnings" in payload) {
    const value = (payload as { warnings?: Warning[] }).warnings;
    if (Array.isArray(value)) return value;
  }
  return [];
}

function buildByStage(stage: string, input: unknown): unknown {
  const payload = input as Record<string, unknown>;

  switch (stage) {
    case "image-analysis":
      return buildImageAnalysis(payload.sourceImage as never);
    case "world-bible":
      return buildWorldBible(payload.imageAnalysis as never);
    case "gameplay-plan":
      return buildGameplayPlan(payload.imageAnalysis as never, payload.worldBible as never);
    case "build-plan":
      return buildBuildPlan(payload.imageAnalysis as never, payload.worldBible as never, payload.gameplayPlan as never);
    case "asset-plan":
      return buildAssetPlan(payload.buildPlan as never);
    case "script-plan":
      return buildScriptPlan(payload.gameplayPlan as never, payload.buildPlan as never);
    case "validation-report":
      return buildValidationReport(payload as never);
    default:
      throw new Error(`Unsupported stage for mock provider: ${stage}`);
  }
}

export class MockProvider implements Provider {
  readonly name = "MockProvider";

  readonly mode = "mock" as const;

  async generate<TInput, TOutput>(
    request: StageGenerationRequest<TInput, TOutput>
  ): Promise<StageGenerationResult<TOutput>> {
    const logs: ProviderAttemptLog[] = [];
    const maxRetries = request.maxRetries ?? 2;

    let lastError: string | undefined;
    let repairs = 0;
    let repairContext: string | undefined;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
      const shouldSimulateInvalid =
        attempt === 1 &&
        Boolean((request.input as Record<string, unknown> | undefined)?.__simulateInvalidResponse);

      const stageOutput = buildByStage(request.stage, {
        ...(request.input as Record<string, unknown>),
        __repairContext: repairContext
      });
      const raw = shouldSimulateInvalid ? "{invalid-json" : JSON.stringify(stageOutput, null, 2);

      try {
        const parsedRaw = JSON.parse(raw);
        const parsed = request.schema.safeParse(parsedRaw);
        if (parsed.success) {
          logs.push({
            stage: request.stage,
            attempt,
            raw,
            parsed: true,
            repairedFromError: repairContext
          });

          return {
            data: parsed.data,
            raw,
            confidence: confidenceFromPayload(parsed.data),
            warnings: warningsFromPayload(parsed.data),
            attempts: attempt,
            repairAttempts: repairs,
            logs
          };
        }

        const parseError = parsed.error.message;
        lastError = parseError;
        logs.push({
          stage: request.stage,
          attempt,
          raw,
          parsed: false,
          parseError,
          repairedFromError: repairContext
        });

        if (attempt <= maxRetries) {
          repairs += 1;
          repairContext = `Schema repair after attempt ${attempt}: ${parseError}`;
        }
      } catch (error) {
        const parseError = error instanceof Error ? error.message : "Unknown parse error";
        lastError = parseError;
        logs.push({
          stage: request.stage,
          attempt,
          raw,
          parsed: false,
          parseError,
          repairedFromError: repairContext
        });

        if (attempt <= maxRetries) {
          repairs += 1;
          repairContext = `JSON repair after attempt ${attempt}: ${parseError}`;
        }
      }
    }

    const error = new Error(`MockProvider failed to produce valid schema output after retries: ${lastError ?? "unknown"}`) as Error & { logs?: ProviderAttemptLog[] };
    error.logs = logs;
    throw error;
  }
}

