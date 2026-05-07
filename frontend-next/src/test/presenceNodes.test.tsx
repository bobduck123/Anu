// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchPublicPresenceNodeMock = vi.fn();
const submitPresenceEnquiryMock = vi.fn();
const submitPresenceQuoteRequestMock = vi.fn();
const capturePresenceEventMock = vi.fn();
const capturePresenceSourceHitMock = vi.fn();
const listControlPresenceNodesMock = vi.fn();
const createControlPresenceNodeMock = vi.fn();
const getControlPresenceNodeMock = vi.fn();
const updateControlPresenceNodeMock = vi.fn();
const publishControlPresenceNodeMock = vi.fn();
const unpublishControlPresenceNodeMock = vi.fn();
const archiveControlPresenceNodeMock = vi.fn();
const listControlPresenceTemplatesMock = vi.fn();
const listControlPresenceEnquiriesMock = vi.fn();
const updateControlPresenceEnquiryMock = vi.fn();
const listControlPresenceCollectionsMock = vi.fn();
const updateControlPresenceCollectionMock = vi.fn();
const listControlPresenceWorksMock = vi.fn();
const updateControlPresenceWorkMock = vi.fn();
const listControlPresenceServicesMock = vi.fn();
const updateControlPresenceServiceMock = vi.fn();
const listControlPresenceProofMock = vi.fn();
const updateControlPresenceProofMock = vi.fn();
const updateControlPresenceProcurementMock = vi.fn();
const listControlPresenceNfcTagsMock = vi.fn();
const createControlPresenceNfcTagMock = vi.fn();
const updateControlPresenceNfcTagMock = vi.fn();
const listControlPresenceConnectionsMock = vi.fn();
const listControlPresenceQuotesMock = vi.fn();
const createControlPresenceQuoteMock = vi.fn();
const updateControlPresenceQuoteMock = vi.fn();
const listControlPresenceVariationsMock = vi.fn();
const listControlPresenceInvoiceSupportMock = vi.fn();
const listControlPresenceHandoversMock = vi.fn();
const getOwnerPresenceNodesMock = vi.fn();
const getOwnerPresenceNodeMock = vi.fn();
const updateOwnerPresenceNodeMock = vi.fn();
const publishOwnerPresenceNodeMock = vi.fn();
const unpublishOwnerPresenceNodeMock = vi.fn();
const getOwnerPresenceNodeWorksMock = vi.fn();
const createOwnerPresenceWorkMock = vi.fn();
const updateOwnerPresenceWorkMock = vi.fn();
const getOwnerPresenceNodeCollectionsMock = vi.fn();
const createOwnerPresenceCollectionMock = vi.fn();
const updateOwnerPresenceCollectionMock = vi.fn();
const getOwnerPresenceNodeEnquiriesMock = vi.fn();
const updateOwnerPresenceEnquiryMock = vi.fn();
const getOwnerPresenceNodeAnalyticsMock = vi.fn();
const getOwnerPresenceNodeNfcTagsMock = vi.fn();
const createOwnerPresenceNfcTagMock = vi.fn();

let currentPathname = '/p/river-practitioner';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => currentPathname,
}));

