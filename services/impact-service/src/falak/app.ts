import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod';
import config from '../config';
import { readFalakRuntimeConfig } from './config/falakRuntimeConfig';
import { FalakHealthService } from './health/falakHealthService';
import { registerMapRoutes } from '../maps/routes/registerMapRoutes';
import { PrismaFalakMapRepository } from '../maps/repositories/prismaFalakMapRepository';
import { FalakMapService } from '../maps/services/falakMapService';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { registerFalakRoutes } from './routes/registerFalakRoutes';
import { PrismaFalakRepository } from './repositories/prismaFalakRepository';
import { createFanoutPublisher } from './services/fanoutPublisher';
import { AllocationWorkflowService } from './services/allocationWorkflowService';
import { ContributionWorkflowService } from './services/contributionWorkflowService';
import { EventWorkflowService } from './services/eventWorkflowService';
import { FalakService } from './services/falakService';
import { ImpactQueryService } from './services/impactQueryService';
import { MutationPipeline } from './services/mutationPipeline';
import { PolicyEngine } from './services/policyEngine';
import { assertSafeFalakStartup } from './startup/falakStartupGuard';

export async function buildFalakApp(prisma: PrismaClient) {
  const runtimeConfig = readFalakRuntimeConfig();
  assertSafeFalakStartup(runtimeConfig);

  const app = Fastify({
    logger: false,
    disableRequestLogging: true
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Falak Protocol API',
        version: '0.1.0',
        description: 'API for ANU powered by the Falak Engine.'
      },
      servers: [
        { url: 'http://localhost:5003', description: 'Local' }
      ],
      tags: [
        { name: 'Health' },
        { name: 'Nodes' },
        { name: 'Edges' },
        { name: 'Graph' },
        { name: 'Policies' },
        { name: 'Approvals' },
        { name: 'Events' },
        { name: 'Contributions' },
        { name: 'Allocations' },
        { name: 'Pools' },
        { name: 'Ledger' },
        { name: 'Spatial' },
        { name: 'Federation' },
        { name: 'Education Maps' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    },
    transform: jsonSchemaTransform
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs'
  });

  const repository = new PrismaFalakRepository(prisma);
  const mapRepository = new PrismaFalakMapRepository(prisma);
  const policyEngine = new PolicyEngine(repository);
  const fanoutPublisher = createFanoutPublisher(config.REDIS_URL);
  const mutationPipeline = new MutationPipeline(repository, policyEngine, fanoutPublisher);
  const service = new FalakService(repository, policyEngine, mutationPipeline);
  const eventWorkflowService = new EventWorkflowService(repository, policyEngine, fanoutPublisher);
  const contributionWorkflowService = new ContributionWorkflowService(repository, policyEngine, fanoutPublisher);
  const allocationWorkflowService = new AllocationWorkflowService(repository, policyEngine, fanoutPublisher);
  const impactQueryService = new ImpactQueryService(repository);
  const mapService = new FalakMapService(mapRepository);
  const falakHealthService = new FalakHealthService(prisma, runtimeConfig);

  logger.info({
    category: 'falak.runtime',
    mode: runtimeConfig.mode,
    isSandbox: runtimeConfig.isSandbox,
    routeGuardMode: runtimeConfig.routeGuardMode,
    darkLaunch: runtimeConfig.darkLaunch,
    mapRouteGuardMode: runtimeConfig.mapRouteGuardMode,
    mapDarkLaunch: runtimeConfig.mapDarkLaunch,
    requireVerifiedActor: runtimeConfig.requireVerifiedActor,
    trustXActorId: runtimeConfig.trustXActorId,
    isProduction: runtimeConfig.isProduction
  }, 'Falak runtime configuration loaded');

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code ?? 'FALAK_ERROR',
          message: error.message,
          details: error.details,
          trace_id: request.falakContext?.traceId
        }
      });
      return;
    }

    const unhandled = error instanceof Error ? error : new Error(String(error));
    logger.error(
      {
        error: unhandled.message,
        stack: unhandled.stack,
        path: request.url,
        method: request.method
      },
      'Unhandled Falak error'
    );

    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        trace_id: request.falakContext?.traceId
      }
    });
  });

  await registerFalakRoutes(app, service, repository, {
    hasDatabase: config.hasDatabase,
    hasRedis: config.hasRedis,
    runtimeConfig,
    falakHealthService
  }, {
    eventWorkflowService,
    contributionWorkflowService,
    allocationWorkflowService,
    impactQueryService
  });
  await registerMapRoutes(app, mapService, repository, runtimeConfig);

  app.get('/openapi.json', async () => app.swagger());

  app.addHook('onResponse', async (request, reply) => {
    logger.info(
      {
        method: request.method,
        path: request.url,
        statusCode: reply.statusCode,
        traceId: request.falakContext?.traceId
      },
      'Falak HTTP request'
    );
  });

  return {
    app,
    fanoutPublisher
  };
}
