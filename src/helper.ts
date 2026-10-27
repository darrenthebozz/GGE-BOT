import AdmZip from 'adm-zip';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path, { join } from 'node:path';
import { isSea } from 'node:sea';

const workingPath = join(tmpdir(), 'ggeBot')


if(isSea()) {
    const zip = new AdmZip(await readFile(path.join(import.meta.dirname, 'node_modules.zip')))
    try {
        var pgPackage = await readFile(join(workingPath, "node_modules", "@embedded-postgres", "windows-x64", 'package.json'), { encoding : 'utf-8'}).then(JSON.parse)
    }
    catch(e) {
        console.warn(e)
        pgPackage = {}
    }

    if(JSON.parse(zip.getEntry("@embedded-postgres/windows-x64/package.json")?.getData()?.toString() ?? "{}").version != pgPackage.version)
        zip.extractAllTo(join(workingPath, "node_modules"), true)
}

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