vi.mock('@/lib/api/presence', () => ({
  fetchPublicPresenceNode: (...args: unknown[]) => fetchPublicPresenceNodeMock(...args),
  submitPresenceEnquiry: (...args: unknown[]) => submitPresenceEnquiryMock(...args),
  submitPresenceQuoteRequest: (...args: unknown[]) => submitPresenceQuoteRequestMock(...args),
  capturePresenceEvent: (...args: unknown[]) => capturePresenceEventMock(...args),
  capturePresenceSourceHit: (...args: unknown[]) => capturePresenceSourceHitMock(...args),
  getAnonymousPresenceSessionId: () => 'presence-session-test',
  presencePublicApiPath: (slug: string, suffix = '') => `http://localhost:5000/api/presence/public/${slug}${suffix}`,
  listControlPresenceNodes: (...args: unknown[]) => listControlPresenceNodesMock(...args),
  createControlPresenceNode: (...args: unknown[]) => createControlPresenceNodeMock(...args),
  getControlPresenceNode: (...args: unknown[]) => getControlPresenceNodeMock(...args),
  updateControlPresenceNode: (...args: unknown[]) => updateControlPresenceNodeMock(...args),
  publishControlPresenceNode: (...args: unknown[]) => publishControlPresenceNodeMock(...args),
  unpublishControlPresenceNode: (...args: unknown[]) => unpublishControlPresenceNodeMock(...args),
  archiveControlPresenceNode: (...args: unknown[]) => archiveControlPresenceNodeMock(...args),
  listControlPresenceTemplates: (...args: unknown[]) => listControlPresenceTemplatesMock(...args),
  listControlPresenceEnquiries: (...args: unknown[]) => listControlPresenceEnquiriesMock(...args),
  updateControlPresenceEnquiry: (...args: unknown[]) => updateControlPresenceEnquiryMock(...args),
  listControlPresenceCollections: (...args: unknown[]) => listControlPresenceCollectionsMock(...args),
  updateControlPresenceCollection: (...args: unknown[]) => updateControlPresenceCollectionMock(...args),
  listControlPresenceWorks: (...args: unknown[]) => listControlPresenceWorksMock(...args),
  updateControlPresenceWork: (...args: unknown[]) => updateControlPresenceWorkMock(...args),
  listControlPresenceServices: (...args: unknown[]) => listControlPresenceServicesMock(...args),
  updateControlPresenceService: (...args: unknown[]) => updateControlPresenceServiceMock(...args),
  listControlPresenceProof: (...args: unknown[]) => listControlPresenceProofMock(...args),
  updateControlPresenceProof: (...args: unknown[]) => updateControlPresenceProofMock(...args),
  updateControlPresenceProcurement: (...args: unknown[]) => updateControlPresenceProcurementMock(...args),
  listControlPresenceNfcTags: (...args: unknown[]) => listControlPresenceNfcTagsMock(...args),
  createControlPresenceNfcTag: (...args: unknown[]) => createControlPresenceNfcTagMock(...args),
  updateControlPresenceNfcTag: (...args: unknown[]) => updateControlPresenceNfcTagMock(...args),
  listControlPresenceConnections: (...args: unknown[]) => listControlPresenceConnectionsMock(...args),
  listControlPresenceQuotes: (...args: unknown[]) => listControlPresenceQuotesMock(...args),
  createControlPresenceQuote: (...args: unknown[]) => createControlPresenceQuoteMock(...args),
  updateControlPresenceQuote: (...args: unknown[]) => updateControlPresenceQuoteMock(...args),
  listControlPresenceVariations: (...args: unknown[]) => listControlPresenceVariationsMock(...args),
  listControlPresenceInvoiceSupport: (...args: unknown[]) => listControlPresenceInvoiceSupportMock(...args),
  listControlPresenceHandovers: (...args: unknown[]) => listControlPresenceHandoversMock(...args),
  getOwnerPresenceNodes: (...args: unknown[]) => getOwnerPresenceNodesMock(...args),
  getOwnerPresenceNode: (...args: unknown[]) => getOwnerPresenceNodeMock(...args),
  updateOwnerPresenceNode: (...args: unknown[]) => updateOwnerPresenceNodeMock(...args),
  publishOwnerPresenceNode: (...args: unknown[]) => publishOwnerPresenceNodeMock(...args),
  unpublishOwnerPresenceNode: (...args: unknown[]) => unpublishOwnerPresenceNodeMock(...args),
  getOwnerPresenceNodeWorks: (...args: unknown[]) => getOwnerPresenceNodeWorksMock(...args),
  createOwnerPresenceWork: (...args: unknown[]) => createOwnerPresenceWorkMock(...args),
  updateOwnerPresenceWork: (...args: unknown[]) => updateOwnerPresenceWorkMock(...args),
  getOwnerPresenceNodeCollections: (...args: unknown[]) => getOwnerPresenceNodeCollectionsMock(...args),
  createOwnerPresenceCollection: (...args: unknown[]) => createOwnerPresenceCollectionMock(...args),
  updateOwnerPresenceCollection: (...args: unknown[]) => updateOwnerPresenceCollectionMock(...args),
  getOwnerPresenceNodeEnquiries: (...args: unknown[]) => getOwnerPresenceNodeEnquiriesMock(...args),
  updateOwnerPresenceEnquiry: (...args: unknown[]) => updateOwnerPresenceEnquiryMock(...args),
  getOwnerPresenceNodeAnalytics: (...args: unknown[]) => getOwnerPresenceNodeAnalyticsMock(...args),
  getOwnerPresenceNodeNfcTags: (...args: unknown[]) => getOwnerPresenceNodeNfcTagsMock(...args),
  createOwnerPresenceNfcTag: (...args: unknown[]) => createOwnerPresenceNfcTagMock(...args),
}));

import PublicPresencePage from '@/app/(public)/p/[username]/page';
import PresenceStudioLayout from '@/app/(app)/app/layout';
import PresenceStudioEntryPage from '@/app/(app)/app/page';
import PresenceStudioPresencePage from '@/app/(app)/app/presence/page';
import PresenceStudioPortfolioPage from '@/app/(app)/app/portfolio/page';
import PresenceStudioWorksPage from '@/app/(app)/app/works/page';
import PresenceStudioCollectionsPage from '@/app/(app)/app/collections/page';
import PresenceStudioEnquiriesPage from '@/app/(app)/app/enquiries/page';
import PresenceStudioQrNfcPage from '@/app/(app)/app/qr-nfc/page';
import PresenceStudioAnalyticsPage from '@/app/(app)/app/analytics/page';
import PresenceStudioSettingsPage from '@/app/(app)/app/settings/page';
import { PresenceNodeRenderer } from '@/components/presence/PresenceNodeRenderer';
import {
  PresenceEnquiryForm,
} from '@/components/presence/PresenceEnquiryForm';
import { PresenceQuoteRequestForm } from '@/components/presence/PresenceQuoteRequestForm';
import {
  PresenceNfcTagManager,
  PresenceNodeAdminTable,
  PresenceNodeEditor,
  PresencePublishPanel,
  PresenceRelationshipLedger,
} from '@/components/presence/PresenceControlComponents';

