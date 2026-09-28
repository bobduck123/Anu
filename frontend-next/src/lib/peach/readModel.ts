import { peachFields, peachOrchard } from './catalog';
import type { PeachField, PublicPeachFieldResponse } from './types';

export function listPeachFields(): PeachField[] {
  return peachFields;
}

export function getActivePeachField(): PeachField {
  return peachFields[0];
}

export function getPeachFieldBySlug(slug: string): PeachField | null {
  return peachFields.find((field) => field.slug === slug) ?? null;
}

export function toPublicPeachFieldResponse(field: PeachField): PublicPeachFieldResponse {
  return {
    orchard: peachOrchard,
    field: {
      ...field,
      publicContributionDisplay: false,
      sensitiveMaterialCollection: false,
      youthMaterialCollection: false,
    },
  };
}

export function getActivePeachFieldResponse(): PublicPeachFieldResponse {
  return toPublicPeachFieldResponse(getActivePeachField());
}
