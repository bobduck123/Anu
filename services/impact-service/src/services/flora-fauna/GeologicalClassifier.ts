import { GeologicalSummary, NutrientVectorInput, roundMetric } from './types';

export class GeologicalClassifier {
  classify(vector: NutrientVectorInput): GeologicalSummary {
    const stabilityIndex = roundMetric(
      (vector.careIndex * 0.25) +
      (vector.reciprocityIndex * 0.25) +
      (vector.stewardshipIndex * 0.5),
    );
    const volatilityIndex = roundMetric(
      (vector.originalityIndex * 0.45) +
      (vector.resonanceIndex * 0.35) +
      ((1 - vector.stewardshipIndex) * 0.2),
    );
    const permeabilityIndex = roundMetric(
      (vector.mycelialDensityIndex * 0.55) +
      (vector.careIndex * 0.25) +
      (vector.resonanceIndex * 0.2),
    );

    let formKey = 'river-basin';
    let strataSummary = 'Balanced channels with enough flow to redistribute attention without drift.';

    if (stabilityIndex >= 0.74 && volatilityIndex <= 0.44) {
      formKey = 'bedrock-terrace';
      strataSummary = 'High stewardship and reciprocity produce a durable commons with predictable flow.';
    } else if (volatilityIndex >= 0.7 && vector.originalityIndex >= 0.72) {
      formKey = 'volcanic-archipelago';
      strataSummary = 'Rapid novelty and high resonance create explosive cultural bursts that require careful cooling.';
    } else if (permeabilityIndex >= 0.72 && vector.mycelialDensityIndex >= 0.68) {
      formKey = 'alluvial-delta';
      strataSummary = 'Dense connective tissue and care keep nutrients circulating across many tributaries.';
    } else if (vector.reciprocityIndex >= 0.66 && vector.mycelialDensityIndex >= 0.7) {
      formKey = 'fungal-shelf';
      strataSummary = 'Reciprocal remix culture forms layered knowledge shelves across the channel network.';
    }

    return {
      formKey,
      strataSummary,
      permeabilityIndex,
      volatilityIndex,
      stabilityIndex,
      rationale: {
        stabilityIndex,
        volatilityIndex,
        permeabilityIndex,
        careIndex: vector.careIndex,
        reciprocityIndex: vector.reciprocityIndex,
        resonanceIndex: vector.resonanceIndex,
        originalityIndex: vector.originalityIndex,
        stewardshipIndex: vector.stewardshipIndex,
        mycelialDensityIndex: vector.mycelialDensityIndex,
      },
    };
  }
}

export default GeologicalClassifier;
