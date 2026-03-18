/**
 * Tenant Management API Client
 * 
 * Provides functions for managing white-label tenant sites including:
 * - Tenant provisioning
 * - Domain management
 * - Branding configuration
 * - Module access control
 */

import { apiFetch } from './client';

// Types
export interface TenantNode {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'pending' | 'suspended';
  is_default?: boolean;
  created_at?: string;
}

export interface TenantDomain {
  id: number;
  domain: string;
  status: 'active' | 'pending' | 'verification_pending';
  tls_ready: boolean;
  created_at?: string;
  verification?: DnsVerificationRecord[];
}

export interface DnsVerificationRecord {
  type: string;
  name: string;
  value: string;
  reason?: string;
}

export interface TenantBranding {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
  favicon_url?: string;
  custom_css?: string;
}

export interface TenantModules {
  marketplace?: boolean;
  calendar?: boolean;
  education?: boolean;
  community?: boolean;
  costLowering?: boolean;
  impact?: boolean;
  relief?: boolean;
  governance?: boolean;
  [key: string]: boolean | undefined;
}

export interface TenantWhiteLabelConfig {
  enabled: boolean;
  hide_platform_branding?: boolean;
  custom_footer?: string;
  support_email?: string;
}

export interface TenantConfig {
  modules: TenantModules;
  branding: TenantBranding;
  white_label: TenantWhiteLabelConfig;
  data_policy: number;
  calendar?: {
    mode: 'shifts' | 'events' | 'booking';
  };
}

export interface TenantSummary {
  id: number;
  name: string;
  slug?: string;
  status?: string;
  member_count: number;
}

export interface TenantDetail {
  node: TenantNode;
  config: TenantConfig;
  domains: TenantDomain[];
  member_count: number;
}

export interface ProvisionTenantInput {
  name: string;
  slug?: string;
  domains?: string[];
  branding?: TenantBranding;
  modules?: TenantModules;
  white_label?: TenantWhiteLabelConfig;
  admin_email?: string;
  data_policy?: number;
}

export interface ProvisionTenantResult {
  node: TenantNode;
  config: TenantConfig;
  domains: {
    provisioned: Array<TenantDomain & { error?: string }>;
    failed: Array<{ domain: string; error: string }>;
  };
  admin_user_created: boolean;
}

export interface DomainVerifyResult {
  domain: string;
  verified: boolean;
  tls_ready: boolean;
  dns_records: DnsVerificationRecord[];
  errors?: string[];
}

// API Functions

/**
 * List all tenants (admin only)
 */
export function listTenants() {
  return apiFetch<TenantSummary[]>('/admin/tenants');
}

/**
 * Get detailed tenant information
 */
export function getTenant(nodeId: number) {
  return apiFetch<TenantDetail>(`/admin/tenants/${nodeId}`);
}

/**
 * Provision a new white-label tenant
 * 
 * Creates a complete tenant setup including:
 * - Node record
 * - Configuration (modules, branding, white-label settings)
 * - Custom domains with Vercel provisioning
 * - Optional admin user
 */
export function provisionTenant(input: ProvisionTenantInput) {
  return apiFetch<ProvisionTenantResult>('/admin/tenants/provision', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Create a basic tenant (without domain provisioning)
 */
export function createTenant(input: { name: string; slug?: string; status?: string }) {
  return apiFetch<TenantNode>('/admin/tenants', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Update tenant modules
 */
export function updateTenantModules(nodeId: number, modules: TenantModules) {
  return apiFetch<{ message: string }>(`/admin/tenants/${nodeId}/modules`, {
    method: 'PATCH',
    body: JSON.stringify({ modules }),
  });
}

/**
 * Update tenant branding
 */
export function updateTenantBranding(nodeId: number, branding: TenantBranding) {
  return apiFetch<{ message: string }>(`/admin/tenants/${nodeId}/branding`, {
    method: 'PATCH',
    body: JSON.stringify({ branding }),
  });
}

/**
 * Update white-label settings
 */
export function updateWhiteLabelSettings(nodeId: number, whiteLabel: TenantWhiteLabelConfig) {
  return apiFetch<{ message: string }>(`/admin/tenants/${nodeId}/white-label`, {
    method: 'PATCH',
    body: JSON.stringify({ white_label: whiteLabel }),
  });
}

// Domain Management

/**
 * List domains for a tenant or all domains (admin)
 */
export function listDomains() {
  return apiFetch<{ domains: TenantDomain[] }>('/api/domains');
}

/**
 * Add a custom domain to a tenant
 */
export function addDomain(nodeId: number, domain: string, provisionVercel = true) {
  return apiFetch<TenantDomain & { vercel_provisioning?: Record<string, unknown> }>('/api/domains', {
    method: 'POST',
    body: JSON.stringify({
      node_id: nodeId,
      domain,
      provision_vercel: provisionVercel,
    }),
  });
}

/**
 * Remove a custom domain
 */
export function removeDomain(domainId: number) {
  return apiFetch<{ success: boolean; removed_domain: string }>(`/api/domains/${domainId}`, {
    method: 'DELETE',
  });
}

/**
 * Verify domain DNS configuration
 */
export function verifyDomain(domainId: number) {
  return apiFetch<DomainVerifyResult>(`/api/domains/${domainId}/verify`, {
    method: 'POST',
  });
}

/**
 * Resolve a domain to its tenant (public, used by middleware)
 */
export function resolveDomain(domain: string) {
  return apiFetch<{
    node_id: number;
    node_slug: string;
    node_name: string;
    is_white_label: boolean;
    brand_config?: TenantBranding;
  }>(`/api/domains/resolve?domain=${encodeURIComponent(domain)}`);
}
