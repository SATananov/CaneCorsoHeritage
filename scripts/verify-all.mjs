import { readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const currentFile = basename(fileURLToPath(import.meta.url));

const verifierFiles = readdirSync(scriptsDir)
    .filter((name) => name.startsWith('verify-') && name.endsWith('.mjs') && name !== currentFile)
    .sort();

if (verifierFiles.length === 0) {
    console.error('FAIL: no verifier scripts were found.');
    process.exit(1);
}

for (const verifierFile of verifierFiles) {
    console.log(`\n=== ${verifierFile} ===`);

    const result = spawnSync(process.execPath, [join(scriptsDir, verifierFile)], {
        cwd: join(scriptsDir, '..'),
        encoding: 'utf8',
        stdio: ['inherit', 'pipe', 'pipe'],
    });

    if (result.stdout) {
        process.stdout.write(result.stdout);
    }

    if (result.stderr) {
        process.stderr.write(result.stderr);
    }

    if (result.error) {
        console.error(`FAIL: ${verifierFile} could not be started: ${result.error.message}`);
        process.exit(1);
    }

    if (result.status !== 0) {
        console.error(`FAIL: ${verifierFile} exited with code ${result.status ?? 'unknown'}.`);
        process.exit(result.status || 1);
    }
}

console.log(`\nPASS: all ${verifierFiles.length} project verifier scripts passed.`);
