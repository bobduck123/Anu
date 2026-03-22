import {
  assert,
  assertSafeHostedStagingTarget,
  closePrisma,
  createPrismaClient,
  loadFalakStagingEnv,
  requestJson,
  resolveSeedFixture,
  stagePass,
  tenantHeaders,
  verifiedActorHeaders
} from './common.mjs';

function amountForCurrency(entries, currency) {
  const match = entries.find((entry) => entry.currency === currency);
  return match ? match.amount : 0;
}

function buildEventBody(runId, fixture) {
  return {
    visibility: 'public',
    sensitivity_class: 'normal',
    slug: `falak-staging-event-${runId}`,
    title: `Falak Staging Event ${runId}`,
    summary: 'Hosted staging ANU slice smoke event',
    metadata: {
      smoke: true,
      run_id: runId
    },
    geometry: {
      type: 'Point',
      coordinates: [149.1207, -35.2793]
    },
    time_start: '2026-05-20T08:00:00.000Z',
    time_end: '2026-05-20T12:00:00.000Z',
    venue_id: fixture.nodes.venue.id,
    community_id: fixture.nodes.community.id,
    campaign_id: fixture.nodes.campaign.id,
    pool_id: fixture.nodes.pool.id
  };
}

function resolveMapGuardMode() {
  const requested = (process.env.FALAK_MAP_ROUTE_GUARD_MODE ?? 'inherit').trim().toLowerCase();
  if (!requested || requested === 'inherit') {
    return (process.env.FALAK_ROUTE_GUARD_MODE ?? 'disabled').trim().toLowerCase();
  }

  return requested;
}

function mapPublicHeaders(mode, fixture) {
  return mode === 'admin_only'
    ? verifiedActorHeaders(fixture.tenant.id, fixture.admin.externalAuthId)
    : tenantHeaders(fixture.tenant.id);
}

async function ensureDisallowedTenant(prisma, runId) {
  return prisma.falakTenant.create({
    data: {
      slug: `falak-disallowed-${runId}`,
      name: `Falak Disallowed ${runId}`,
      settings: {}
    }
  });
}

async function ensureUnallowlistedActor(prisma, fixture, runId) {
  return prisma.falakActor.create({
    data: {
      tenantId: fixture.tenant.id,
      actorType: 'human',
      externalAuthId: `falak-outsider-${runId}`,
      displayName: `Falak Outsider ${runId}`,
      metadata: {
        smoke: true,
        run_id: runId
      }
    }
  });
}

async function assertGuardBehavior(prisma, fixture, runId) {
  const mode = (process.env.FALAK_ROUTE_GUARD_MODE ?? 'disabled').trim().toLowerCase();
  const eventBody = buildEventBody(`${runId}-guard`, fixture);

  switch (mode) {
    case 'disabled': {
      const response = await requestJson('POST', '/v1/falak/events', {
        headers: verifiedActorHeaders(fixture.tenant.id, fixture.admin.externalAuthId),
        body: eventBody,
        expectedStatus: 404
      });
      assert(response.json?.error?.code === 'FALAK_DISABLED', 'Disabled Falak route did not return FALAK_DISABLED.');
      stagePass('Stage B.4', 'Falak guarded routes short-circuit with FALAK_DISABLED');
      return false;
    }
    case 'tenant_allowlist': {
      const disallowedTenant = await ensureDisallowedTenant(prisma, runId);
      const response = await requestJson('GET', `/v1/falak/pools/${fixture.nodes.pool.id}/balance`, {
        headers: tenantHeaders(disallowedTenant.id),
        expectedStatus: 403
      });
      assert(response.json?.error?.code === 'TENANT_NOT_ALLOWED', 'Tenant allowlist did not block a disallowed tenant.');
      stagePass('Stage B.4', 'Falak guarded routes enforce tenant allowlist');
      return true;
    }
    case 'admin_only': {
      const outsider = await ensureUnallowlistedActor(prisma, fixture, runId);
      const response = await requestJson('POST', '/v1/falak/events', {
        headers: verifiedActorHeaders(fixture.tenant.id, outsider.externalAuthId),
        body: eventBody,
        expectedStatus: 403
      });
      assert(response.json?.error?.code === 'ACTOR_NOT_ALLOWED', 'Admin-only mode did not block an unallowlisted actor.');
      stagePass('Stage B.4', 'Falak guarded routes enforce actor allowlist');
      return true;
    }
    case 'enabled': {
      const response = await requestJson('POST', '/v1/falak/events', {
        headers: tenantHeaders(fixture.tenant.id),
        body: eventBody,
        expectedStatus: 401
      });
      assert(
        response.json?.error?.code === 'VERIFIED_ACTOR_REQUIRED',
        'Enabled mode did not require a verified actor for privileged Falak routes.'
      );
      stagePass('Stage B.4', 'Falak guarded privileged routes require a verified actor');
      return true;
    }
    default:
      throw new Error(`Unsupported FALAK_ROUTE_GUARD_MODE for smoke verification: ${mode}`);
  }
}

