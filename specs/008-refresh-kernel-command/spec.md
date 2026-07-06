---
id: "008-refresh-kernel-command"
title: "refresh-kernel: in-place, ref-aware 3-way kernel refresh for generated products"
status: draft
created: "2026-07-05"
owner: bart
kind: feature
domain: generator
risk: medium
implementation: pending
depends_on: ["002-encore-generator-core", "004-dual-app-generator", "006-factory-schema-lockstep"]
code_aliases: ["REFRESH_KERNEL"]
summary: >
  setup-app refuses a non-empty destination (setup-app.ts:365-371), so a
  generated product cannot inherit baseline improvements after birth: the only
  in-place mutators are the per-module add/remove-module scripts, and nothing
  updates baseline-owned files in an existing tree. lockstep (spec 006) detects
  baseline drift but applies nothing. refresh-kernel closes that gap with an
  in-place, ref-aware 3-way merge (base = the ref the app was born at, ours =
  the current tree, theirs = the target baseline ref) scoped to baseline-owned
  files, preserving app-authored and module-owned files and surfacing conflicts
  rather than overwriting. It also reconciles the module catalog when a
  born-with module (the retired data-redis marker is the worked example) has
  been removed upstream. This makes the born-with baseline a living dependency
  instead of a one-time scaffold.
establishes:
  - "adapters/acme-vue-encore/scripts/refresh-kernel.ts"
  - "adapters/acme-vue-encore/scripts/lib/three-way-merge.ts"
  - "adapters/acme-vue-encore/scripts/refresh-kernel.test.ts"
---

# 008: refresh-kernel, in-place ref-aware 3-way kernel refresh

## 1. Purpose

The generator is a one-shot scaffolder. `setup-app.ts:365-371` refuses a
non-empty destination, and the only in-place mutators (`add-module.ts`,
`remove-module.ts`) are scoped to module payloads via `template.json`
ownership. `lockstep/check.ts` (spec 006) can detect that the generator has
drifted from its pinned baseline, but nothing applies a newer baseline to an
already-generated product.

The consequence: a product cloned from `template-encore` at ref R cannot
inherit baseline improvements landed after R (security and gateway wiring under
`apps/api/`, auth hardening, build and tooling changes in the kernel
top-levels) without a manual re-scaffold-and-reconcile that clobbers app code.
This blocks the "both" posture where a generated product is simultaneously a
living product and a faithful generator fixture: the moment the baseline moves,
every product decays.

refresh-kernel makes the born-with baseline a living dependency: an in-place,
reviewable, conflict-surfacing update that pulls baseline-owned files forward
while leaving app and module code intact.

## 2. Territory

**Units this spec establishes** (new):

- `adapters/acme-vue-encore/scripts/refresh-kernel.ts`: the command.
- `adapters/acme-vue-encore/scripts/lib/three-way-merge.ts`: a base/ours/theirs
  content merger with conflict-marker output (no such utility exists today; the
  present mergers are all two-way and additive).
- `adapters/acme-vue-encore/scripts/refresh-kernel.test.ts`: unit and
  fixture coverage.

**Coordinated edits to units owned by other specs** (coupling-gated against
their owners, called out here so the dependency is explicit):

- `scripts/lib/template-json.ts` (spec 002): extend `templateJsonSchema` with a
  `bornWith` provenance block (FR-001). Adding one optional field is additive
  and back-compatible with existing `template.json` files.
- `scripts/setup-app.ts` and `scripts/setup-dual-app.ts` (specs 002, 004):
  stamp `bornWith` at scaffold time (FR-001).

**Reused, read-only mechanisms** (no ownership claimed):

- `scripts/lib/born-with.ts` `classifyEntry`: which files are carried, and the
  `kernel` / `app` / `generator-artifact` split.
- `scripts/lib/template-json.ts` `getFileOwner`: which files are module-owned.
- `scripts/lib/env-merger.ts` `mergeEnvVars` (union-by-key) and
  `commentOutEnvVars`: additive `.env.example` handling.
- `scripts/lib/encore-composer.ts` JSONC-surgical write
  (`writeEncoreAppCorsFields` strategy): minimum-surface edits to structured
  config that preserve comments and untouched formatting.
- `scripts/lockstep/baseline.lock.json` `pinnedRef`: the default target ref
  selector; `baselineStructure.coreServices`: the baseline-core service paths.

