export type ModelRegistryItem = {
  key: string;
  version: number;
  description?: string | null;
  param_schema?: Record<string, unknown> | null;
  required_inputs?: string[] | null;
  min_sample_size?: number | null;
  output_units?: string | null;
  confidence_method?: string | null;
  uncertainty_format?: string | null;
  convexity_property?: string | null;
  fallback_mode?: string | null;
  complexity_bound?: string | null;
  update_policy?: string | null;
  requires_backtest?: boolean | null;
  requires_calibration?: boolean | null;
  cooling_period_days?: number | null;
};

export type LabyrinthState = 'dormant' | 'active' | 'contested' | 'deprecated' | 'experimental';

export interface PresentedRegistryModel {
  id: string;
  source: ModelRegistryItem;
  title: string;
  purpose: string;
  state: LabyrinthState;
  stateReason: string;
  versionLabel: string;
  shapeLabel: string;
  shapeDetail: string;
  dependencySummary: string;
  dependencyInputs: string[];
  parameterKeys: string[];
  historySummary: string;
  releaseNotes: string[];
  stewardSummary: string;
  outputUnitsLabel: string;
}

function toWords(value: string): string {
  return value
    .split(/[_\-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sentenceCase(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const words = toWords(value);
  return words.length > 0 ? words : fallback;
}

function paramKeys(paramSchema: ModelRegistryItem['param_schema']): string[] {
  if (!paramSchema || typeof paramSchema !== 'object') {
    return [];
  }

  return Object.keys(paramSchema);
}

function deriveState(model: ModelRegistryItem): { state: LabyrinthState; reason: string } {
  const searchable = [
    model.key,
    model.description,
    model.update_policy,
    model.fallback_mode,
    model.convexity_property,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  if (/(deprecated|legacy|sunset|retired|archive)/.test(searchable)) {
    return {
      state: 'deprecated',
      reason: 'This model carries legacy or sunset signals in its registry policy or naming.',
    };
  }

  if (model.requires_backtest && model.requires_calibration) {
    return {
      state: 'contested',
      reason: 'Both backtesting and calibration are required before institutional confidence can be treated as settled.',
    };
  }

  if (model.version <= 1 || /(experimental|pilot|draft|prototype)/.test(searchable)) {
    return {
      state: 'experimental',
      reason: 'This model is early-stage or explicitly marked as experimental in the registry payload.',
    };
  }

  if (model.version >= 3) {
    return {
      state: 'active',
      reason: 'The model has advanced through multiple versions without an explicit deprecation or experimental flag.',
    };
  }

  return {
    state: 'dormant',
    reason: 'The model is registered and readable, but the payload does not yet show strong active or contested indicators.',
  };
}

function deriveShape(model: ModelRegistryItem): { label: string; detail: string } {
  const inputs = model.required_inputs?.length ?? 0;
  const hasUncertainty = Boolean(model.confidence_method || model.uncertainty_format);

  if (inputs >= 4) {
    return {
      label: 'Simulation lattice',
      detail: `${inputs} required inputs shape this model as a multi-input governance lattice rather than a single scalar instrument.`,
    };
  }

  if (hasUncertainty) {
    return {
      label: 'Probabilistic contour',
      detail: `${sentenceCase(model.confidence_method, 'Confidence model')} with ${sentenceCase(model.uncertainty_format, 'structured uncertainty')} makes this model read as a probabilistic contour.`,
    };
  }

  if (model.convexity_property) {
    return {
      label: 'Boundary envelope',
      detail: `${sentenceCase(model.convexity_property, 'Boundary rule')} shapes this model as a bounded institutional envelope.`,
    };
  }

  if (model.complexity_bound) {
    return {
      label: 'Complexity gauge',
      detail: `${sentenceCase(model.complexity_bound, 'Complexity bound')} determines how far the model can expand before review is required.`,
    };
  }

  return {
    label: 'Registry contour',
    detail: 'The registry exposes a canonical model record, but richer simulation geometry is not yet published by this endpoint.',
  };
}

function deriveDependencySummary(inputs: string[], parameterNames: string[]): string {
  if (inputs.length > 0 && parameterNames.length > 0) {
    return `${inputs.length} required inputs and ${parameterNames.length} parameter controls determine the model envelope.`;
  }

  if (inputs.length > 0) {
    return `${inputs.length} required inputs are published for this model.`;
  }

  if (parameterNames.length > 0) {
    return `${parameterNames.length} parameter controls are published, but required inputs are not explicitly listed.`;
  }

  return 'The registry does not yet publish explicit input or parameter dependencies for this model.';
}

function deriveHistorySummary(model: ModelRegistryItem): { summary: string; releaseNotes: string[] } {
  const notes = [
    `Version ${model.version} currently registered`,
    model.update_policy ? `${sentenceCase(model.update_policy, 'Update policy')} update discipline` : null,
    typeof model.cooling_period_days === 'number'
      ? `${model.cooling_period_days} day cooling window`
      : null,
    model.requires_backtest ? 'Backtest required before activation' : null,
    model.requires_calibration ? 'Calibration report required before activation' : null,
    model.fallback_mode ? `${sentenceCase(model.fallback_mode, 'Fallback mode')} fallback mode` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    summary: notes.length > 0
      ? notes.join(' / ')
      : 'The registry exposes a version number, but fuller release history is not yet surfaced by this endpoint.',
    releaseNotes: notes,
  };
}

function deriveStewardSummary(model: ModelRegistryItem): string {
  const reviewFlags = [
    model.requires_backtest ? 'backtest' : null,
    model.requires_calibration ? 'calibration' : null,
  ].filter((value): value is string => Boolean(value));

  if (reviewFlags.length > 0) {
    return `This model currently routes through institutional ${reviewFlags.join(' + ')} review before it should be treated as stable.`;
  }

  return 'Specific steward records are not exposed by this endpoint yet; the current visible control lane is the institutional formulas registry.';
}

export function presentRegistryModel(model: ModelRegistryItem): PresentedRegistryModel {
  const inputs = (model.required_inputs ?? []).filter((input): input is string => typeof input === 'string' && input.trim().length > 0);
  const parameterNames = paramKeys(model.param_schema);
  const state = deriveState(model);
  const shape = deriveShape(model);
  const history = deriveHistorySummary(model);
  const title = toWords(model.key);

  return {
    id: `${model.key}-${model.version}`,
    source: model,
    title,
    purpose:
      model.description && model.description.trim().length > 0
        ? model.description
        : `Versioned institutional model for ${title.toLowerCase()}.`,
    state: state.state,
    stateReason: state.reason,
    versionLabel: `v${model.version}`,
    shapeLabel: shape.label,
    shapeDetail: shape.detail,
    dependencySummary: deriveDependencySummary(inputs, parameterNames),
    dependencyInputs: inputs,
    parameterKeys: parameterNames,
    historySummary: history.summary,
    releaseNotes: history.releaseNotes,
    stewardSummary: deriveStewardSummary(model),
    outputUnitsLabel: model.output_units ? sentenceCase(model.output_units, 'Declared output') : 'Declared output unavailable',
  };
}
