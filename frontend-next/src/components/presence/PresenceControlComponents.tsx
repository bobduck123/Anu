'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Archive, BarChart3, ClipboardList, Copy, ExternalLink, Eye, FileText, Inbox, PauseCircle, PlayCircle, RadioTower, Save, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  archiveControlPresenceNode,
  createControlPresenceNode,
  createControlPresenceNfcTag,
  createControlPresenceQuote,
  getControlPresenceNode,
  listControlPresenceConnections,
  listControlPresenceCollections,
  listControlPresenceEnquiries,
  listControlPresenceNfcTags,
  listControlPresenceNodes,
  listControlPresenceProof,
  listControlPresenceQuotes,
  listControlPresenceServices,
  listControlPresenceTemplates,
  listControlPresenceHandovers,
  listControlPresenceInvoiceSupport,
  listControlPresenceVariations,
  listControlPresenceWorks,
  publishControlPresenceNode,
  unpublishControlPresenceNode,
  updateControlPresenceCollection,
  updateControlPresenceEnquiry,
  updateControlPresenceNfcTag,
  updateControlPresenceNode,
  updateControlPresenceProcurement,
  updateControlPresenceProof,
  updateControlPresenceQuote,
  updateControlPresenceService,
  updateControlPresenceWork,
  type PresenceConnection,
  type PresenceHandover,
  type PresenceInvoiceSupport,
  type PresenceCollection,
  type PresenceEnquiry,
  type PresenceNfcTag,
  type PresenceNode,
  type PresenceNodeInput,
  type PresenceProofItem,
  type PresenceQuote,
  type PresenceService,
  type PresenceTemplate,
  type PresenceVariation,
  type PresenceWork,
} from '@/lib/api/presence';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { StatusBadge } from '@/ui-system/primitives/StatusBadge';
import { PresenceMediaUrlInput } from './PresenceMediaUrlInput';

const NODE_TYPES = [
  'practitioner',
  'artist',
  'creative',
  'founder',
  'consultant',
  'fractional_executive',
  'advisor',
  'tradie',
  'field_service',
  'venue',
  'organisation',
  'project',
  'event_organiser',
  'community_worker',
  'coach',
  'custom',
];

const DISPLAY_MODES = [
  'profile_card',
  'opportunity_profile',
  'premium_profile',
  'professional_contract',
  'artist_gallery',
  'minimal_portal',
  'gallery_portal',
  'practitioner_profile',
  'tradie_profile',
  'field_service_profile',
  'venue_profile',
  'organisation_profile',
  'white_label_network_entry',
];

const PLAN_TYPES = ['showcase', 'basic', 'opportunity_kit', 'premium', 'professional_contract', 'artist_presence', 'practitioner_presence', 'tradie_field_service', 'organisation_venue', 'white_label_network'];

function jsonText(value: unknown, fallback: unknown) {
  return JSON.stringify(value ?? fallback, null, 2);
}

function parseJsonList(raw: string, label: string) {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON array.`);
    }
    return parsed;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : `${label} is invalid JSON.`);
  }
}

function publicPath(slug: string) {
  return `/p/${encodeURIComponent(slug)}`;
}

export function PresenceNodeAdminTable() {
  const [nodes, setNodes] = useState<PresenceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [nodeType, setNodeType] = useState('');
  const [displayMode, setDisplayMode] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (nodeType) params.node_type = nodeType;
      if (displayMode) params.display_mode = displayMode;
      if (tenantId) params.tenant_id = tenantId;
      if (ownerUserId) params.owner_user_id = ownerUserId;
      if (templateId) params.template_id = templateId;
      setNodes(await listControlPresenceNodes(params));
    } catch (loadError) {
      setNodes([]);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Presence Nodes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return nodes;
    return nodes.filter((node) =>
      [node.display_name, node.slug, node.headline, node.node_type, node.status].some((value) =>
        String(value || '').toLowerCase().includes(normalized),
      ),
    );
  }, [nodes, query]);

  if (loading) {
    return <LoadingState message="Loading Presence Nodes..." />;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border border-white/12 bg-white/[0.06] p-4 lg:grid-cols-[1fr_repeat(6,10rem)_auto]">
        <label className="flex items-center gap-2 rounded-md border border-white/14 bg-[#1e0227]/58 px-3 py-2 text-sm text-white/78">
          <Search className="h-4 w-4" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nodes" className="w-full bg-transparent outline-none" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white">
          <option value="">All statuses</option>
          {['draft', 'pending_review', 'published', 'unpublished', 'suspended', 'archived'].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select value={nodeType} onChange={(event) => setNodeType(event.target.value)} className="rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white">
          <option value="">All types</option>
          {NODE_TYPES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select value={displayMode} onChange={(event) => setDisplayMode(event.target.value)} className="rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white">
          <option value="">All modes</option>
          {DISPLAY_MODES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} placeholder="Tenant ID" className="rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        <input value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)} placeholder="Owner ID" className="rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        <input value={templateId} onChange={(event) => setTemplateId(event.target.value)} placeholder="Template ID" className="rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        <button type="button" onClick={() => void load()} className="rounded-md bg-[#e0b115] px-3 py-2 text-sm font-semibold text-[#1e0227]">
          Filter
        </button>
      </div>

      {error ? <p className="rounded-lg border border-red-200/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No Presence Nodes" description="Create the first node to start the alpha pilot." actionLabel="Create node" actionHref="/control/presence/new" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/12 bg-white/[0.06]">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-white/12 bg-white/[0.06] text-xs uppercase tracking-[0.12em] text-white/58">
              <tr>
                <th className="px-4 py-3">Node</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((node) => (
                <tr key={node.id} className="border-b border-white/8 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{node.display_name}</div>
                    <div className="mt-1 text-xs text-white/56">/{node.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={(node.status || 'draft') as 'active'} dot />
                  </td>
                  <td className="px-4 py-3 text-white/74">
                    <div className="capitalize">{node.node_type.replace(/_/g, ' ')}</div>
                    <div className="mt-1 text-xs text-white/48">{node.display_mode?.replace(/_/g, ' ') || 'profile card'}</div>
                  </td>
                  <td className="px-4 py-3 font-mono-data text-white/74">{node.tenant_id ?? '--'}</td>
                  <td className="px-4 py-3 text-white/66">{node.updated_at ? new Date(node.updated_at).toLocaleDateString() : '--'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/control/presence/${node.id}`} className="rounded-md border border-white/16 px-2 py-1 text-xs text-white">
                        Open
                      </Link>
                      <Link href={`/control/presence/${node.id}/edit`} className="rounded-md border border-white/16 px-2 py-1 text-xs text-white">
                        Edit
                      </Link>
                      <Link href={publicPath(node.slug)} className="rounded-md border border-white/16 px-2 py-1 text-xs text-white">
                        Public
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PresenceTemplatePicker({
  value,
  onChange,
  templates,
}: {
  value?: number | null;
  onChange: (value: number | null) => void;
  templates: PresenceTemplate[];
}) {
  return (
    <select value={value ? String(value) : ''} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} className="rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white">
      <option value="">No template</option>
      {templates.map((template) => (
        <option key={template.id} value={template.id}>
          {template.name}
        </option>
      ))}
    </select>
  );
}