const sampleNode = {
  id: 12,
  slug: 'river-practitioner',
  display_name: 'River Stone',
  headline: 'Trauma-informed practitioner',
  bio: '<p>Gentle care for community members.</p>',
  node_type: 'practitioner',
  display_mode: 'practitioner_profile',
  plan_type: 'premium',
  status: 'published',
  visibility: 'public',
  tenant_id: 4,
  organisation_id: 4,
  template_id: 1,
  template: {
    id: 1,
    name: 'Premium Practitioner Profile',
    node_type: 'practitioner',
    display_mode: 'practitioner_profile',
    is_active: true,
    is_premium: false,
  },
  visual_mood: 'grounded-care',
  landing_enabled: false,
  practice_statement: '<p>Practice statement for care work.</p>',
  curatorial_statement: '',
  capability_statement: '<p>Capability statement.</p>',
  proof_summary: 'Proof ledger summary.',
  procurement_summary: 'Procurement-ready summary.',
  directory_ready: true,
  map_ready: true,
  archive_ready: false,
  marketplace_ready: false,
  white_label_ready: false,
  location_label: 'Sydney',
  service_area: 'Online and in-person',
  public_email: 'river@example.org',
  profile_image_url: 'https://example.org/river.jpg',
  cover_image_url: 'https://example.org/cover.jpg',
  organisation: { id: 4, slug: 'mudyin', name: 'Mudyin Healing Centre', status: 'active' },
  availability_chips: [{ label: 'Taking enquiries', chip_type: 'availability', is_active: true, sort_order: 0 }],
  links: [{ label: 'Website', url: 'https://example.org', link_type: 'website', is_visible: true, sort_order: 0 }],
  services: [{ id: 9, title: 'Intro call', description: 'A short fit check.', problem_solved: 'Clarifies fit.', price_label: 'Free', is_visible: true, sort_order: 0 }],
  proof_items: [{ id: 10, title: 'Case study', challenge: 'A challenge.', outcome: 'A result.', is_public: true, sort_order: 0 }],
  credentials: [{ id: 11, title: 'Licence', issuer: 'Issuer', credential_type: 'licence', is_public: true }],
  procurement_profile: { id: 12, business_name: 'River Advisory', rate_label: 'From $4,500', insurance_status: 'Covered', nda_ready: true },
  collections: [{ id: 3, title: 'Selected Works', description: 'A small collection.', is_visible: true, sort_order: 0 }],
  works: [
    {
      id: 7,
      title: 'River Memory Wall',
      slug: 'river-memory-wall',
      year: '2026',
      medium: 'Acrylic',
      description: 'Selected work sample.',
      image_url: 'https://example.org/work.jpg',
      is_visible: true,
      sort_order: 0,
    },
  ],
  portfolio_items: [
    {
      title: 'Studio work',
      description: 'Portfolio sample.',
      media_url: 'https://example.org/work.jpg',
      external_url: 'https://example.org/work',
      media_type: 'image',
      is_visible: true,
      sort_order: 0,
    },
  ],
  sections: [{ section_type: 'about', title: 'About', content: 'Public-safe overview.', is_visible: true, sort_order: 0 }],
  analytics: {
    total_views: 10,
    total_enquiries: 2,
    quote_requests: 1,
    conversion_rate: 20,
    recent_events: [],
  },
  nfc_tags: [{ id: 20, label: 'NFC card', source_code: 'nfc-card', tag_type: 'business_card', is_active: true }],
  connections: [{ id: 21, node_id: 12, contact_name: 'Jordan Park', contact_email: 'jordan@example.org', source_type: 'quote_request', status: 'enquired', consent_status: 'provided' }],
  quotes: [{ id: 22, node_id: 12, title: 'Quote request from Jordan', status: 'draft', currency: 'AUD' }],
  variations: [{ id: 23, node_id: 12, title: 'Add sensor', status: 'draft' }],
  invoice_support_records: [{ id: 24, node_id: 12, invoice_number: 'INV-1', status: 'draft' }],
  handovers: [{ id: 25, node_id: 12, summary: 'Handover', customer_acceptance_status: 'pending' }],
};

const ownerNodeSample = {
  id: 12,
  slug: 'river-practitioner',
  display_name: 'River Stone',
  headline: 'Trauma-informed practitioner',
  bio: '<p>Gentle care for community members.</p>',
  node_type: 'practitioner',
  display_mode: 'practitioner_profile',
  plan_type: 'premium',
  status: 'published',
  visibility: 'public',
  profile_image_url: 'https://example.org/river.jpg',
  cover_image_url: 'https://example.org/cover.jpg',
  practice_statement: '<p>Practice statement for care work.</p>',
  curatorial_statement: '<p>Curatorial statement for river practice.</p>',
  public_url: 'http://localhost:3000/p/river-practitioner',
};

const ownerCollectionsSample = [
  {
    id: 3,
    title: 'Selected Works',
    description: 'A small collection.',
    cover_image_url: 'https://example.org/walls.jpg',
    is_visible: true,
    sort_order: 0,
  },
];

const ownerWorksSample = [
  {
    id: 7,
    collection_id: 3,
    title: 'River Memory Wall',
    year: '2026',
    medium: 'Acrylic',
    dimensions: '18m wall',
    description: 'Selected work sample.',
    image_url: 'https://example.org/work.jpg',
    availability_status: 'commissioned',
    is_visible: true,
    sort_order: 0,
  },
];

const ownerEnquiriesSample = [
  {
    id: 31,
    node_id: 12,
    enquiry_type: 'commission',
    name: 'Ari Visitor',
    email: 'ari@example.org',
    phone: '0400000000',
    company: 'Studio North',
    role_title: 'Curator',
    budget_range: '$5k-$10k',
    timeline: 'June',
    project_type: 'Exhibition',
    urgency: 'normal',
    message: 'I would like to discuss a selected work.',
    preferred_contact_method: 'email',
    status: 'new',
    source_url: 'http://localhost:3000/p/river-practitioner?nfc=gallery-card',
    source_type: 'nfc',
    source_tag_id: 20,
    created_at: '2026-05-06T01:00:00Z',
  },
];

