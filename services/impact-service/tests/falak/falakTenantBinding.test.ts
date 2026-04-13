import { createSeededFalakRepository } from '../../src/falak/testing/inMemoryFalakRepository';

describe('Falak tenant binding', () => {
  test('resolves deterministic backend node binding from tenant identity', async () => {
    const { repository, tenantId } = createSeededFalakRepository();
    const tenant = await repository.findTenantById(tenantId);

    expect(tenant).not.toBeNull();
    expect(tenant?.backendNodeSlug).toBe('au-nsw-sydney');
    expect(tenant?.backendNodeId).toBe(1);

    const verified = await repository.verifyTenantNodeBinding(tenantId, 'au-nsw-sydney');
    expect(verified.backendNodeSlug).toBe('au-nsw-sydney');
  });

  test('rejects backend node slug mismatches and cross-tenant slug reuse', async () => {
    const { repository, tenantId, otherTenantId } = createSeededFalakRepository();

    await expect(
      repository.verifyTenantNodeBinding(tenantId, 'au-vic-melbourne')
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'TENANT_BACKEND_NODE_BINDING_MISMATCH'
    });

    await expect(
      repository.verifyTenantNodeBinding(otherTenantId, 'au-nsw-sydney')
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'TENANT_BACKEND_NODE_BINDING_MISMATCH'
    });
  });

  test('fails clearly when a tenant has no explicit backend node binding metadata', async () => {
    const { repository, tenantId } = createSeededFalakRepository();
    const tenant = await repository.findTenantById(tenantId);
    if (!tenant) {
      throw new Error('Expected seeded tenant to exist');
    }

    repository.state.tenants.set(tenantId, {
      ...tenant,
      backendNodeSlug: null,
      backendNodeId: null
    });

    await expect(
      repository.verifyTenantNodeBinding(tenantId, 'au-nsw-sydney')
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'TENANT_BACKEND_NODE_BINDING_MISSING'
    });
  });
});