async function assertMapGuardBehavior(prisma, fixture, runId) {
  const mode = resolveMapGuardMode();

  switch (mode) {
    case 'disabled': {
      const response = await requestJson('GET', '/v1/education/maps', {
        expectedStatus: 404
      });
      assert(response.json?.error?.code === 'FALAK_MAPS_DISABLED', 'Disabled maps route did not return FALAK_MAPS_DISABLED.');
      stagePass('Stage B.5', 'Falak-backed education maps short-circuit with FALAK_MAPS_DISABLED');
      return false;
    }
    case 'tenant_allowlist': {
      const disallowedTenant = await ensureDisallowedTenant(prisma, `${runId}-maps`);
      const denied = await requestJson('GET', '/v1/education/maps', {
        headers: tenantHeaders(disallowedTenant.id),
        expectedStatus: 403
      });
      assert(denied.json?.error?.code === 'TENANT_NOT_ALLOWED', 'Map tenant allowlist did not block a disallowed tenant.');

      const allowed = await requestJson('GET', '/v1/education/maps', {
        headers: tenantHeaders(fixture.tenant.id),
        expectedStatus: 200
      });
      assert(Array.isArray(allowed.json), 'Allowlisted tenant did not receive a map list payload.');
      stagePass('Stage B.5', 'Falak-backed education maps enforce tenant allowlist');
      return true;
    }
    case 'admin_only': {
      const anonymous = await requestJson('GET', '/v1/education/maps', {
        headers: tenantHeaders(fixture.tenant.id),
        expectedStatus: 401
      });
      assert(
        anonymous.json?.error?.code === 'VERIFIED_ACTOR_REQUIRED',
        'Admin-only maps mode did not require a verified actor.'
      );

      const outsider = await ensureUnallowlistedActor(prisma, fixture, `${runId}-maps`);
      const denied = await requestJson('GET', '/v1/education/maps', {
        headers: verifiedActorHeaders(fixture.tenant.id, outsider.externalAuthId),
        expectedStatus: 403
      });
      assert(denied.json?.error?.code === 'ACTOR_NOT_ALLOWED', 'Admin-only maps mode did not block an unallowlisted actor.');

      const allowed = await requestJson('GET', '/v1/education/maps', {
        headers: verifiedActorHeaders(fixture.tenant.id, fixture.admin.externalAuthId),
        expectedStatus: 200
      });
      assert(Array.isArray(allowed.json), 'Allowlisted map actor did not receive a map list payload.');
      stagePass('Stage B.5', 'Falak-backed education maps enforce actor allowlist');
      return true;
    }
    case 'enabled': {
      const publicList = await requestJson('GET', '/v1/education/maps', {
        headers: tenantHeaders(fixture.tenant.id),
        expectedStatus: 200
      });
      assert(Array.isArray(publicList.json), 'Enabled maps mode did not expose the public list endpoint.');
      stagePass('Stage B.5', 'Falak-backed education maps expose the public list endpoint when enabled');
      return true;
    }
    default:
      throw new Error(`Unsupported FALAK_MAP_ROUTE_GUARD_MODE for smoke verification: ${mode}`);
  }
}