const ownerAnalyticsSample = {
  total_views: 10,
  total_enquiries: 2,
  quote_requests: 0,
  conversion_rate: 20,
  top_sources: [{ source_type: 'nfc', source_code: 'gallery-card', count: 3 }],
  top_links: [{ label: 'Website', url: 'https://example.org', count: 4 }],
  recent_events: [
    { id: 1, event_type: 'node_viewed', created_at: '2026-05-06T01:00:00Z', metadata: {} },
    { id: 2, event_type: 'nfc_scanned', created_at: '2026-05-06T01:05:00Z', metadata: { source_code: 'gallery-card' } },
  ],
};

const ownerNfcTagsSample = [
  {
    id: 20,
    node_id: 12,
    label: 'Gallery card',
    source_code: 'gallery-card',
    tag_type: 'business_card',
    destination_url: 'http://localhost:3000/p/river-practitioner?nfc=gallery-card',
    is_active: true,
  },
];

describe('Presence Nodes frontend', () => {
  beforeEach(() => {
    currentPathname = '/p/river-practitioner';
    vi.clearAllMocks();
    submitPresenceEnquiryMock.mockResolvedValue({ id: 1, status: 'new', message: 'Enquiry submitted.' });
    submitPresenceQuoteRequestMock.mockResolvedValue({ enquiry_id: 1, connection_id: 21, quote_id: 22, status: 'new', message: 'Quote request submitted.' });
    capturePresenceEventMock.mockResolvedValue(undefined);
    capturePresenceSourceHitMock.mockResolvedValue({ captured: true });
    listControlPresenceTemplatesMock.mockResolvedValue([sampleNode.template]);
    getControlPresenceNodeMock.mockResolvedValue(sampleNode);
    updateControlPresenceNodeMock.mockImplementation(async (_id, payload) => ({ ...sampleNode, ...payload }));
    publishControlPresenceNodeMock.mockResolvedValue({ ...sampleNode, status: 'published' });
    unpublishControlPresenceNodeMock.mockResolvedValue({ ...sampleNode, status: 'unpublished' });
    archiveControlPresenceNodeMock.mockResolvedValue({ ...sampleNode, status: 'archived' });
    listControlPresenceNodesMock.mockResolvedValue([sampleNode]);
    listControlPresenceEnquiriesMock.mockResolvedValue([]);
    updateControlPresenceEnquiryMock.mockResolvedValue({ id: 1, status: 'read' });
    listControlPresenceCollectionsMock.mockResolvedValue(sampleNode.collections);
    updateControlPresenceCollectionMock.mockImplementation(async (_id, payload) => ({ ...sampleNode.collections[0], ...payload }));
    listControlPresenceWorksMock.mockResolvedValue(sampleNode.works);
    updateControlPresenceWorkMock.mockImplementation(async (_id, payload) => ({ ...sampleNode.works[0], ...payload }));
    listControlPresenceServicesMock.mockResolvedValue(sampleNode.services);
    updateControlPresenceServiceMock.mockImplementation(async (_id, payload) => ({ ...sampleNode.services[0], ...payload }));
    listControlPresenceProofMock.mockResolvedValue(sampleNode.proof_items);
    updateControlPresenceProofMock.mockImplementation(async (_id, payload) => ({ ...sampleNode.proof_items[0], ...payload }));
    updateControlPresenceProcurementMock.mockImplementation(async (_id, payload) => ({ ...sampleNode.procurement_profile, ...payload }));
    listControlPresenceNfcTagsMock.mockResolvedValue(sampleNode.nfc_tags);
    createControlPresenceNfcTagMock.mockResolvedValue({ id: 99, label: 'NFC business card', source_code: 'nfc-card-2', tag_type: 'business_card', is_active: true });
    updateControlPresenceNfcTagMock.mockImplementation(async (_id, payload) => ({ ...sampleNode.nfc_tags[0], ...payload }));
    listControlPresenceConnectionsMock.mockResolvedValue(sampleNode.connections);
    listControlPresenceQuotesMock.mockResolvedValue(sampleNode.quotes);
    createControlPresenceQuoteMock.mockResolvedValue({ id: 30, node_id: 12, title: 'New alpha quote', status: 'draft', currency: 'AUD' });
    updateControlPresenceQuoteMock.mockImplementation(async (_id, payload) => ({ ...sampleNode.quotes[0], ...payload }));
    listControlPresenceVariationsMock.mockResolvedValue(sampleNode.variations);
    listControlPresenceInvoiceSupportMock.mockResolvedValue(sampleNode.invoice_support_records);
    listControlPresenceHandoversMock.mockResolvedValue(sampleNode.handovers);
    getOwnerPresenceNodesMock.mockResolvedValue([ownerNodeSample]);
    getOwnerPresenceNodeMock.mockResolvedValue(ownerNodeSample);
    updateOwnerPresenceNodeMock.mockImplementation(async (_id, payload) => ({ ...ownerNodeSample, ...payload }));
    publishOwnerPresenceNodeMock.mockResolvedValue({ ...ownerNodeSample, status: 'published' });
    unpublishOwnerPresenceNodeMock.mockResolvedValue({ ...ownerNodeSample, status: 'unpublished' });
    getOwnerPresenceNodeWorksMock.mockResolvedValue(ownerWorksSample);
    createOwnerPresenceWorkMock.mockImplementation(async (_id, payload) => ({ id: 88, ...payload }));
    updateOwnerPresenceWorkMock.mockImplementation(async (_id, payload) => ({ ...ownerWorksSample[0], ...payload }));
    getOwnerPresenceNodeCollectionsMock.mockResolvedValue(ownerCollectionsSample);
    createOwnerPresenceCollectionMock.mockImplementation(async (_id, payload) => ({ id: 77, ...payload }));
    updateOwnerPresenceCollectionMock.mockImplementation(async (_id, payload) => ({ ...ownerCollectionsSample[0], ...payload }));
    getOwnerPresenceNodeEnquiriesMock.mockResolvedValue(ownerEnquiriesSample);
    updateOwnerPresenceEnquiryMock.mockImplementation(async (_id, status) => ({ ...ownerEnquiriesSample[0], status }));
    getOwnerPresenceNodeAnalyticsMock.mockResolvedValue(ownerAnalyticsSample);
    getOwnerPresenceNodeNfcTagsMock.mockResolvedValue(ownerNfcTagsSample);
    createOwnerPresenceNfcTagMock.mockResolvedValue({ id: 32, label: 'Studio door', source_code: 'studio-door', tag_type: 'business_card', destination_url: 'http://localhost:3000/p/river-practitioner?nfc=studio-door', is_active: true });
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it('renders the public Presence page sections and controls', () => {
    render(<PresenceNodeRenderer node={sampleNode} publicUrl="http://localhost:3000/p/river-practitioner" />);

    expect(screen.getByRole('heading', { name: 'River Stone' })).toBeInTheDocument();
    expect(screen.getByText('Mudyin Healing Centre')).toBeInTheDocument();
    expect(screen.getByText('Taking enquiries')).toBeInTheDocument();
    expect(screen.getByText('Intro call')).toBeInTheDocument();
    expect(screen.getByText('Practice notes and public records')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /share/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('vCard').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
  });

  it('renders Basic, Artist Gallery, and Minimal Portal display modes differently', () => {
    const { rerender } = render(
      <PresenceNodeRenderer
        node={{ ...sampleNode, display_mode: 'profile_card', plan_type: 'basic', display_name: 'Basic Card', services: [], works: [], collections: [] }}
        publicUrl="http://localhost:3000/p/basic-card"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Basic Card' })).toBeInTheDocument();
    expect(screen.queryByText('Practice Statement')).not.toBeInTheDocument();

    rerender(
      <PresenceNodeRenderer
        node={{ ...sampleNode, display_mode: 'artist_gallery', node_type: 'artist', display_name: 'Kira Stone', headline: 'Public art and selected works' }}
        publicUrl="http://localhost:3000/p/kira-stone"
      />,
    );
    expect(screen.getByText('Practice Statement')).toBeInTheDocument();
    expect(screen.getAllByText('Selected Works').length).toBeGreaterThan(0);
    expect(screen.getAllByText('River Memory Wall').length).toBeGreaterThan(0);

    rerender(
      <PresenceNodeRenderer
        node={{
          ...sampleNode,
          display_mode: 'minimal_portal',
          node_type: 'artist',
          display_name: 'Lena Moss',
          landing_title: 'Lena Moss',
          landing_subtitle: 'Quiet works for thresholds.',
          landing_enter_label: 'Enter',
        }}
        publicUrl="http://localhost:3000/p/lena-moss"
      />,
    );
    expect(screen.getByRole('link', { name: /enter/i })).toBeInTheDocument();
    expect(screen.getByText('Quiet works for thresholds.')).toBeInTheDocument();
    expect(screen.getByText('Portal index')).toBeInTheDocument();
    expect(screen.getByText('Collection index')).toBeInTheDocument();
  });

  it('renders the six creative pilot template modes with distinct public sections', () => {
    const { rerender } = render(
      <PresenceNodeRenderer
        node={{ ...sampleNode, display_mode: 'artist_gallery', node_type: 'artist', display_name: 'Eli James', template: { ...sampleNode.template, name: 'Gallery Wall', display_mode: 'artist_gallery' } }}
        publicUrl="http://localhost:3000/p/eli-james"
      />,
    );
    expect(screen.getByText('Gallery Wall')).toBeInTheDocument();
    expect(screen.getAllByText(/selected works/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Curated rooms/i).length).toBeGreaterThan(0);

    rerender(
      <PresenceNodeRenderer
        node={{ ...sampleNode, display_mode: 'editorial_portfolio', display_name: 'Nova Studio', headline: 'We design brands with cultural impact.', template: { ...sampleNode.template, name: 'Editorial Portfolio', display_mode: 'editorial_portfolio' } }}
        publicUrl="http://localhost:3000/p/nova-studio"
      />,
    );
    expect(screen.getByText('Editorial Portfolio')).toBeInTheDocument();
    expect(screen.getByText(/View selected work/i)).toBeInTheDocument();
    expect(screen.getByText(/Selected works and projects/i)).toBeInTheDocument();

    rerender(
      <PresenceNodeRenderer
        node={{ ...sampleNode, display_mode: 'studio_practice', display_name: 'River and Clay', headline: 'Objects and spaces that hold meaning.', template: { ...sampleNode.template, name: 'Studio Practice', display_mode: 'studio_practice' } }}
        publicUrl="http://localhost:3000/p/river-and-clay"
      />,
    );
    expect(screen.getByText('Studio Practice')).toBeInTheDocument();
    expect(screen.getByText(/Studio method/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Bodies of work/i).length).toBeGreaterThan(0);

    rerender(
      <PresenceNodeRenderer
        node={{ ...sampleNode, display_mode: 'practitioner_profile', display_name: 'Lila Harmon', headline: 'Support for mind, body and life.', template: { ...sampleNode.template, name: 'Practitioner Presence', display_mode: 'practitioner_profile' } }}
        publicUrl="http://localhost:3000/p/lila-harmon"
      />,
    );
    expect(screen.getByText('Practitioner Presence')).toBeInTheDocument();
    expect(screen.getByText(/Method and philosophy/i)).toBeInTheDocument();
    expect(screen.getByText(/Grounding and trust/i)).toBeInTheDocument();

    rerender(
      <PresenceNodeRenderer
        node={{ ...sampleNode, display_mode: 'venue_profile', node_type: 'venue', display_name: 'The Commons', headline: 'A space for culture, ideas and community.', template: { ...sampleNode.template, name: 'Venue / Collective Presence', display_mode: 'venue_profile' } }}
        publicUrl="http://localhost:3000/p/the-commons"
      />,
    );
    expect(screen.getByText(/Venue \/ Collective Presence/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Programs and gatherings/i).length).toBeGreaterThan(0);
  });

  it('renders Opportunity, Professional Contract, and Tradie display modes differently', () => {
    const { rerender } = render(
      <PresenceNodeRenderer
        node={{ ...sampleNode, display_mode: 'opportunity_profile', display_name: 'Opportunity Kit', plan_type: 'opportunity_kit' }}
        publicUrl="http://localhost:3000/p/opportunity-kit"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Opportunity Kit' })).toBeInTheDocument();
    expect(screen.getByText('Intro call')).toBeInTheDocument();

    rerender(
      <PresenceNodeRenderer
        node={{ ...sampleNode, display_mode: 'professional_contract', display_name: 'Elian Ward', headline: 'Fractional operations advisor' }}
        publicUrl="http://localhost:3000/p/elian-ward"
      />,
    );
    expect(screen.getByText('Professional Contract Presence')).toBeInTheDocument();
    expect(screen.getByText('Capability')).toBeInTheDocument();
    expect(screen.getByText('Procurement Ready')).toBeInTheDocument();
    expect(screen.getByText('Proof Ledger')).toBeInTheDocument();

    rerender(
      <PresenceNodeRenderer
        node={{ ...sampleNode, display_mode: 'tradie_profile', node_type: 'tradie', display_name: 'Harbour Electrical', headline: 'Licensed electrician in Inner West' }}
        publicUrl="http://localhost:3000/p/harbour-electrical"
      />,
    );
    expect(screen.getByText('Field Service Presence')).toBeInTheDocument();
    expect(screen.getByText('Licences and Credentials')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request quote/i })).toBeDisabled();
  });

  it('returns not found for missing or unpublished public nodes', async () => {
    fetchPublicPresenceNodeMock.mockResolvedValueOnce(null);

    await expect(PublicPresencePage({ params: { username: 'missing-node' } })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('validates and submits the enquiry form successfully', async () => {
    render(<PresenceEnquiryForm slug="river-practitioner" displayName="River Stone" />);

    expect(screen.getByRole('button', { name: /send enquiry/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ari Visitor' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ari@example.org' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'I would like to book a session.' } });
    fireEvent.click(screen.getByLabelText(/I consent/i));
    fireEvent.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => expect(submitPresenceEnquiryMock).toHaveBeenCalled());
    expect(await screen.findByText('Enquiry sent')).toBeInTheDocument();
  });

  it('validates and submits the quote request form successfully', async () => {
    render(<PresenceQuoteRequestForm slug="harbour-electrical" displayName="Harbour Electrical" />);

    expect(screen.getByRole('button', { name: /request quote/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jordan Park' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jordan@example.org' } });
    fireEvent.change(screen.getByLabelText('Job description'), { target: { value: 'Two studio lights need replacement.' } });
    fireEvent.click(screen.getByLabelText(/I consent/i));
    fireEvent.click(screen.getByRole('button', { name: /request quote/i }));

    await waitFor(() => expect(submitPresenceQuoteRequestMock).toHaveBeenCalled());
    expect(await screen.findByText('Quote request sent')).toBeInTheDocument();
  });

  it('loads an existing editor record and saves edits', async () => {
    render(<PresenceNodeEditor nodeId={12} />);

    await waitFor(() => expect(screen.getByLabelText('Display name')).toHaveValue('River Stone'));
    expect(screen.getByText('Portal settings')).toBeInTheDocument();
    expect(screen.getByText('Selected works')).toBeInTheDocument();
    expect(screen.getByText('Collections')).toBeInTheDocument();
    expect(screen.getByText('Services and offers')).toBeInTheDocument();
    expect(screen.getByText('Proof and case studies')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: 'Updated headline' } });
    fireEvent.click(screen.getByRole('button', { name: /save node/i }));

    await waitFor(() => expect(updateControlPresenceNodeMock).toHaveBeenCalled());
    expect(updateControlPresenceNodeMock.mock.calls[0][1].headline).toBe('Updated headline');
    expect(updateControlPresenceNodeMock.mock.calls[0][1].works[0].title).toBe('River Memory Wall');
    expect(updateControlPresenceNodeMock.mock.calls[0][1].collections[0].title).toBe('Selected Works');
    expect(updateControlPresenceNodeMock.mock.calls[0][1].proof_items[0].title).toBe('Case study');
  });

  it('renders NFC tag manager and relationship ledger', async () => {
    render(
      <div>
        <PresenceNfcTagManager nodeId={12} />
        <PresenceRelationshipLedger nodeId={12} />
      </div>,
    );

    await waitFor(() => expect(screen.getByText(/NFC card/)).toBeInTheDocument());
    expect(screen.getByText('Jordan Park')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('NFC business card'), { target: { value: 'Van sticker' } });
    fireEvent.change(screen.getByDisplayValue('nfc-card'), { target: { value: 'van-sticker' } });
    fireEvent.click(screen.getByRole('button', { name: /add tag/i }));
    await waitFor(() => expect(createControlPresenceNfcTagMock).toHaveBeenCalled());
  });

  it('runs publish controls and admin list filters', async () => {
    const onChange = vi.fn();
    render(<PresencePublishPanel node={{ ...sampleNode, status: 'draft' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }));
    await waitFor(() => expect(publishControlPresenceNodeMock).toHaveBeenCalledWith(12));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));

    render(<PresenceNodeAdminTable />);
    await waitFor(() => expect(screen.getByText('River Stone')).toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue('All statuses'), { target: { value: 'published' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    await waitFor(() => expect(listControlPresenceNodesMock).toHaveBeenLastCalledWith({ status: 'published' }));
  });

  it('renders the presence studio dashboard with loaded owner node data and quick links', async () => {
    currentPathname = '/app';
    render(<PresenceStudioEntryPage />);

    expect(await screen.findByRole('heading', { name: 'Prepare your public world' })).toBeInTheDocument();
    expect(await screen.findByText('River Stone')).toBeInTheDocument();
    expect(screen.getByText('Trauma-informed practitioner')).toBeInTheDocument();
    expect(screen.getByText('/river-practitioner')).toBeInTheDocument();
    expect(screen.getAllByText('http://localhost:3000/p/river-practitioner').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Shape this Presence/i })).toHaveAttribute('href', '/app/presence');
    expect(screen.getAllByRole('link', { name: /Public preview/i })[0]).toHaveAttribute('href', 'http://localhost:3000/p/river-practitioner');
    expect(screen.getByText(/Launch readiness/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /World/ })).toHaveAttribute('href', '/app/portfolio');
    expect(screen.getByRole('link', { name: /Works/ })).toHaveAttribute('href', '/app/works');
    expect(screen.getByRole('link', { name: /Collections/ })).toHaveAttribute('href', '/app/collections');
    expect(screen.getByRole('link', { name: /Enquiries/ })).toHaveAttribute('href', '/app/enquiries');
    expect(screen.getByRole('link', { name: /QR\/NFC/ })).toHaveAttribute('href', '/app/qr-nfc');
    expect(screen.getByRole('link', { name: /Signals/ })).toHaveAttribute('href', '/app/analytics');
    expect(screen.getByRole('link', { name: /Launch/ })).toHaveAttribute('href', '/app/settings');
  });

  it('renders the presence studio dashboard empty state when the owner has no nodes', async () => {
    currentPathname = '/app';
    getOwnerPresenceNodesMock.mockResolvedValueOnce([]);
    render(<PresenceStudioEntryPage />);

    expect(await screen.findByText('Your studio is waiting')).toBeInTheDocument();
    expect(screen.getByText(/No public Presence is attached to this account yet/i)).toBeInTheDocument();
  });

  it('renders the presence studio shell navigation with active route styling', () => {
    currentPathname = '/app/presence';
    render(
      <PresenceStudioLayout>
        <div>studio child</div>
      </PresenceStudioLayout>,
    );

    expect(screen.getByText('Shape your public world')).toBeInTheDocument();
    expect(screen.getByLabelText('Presence Studio sections')).toBeInTheDocument();
    expect(screen.getByText('studio child')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Studio' })[0]).toHaveAttribute('href', '/app/dashboard');
    expect(screen.getAllByRole('link', { name: 'Presence' })[0]).toHaveAttribute('aria-current', 'page');
  });

  it('renders the presence screen with loaded owner node fields', async () => {
    currentPathname = '/app/presence';
    render(<PresenceStudioPresencePage />);

    expect(await screen.findByRole('heading', { name: 'River Stone' })).toBeInTheDocument();
    expect(screen.getByText('Trauma-informed practitioner')).toBeInTheDocument();
    expect(screen.getByText('http://localhost:3000/p/river-practitioner')).toBeInTheDocument();
    expect(screen.getByText('Practice statement for care work.')).toBeInTheDocument();
    expect(screen.getByText('Curatorial statement for river practice.')).toBeInTheDocument();
    expect(screen.getByText('Gentle care for community members.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: 'Updated owner headline' } });
    fireEvent.click(screen.getByRole('button', { name: /save public identity/i }));
    await waitFor(() => expect(updateOwnerPresenceNodeMock).toHaveBeenCalled());
    expect(updateOwnerPresenceNodeMock.mock.calls[0][1].headline).toBe('Updated owner headline');
  });

  it('renders the presence screen empty state when no owner node exists', async () => {
    currentPathname = '/app/presence';
    getOwnerPresenceNodesMock.mockResolvedValueOnce([]);
    render(<PresenceStudioPresencePage />);

    expect(await screen.findByText('No Presence node available')).toBeInTheDocument();
    expect(screen.getByText(/does not have a Presence profile to show yet/i)).toBeInTheDocument();
  });

  it('renders the presence screen sign-in state when owner auth is missing', async () => {
    currentPathname = '/app/presence';
    getOwnerPresenceNodesMock.mockRejectedValueOnce({ code: 'unauthorized', message: 'Sign in required' });
    render(<PresenceStudioPresencePage />);

    expect(await screen.findByText('Sign in required')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth');
  });

  it('renders the works screen with loaded owner works', async () => {
    currentPathname = '/app/works';
    render(<PresenceStudioWorksPage />);

    expect(await screen.findByRole('heading', { name: 'Proof objects for the public world' })).toBeInTheDocument();
    expect(await screen.findByText('River Memory Wall')).toBeInTheDocument();
    expect(screen.getByText('2026 / Acrylic / 18m wall')).toBeInTheDocument();
    expect(screen.getByText('Selected work sample.')).toBeInTheDocument();
    expect(screen.getByText('Selected Works')).toBeInTheDocument();
    expect(screen.getByText('commissioned')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add selected work/i }));
    fireEvent.change(screen.getByLabelText('Work title'), { target: { value: 'New Studio Study' } });
    fireEvent.click(screen.getByRole('button', { name: /^add work$/i }));
    await waitFor(() => expect(createOwnerPresenceWorkMock).toHaveBeenCalled());
  });

  it('renders the works screen empty state when no works exist', async () => {
    currentPathname = '/app/works';
    getOwnerPresenceNodeWorksMock.mockResolvedValueOnce([]);
    render(<PresenceStudioWorksPage />);

    expect(await screen.findByText('No selected works yet')).toBeInTheDocument();
    expect(screen.getByText(/Add the first work/i)).toBeInTheDocument();
  });

  it('renders the works screen error state when works cannot load', async () => {
    currentPathname = '/app/works';
    getOwnerPresenceNodeWorksMock.mockRejectedValueOnce({ code: 'forbidden', message: 'forbidden' });
    render(<PresenceStudioWorksPage />);

    expect(await screen.findByText('Owner access unavailable')).toBeInTheDocument();
  });

  it('renders the collections screen with loaded owner collections', async () => {
    currentPathname = '/app/collections';
    render(<PresenceStudioCollectionsPage />);

    expect(await screen.findByRole('heading', { name: 'Rooms inside the public world' })).toBeInTheDocument();
    expect(await screen.findByText('Selected Works')).toBeInTheDocument();
    expect(screen.getByText('A small collection.')).toBeInTheDocument();
    expect(screen.getByText('1 works')).toBeInTheDocument();
    expect(screen.getByText('Sort 0')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /new collection/i }));
    fireEvent.change(screen.getByLabelText('Collection title'), { target: { value: 'New Body of Work' } });
    fireEvent.click(screen.getByRole('button', { name: /^create collection$/i }));
    await waitFor(() => expect(createOwnerPresenceCollectionMock).toHaveBeenCalled());
  });

  it('renders the collections screen empty state when no collections exist', async () => {
    currentPathname = '/app/collections';
    getOwnerPresenceNodeCollectionsMock.mockResolvedValueOnce([]);
    render(<PresenceStudioCollectionsPage />);

    expect(await screen.findByText('No collections yet')).toBeInTheDocument();
    expect(screen.getByText(/Create the first body of work/i)).toBeInTheDocument();
  });

  it('renders the enquiries screen with loaded owner enquiries and status updates', async () => {
    currentPathname = '/app/enquiries';
    render(<PresenceStudioEnquiriesPage />);

    expect(await screen.findByRole('heading', { name: 'Opportunity inbox' })).toBeInTheDocument();
    expect(screen.getByText('Ari Visitor')).toBeInTheDocument();
    expect(screen.getByText(/Studio North/)).toBeInTheDocument();
    expect(screen.getByText(/gallery-card/)).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('new'), { target: { value: 'read' } });
    await waitFor(() => expect(updateOwnerPresenceEnquiryMock).toHaveBeenCalledWith(31, 'read'));
  });

  it('renders the QR and NFC screen with canonical URL, QR, and tag creation', async () => {
    currentPathname = '/app/qr-nfc';
    render(<PresenceStudioQrNfcPage />);

    expect(await screen.findByRole('heading', { name: 'Physical-world bridge' })).toBeInTheDocument();
    expect(screen.getByText('http://localhost:3000/p/river-practitioner')).toBeInTheDocument();
    expect(screen.getByAltText(/scanner-grade QR/i)).toHaveAttribute('src', 'http://localhost:5000/api/presence/public/river-practitioner/qr');
    expect(screen.getByText('Gallery card')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Studio door' } });
    fireEvent.change(screen.getByLabelText('Source code'), { target: { value: 'studio-door' } });
    fireEvent.click(screen.getByRole('button', { name: /create source tag/i }));
    await waitFor(() => expect(createOwnerPresenceNfcTagMock).toHaveBeenCalled());
  });

  it('renders the portfolio overview, analytics, and settings screens', async () => {
    currentPathname = '/app/portfolio';
    const portfolio = render(<PresenceStudioPortfolioPage />);
    expect(await screen.findByRole('heading', { name: 'Shape the public world' })).toBeInTheDocument();
    expect(screen.getByText('Selected works are strong enough')).toBeInTheDocument();
    expect(screen.getByText('A body of work is named')).toBeInTheDocument();
    portfolio.unmount();

    currentPathname = '/app/analytics';
    const analytics = render(<PresenceStudioAnalyticsPage />);
    expect(await screen.findByRole('heading', { name: 'Audience signals' })).toBeInTheDocument();
    expect(screen.getByText('gallery-card')).toBeInTheDocument();
    expect(screen.getByText('nfc scanned')).toBeInTheDocument();
    analytics.unmount();

    currentPathname = '/app/settings';
    render(<PresenceStudioSettingsPage />);
    expect(await screen.findByRole('heading', { name: 'Publish safely' })).toBeInTheDocument();
    expect(screen.getByText('Display mode')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /unpublish/i }));
    await waitFor(() => expect(unpublishOwnerPresenceNodeMock).toHaveBeenCalledWith(12));
  });
});
