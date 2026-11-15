import { existsSync } from 'node:fs';

// TODO agree on a way to authenticate requests to the api. for now we're not doing tests that have preconditions but i think doing this with a PAT in .env is fine?
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