export function PresenceTemplatePreview({ template }: { template?: PresenceTemplate | null }) {
  if (!template) {
    return (
      <div className="rounded-lg border border-white/12 bg-white/[0.05] p-4 text-sm text-white/62">
        Select a template to preview alpha defaults.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-white/12 bg-white/[0.06] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{template.name}</h3>
          <p className="mt-2 text-sm leading-6 text-white/68">{template.description}</p>
        </div>
        {template.is_premium ? <span className="rounded-md bg-[#e0b115]/18 px-2 py-1 text-xs text-[#f6d4cb]">Premium</span> : null}
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-white/52">{template.node_type.replace(/_/g, ' ')}</p>
    </div>
  );
}

export function PresenceNodeEditor({ nodeId }: { nodeId?: number }) {
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [templates, setTemplates] = useState<PresenceTemplate[]>([]);
  const [loading, setLoading] = useState(Boolean(nodeId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<PresenceNodeInput>({
    display_name: '',
    slug: '',
    headline: '',
    bio: '',
    node_type: 'custom',
    display_mode: 'profile_card',
    plan_type: 'basic',
    visibility: 'public',
    status: 'draft',
    landing_enabled: false,
    landing_title: '',
    landing_subtitle: '',
    landing_background_url: '',
    landing_enter_label: 'Enter',
    practice_statement: '',
    curatorial_statement: '',
    capability_statement: '',
    proof_summary: '',
    procurement_summary: '',
    business_functions_enabled: false,
    directory_ready: false,
    map_ready: false,
    archive_ready: false,
    marketplace_ready: false,
    white_label_ready: false,
    links: [{ label: 'Website', url: 'https://example.org', link_type: 'website' }],
    services: [],
    proof_items: [],
    credentials: [],
    procurement_profile: null,
    collections: [],
    works: [],
    portfolio_items: [],
    availability_chips: [{ label: 'Taking enquiries', chip_type: 'availability' }],
    business_functions: [],
    sections: [],
  });
  const [linksText, setLinksText] = useState(jsonText(payload.links, []));
  const [servicesText, setServicesText] = useState(jsonText(payload.services, []));
  const [proofText, setProofText] = useState(jsonText(payload.proof_items, []));
  const [credentialsText, setCredentialsText] = useState(jsonText(payload.credentials, []));
  const [procurementText, setProcurementText] = useState(jsonText(payload.procurement_profile, {}));
  const [collectionsText, setCollectionsText] = useState(jsonText(payload.collections, []));
  const [worksText, setWorksText] = useState(jsonText(payload.works, []));
  const [portfolioText, setPortfolioText] = useState(jsonText(payload.portfolio_items, []));
  const [chipsText, setChipsText] = useState(jsonText(payload.availability_chips, []));
  const [businessFunctionsText, setBusinessFunctionsText] = useState(jsonText(payload.business_functions, []));
  const [sectionsText, setSectionsText] = useState(jsonText(payload.sections, []));

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [templateRows, loadedNode] = await Promise.all([
          listControlPresenceTemplates(),
          nodeId ? getControlPresenceNode(nodeId) : Promise.resolve(null),
        ]);
        if (!active) return;
        setTemplates(templateRows);
        if (loadedNode) {
          setNode(loadedNode);
          setPayload(loadedNode);
          setLinksText(jsonText(loadedNode.links, []));
          setServicesText(jsonText(loadedNode.services, []));
          setProofText(jsonText(loadedNode.proof_items, []));
          setCredentialsText(jsonText(loadedNode.credentials, []));
          setProcurementText(jsonText(loadedNode.procurement_profile, {}));
          setCollectionsText(jsonText(loadedNode.collections, []));
          setWorksText(jsonText(loadedNode.works, []));
          setPortfolioText(jsonText(loadedNode.portfolio_items, []));
          setChipsText(jsonText(loadedNode.availability_chips, []));
          setBusinessFunctionsText(jsonText(loadedNode.business_functions, []));
          setSectionsText(jsonText(loadedNode.sections, []));
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load Presence Node.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [nodeId]);

  const selectedTemplate = templates.find((template) => template.id === payload.template_id);

  const updateField = <K extends keyof PresenceNodeInput>(key: K, value: PresenceNodeInput[K]) => {
    setPayload((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body: PresenceNodeInput = {
        ...payload,
        links: parseJsonList(linksText, 'Links'),
        services: parseJsonList(servicesText, 'Services'),
        proof_items: parseJsonList(proofText, 'Proof items'),
        credentials: parseJsonList(credentialsText, 'Credentials'),
        procurement_profile: JSON.parse(procurementText || '{}'),
        collections: parseJsonList(collectionsText, 'Collections'),
        works: parseJsonList(worksText, 'Selected works'),
        portfolio_items: parseJsonList(portfolioText, 'Portfolio items'),
        availability_chips: parseJsonList(chipsText, 'Availability chips'),
        business_functions: parseJsonList(businessFunctionsText, 'Business functions'),
        sections: parseJsonList(sectionsText, 'Sections'),
      };
      const saved = nodeId ? await updateControlPresenceNode(nodeId, body) : await createControlPresenceNode(body);
      setNode(saved);
      setPayload(saved);
      setMessage('Presence Node saved.');
      if (!nodeId) {
        window.history.replaceState(null, '', `/control/presence/${saved.id}/edit`);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save Presence Node.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading editor..." />;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="space-y-4 rounded-lg border border-white/12 bg-white/[0.06] p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-white/78">
            Display name
            <input value={payload.display_name || ''} onChange={(event) => updateField('display_name', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Slug
            <input value={payload.slug || ''} onChange={(event) => updateField('slug', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-white/78 md:col-span-2">
            Headline
            <input value={payload.headline || ''} onChange={(event) => updateField('headline', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Type
            <select value={payload.node_type || 'custom'} onChange={(event) => updateField('node_type', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white">
              {NODE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Template
            <PresenceTemplatePicker value={payload.template_id} onChange={(value) => updateField('template_id', value)} templates={templates} />
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Display mode
            <select value={payload.display_mode || 'profile_card'} onChange={(event) => updateField('display_mode', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white">
              {DISPLAY_MODES.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Tier
            <select value={payload.plan_type || 'basic'} onChange={(event) => updateField('plan_type', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white">
              {PLAN_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Visual mood
            <input value={payload.visual_mood || ''} onChange={(event) => updateField('visual_mood', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Tenant ID
            <input value={payload.tenant_id ?? ''} onChange={(event) => updateField('tenant_id', event.target.value ? Number(event.target.value) : null)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Organisation ID
            <input value={payload.organisation_id ?? ''} onChange={(event) => updateField('organisation_id', event.target.value ? Number(event.target.value) : null)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Visibility
            <select value={payload.visibility || 'public'} onChange={(event) => updateField('visibility', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white">
              <option value="public">public</option>
              <option value="unlisted">unlisted</option>
              <option value="private">private</option>
              <option value="admin-only">admin-only</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Location
            <input value={payload.location_label || ''} onChange={(event) => updateField('location_label', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Service area
            <input value={payload.service_area || ''} onChange={(event) => updateField('service_area', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Public email
            <input value={payload.public_email || ''} onChange={(event) => updateField('public_email', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-white/78">
            Public phone
            <input value={payload.public_phone || ''} onChange={(event) => updateField('public_phone', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <PresenceMediaUrlInput
            label="Profile image URL"
            value={payload.profile_image_url}
            onChange={(value) => updateField('profile_image_url', value)}
            alt="Profile image preview"
          />
          <PresenceMediaUrlInput
            label="Cover image URL"
            value={payload.cover_image_url}
            onChange={(value) => updateField('cover_image_url', value)}
            alt="Cover image preview"
          />
        </div>

        <PresencePortalSettingsEditor payload={payload} updateField={updateField} />
        <PresenceStatementEditor payload={payload} updateField={updateField} />
        <PresenceReadinessEditor payload={payload} updateField={updateField} />

        <label className="space-y-2 text-sm text-white/78">
          Bio
          <textarea value={payload.bio || ''} onChange={(event) => updateField('bio', event.target.value)} className="min-h-32 w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        </label>

        <JsonEditor label="Links JSON" value={linksText} onChange={setLinksText} />
        <PresenceServicesEditor value={servicesText} onChange={setServicesText} nodeId={nodeId} />
        <PresenceProofEditor value={proofText} onChange={setProofText} nodeId={nodeId} />
        <JsonEditor label="Credentials JSON" value={credentialsText} onChange={setCredentialsText} />
        <PresenceProcurementEditor value={procurementText} onChange={setProcurementText} nodeId={nodeId} />
        <PresenceCollectionsEditor value={collectionsText} onChange={setCollectionsText} nodeId={nodeId} />
        <PresenceWorksEditor value={worksText} onChange={setWorksText} nodeId={nodeId} />
        <JsonEditor label="Portfolio JSON" value={portfolioText} onChange={setPortfolioText} />
        <JsonEditor label="Availability chips JSON" value={chipsText} onChange={setChipsText} />
        <JsonEditor label="Business functions JSON" value={businessFunctionsText} onChange={setBusinessFunctionsText} />
        <JsonEditor label="Sections JSON" value={sectionsText} onChange={setSectionsText} />

        {error ? <p className="rounded-lg border border-red-200/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
        {message ? <p className="rounded-lg border border-emerald-200/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p> : null}

        <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-[#e0b115] px-4 py-2 text-sm font-semibold text-[#1e0227] disabled:opacity-60">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save node'}
        </button>
      </section>

      <aside className="space-y-4">
        <PresenceTemplatePreview template={selectedTemplate} />
        {node ? <PresencePublishPanel node={node} onChange={setNode} /> : null}
      </aside>
    </div>
  );
}

function JsonEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 text-sm text-white/78">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} spellCheck={false} className="min-h-28 w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 font-mono text-xs leading-5 text-white outline-none" />
    </label>
  );
}

type EditorUpdateField = (key: keyof PresenceNodeInput, value: PresenceNodeInput[keyof PresenceNodeInput]) => void;

export function PresencePortalSettingsEditor({ payload, updateField }: { payload: PresenceNodeInput; updateField: EditorUpdateField }) {
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Portal settings</h2>
        <label className="inline-flex items-center gap-2 text-sm text-white/72">
          <input type="checkbox" checked={Boolean(payload.landing_enabled)} onChange={(event) => updateField('landing_enabled', event.target.checked)} />
          Landing enabled
        </label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm text-white/78">
          Landing title
          <input value={payload.landing_title || ''} onChange={(event) => updateField('landing_title', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm text-white/78">
          Enter label
          <input value={payload.landing_enter_label || ''} onChange={(event) => updateField('landing_enter_label', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm text-white/78 md:col-span-2">
          Landing subtitle
          <input value={payload.landing_subtitle || ''} onChange={(event) => updateField('landing_subtitle', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <div className="md:col-span-2">
          <PresenceMediaUrlInput
            label="Landing background URL"
            value={payload.landing_background_url}
            onChange={(value) => updateField('landing_background_url', value)}
            alt="Landing background preview"
          />
        </div>
      </div>
    </section>
  );
}

export function PresenceStatementEditor({ payload, updateField }: { payload: PresenceNodeInput; updateField: EditorUpdateField }) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <label className="space-y-2 text-sm text-white/78">
        Practice statement
        <textarea value={payload.practice_statement || ''} onChange={(event) => updateField('practice_statement', event.target.value)} className="min-h-32 w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
      </label>
      <label className="space-y-2 text-sm text-white/78">
        Curatorial statement
        <textarea value={payload.curatorial_statement || ''} onChange={(event) => updateField('curatorial_statement', event.target.value)} className="min-h-32 w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
      </label>
      <label className="space-y-2 text-sm text-white/78">
        Capability statement
        <textarea value={payload.capability_statement || ''} onChange={(event) => updateField('capability_statement', event.target.value)} className="min-h-32 w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
      </label>
      <label className="space-y-2 text-sm text-white/78">
        Proof summary
        <textarea value={payload.proof_summary || ''} onChange={(event) => updateField('proof_summary', event.target.value)} className="min-h-32 w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
      </label>
      <label className="space-y-2 text-sm text-white/78 md:col-span-2">
        Procurement summary
        <textarea value={payload.procurement_summary || ''} onChange={(event) => updateField('procurement_summary', event.target.value)} className="min-h-24 w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
      </label>
    </section>
  );
}

export function PresenceReadinessEditor({ payload, updateField }: { payload: PresenceNodeInput; updateField: EditorUpdateField }) {
  const flags: Array<[keyof PresenceNodeInput, string]> = [
    ['business_functions_enabled', 'Business functions'],
    ['directory_ready', 'Directory ready'],
    ['map_ready', 'Map ready'],
    ['archive_ready', 'Archive ready'],
    ['marketplace_ready', 'Marketplace ready'],
    ['white_label_ready', 'White-label ready'],
  ];
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.04] p-4">
      <h2 className="text-base font-semibold text-white">Network readiness</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {flags.map(([key, label]) => (
          <label key={key} className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-[#1e0227]/48 px-3 py-2 text-sm text-white/76">
            <input type="checkbox" checked={Boolean(payload[key])} onChange={(event) => updateField(key, event.target.checked)} />
            {label}
          </label>
        ))}
      </div>
    </section>
  );
}

function appendJsonListItem(value: string, onChange: (value: string) => void, item: Record<string, unknown>, label: string) {
  const rows = parseJsonList(value, label);
  onChange(jsonText([...rows, item], []));
}

export function PresenceCollectionsEditor({ value, onChange, nodeId }: { value: string; onChange: (value: string) => void; nodeId?: number }) {
  const [rows, setRows] = useState<PresenceCollection[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!nodeId) return;
    setLoading(true);
    try {
      const collections = await listControlPresenceCollections(nodeId);
      setRows(collections);
      onChange(jsonText(collections, []));
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (collection: PresenceCollection) => {
    if (!collection.id) return;
    const updated = await updateControlPresenceCollection(collection.id, { is_visible: !collection.is_visible });
    const next = rows.map((row) => (row.id === updated.id ? updated : row));
    setRows(next);
    onChange(jsonText(next, []));
  };

  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Collections</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => appendJsonListItem(value, onChange, { title: 'New collection', description: '', is_visible: true }, 'Collections')} className="rounded-md border border-white/16 px-3 py-2 text-sm text-white">
            Add collection
          </button>
          {nodeId ? (
            <button type="button" onClick={() => void refresh()} className="rounded-md border border-white/16 px-3 py-2 text-sm text-white">
              {loading ? 'Loading...' : 'Sync live'}
            </button>
          ) : null}
        </div>
      </div>
      {rows.length ? (
        <div className="mt-3 grid gap-2">
          {rows.map((row) => (
            <div key={row.id || row.title} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#1e0227]/52 px-3 py-2 text-sm text-white/72">
              <span>{row.title}</span>
              <button type="button" onClick={() => void toggle(row)} className="rounded-md border border-white/14 px-2 py-1 text-xs text-white">
                {row.is_visible ? 'Hide' : 'Show'}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3">
        <JsonEditor label="Collections JSON" value={value} onChange={onChange} />
      </div>
    </section>
  );
}

export function PresenceWorkForm({ onAdd }: { onAdd: (item: Record<string, unknown>) => void }) {
  return (
    <button
      type="button"
      onClick={() =>
        onAdd({
          title: 'Untitled selected work',
          year: '2026',
          medium: '',
          dimensions: '',
          description: '',
          image_url: '',
          availability_status: 'available',
          is_visible: true,
        })
      }
      className="rounded-md border border-white/16 px-3 py-2 text-sm text-white"
    >
      Add selected work
    </button>
  );
}

export function PresenceWorksEditor({ value, onChange, nodeId }: { value: string; onChange: (value: string) => void; nodeId?: number }) {
  const [rows, setRows] = useState<PresenceWork[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!nodeId) return;
    setLoading(true);
    try {
      const works = await listControlPresenceWorks(nodeId);
      setRows(works);
      onChange(jsonText(works, []));
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (work: PresenceWork) => {
    if (!work.id) return;
    const updated = await updateControlPresenceWork(work.id, { is_visible: !work.is_visible });
    const next = rows.map((row) => (row.id === updated.id ? updated : row));
    setRows(next);
    onChange(jsonText(next, []));
  };

  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Selected works</h2>
        <div className="flex flex-wrap gap-2">
          <PresenceWorkForm onAdd={(item) => appendJsonListItem(value, onChange, item, 'Selected works')} />
          {nodeId ? (
            <button type="button" onClick={() => void refresh()} className="rounded-md border border-white/16 px-3 py-2 text-sm text-white">
              {loading ? 'Loading...' : 'Sync live'}
            </button>
          ) : null}
        </div>
      </div>
      {rows.length ? (
        <div className="mt-3 grid gap-2">
          {rows.map((row) => (
            <div key={row.id || row.title} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#1e0227]/52 px-3 py-2 text-sm text-white/72">
              <span>{row.title}</span>
              <button type="button" onClick={() => void toggle(row)} className="rounded-md border border-white/14 px-2 py-1 text-xs text-white">
                {row.is_visible ? 'Hide' : 'Show'}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3">
        <JsonEditor label="Selected works JSON" value={value} onChange={onChange} />
      </div>
    </section>
  );
}

export function PresenceServicesEditor({ value, onChange, nodeId }: { value: string; onChange: (value: string) => void; nodeId?: number }) {
  const [rows, setRows] = useState<PresenceService[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!nodeId) return;
    setLoading(true);
    try {
      const services = await listControlPresenceServices(nodeId);
      setRows(services);
      onChange(jsonText(services, []));
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (service: PresenceService) => {
    if (!service.id) return;
    const updated = await updateControlPresenceService(service.id, { is_visible: !service.is_visible });
    const next = rows.map((row) => (row.id === updated.id ? updated : row));
    setRows(next);
    onChange(jsonText(next, []));
  };

  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Services and offers</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => appendJsonListItem(value, onChange, { title: 'New offer', description: '', price_label: 'Quote on request', is_visible: true }, 'Services')} className="rounded-md border border-white/16 px-3 py-2 text-sm text-white">
            Add offer
          </button>
          {nodeId ? (
            <button type="button" onClick={() => void refresh()} className="rounded-md border border-white/16 px-3 py-2 text-sm text-white">
              {loading ? 'Loading...' : 'Sync live'}
            </button>
          ) : null}
        </div>
      </div>
      {rows.length ? (
        <div className="mt-3 grid gap-2">
          {rows.map((row) => (
            <div key={row.id || row.title} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#1e0227]/52 px-3 py-2 text-sm text-white/72">
              <span>{row.title}</span>
              <button type="button" onClick={() => void toggle(row)} className="rounded-md border border-white/14 px-2 py-1 text-xs text-white">
                {row.is_visible ? 'Hide' : 'Show'}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3">
        <JsonEditor label="Services JSON" value={value} onChange={onChange} />
      </div>
    </section>
  );
}

export function PresenceOfferEditor(props: { value: string; onChange: (value: string) => void; nodeId?: number }) {
  return <PresenceServicesEditor {...props} />;
}

export function PresenceProofEditor({ value, onChange, nodeId }: { value: string; onChange: (value: string) => void; nodeId?: number }) {
  const [rows, setRows] = useState<PresenceProofItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!nodeId) return;
    setLoading(true);
    try {
      const proof = await listControlPresenceProof(nodeId);
      setRows(proof);
      onChange(jsonText(proof, []));
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (proof: PresenceProofItem) => {
    if (!proof.id) return;
    const updated = await updateControlPresenceProof(proof.id, { is_public: !proof.is_public });
    const next = rows.map((row) => (row.id === updated.id ? updated : row));
    setRows(next);
    onChange(jsonText(next, []));
  };

  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Proof and case studies</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => appendJsonListItem(value, onChange, { title: 'New proof item', challenge: '', outcome: '', is_public: true }, 'Proof items')} className="rounded-md border border-white/16 px-3 py-2 text-sm text-white">
            Add proof
          </button>
          {nodeId ? (
            <button type="button" onClick={() => void refresh()} className="rounded-md border border-white/16 px-3 py-2 text-sm text-white">
              {loading ? 'Loading...' : 'Sync live'}
            </button>
          ) : null}
        </div>
      </div>
      {rows.length ? (
        <div className="mt-3 grid gap-2">
          {rows.map((row) => (
            <div key={row.id || row.title} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#1e0227]/52 px-3 py-2 text-sm text-white/72">
              <span>{row.title}</span>
              <button type="button" onClick={() => void toggle(row)} className="rounded-md border border-white/14 px-2 py-1 text-xs text-white">
                {row.is_public ? 'Make private' : 'Make public'}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3">
        <JsonEditor label="Proof JSON" value={value} onChange={onChange} />
      </div>
    </section>
  );
}

export function PresenceProcurementEditor({ value, onChange, nodeId }: { value: string; onChange: (value: string) => void; nodeId?: number }) {
  const [saving, setSaving] = useState(false);
  const sync = async () => {
    if (!nodeId) return;
    setSaving(true);
    try {
      const payload = JSON.parse(value || '{}');
      const saved = await updateControlPresenceProcurement(nodeId, payload);
      onChange(jsonText(saved, {}));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Procurement profile</h2>
        {nodeId ? (
          <button type="button" onClick={() => void sync()} className="rounded-md border border-white/16 px-3 py-2 text-sm text-white">
            {saving ? 'Saving...' : 'Save procurement'}
          </button>
        ) : null}
      </div>
      <div className="mt-3">
        <JsonEditor label="Procurement JSON" value={value} onChange={onChange} />
      </div>
    </section>
  );
}

export function PresencePublishPanel({ node, onChange }: { node: PresenceNode; onChange: (node: PresenceNode) => void }) {
  const [mutating, setMutating] = useState(false);
  const [copied, setCopied] = useState(false);
  const publicUrl = typeof window === 'undefined' ? `/p/${node.slug}` : `${window.location.origin}/p/${node.slug}`;

  const mutate = async (action: 'publish' | 'unpublish' | 'archive') => {
    setMutating(true);
    try {
      const next =
        action === 'publish'
          ? await publishControlPresenceNode(node.id)
          : action === 'unpublish'
            ? await unpublishControlPresenceNode(node.id)
            : await archiveControlPresenceNode(node.id);
      onChange(next);
    } finally {
      setMutating(false);
    }
  };

  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.06] p-4">
      <h2 className="text-base font-semibold text-white">Publish controls</h2>
      <div className="mt-3 text-sm text-white/68">
        <p>Status: <span className="font-semibold text-white">{node.status}</span></p>
        <p className="mt-1">Public route: <span className="break-all font-mono text-xs">{publicUrl}</span></p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={mutating} onClick={() => void mutate('publish')} className="inline-flex items-center gap-2 rounded-md border border-emerald-200/30 px-3 py-2 text-sm text-white">
          <PlayCircle className="h-4 w-4" />
          Publish
        </button>
        <button type="button" disabled={mutating} onClick={() => void mutate('unpublish')} className="inline-flex items-center gap-2 rounded-md border border-white/18 px-3 py-2 text-sm text-white">
          <PauseCircle className="h-4 w-4" />
          Unpublish
        </button>
        <button type="button" disabled={mutating} onClick={() => void mutate('archive')} className="inline-flex items-center gap-2 rounded-md border border-red-200/30 px-3 py-2 text-sm text-white">
          <Archive className="h-4 w-4" />
          Archive
        </button>
        <Link href={`/p/${node.slug}`} className="inline-flex items-center gap-2 rounded-md border border-white/18 px-3 py-2 text-sm text-white">
          <ExternalLink className="h-4 w-4" />
          Preview
        </Link>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
          className="inline-flex items-center gap-2 rounded-md border border-white/18 px-3 py-2 text-sm text-white"
        >
          <Copy className="h-4 w-4" />
          {copied ? 'Copied' : 'Copy URL'}
        </button>
      </div>
    </section>
  );
}

export function PresenceEnquiryInbox({ nodeId }: { nodeId: number }) {
  const [enquiries, setEnquiries] = useState<PresenceEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setEnquiries(await listControlPresenceEnquiries(nodeId, status ? { status } : {}));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load enquiries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  const setEnquiryStatus = async (id: number, nextStatus: string) => {
    const updated = await updateControlPresenceEnquiry(id, nextStatus);
    setEnquiries((current) => current.map((item) => (item.id === id ? updated : item)));
  };

  if (loading) {
    return <LoadingState message="Loading enquiries..." />;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3 rounded-lg border border-white/12 bg-white/[0.06] p-4">
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white">
          <option value="">All enquiries</option>
          {['new', 'read', 'replied', 'converted', 'archived', 'spam', 'deleted'].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void load()} className="rounded-md bg-[#e0b115] px-3 py-2 text-sm font-semibold text-[#1e0227]">
          Filter
        </button>
      </div>
      {error ? <p className="rounded-lg border border-red-200/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
      {enquiries.length === 0 ? (
        <EmptyState icon={Inbox} title="No enquiries" description="New public enquiries will appear here." />
      ) : (
        <div className="grid gap-3">
          {enquiries.map((enquiry) => (
            <article key={enquiry.id} className="rounded-lg border border-white/12 bg-white/[0.06] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{enquiry.name}</h3>
                  <p className="mt-1 text-sm text-white/66">{enquiry.email} {enquiry.phone ? `- ${enquiry.phone}` : ''}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/48">{enquiry.enquiry_type}</p>
                </div>
                <select value={enquiry.status} onChange={(event) => void setEnquiryStatus(enquiry.id, event.target.value)} className="rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white">
                  {['new', 'read', 'replied', 'converted', 'archived', 'spam', 'deleted'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/78">{enquiry.message}</p>
              <p className="mt-3 text-xs text-white/48">Source: {enquiry.source_url || 'not provided'} - {enquiry.created_at ? new Date(enquiry.created_at).toLocaleString() : '--'}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function PresenceAnalyticsSummary({ node }: { node: PresenceNode }) {
  const analytics = node.analytics;
  if (!analytics) {
    return null;
  }
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <Metric icon={Eye} label="Views" value={String(analytics.total_views)} />
      <Metric icon={Inbox} label="Enquiries" value={String(analytics.total_enquiries)} />
      <Metric icon={BarChart3} label="Quotes" value={String(analytics.quote_requests || 0)} />
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/[0.06] p-4">
      <Icon className="h-4 w-4 text-[#e0b115]" />
      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-white/52">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function PresenceNfcTagManager({ nodeId }: { nodeId: number }) {
  const [rows, setRows] = useState<PresenceNfcTag[]>([]);
  const [label, setLabel] = useState('NFC business card');
  const [sourceCode, setSourceCode] = useState('nfc-card');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listControlPresenceNfcTags(nodeId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  const add = async () => {
    const created = await createControlPresenceNfcTag(nodeId, { label, source_code: sourceCode, tag_type: 'business_card', is_active: true });
    setRows((current) => [created, ...current]);
  };

  const toggle = async (tag: PresenceNfcTag) => {
    if (!tag.id) return;
    const updated = await updateControlPresenceNfcTag(tag.id, { is_active: !tag.is_active });
    setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
  };

  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.06] p-5">
      <div className="flex items-center gap-2">
        <RadioTower className="h-4 w-4 text-[#e0b115]" />
        <h2 className="text-base font-semibold text-white">NFC tag manager</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input value={label} onChange={(event) => setLabel(event.target.value)} className="rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        <input value={sourceCode} onChange={(event) => setSourceCode(event.target.value)} className="rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        <button type="button" onClick={() => void add()} className="rounded-md bg-[#e0b115] px-3 py-2 text-sm font-semibold text-[#1e0227]">
          Add tag
        </button>
      </div>
      {loading ? <p className="mt-3 text-sm text-white/62">Loading tags...</p> : null}
      <div className="mt-4 grid gap-2">
        {rows.map((tag) => (
          <div key={tag.id || tag.source_code} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-[#1e0227]/52 px-3 py-2 text-sm text-white/72">
            <span>{tag.label} / {tag.source_code}</span>
            <button type="button" onClick={() => void toggle(tag)} className="rounded-md border border-white/14 px-2 py-1 text-xs text-white">
              {tag.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PresenceRelationshipLedger({ nodeId }: { nodeId: number }) {
  const [rows, setRows] = useState<PresenceConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const connections = await listControlPresenceConnections(nodeId);
        if (active) setRows(connections);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [nodeId]);

  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.06] p-5">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-[#e0b115]" />
        <h2 className="text-base font-semibold text-white">Relationship Ledger</h2>
      </div>
      {loading ? <p className="mt-3 text-sm text-white/62">Loading connections...</p> : null}
      {!loading && rows.length === 0 ? <p className="mt-3 text-sm text-white/62">No named connections yet. Anonymous NFC scans remain interaction records until details are submitted.</p> : null}
      <div className="mt-4 grid gap-3">
        {rows.map((connection) => (
          <article key={connection.id} className="rounded-md border border-white/10 bg-[#1e0227]/52 p-3">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{connection.contact_name || connection.organisation || 'Named connection'}</h3>
                <p className="mt-1 text-xs text-white/54">{[connection.contact_email, connection.contact_phone].filter(Boolean).join(' / ')}</p>
              </div>
              <span className="rounded-md bg-white/[0.08] px-2 py-1 text-xs text-white/72">{connection.status}</span>
            </div>
            <p className="mt-2 text-xs text-white/50">Source: {connection.source_type}{connection.source_tag_id ? ` / tag ${connection.source_tag_id}` : ''}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PresenceInteractionTimeline({ connections }: { connections?: PresenceConnection[] }) {
  const interactions = (connections || []).flatMap((connection) => connection.interactions || []);
  if (!interactions.length) return null;
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.06] p-5">
      <h2 className="text-base font-semibold text-white">Interaction timeline</h2>
      <div className="mt-4 grid gap-2">
        {interactions.map((interaction) => (
          <div key={interaction.id} className="rounded-md border border-white/10 bg-[#1e0227]/52 px-3 py-2 text-sm text-white/72">
            {interaction.interaction_type} / {interaction.occurred_at ? new Date(interaction.occurred_at).toLocaleString() : '--'}
          </div>
        ))}
      </div>
    </section>
  );
}

export function PresenceQuoteManager({ nodeId }: { nodeId: number }) {
  const [rows, setRows] = useState<PresenceQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listControlPresenceQuotes(nodeId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  const add = async () => {
    const created = await createControlPresenceQuote(nodeId, { title: 'New alpha quote', status: 'draft', currency: 'AUD', description: 'Quote foundation record.' });
    setRows((current) => [created, ...current]);
  };

  const markSent = async (quote: PresenceQuote) => {
    const updated = await updateControlPresenceQuote(quote.id, { status: 'sent' });
    setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
  };

  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.06] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Quote foundation</h2>
        <button type="button" onClick={() => void add()} className="rounded-md border border-white/16 px-3 py-2 text-sm text-white">
          Create quote
        </button>
      </div>
      {loading ? <p className="mt-3 text-sm text-white/62">Loading quotes...</p> : null}
      <div className="mt-4 grid gap-2">
        {rows.map((quote) => (
          <div key={quote.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-[#1e0227]/52 px-3 py-2 text-sm text-white/72">
            <span>{quote.title} / {quote.status}</span>
            <button type="button" onClick={() => void markSent(quote)} className="rounded-md border border-white/14 px-2 py-1 text-xs text-white">
              Mark sent
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PresenceVariationManager({ nodeId }: { nodeId: number }) {
  const [rows, setRows] = useState<PresenceVariation[]>([]);
  useEffect(() => {
    void listControlPresenceVariations(nodeId).then(setRows).catch(() => setRows([]));
  }, [nodeId]);
  return <SimpleRows title="Variation foundation" rows={rows.map((row) => `${row.title} / ${row.status}`)} />;
}

export function PresenceInvoiceSupportPanel({ nodeId }: { nodeId: number }) {
  const [rows, setRows] = useState<PresenceInvoiceSupport[]>([]);
  useEffect(() => {
    void listControlPresenceInvoiceSupport(nodeId).then(setRows).catch(() => setRows([]));
  }, [nodeId]);
  return <SimpleRows title="Invoice support foundation" rows={rows.map((row) => `${row.invoice_number || row.id} / ${row.status}`)} />;
}

export function PresenceHandoverManager({ nodeId }: { nodeId: number }) {
  const [rows, setRows] = useState<PresenceHandover[]>([]);
  useEffect(() => {
    void listControlPresenceHandovers(nodeId).then(setRows).catch(() => setRows([]));
  }, [nodeId]);
  return <SimpleRows title="Handover foundation" rows={rows.map((row) => `${row.summary || row.id} / ${row.customer_acceptance_status || 'pending'}`)} />;
}

function SimpleRows({ title, rows }: { title: string; rows: string[] }) {
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.06] p-5">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {rows.length ? (
        <div className="mt-4 grid gap-2">
          {rows.map((row) => (
            <div key={row} className="rounded-md border border-white/10 bg-[#1e0227]/52 px-3 py-2 text-sm text-white/72">
              {row}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-white/62">No records yet.</p>
      )}
    </section>
  );
}

export function PresenceNodeControlDetail({ nodeId }: { nodeId: number }) {
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const payload = await getControlPresenceNode(nodeId);
        if (active) setNode(payload);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load Presence Node.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [nodeId]);

  if (loading) {
    return <LoadingState message="Loading Presence Node..." />;
  }
  if (error || !node) {
    return <p className="rounded-lg border border-red-200/30 bg-red-500/10 p-4 text-sm text-red-100">{error || 'Presence Node not found.'}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-lg border border-white/12 bg-white/[0.06] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-white/52">/{node.slug}</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">{node.display_name}</h1>
              {node.headline ? <p className="mt-2 text-sm leading-6 text-white/70">{node.headline}</p> : null}
            </div>
            <StatusBadge status={node.status} dot />
          </div>
          <div className="mt-5 grid gap-3 text-sm text-white/68 sm:grid-cols-3">
            <p>Type: <span className="text-white">{node.node_type.replace(/_/g, ' ')}</span></p>
            <p>Mode: <span className="text-white">{node.display_mode?.replace(/_/g, ' ')}</span></p>
            <p>Tier: <span className="text-white">{node.plan_type?.replace(/_/g, ' ') || 'basic'}</span></p>
            <p>Tenant: <span className="text-white">{node.tenant_id ?? '--'}</span></p>
            <p>Visibility: <span className="text-white">{node.visibility}</span></p>
            <p>Readiness: <span className="text-white">{[node.directory_ready && 'directory', node.map_ready && 'map', node.archive_ready && 'archive', node.marketplace_ready && 'market'].filter(Boolean).join(', ') || '--'}</span></p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/control/presence/${node.id}/edit`} className="rounded-md bg-[#e0b115] px-3 py-2 text-sm font-semibold text-[#1e0227]">
              Edit
            </Link>
            <Link href={`/control/presence/${node.id}/enquiries`} className="rounded-md border border-white/16 px-3 py-2 text-sm font-semibold text-white">
              Enquiries
            </Link>
            <Link href={`/p/${node.slug}`} className="rounded-md border border-white/16 px-3 py-2 text-sm font-semibold text-white">
              Public route
            </Link>
          </div>
        </section>
        <PresencePublishPanel node={node} onChange={setNode} />
      </div>
      <PresenceAnalyticsSummary node={node} />
      <section className="rounded-lg border border-white/12 bg-white/[0.06] p-5">
        <h2 className="text-base font-semibold text-white">Recent analytics</h2>
        {node.analytics?.recent_events?.length ? (
          <div className="mt-4 grid gap-2">
            {node.analytics.recent_events.slice(0, 10).map((event) => (
              <div key={event.id} className="flex flex-wrap justify-between gap-3 rounded-md border border-white/10 bg-[#1e0227]/52 px-3 py-2 text-sm">
                <span className="text-white">{event.event_type}</span>
                <span className="text-white/56">{event.created_at ? new Date(event.created_at).toLocaleString() : '--'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-white/62">No analytics events captured yet.</p>
        )}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <PresenceNfcTagManager nodeId={node.id} />
        <PresenceRelationshipLedger nodeId={node.id} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <PresenceQuoteManager nodeId={node.id} />
        <PresenceVariationManager nodeId={node.id} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <PresenceInvoiceSupportPanel nodeId={node.id} />
        <PresenceHandoverManager nodeId={node.id} />
      </div>
    </div>
  );
}

export function PresenceTemplatesControlPanel() {
  const [templates, setTemplates] = useState<PresenceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await listControlPresenceTemplates();
        if (active) setTemplates(rows);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load templates.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingState message="Loading templates..." />;
  }

  return (
    <section className="space-y-4">
      {error ? <p className="rounded-lg border border-red-200/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <PresenceTemplatePreview key={template.id} template={template} />
        ))}
      </div>
    </section>
  );
}
