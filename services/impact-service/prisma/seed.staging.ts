import { disconnectSeedPrisma, runSeed } from './seed';

runSeed({
  commandName: 'Prisma staging seed',
  guardMode: 'staging'
})
  .catch((error) => {
    console.error('Staging seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectSeedPrisma();
  });
