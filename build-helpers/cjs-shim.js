// CJS shim for ESM compatibility
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

global.require = createRequire(import.meta.url);
global.__filename = fileURLToPath(import.meta.url);
global.__dirname = dirname(__filename);