import { KvAdapter } from "../kv";
import {
  OpenRouterModel,
  OpenRouterModelsResponse,
  CachedFreeModel,
  ModelRegistryCache,
} from "./types";
import {
  OPENROUTER_BASE_URL,
  MODEL_REGISTRY_KV_KEY,
  MODEL_REGISTRY_TTL_HOURS,
  FALLBACK_MODEL,
  MODEL_SCORING,
} from "./constants";

/**
 * Fetches all available models from OpenRouter API
 */
async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/models`);
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as OpenRouterModelsResponse;
  return data.data;
}

/**
 * Filters models to only include free ones
 */
function filterFreeModels(models: OpenRouterModel[]): OpenRouterModel[] {
  return models.filter((model) => {
    const promptPrice = parseFloat(model.pricing?.prompt || "1");
    const completionPrice = parseFloat(model.pricing?.completion || "1");
    return promptPrice === 0 && completionPrice === 0;
  });
}

/**
 * Calculates a ranking score for a model
 * Higher score = better model for our use case
 */
function calculateModelScore(model: OpenRouterModel): number {
  let score = 0;

  // Coder models get highest priority
  const isCoder = model.id.toLowerCase().includes("coder");
  if (isCoder) {
    score += MODEL_SCORING.CODER_BONUS;
  }

  // Models with tool support are preferred
  const supportsTools = model.supported_parameters?.includes("tools") ?? false;
  if (supportsTools) {
    score += MODEL_SCORING.TOOLS_BONUS;
  }

  // Context length bonus (points per 100k)
  const contextLength = model.context_length || 0;
  score += Math.floor(contextLength / 100000) * MODEL_SCORING.CONTEXT_POINTS_PER_100K;

  return score;
}

/**
 * Transforms an OpenRouter model into our cached format
 */
function transformToCachedModel(model: OpenRouterModel): CachedFreeModel {
  return {
    id: model.id,
    name: model.name,
    context_length: model.context_length,
    max_completion_tokens: model.top_provider?.max_completion_tokens ?? 4096,
    supports_tools: model.supported_parameters?.includes("tools") ?? false,
    is_coder: model.id.toLowerCase().includes("coder"),
    score: calculateModelScore(model),
  };
}

/**
 * Checks if the cache is still valid
 */
function isCacheValid(cache: ModelRegistryCache): boolean {
  const lastSynced = new Date(cache.last_synced);
  const now = new Date();
  const hoursSinceSync = (now.getTime() - lastSynced.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync < cache.ttl_hours;
}

/**
 * Model Registry - manages free model discovery, caching, and selection
 */
export class ModelRegistry {
  private kv: KvAdapter;
  private cachedModels: CachedFreeModel[] | null = null;

  constructor(kv: KvAdapter) {
    this.kv = kv;
  }

  /**
   * Gets the best available free model, refreshing cache if needed
   */
  async getBestModel(): Promise<string> {
    const models = await this.getModels();
    if (models.length === 0) {
      console.warn("[ModelRegistry] No free models available, using fallback");
      return FALLBACK_MODEL;
    }
    return models[0].id;
  }

  /**
   * Gets a specific type of model (e.g., coder, tools-capable)
   */
  async getModelByCapability(options: {
    requireTools?: boolean;
    preferCoder?: boolean;
    minContextLength?: number;
  }): Promise<string> {
    const models = await this.getModels();
    
    let filtered = models;

    if (options.requireTools) {
      filtered = filtered.filter((m) => m.supports_tools);
    }

    if (options.minContextLength !== undefined) {
      const minCtx = options.minContextLength;
      filtered = filtered.filter((m) => m.context_length >= minCtx);
    }

    if (options.preferCoder) {
      const coderModels = filtered.filter((m) => m.is_coder);
      if (coderModels.length > 0) {
        filtered = coderModels;
      }
    }

    if (filtered.length === 0) {
      console.warn("[ModelRegistry] No models match criteria, using best available");
      return models.length > 0 ? models[0].id : FALLBACK_MODEL;
    }

    return filtered[0].id;
  }

  /**
   * Gets all cached free models, sorted by score descending
   */
  async getModels(): Promise<CachedFreeModel[]> {
    // Return in-memory cache if available
    if (this.cachedModels) {
      return this.cachedModels;
    }

    // Try to load from KV cache
    const kvCache = await this.loadFromKv();
    if (kvCache && isCacheValid(kvCache)) {
      this.cachedModels = kvCache.models;
      console.log(`[ModelRegistry] Loaded ${kvCache.models.length} models from cache`);
      return this.cachedModels;
    }

    // Refresh from API
    return this.refresh();
  }

  /**
   * Forces a refresh of the model registry from OpenRouter API
   */
  async refresh(): Promise<CachedFreeModel[]> {
    console.log("[ModelRegistry] Refreshing free models from OpenRouter...");
    
    try {
      const allModels = await fetchOpenRouterModels();
      const freeModels = filterFreeModels(allModels);
      
      // Transform and filter by minimum context length
      const cachedModels = freeModels
        .map(transformToCachedModel)
        .filter((m) => m.context_length >= MODEL_SCORING.MIN_CONTEXT_LENGTH)
        .sort((a, b) => b.score - a.score);

      // Save to KV
      const cache: ModelRegistryCache = {
        models: cachedModels,
        last_synced: new Date().toISOString(),
        ttl_hours: MODEL_REGISTRY_TTL_HOURS,
      };
      await this.saveToKv(cache);

      // Update in-memory cache
      this.cachedModels = cachedModels;
      
      console.log(`[ModelRegistry] Cached ${cachedModels.length} free models`);
      this.logTopModels(cachedModels.slice(0, 5));
      
      return cachedModels;
    } catch (error) {
      console.error("[ModelRegistry] Failed to refresh models", { error });
      
      // Return stale cache if available
      const staleCache = await this.loadFromKv();
      if (staleCache) {
        console.warn("[ModelRegistry] Using stale cache due to refresh failure");
        this.cachedModels = staleCache.models;
        return this.cachedModels;
      }
      
      return [];
    }
  }

  /**
   * Loads the model registry from KV storage
   */
  private async loadFromKv(): Promise<ModelRegistryCache | null> {
    try {
      const result = await this.kv.get<ModelRegistryCache>(MODEL_REGISTRY_KV_KEY);
      return result.value ?? null;
    } catch (error) {
      console.warn("[ModelRegistry] Failed to load from KV", { error });
      return null;
    }
  }

  /**
   * Saves the model registry to KV storage
   */
  private async saveToKv(cache: ModelRegistryCache): Promise<void> {
    try {
      await this.kv.set(MODEL_REGISTRY_KV_KEY, cache);
    } catch (error) {
      console.error("[ModelRegistry] Failed to save to KV", { error });
    }
  }

  /**
   * Logs the top models for debugging
   */
  private logTopModels(models: CachedFreeModel[]): void {
    console.log("[ModelRegistry] Top models:");
    models.forEach((m, i) => {
      const tags = [
        m.is_coder ? "coder" : null,
        m.supports_tools ? "tools" : null,
        `${Math.round(m.context_length / 1000)}k ctx`,
      ].filter(Boolean).join(", ");
      console.log(`  ${i + 1}. ${m.id} (score: ${m.score}, ${tags})`);
    });
  }
}

/**
 * Factory function to create a ModelRegistry instance
 */
export function createModelRegistry(kv: KvAdapter): ModelRegistry {
  return new ModelRegistry(kv);
}