**Definition: baseline-owned file.** A path materialized into the product by
`copyBaseline` at birth: present in the baseline tree at the born ref, with
`classifyEntry` in {`kernel`, `app`} (never `generator-artifact`), and
`getFileOwner === null` (not installed by a module). refresh-kernel operates
only on baseline-owned files. This is deliberately broader than the narrow
`classifyEntry === 'kernel'` set (which is only `standards`, `spec-spine.toml`,
`.claude`, `Makefile`, `tools`, `AGENTS.md`, `CODEMAP.md`): the baseline-core
services under `apps/api/{auth,db,gateway,health,lib,web}` (the
`baselineStructure.coreServices` set) are classified `app` by `born-with.ts`
yet are exactly the files a security or gateway improvement touches. A file that
descends from the baseline is refreshable regardless of its top-level
classification; what distinguishes a refreshable baseline file from a genuine
app edit is the 3-way base side, not `classifyEntry` alone. Hence the
provenance prerequisite in FR-001.

## 3. Behavior

#### FR-001: Born-with provenance record

`template.json` gains an optional `bornWith` block:
`{ upstreamSource, ref, baseVersion, profile, variant, generatedAt }`, where
`ref` is the resolved 40-hex `template-encore` commit the product was scaffolded
from. `setup-app.ts` and `setup-dual-app.ts` populate it at scaffold from the
source checkout's resolved `HEAD` (or the `--source` ref) and the chosen
profile and variant. This is the back-pointer the produced app lacks today:
`template.json` records module ownership but not the origin ref, and
`baseVersion` is a semver default (`"3.0.0"`), not a commit.

#### FR-002: Legacy fallback, fail-visible

For a product with no `bornWith` (generated before FR-001), refresh-kernel
requires an explicit `--from-ref <sha>` and refuses to run without it. It never
guesses the base ref, and never silently degrades to a two-way merge. A wrong
or unresolvable `--from-ref` is a hard failure.

#### FR-003: Target ref selection

The target (theirs) ref defaults to the generator's current
`baseline.lock.json` `pinnedRef`, and is overridable via `--to-ref <sha>`.
refresh-kernel reads the pin; it does not advance it. Advancing the pin is
spec 006 territory (§5).

#### FR-004: Baseline tree materialization

refresh-kernel materializes the `template-encore` tree at both the base ref
(`bornWith.ref` or `--from-ref`) and the target ref, using the same source
resolution as lockstep (`TEMPLATE_ENCORE_SOURCE`, a sibling checkout, or a
clone of `upstreamSource`). Both trees are read at their exact refs; neither
mutates the product.

#### FR-005: Per-file 3-way classification

For each baseline-owned path P (present in the base or target baseline tree,
`classifyEntry(P) !== 'generator-artifact'`, `getFileOwner(P) === null`):

- `ours == base` (app never touched it): fast-forward to `theirs`.
- `theirs == base` (baseline never changed it): keep `ours`.
- `ours == theirs`: no-op.
- present in target, absent at base (baseline added it): add to the product.
- present at base, absent in target (baseline removed it): remove from the
  product iff `ours == base`; otherwise surface a delete-versus-keep conflict.
- otherwise: a 3-way content merge (FR-006).

#### FR-006: Content merge and conflict surfacing

Clean 3-way merges are written. Conflicts are surfaced, never silently
overwritten: emit conflict markers into the file (or write a `.orig` sidecar
plus a conflict entry) and record the path in the report. Any run with an
unresolved conflict exits non-zero. This mirrors `decomposeModule`'s
warn-loudly posture (`encore-composer.ts:390-399`): surface, do not guess.
Structured files use targeted mergers instead of line diff3: `.env.example` via
`env-merger` union-by-key (add new baseline vars, never overwrite an app value);
JSON and JSONC via the `encore-composer` surgical-write strategy (rewrite only
changed fields, preserve comments and formatting).

#### FR-007: Module-owned files are out of scope

Any path with `getFileOwner(P) !== null` is never touched by refresh-kernel.
Module payloads are refreshed only by `add-module` / `remove-module`
(specs 002, 003). refresh-kernel touches the baseline, not the composed modules.

#### FR-008: App-authored files are preserved

Paths absent from the base baseline tree (files the app author created after
birth) are never touched. refresh-kernel only ever acts on files that provably
descend from the baseline.

#### FR-009: Module-catalog reconciliation

For each module M in `template.json.modules` that is absent from the catalog at
the target ref:

