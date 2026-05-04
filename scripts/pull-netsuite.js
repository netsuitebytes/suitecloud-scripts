#!/usr/bin/env node
'use strict';

/**
 * Pulls files and objects from a NetSuite org via SuiteCloud CLI.
 * Requires SuiteCloud CLI to be installed and authenticated.
 *
 * Usage:
 *   node scripts/pull-netsuite.js [--authid <id>] [--batchsize <n>] [--all] [--files] [--objects] [--templates]
 *
 *   --authid <id>      Auth profile alias — prompted interactively if omitted
 *   --batchsize <n>    Files per import call (default: 10)
 *   --files            Pull SuiteScript files from File Cabinet (default)
 *   --all              Pull files + objects + templates
 *   --objects          Pull SuiteScript & customization object definitions
 *   --templates        Pull template files from File Cabinet
 */

const { spawnSync } = require('child_process');
const fs            = require('fs');
const path          = require('path');
const readline      = require('readline');

const PROJECT_JSON = path.resolve(__dirname, '..', 'project.json');

// ── Configuration ─────────────────────────────────────────────────────────────

const CONFIG = {
    // File Cabinet folders to pull — add/remove as needed
    fileFolders: {
        scripts:   ['/SuiteScripts'],
        templates: ['/Templates', '/SuiteApps/com.netsuite.advancedpdf'],
    },

    // Object categories to pull — uses `suitecloud object:import`
    // Each key maps to an array of NetSuite object types
    objectTypes: {
        scripts: [
            'clientscript',
            'usereventscript',
            'scheduledscript',
            'mapreducescript',
            'suitelet',
            'portlet',
            'restlet',
            'workflowactionscript',
            'massupdatescript',
            'scriptdeployment',
        ],
        customizations: [
            'customrecordtype',
            'customsegment',
            'customlist',
            // Custom field types
            'entitycustomfield',
            'transactionbodycustomfield',
            'transactioncolumncustomfield',
            'itemcustomfield',
            'itemnumbercustomfield',
            'itemoptioncustomfield',
            'crmcustomfield',
            'othercustomfield',
        ],
        templates: [
            'emailtemplate',
            'advancedpdftemplate',
        ],
        accountConfig: [
            'workflow',
            'savedsearch',
            'role',
            'customtransactiontype',
            'dataset',
            'workbook',
        ],
    },
};

// ── Runtime settings ──────────────────────────────────────────────────────────

const IS_WINDOWS = process.platform === 'win32';

const argv            = process.argv.slice(2);
const authIdIndex     = argv.indexOf('--authid');
const batchSizeIndex  = argv.indexOf('--batchsize');
const AUTH_ID_ARG     = authIdIndex    !== -1 ? argv[authIdIndex    + 1] : null;
const BATCH_SIZE      = batchSizeIndex !== -1 ? parseInt(argv[batchSizeIndex + 1], 10) : 10;
const valuePairs      = new Set([authIdIndex, authIdIndex + 1, batchSizeIndex, batchSizeIndex + 1].filter(i => i >= 0));
const ARGS            = new Set(argv.filter((_, i) => !valuePairs.has(i)));

const RUN_ALL       = ARGS.has('--all');
const RUN_FILES     = RUN_ALL || ARGS.size === 0 || ARGS.has('--files');
const RUN_OBJECTS   = RUN_ALL || ARGS.has('--objects');
const RUN_TEMPLATES = RUN_ALL || ARGS.has('--templates');

// ── Helpers ───────────────────────────────────────────────────────────────────

function runSuiteCloud(args) {
    // On Windows, invoke via cmd.exe /c so .cmd shims work without shell:true
    const cmd     = IS_WINDOWS ? 'cmd.exe' : 'suitecloud';
    const cmdArgs = IS_WINDOWS ? ['/c', 'suitecloud', ...args] : args;

    console.log(`\n> suitecloud ${args.join(' ')}`);

    const result = spawnSync(cmd, cmdArgs, {
        encoding: 'utf8',
        stdio: ['inherit', 'pipe', 'pipe'],
    });

    const output = (result.stdout || '') + (result.stderr || '');
    if (result.error) {
        console.error('Failed to spawn suitecloud:', result.error.message);
        process.exit(1);
    }
    if (output) process.stdout.write(output);
    return { output, status: result.status ?? -1 };
}

function selectAuthId(authId) {
    console.log(`\nSetting defaultAuthId in project.json: ${authId}`);
    const proj = JSON.parse(fs.readFileSync(PROJECT_JSON, 'utf8'));
    proj.defaultAuthId = authId;
    fs.writeFileSync(PROJECT_JSON, JSON.stringify(proj, null, '\t') + '\n', 'utf8');
}

