import { app, ready } from './app.js';
import { config } from './config.js';

// No top-level await (see app.js) — this file is require()'d directly by
// some hosts' Node process managers, which can't await an ESM module.
ready
  .then(() => {
    app.listen(config.port, () => {
      console.log(`FleetPilot Enterprise API listening on http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
