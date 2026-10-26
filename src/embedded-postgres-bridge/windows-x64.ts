import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const workingPath = join(tmpdir(), 'ggeBot')
export const {initdb, pg_ctl, postgres} = createRequire(join(workingPath, 'node_modules'))("@embedded-postgres/windows-x64")
