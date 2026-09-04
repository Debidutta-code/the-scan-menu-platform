import { startPrintAgent } from './server';

const server = startPrintAgent();

process.on('SIGINT', () => {
  console.log('\nStopping The Scan Menu Local Print Agent...');
  server.close(() => {
    console.log('Agent stopped gracefully.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
