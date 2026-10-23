import { loadConfig } from './config';
import { createCollabServer } from './server';

const config = loadConfig();
const collab = createCollabServer(config, {
  log: (event, fields) => console.log(JSON.stringify({ t: new Date().toISOString(), event, ...fields })),
});

const port = await collab.start();
console.log(JSON.stringify({ t: new Date().toISOString(), event: 'collab.listening', port }));

const stop = async () => {
  await collab.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