function buildTinyImportSeed(runId) {
  return {
    topicKey: `phase-c-import-${runId}`,
    title: `Phase C Import ${runId}`,
    archetype: 'theory',
    description: 'Tiny privileged import payload used for smoke verification.',
    seedQueries: ['phase c import smoke'],
    suppliedUrls: ['https://plato.stanford.edu/contents.html'],
    documents: [
      {
        id: `seed-doc-${runId}`,
        url: 'https://example.org/phase-c-import',
        title: 'Phase C Import Source',
        type: 'source_pack',
        sections: [
          {
            heading: 'Summary',
            kind: 'summary',
            lines: ['Tiny import smoke payload.']
          }
        ]
      }
    ],
    entities: [
      {
        label: 'Phase C Smoke Entity',
        entityType: 'topic',
        categoryKey: 'smoke',
        tags: ['phase-c', 'smoke'],
        summary: 'Seed entity for privileged import smoke checks.',
        axisScores: {
          x: 0,
          y: 0,
          z: 0
        },
        metrics: {
          importance: 0.5,
          evidence: 0.5,
          popularity: 0.4
        },
        sources: [
          {
            url: 'https://plato.stanford.edu/contents.html',
            title: 'SEP contents',
            domain: 'plato.stanford.edu'
          }
        ]
      }
    ]
  };
}

async function exerciseMapSurface(fixture, runId) {
  const mode = resolveMapGuardMode();
  const publicHeaders = mapPublicHeaders(mode, fixture);
  const resolved = await requestJson('POST', '/v1/education/maps/resolve', {
    headers: publicHeaders,
    body: {
      topic: 'consciousness theories',
      mode: 'auto_seed'
    },
    expectedStatus: 200
  });

  const topicKey = resolved.json?.map?.definition?.topicKey;
  assert(topicKey === 'consciousness-theories', 'Map resolve did not return the expected topic key.');
  stagePass('Stage B.6', 'Falak-backed education maps resolve flow works over HTTP');

  const detail = await requestJson('GET', `/v1/education/maps/${topicKey}`, {
    headers: publicHeaders,
    expectedStatus: 200
  });
  assert(detail.json?.definition?.topicKey === topicKey, 'Map detail endpoint did not return the resolved map.');

  const leftThought = await requestJson('POST', '/v1/education/maps/resolve', {
    headers: publicHeaders,
    body: {
      topic: 'left-thought-graph-atlas',
      mode: 'curated_refine'
    },
    expectedStatus: 200
  });
  const leftThoughtMap = leftThought.json?.map;
  const leftThoughtTopicKey = leftThoughtMap?.definition?.topicKey;
  assert(leftThoughtTopicKey === 'left-thought-graph-atlas', 'Left-thought resolve did not return the expected topic key.');
  assert(leftThoughtMap?.nodes?.length === 79, 'Left-thought map node count drifted from expected parity baseline (79).');
  assert(leftThoughtMap?.edges?.length === 126, 'Left-thought map edge count drifted from expected parity baseline (126).');
  const sepLinkedNodes = (leftThoughtMap?.nodes ?? []).filter((node) =>
    (node.sources ?? []).some((source) => source.domain === 'plato.stanford.edu')
  ).length;
  assert(sepLinkedNodes === 79, 'Left-thought map SEP-linked node coverage drifted from expected baseline (79).');
  stagePass('Stage B.6b', 'Left-thought atlas resolves with parity-preserving counts and SEP coverage');

  const unauthenticatedAdmin = await requestJson('PATCH', `/v1/education/maps/${topicKey}/status`, {
    headers: tenantHeaders(fixture.tenant.id),
    body: {
      status: 'reviewed'
    },
    expectedStatus: 401
  });
  assert(
    unauthenticatedAdmin.json?.error?.code === 'VERIFIED_ACTOR_REQUIRED',
    'Privileged map status update did not require a verified actor.'
  );

  const updated = await requestJson('PATCH', `/v1/education/maps/${topicKey}/status`, {
    headers: verifiedActorHeaders(fixture.tenant.id, fixture.admin.externalAuthId),
    body: {
      status: 'reviewed'
    },
    expectedStatus: 200
  });
  assert(updated.json?.definition?.status === 'reviewed', `Map status update failed for smoke run ${runId}.`);
  stagePass('Stage B.7', 'Falak-backed education map admin mutation requires verified actor and succeeds when verified');

  const importHeaders = verifiedActorHeaders(fixture.tenant.id, fixture.admin.externalAuthId);
  const importSeed = buildTinyImportSeed(runId);

  const importPreview = await requestJson('POST', '/v1/education/maps/import/preview', {
    headers: importHeaders,
    body: {
      mode: 'curated_refine',
      seed: importSeed
    },
    expectedStatus: 200
  });
  assert(importPreview.json?.preview?.nodeCount === 1, 'Phase C import preview did not report the expected node count.');

  const importPersist = await requestJson('POST', '/v1/education/maps/import/persist', {
    headers: importHeaders,
    body: {
      mode: 'curated_refine',
      status: 'reviewed',
      force: false,
      importNote: 'staging smoke import',
      seed: importSeed
    },
    expectedStatus: 200
  });
  assert(importPersist.json?.map?.definition?.topicKey === importSeed.topicKey, 'Phase C import persist did not return the expected topic key.');
  assert(importPersist.json?.preview?.nodeCount === 1, 'Phase C import persist did not include preview metrics.');

  const importPersistRepeat = await requestJson('POST', '/v1/education/maps/import/persist', {
    headers: importHeaders,
    body: {
      mode: 'curated_refine',
      status: 'reviewed',
      force: false,
      importNote: 'staging smoke import repeat',
      seed: importSeed
    },
    expectedStatus: 200
  });
  assert(importPersistRepeat.json?.idempotentReuse === true, 'Phase C repeat import did not report idempotentReuse=true.');
  assert(importPersistRepeat.json?.jobCreated === false, 'Phase C repeat import unexpectedly created a compile job.');
  assert(
    importPersistRepeat.json?.checksum === importPersist.json?.checksum,
    'Phase C repeat import checksum drifted from initial import payload.',
  );

  stagePass('Stage B.8', 'Phase C privileged import preview/persist endpoints are operational with idempotent reuse');
}

