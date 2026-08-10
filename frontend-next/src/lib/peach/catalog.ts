import type { PeachField, PeachOrchard } from './types';

export const peachOrchard: PeachOrchard = {
  id: 'PEACH-ORCHARD-ANU-001',
  slug: 'peach-anu',
  nodeSlug: 'anu',
  title: 'PEACH Orchard',
  description:
    'ANU collective-cultural orchard for Fields that cultivate society\'s interest in itself.',
  phase: 'Private internal pilot preparation',
  publicIndexing: 'noindex',
};

export const peachFields: PeachField[] = [
  {
    id: 'PEACH-FIELD-001',
    orchardId: peachOrchard.id,
    nodeSlug: peachOrchard.nodeSlug,
    slug: 'studying-ourselves',
    title: 'Studying Ourselves',
    status: 'tending',
    season: 'Phase 1 pilot season',
    steward: {
      id: 'peach-founding-steward',
      displayName: 'PEACH founding steward',
      role: 'founding_steward',
    },
    shortDescription:
      'A Field is a bounded cultural inquiry. This first Field asks what changes when a community studies itself with the seriousness usually reserved for institutions.',
    seed: {
      text: 'What does a community learn when it studies itself as seriously as institutions study it?',
      reasonForNow:
        'PEACH is ANU-native as a collective-cultural vertical. Its first Field proves culture as cultivation: a community notices itself, interprets what it finds, and may later make a consented work from that attention.',
    },
    soil: [
      "Communities are often researched, represented, marketed to, categorized, and reported on by institutions. Those descriptions may be useful, but they often sit outside the community's own interpretive life.",
      'This Field asks what changes when the tools of attention move closer to the community: when memory, reading, archival fragments, conversation, and making become shared practice rather than external analysis.',
      'The Field does not claim to represent a whole community. It demonstrates a method for communal self-study and a path from attention to a possible Yield and Commons Return.',
    ],
    vessels: [
      {
        id: 'community-self-study-question-set',
        type: 'document',
        title: 'Community self-study question set',
        access: 'Shown as a PEACH-authored guide for private pilot participants.',
        reason:
          'Gives participants a practical way to notice what institutions ask, what they omit, and what the community might ask of itself.',
        rights: 'PEACH-authored, reusable with attribution.',
      },
      {
        id: 'local-organizational-archive-fragment',
        type: 'archive_fragment',
        title: 'Local or organizational archive fragment',
        access: 'Submitted or selected by steward with permission.',
        reason: 'Grounds the Field in specific memory rather than abstract community language.',
        rights: 'Requires source permission before public use.',
      },
      {
        id: 'conversation-with-memory-holder',
        type: 'oral_history',
        title: 'Recorded conversation with a community memory-holder',
        access: 'Edited excerpt or transcript after consent.',
        reason: 'Brings lived interpretation into the Field without treating memory as raw content.',
        rights: 'Explicit consent required for recording, excerpting, attribution, and Commons Return.',
      },
      {
        id: 'public-institutional-representation',
        type: 'public_record',
        title: 'A public institutional representation of the community',
        access: 'Link or cited excerpt where rights allow.',
        reason: 'Creates contrast between external study and community self-study.',
        rights: 'Use citation and limited excerpting; link to original source.',
      },
      {
        id: 'cultural-work-from-self-observation',
        type: 'artwork',
        title: 'A cultural work made from self-observation',
        access: 'Link, excerpt, or viewing/listening note.',
        reason: 'Shows that studying oneself can become cultural production, not only analysis.',
        rights: 'Respect creator rights and quote/display only with permission or allowed use.',
      },
    ],
    gatherings: [
      {
        id: 'reading-the-outside-view',
        title: 'Reading The Outside View',
        format: 'Live digital or in-person discussion',
        timing: 'To be scheduled',
        purpose:
          'Compare how institutions describe a community with what community members notice, value, dispute, or remember.',
      },
      {
        id: 'making-from-the-inside-view',
        title: 'Making From The Inside View',
        format: 'Facilitated maker session',
        timing: 'To be scheduled after initial tending',
        purpose:
          'Select recurring questions, images, phrases, contradictions, and memories from reviewed Contributions and shape the first Yield.',
      },
    ],
    prompts: [
      {
        id: 'outsider-question',
        text:
          'What is one question outsiders often ask about this community, and what question do you wish the community asked itself?',
        guidance: 'Avoid naming private individuals without consent.',
        intakeStatus: 'disabled',
      },
      {
        id: 'recognition-object',
        text:
          'Share one object, place, phrase, document, image, or memory that helps this community recognize itself.',
        guidance: 'Confirm you have permission to share any material you submit.',
        intakeStatus: 'disabled',
      },
      {
        id: 'hard-won-learning',
        text: 'What has this community learned the hard way that should be preserved for future members?',
        guidance: 'No trauma disclosure is required. Sensitive material should stay private or request follow-up.',
        intakeStatus: 'disabled',
      },
    ],
    supportOptions: [
      {
        id: 'membership',
        label: 'Membership',
        enables: 'Stewardship, access, Field operations, and Commons preservation.',
        mode: 'manual_enquiry',
        paymentTaken: false,
      },
      {
        id: 'one_off_support',
        label: 'One-off support',
        enables: 'Flexible support for maker fees, publication, archive, or future Field work.',
        mode: 'manual_enquiry',
        paymentTaken: false,
      },
      {
        id: 'sponsor_access',
        label: 'Sponsor access',
        enables: 'Participation support without exposing recipient identities.',
        mode: 'manual_enquiry',
        paymentTaken: false,
      },
      {
        id: 'sponsor_field',
        label: 'Sponsor the Field',
        enables: 'Research, facilitation, stewardship, accessibility, and Return.',
        mode: 'manual_enquiry',
        paymentTaken: false,
      },
      {
        id: 'sponsor_yield',
        label: 'Sponsor the Yield',
        enables: 'Editing, design, transcription, publication, archive, and Commons Return.',
        mode: 'manual_enquiry',
        paymentTaken: false,
      },
    ],
    yield: {
      title: 'Studying Ourselves: A First PEACH Field Report',
      status: 'planned',
      description:
        'A possible future Field report with selected, re-consented excerpts, source trail, method notes, and continuation questions. No Yield is public in the private pilot.',
    },
    returnPlan:
      'A Commons Return is the approved work, method, or learning that comes back to the community after consent and steward review. For Field 001, that could later be a Field report, source trail, consent scope summary, teaching note, and future questions.',
    commonsEntries: [
      {
        id: 'commons-placeholder-field-001',
        fieldId: 'PEACH-FIELD-001',
        title: 'Commons Return placeholder',
        status: 'placeholder',
        summary:
          'No public Commons entry has been returned yet. This placeholder explains the return path without publishing participant material.',
        publicUrl: null,
      },
    ],
    contributionIntakeStatus: 'pilot_private',
    publicContributionDisplay: false,
    sensitiveMaterialCollection: false,
    youthMaterialCollection: false,
    noindex: true,
    updatedAt: '2026-07-31T00:00:00.000Z',
  },
];

