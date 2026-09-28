export type PeachFieldStatus =
  | 'draft'
  | 'upcoming'
  | 'open'
  | 'tending'
  | 'making'
  | 'yielding'
  | 'returned'
  | 'archived_dormant';

export type PeachContributionIntakeStatus = 'disabled' | 'pilot_private' | 'open';
export type PeachSupportMode = 'manual_enquiry' | 'coming_soon';
export type PeachYieldStatus = 'planned' | 'in_progress' | 'released';
export type PeachCommonsStatus = 'placeholder' | 'returned' | 'archived';

export type PeachOrchard = {
  id: string;
  slug: string;
  nodeSlug: string;
  title: string;
  description: string;
  phase: string;
  publicIndexing: 'noindex' | 'index';
};

export type PeachSeed = {
  text: string;
  reasonForNow: string;
};

export type PeachVessel = {
  id: string;
  type: string;
  title: string;
  access: string;
  reason: string;
  rights: string;
};

export type PeachGathering = {
  id: string;
  title: string;
  format: string;
  timing: string;
  purpose: string;
};

export type PeachTendingPrompt = {
  id: string;
  text: string;
  guidance: string;
  intakeStatus: PeachContributionIntakeStatus;
};

export type PeachSupportIntentOption = {
  id: 'membership' | 'one_off_support' | 'sponsor_access' | 'sponsor_field' | 'sponsor_yield';
  label: string;
  enables: string;
  mode: PeachSupportMode;
  paymentTaken: false;
};

export type PeachYield = {
  title: string;
  status: PeachYieldStatus;
  description: string;
};

export type PeachCommonsEntry = {
  id: string;
  fieldId: string;
  title: string;
  status: PeachCommonsStatus;
  summary: string;
  publicUrl: string | null;
};

export type PeachSteward = {
  id: string;
  displayName: string;
  role: 'founding_steward' | 'field_steward';
};

export type PeachField = {
  id: string;
  orchardId: string;
  nodeSlug: string;
  slug: string;
  title: string;
  status: PeachFieldStatus;
  season: string;
  steward: PeachSteward;
  shortDescription: string;
  seed: PeachSeed;
  soil: string[];
  vessels: PeachVessel[];
  gatherings: PeachGathering[];
  prompts: PeachTendingPrompt[];
  supportOptions: PeachSupportIntentOption[];
  yield: PeachYield;
  returnPlan: string;
  commonsEntries: PeachCommonsEntry[];
  contributionIntakeStatus: PeachContributionIntakeStatus;
  publicContributionDisplay: false;
  sensitiveMaterialCollection: false;
  youthMaterialCollection: false;
  noindex: boolean;
  updatedAt: string;
};

export type PublicPeachFieldResponse = {
  orchard: PeachOrchard;
  field: PeachField;
};