function listFilesInFolder(folder) {
    const { output } = runSuiteCloud(['file:list', '--folder', folder]);
    return output
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => /^\/.*\.[a-zA-Z0-9]{1,5}$/.test(l));
}

function importFilesInBatches(files) {
    if (files.length === 0) { console.log('  No files found.'); return; }

    const totalBatches = Math.ceil(files.length / BATCH_SIZE);
    console.log(`  Importing ${files.length} file(s) in ${totalBatches} batch(es)...`);

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch    = files.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        console.log(`\n  --- Batch ${batchNum}/${totalBatches} ---`);
        runSuiteCloud(['file:import', '--paths', ...batch]);
    }
}

function importObjectsByType(types) {
    for (const type of types) {
        console.log(`\n  Importing type: ${type}`);
        runSuiteCloud([
            'object:import',
            '--type',            type,
            '--scriptid',        'ALL',
            '--excludefiles',           // files are handled separately
        ]);
    }
}

// ── Sections ──────────────────────────────────────────────────────────────────

function pullScriptFiles() {
    console.log('\n━━ Script Files (File Cabinet) ━━━━━━━━━━━━━━━━━━━━━━━━');
    let files = [];
    for (const folder of CONFIG.fileFolders.scripts) {
        console.log(`  Listing: ${folder}`);
        files.push(...listFilesInFolder(folder));
    }
    files = [...new Set(files)];
    console.log(`  Found ${files.length} file(s)`);
    importFilesInBatches(files);
}

function pullTemplateFiles() {
    console.log('\n━━ Template Files (File Cabinet) ━━━━━━━━━━━━━━━━━━━━━━');
    let files = [];
    for (const folder of CONFIG.fileFolders.templates) {
        console.log(`  Listing: ${folder}`);
        const found = listFilesInFolder(folder);
        if (found.length === 0) console.log(`  (none found or folder does not exist)`);
        files.push(...found);
    }
    files = [...new Set(files)];
    console.log(`  Found ${files.length} file(s)`);
    importFilesInBatches(files);
}

function pullScriptObjects() {
    console.log('\n━━ Script Objects ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    importObjectsByType(CONFIG.objectTypes.scripts);
}

function pullCustomizationObjects() {
    console.log('\n━━ Customization Objects (Fields, Records, Lists) ━━━━━━');
    importObjectsByType(CONFIG.objectTypes.customizations);
}

function pullTemplateObjects() {
    console.log('\n━━ Template Objects ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    importObjectsByType(CONFIG.objectTypes.templates);
}

function pullAccountConfig() {
    console.log('\n━━ Account Configuration Objects ━━━━━━━━━━━━━━━━━━━━━━');
    importObjectsByType(CONFIG.objectTypes.accountConfig);
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function listAuthProfiles() {
    const cmd     = IS_WINDOWS ? 'cmd.exe' : 'suitecloud';
    const args    = IS_WINDOWS
        ? ['/c', 'suitecloud', 'account:manageauth', '--list']
        : ['account:manageauth', '--list'];
    const result  = spawnSync(cmd, args, { encoding: 'utf8' });
    return (result.stdout || '') + (result.stderr || '');
}

function prompt(question) {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   NetSuite SuiteScript Pull Script    ║');
    console.log('╚═══════════════════════════════════════╝');

    let authId = AUTH_ID_ARG;

    if (!authId) {
        console.log('\nConfigured auth profiles:');
        console.log(listAuthProfiles());
        authId = await prompt('Enter auth ID to use: ');
        if (!authId) {
            console.error('Error: auth ID is required.');
            process.exit(1);
        }
    }

    console.log(`Platform  : ${process.platform}`);
    console.log(`Auth ID   : ${authId}`);
    console.log(`Sections  : ${[
        RUN_FILES     && 'files',
        RUN_OBJECTS   && 'objects',
        RUN_TEMPLATES && 'templates',
    ].filter(Boolean).join(', ')}`);

    selectAuthId(authId);

    if (RUN_FILES)     pullScriptFiles();
    if (RUN_TEMPLATES) pullTemplateFiles();
    if (RUN_TEMPLATES) pullTemplateObjects();
    if (RUN_OBJECTS)   pullScriptObjects();
    if (RUN_OBJECTS)   pullCustomizationObjects();
    if (RUN_OBJECTS)   pullAccountConfig();

    console.log('\n✓ Done');
}

main();
