import { uid, roundWeight, clampInteger, clampNumber } from "./utils.mjs";

export function defaultPreset(name = "Hybrid 0.7 / 0.3") {
  return {
    id: uid("preset"),
    name,
    searchMethod: "hybrid_search",
    hybridMode: "weighted_score",
    vectorWeight: 0.7,
    embeddingProviderName: "",
    embeddingModelName: "",
    rerankingProviderName: "",
    rerankingModelName: "",
    topK: 3,
    scoreThresholdEnabled: false,
    scoreThreshold: 0.5,
  };
}

export function sanitizePreset(preset) {
  return {
    id: preset.id || uid("preset"),
    name: String(preset.name || "設定"),
    searchMethod: ["hybrid_search", "semantic_search", "full_text_search"].includes(preset.searchMethod)
      ? preset.searchMethod
      : "hybrid_search",
    hybridMode: ["weighted_score", "reranking_model"].includes(preset.hybridMode)
      ? preset.hybridMode
      : "weighted_score",
    vectorWeight: roundWeight(clampNumber(Number(preset.vectorWeight), 0, 1, 0.7)),
    embeddingProviderName: String(preset.embeddingProviderName || ""),
    embeddingModelName: String(preset.embeddingModelName || ""),
    rerankingProviderName: String(preset.rerankingProviderName || ""),
    rerankingModelName: String(preset.rerankingModelName || ""),
    topK: clampInteger(Number(preset.topK), 1, 50, 3),
    scoreThresholdEnabled: Boolean(preset.scoreThresholdEnabled),
    scoreThreshold: clampNumber(Number(preset.scoreThreshold), 0, 1, 0.5),
  };
}

export function buildRetrievalModel(preset) {
  const model = {
    search_method: preset.searchMethod,
    top_k: preset.topK,
    score_threshold_enabled: preset.scoreThresholdEnabled,
    score_threshold: preset.scoreThreshold,
  };

  if (preset.searchMethod !== "hybrid_search") {
    model.reranking_enable = false;
    return model;
  }

  const vectorWeight = roundWeight(preset.vectorWeight);
  const keywordWeight = roundWeight(1 - vectorWeight);

  model.reranking_enable = preset.hybridMode === "reranking_model";
  model.reranking_mode = preset.hybridMode;
  model.reranking_model = {
    reranking_provider_name: preset.rerankingProviderName || "",
    reranking_model_name: preset.rerankingModelName || "",
  };
  model.weights = {
    weight_type: "customized",
    vector_setting: {
      vector_weight: vectorWeight,
      embedding_provider_name: preset.embeddingProviderName || "",
      embedding_model_name: preset.embeddingModelName || "",
    },
    keyword_setting: {
      keyword_weight: keywordWeight,
    },
  };

  return model;
}
