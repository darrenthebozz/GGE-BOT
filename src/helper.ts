import AdmZip from 'adm-zip';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path, { join } from 'node:path';
import { isSea } from 'node:sea';

const workingPath = join(tmpdir(), 'ggeBot')

// if(isSea()) {
//     const zip = new AdmZip(await readFile(path.join(import.meta.dirname, 'node_modules.zip')))
//     zip.extractAllTo(join(workingPath, "node_modules"), true)
// }

try {
    if(isSea()) {
        //@ts-ignore
        await import('./dist/server/entry.js')
    }
    else
        await import('./entry')
}
catch (e) {
    console.error(e)
}