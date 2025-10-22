import Fastify from 'fastify';
import cors from '@fastify/cors';

import { healthRoute } from './routes/health.js';
import { latestFundingRoute } from './routes/latest.js';
import { historyFundingRoute } from './routes/history.js';
import { arbitrageRoute } from './routes/arbitrage.js';
import { createInMemoryFundingStore } from './storage/inMemoryStore.js';
import { startIngestScheduler } from './services/ingestScheduler.js';
import { createFundingService } from './services/fundingService.js';
import { loadConfig } from './config/index.js';

const server = Fastify({ logger: true });

const config = loadConfig();

const store = createInMemoryFundingStore();
const fundingService = createFundingService(store, {
  connectors: {
    aster: {
      baseUrl: config.connectors.aster.baseUrl,
      apiKey: config.connectors.aster.apiKey
    },
    paradex: {
      baseUrl: config.connectors.paradex.baseUrl,
      markets: config.connectors.paradex.markets,
      maxMarkets: config.connectors.paradex.maxMarkets
    },
    lighter: {
      baseUrl: config.connectors.lighter.baseUrl
    },
    hyperliquid: {
      baseUrl: config.connectors.hyperliquid.baseUrl
    },
    edgex: {
      baseUrl: config.connectors.edgex.baseUrl,
      contractIds: config.connectors.edgex.contractIds,
      maxContracts: config.connectors.edgex.maxContracts
    }
  }
});

const scheduler = startIngestScheduler(fundingService, {
  intervalMs: config.scheduler.intervalMs,
  historySymbols: config.scheduler.historySymbols,
  historyGranularityHours: config.scheduler.historyGranularityHours,
  historyLookbackHours: config.scheduler.historyLookbackHours
});

await server.register(cors, { origin: true });
await server.register(healthRoute, { prefix: '/api' });
await server.register(latestFundingRoute, { prefix: '/api', fundingService });
await server.register(historyFundingRoute, { prefix: '/api', fundingService });
await server.register(arbitrageRoute, { prefix: '/api' });

const port = config.server.port;

server
  .listen({ port, host: '0.0.0.0' })
  .then(() => {
    server.log.info(`API listening on ${port}`);
  })
  .catch((error) => {
    server.log.error(error, 'Failed to start API');
    process.exit(1);
  });

const shutdown = () => {
  scheduler.stop();
  server.close().finally(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
