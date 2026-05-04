# suitecloud-scripts

Node scripts that extend SuiteCloud — automated pull of SuiteScript files and object definitions from a NetSuite org.

Part of the [NetSuiteBytes](https://netsuitebytes.org) developer toolchain.

---

## The problem

The SuiteCloud VS Code extension handles individual file deploys and JS diffs. What it does not do:

- Pull *all* SuiteScript files from a connected org in one operation
- Pull object definitions (script records, deployment records, custom fields, workflows, saved searches) alongside the files
- Automate any of this in a CI/CD pipeline

These scripts fill that gap.

---

## What's here

| Script | What it does |
|--------|-------------|
| `scripts/pull-netsuite.js` | Pull SuiteScript files and/or object definitions from a NetSuite org into the local project |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [SuiteCloud CLI](https://www.npmjs.com/package/@oracle/suitecloud-cli) installed globally:

```bash
npm install -g @oracle/suitecloud-cli
```

---

## VS Code Setup

Install the **Oracle SuiteCloud Extension for VS Code**:

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for **SuiteCloud** (publisher: Oracle)
4. Click Install

The extension provides IntelliSense and autocomplete for SuiteScript 2.x APIs, CLI commands in the Command Palette, and file/object import from the Explorer panel.

---

## Authentication

You need an auth ID alias for each NetSuite environment you work with. Aliases are stored locally in `~/.suitecloud-sdk/`.

**Option A — VS Code Command Palette**

1. Open the Command Palette (`Ctrl+Shift+P`)
2. Run **SuiteCloud: Set Up Account** (OAuth 2.0, browser-based login)
3. Enter an alias when prompted (e.g. `my-sandbox`)
4. Repeat for each environment

**Option B — CLI**

```bash
suitecloud account:setup
```

List all saved aliases:

```bash
suitecloud account:manageauth --list
```

---

## Usage

### Pull SuiteScript files (default)

```bash
node scripts/pull-netsuite.js --authid <your-alias>
```

### Pull everything — files, objects, and templates

```bash
node scripts/pull-netsuite.js --authid <your-alias> --all
```

### Pull specific sections

```bash
node scripts/pull-netsuite.js --authid <your-alias> --objects
node scripts/pull-netsuite.js --authid <your-alias> --templates
```

### Interactive — prompts for auth ID alias

```bash
node scripts/pull-netsuite.js
```

| Flag | Description | Default |
|---|---|---|
| `--authid <id>` | Auth ID alias — prompted interactively if omitted | — |
| `--batchsize <n>` | Files per import call | `10` |
| `--files` | Pull SuiteScript files from File Cabinet | default |
| `--objects` | Pull SuiteScript and customization object definitions | — |
| `--templates` | Pull template files and objects | — |
| `--all` | Pull files + objects + templates | — |

---

## What gets pulled

**Files** (`--files`, default): All files from `/SuiteScripts` in the File Cabinet.

**Objects** (`--objects`):
- Script types: `clientscript`, `usereventscript`, `scheduledscript`, `mapreducescript`, `suitelet`, `portlet`, `restlet`, `workflowactionscript`, `massupdatescript`, `scriptdeployment`
- Customizations: custom record types, custom segments, custom lists, and all custom field types
- Account config: workflows, saved searches, roles, custom transaction types, datasets, workbooks

**Templates** (`--templates`): Files from `/Templates` and `/SuiteApps/com.netsuite.advancedpdf`, plus `emailtemplate` and `advancedpdftemplate` objects.

---

## Project structure

```
src/
  FileCabinet/
    SuiteScripts/     ← populated by pull-netsuite.js
  Objects/            ← populated by pull-netsuite.js (object definitions)
  manifest.xml
  deploy.xml
scripts/
  pull-netsuite.js    ← the pull automation script
suitecloud.config.js
```

---

## Contributing

Questions and contributions welcome in [Discussions](https://github.com/orgs/netsuitebytes/discussions).

---

## License

MIT

---

*Part of [NetSuiteBytes](https://netsuitebytes.org) — built by [Literal Data LLC](https://literaldata.com)*