- If M is a declarative marker (no `fileOwnership` entries, no payload): auto
  migrate. Remove M from `modules`, drop any `fileOwnership` entries owned by M,
  comment out its env vars via `commentOutEnvVars`, and report the removal. The
  `data-redis` marker is the worked example: it shipped `"files": {}`, was
  unreferenced by the Postgres-backed limiter, and was retired from the catalog
  on 2026-07-05 (ahead of this command, since a bare marker needs no 3-way
  merge to remove).
- If M owns files (`fileOwnership` entries exist): refuse, and instruct the
  operator to run `remove-module M` first. refresh-kernel does not strip
  app-integrated module code.

All catalog deltas (modules added, removed, or version-changed between base and
target) are reported.

#### FR-010: Dual-topology awareness

For a dual product (two baseline clones `public/` and `internal/`, per
spec 004), refresh-kernel refreshes each sub-app independently, then re-asserts
the deterministic internal-SPA rewire (`wireInternalSpa`: the `vite.config.ts`
`outDir` and the root `build:apps` repoint). That rewire is an app-owned edit to
baseline files, so without re-assertion it would recur as a conflict on every
refresh. Re-asserting it is safe because it is a pure, idempotent transform.

#### FR-011: Dry-run and clean-tree guard

`--dry-run` prints the full per-file plan (fast-forward / keep / no-op / add /
remove / merge-clean / CONFLICT) and the catalog deltas, and writes nothing. A
non-dry run refuses to proceed on a dirty git tree (uncommitted changes) so the
refresh lands as a single reviewable diff; `--allow-dirty` overrides.

#### FR-012: Idempotence and pin advance

On a successful, conflict-free run, `bornWith.ref` advances to the target ref.
A subsequent run against the same target is a no-op. The classifier and mergers
are deterministic, so the whole operation is idempotent for fixed inputs
(constitution-style determinism).

#### FR-013: Fail-visible reporting

refresh-kernel emits a structured summary: files fast-forwarded, merged, and
conflicted; modules migrated; and the ref move. Any error (unresolvable source,
missing base ref, unreadable file, dirty tree without `--allow-dirty`) is a hard
failure. The run is never skipped-green (lockstep posture).

## 4. Acceptance criteria

**AC-1.** A product born at ref R with an unmodified kernel file F is refreshed
to R' where F changed upstream: F is fast-forwarded to R' content, no conflict
reported.

**AC-2.** The app modified baseline file F in one region and the baseline
changed F in a non-overlapping region: refresh produces a clean 3-way merge
preserving both edits.

**AC-3.** Overlapping edits: refresh surfaces a conflict (markers plus non-zero
exit) and leaves the tree in a reviewable state; no silent overwrite.

**AC-4.** A module-owned file (`getFileOwner !== null`) is never modified.

**AC-5.** An app-authored file absent from the base baseline tree is never
modified.

**AC-6.** A declarative-marker module removed upstream (`data-redis`) is auto
migrated: dropped from `template.json.modules`, its `REDIS_URL` env commented,
and reported. A payload-bearing removed module instead halts with a
`remove-module` instruction.

**AC-7.** A product without `bornWith` fails without `--from-ref`, and succeeds
with a correct `--from-ref`.

**AC-8.** `--dry-run` writes nothing, and the plan it prints matches the result
of a real run applied to the same inputs (plan/apply parity).

**AC-9.** refresh-kernel does not modify `baseline.lock.json`. The pin advance
remains a spec 006 act.

**AC-10.** On a dual product, both sub-apps refresh and the internal rewire is
re-asserted; a second refresh against the same target is a no-op.

**AC-11.** A run on a dirty git tree is refused unless `--allow-dirty`.

## 5. Out of scope

- Advancing the generator's `baseline.lock.json` `pinnedRef` (spec 006). This
  spec reads the pin; moving it forward is a deliberate, coupling-gated act in
  006's territory.
- Refreshing module payloads or upgrading module versions in place: that is
  `add-module` / `remove-module` (specs 002, 003). refresh-kernel refreshes the
  baseline, and only reconciles catalog membership (FR-009).
- Fleet orchestration: applying refresh across many OAP-generated tenants at
  once. That is an OAP-side / OPC concern; refresh-kernel is the per-product
  primitive such a fleet operation would call.
- Semantic or behavioral conflict auto-resolution: refresh-kernel surfaces
  conflicts for human resolution and does not reason about code semantics.
- Deleting a module from the generator's catalog (as the `data-redis` retirement
  did on 2026-07-05) is a generator-repo change; refresh-kernel only migrates
  products off a module the catalog has already dropped.