loadFalakStagingEnv();
assertSafeHostedStagingTarget('Falak staging smoke', {
  requireMutationAllowance:
    (process.env.FALAK_ROUTE_GUARD_MODE ?? 'disabled').trim().toLowerCase() !== 'disabled' ||
    resolveMapGuardMode() !== 'disabled'
});

const prisma = await createPrismaClient();

try {
  const fixture = await resolveSeedFixture(prisma);
  const runId = `staging-${Date.now()}`;

  const health = await requestJson('GET', '/health', {
    expectedStatus: 200
  });
  const nonFalakHealthAcceptable =
    health.json?.status === 'ok' ||
    (
      health.json?.status === 'degraded' &&
      health.json?.betaPlaceholderInfra === false &&
      health.json?.dependencies?.database === 'configured' &&
      health.json?.dependencies?.stripe === 'todo'
    );
  assert(nonFalakHealthAcceptable, 'Non-Falak /health endpoint did not report an acceptable staging status.');
  stagePass('Stage B.1', `Non-Falak route still resolves through the existing app (${health.json?.status})`);

  const falakHealth = await requestJson('GET', '/v1/falak/health', {
    expectedStatus: 200
  });
  assert(falakHealth.json?.status, 'Falak /v1/falak/health did not return a health payload.');
  stagePass('Stage B.2', 'Falak health resolves through the isolated route family');

  const falakReadiness = await requestJson('GET', '/v1/falak/readiness', {
    expectedStatus: 200
  });
  assert(falakReadiness.json?.status === 'ok', 'Falak /v1/falak/readiness did not report ok.');
  stagePass('Stage B.3', 'Falak readiness resolves through the isolated route family');

  const guardAllowsSliceFlow = await assertGuardBehavior(prisma, fixture, runId);
  const mapGuardAllowsSurface = await assertMapGuardBehavior(prisma, fixture, runId);
  if (mapGuardAllowsSurface) {
    await exerciseMapSurface(fixture, runId);
  }
  if (guardAllowsSliceFlow) {
    const balanceBefore = await requestJson('GET', `/v1/falak/pools/${fixture.nodes.pool.id}/balance`, {
      headers: tenantHeaders(fixture.tenant.id),
      expectedStatus: 200
    });
    const balanceBeforeAud = amountForCurrency(balanceBefore.json.balances, 'AUD');

    const createdEvent = await requestJson('POST', '/v1/falak/events', {
      headers: verifiedActorHeaders(fixture.tenant.id, fixture.admin.externalAuthId),
      body: buildEventBody(runId, fixture),
      expectedStatus: 201
    });
    const createdEventId = createdEvent.json.event.id;
    stagePass('Stage C.1', 'Create event works on the isolated Falak route family');

    await requestJson('POST', '/v1/falak/contributions', {
      headers: tenantHeaders(fixture.tenant.id),
      body: {
        event_id: createdEventId,
        pool_id: fixture.nodes.pool.id,
        amount: 900,
        currency: 'AUD',
        note: 'Hosted staging contribution',
        reference: `staging-contribution-${runId}`,
        contributed_at: '2026-05-20T09:00:00.000Z'
      },
      expectedStatus: 201
    });
    stagePass('Stage C.2', 'Record contribution works');

    const proposal = await requestJson('POST', '/v1/falak/allocations/propose', {
      headers: verifiedActorHeaders(fixture.tenant.id, fixture.admin.externalAuthId),
      body: {
        event_id: createdEventId,
        pool_id: fixture.nodes.pool.id,
        target_id: fixture.nodes.campaign.id,
        amount: 600,
        currency: 'AUD',
        rationale: `Hosted staging allocation ${runId}`
      },
      expectedStatus: 201
    });
    const sliceApprovalId = proposal.json?.approval?.id;
    assert(sliceApprovalId, 'Allocation proposal did not auto-materialize approval.');
    stagePass('Stage C.3', 'Propose allocation works and creates approval');

    await requestJson('POST', `/v1/falak/approvals/${sliceApprovalId}/vote`, {
      headers: verifiedActorHeaders(fixture.tenant.id, fixture.governor.externalAuthId),
      body: {
        vote: 'approve',
        note: 'Hosted staging governor vote'
      },
      expectedStatus: 200
    });
    const executed = await requestJson('POST', `/v1/falak/approvals/${sliceApprovalId}/vote`, {
      headers: verifiedActorHeaders(fixture.tenant.id, fixture.admin.externalAuthId),
      body: {
        vote: 'approve',
        note: 'Hosted staging admin vote'
      },
      expectedStatus: 200
    });
    assert(executed.json.executed === true, 'Approval-backed allocation did not execute.');
    assert(executed.json.ledger_entries.length === 2, 'Allocation execution did not write the expected ledger pair.');

    const duplicateVote = await requestJson('POST', `/v1/falak/approvals/${sliceApprovalId}/vote`, {
      headers: verifiedActorHeaders(fixture.tenant.id, fixture.admin.externalAuthId),
      body: {
        vote: 'approve',
        note: 'Hosted staging duplicate vote'
      }
    });
    assert(duplicateVote.status === 409, 'Resolved approval accepted a duplicate vote.');
    stagePass('Stage C.4', 'Approval-backed allocation resolves exactly once');

    const balanceAfter = await requestJson('GET', `/v1/falak/pools/${fixture.nodes.pool.id}/balance`, {
      headers: tenantHeaders(fixture.tenant.id),
      expectedStatus: 200
    });
    const balanceAfterAud = amountForCurrency(balanceAfter.json.balances, 'AUD');
    assert(balanceAfterAud - balanceBeforeAud === 300, 'Pool balance delta was not +300 AUD after contribution and allocation.');
    stagePass('Stage C.5', 'Pool balance is coherent');

    const impact = await requestJson('GET', `/v1/falak/events/${createdEventId}/impact`, {
      headers: tenantHeaders(fixture.tenant.id),
      expectedStatus: 200
    });
    assert(amountForCurrency(impact.json.total_contributions, 'AUD') === 900, 'Event impact contribution total is incoherent.');
    assert(amountForCurrency(impact.json.executed_totals, 'AUD') === 600, 'Event impact executed total is incoherent.');
    assert(
      impact.json.event_stream.some((event) => event.event_type === 'allocation.executed'),
      'Event impact is missing allocation.executed in the event stream.'
    );
    stagePass('Stage C.6', 'Event impact query is coherent');
  }
} finally {
  await closePrisma(prisma);
}
