---
id: "031-factory-schema-lockstep"
title: "Generator/baseline lockstep: pin the generator to template-encore's frozen invariants"
status: approved
created: "2026-06-23"
owner: bart
kind: governance
domain: ci-cd
risk: medium
implementation: complete
depends_on: ["008-encore-generator-core"]
code_aliases: ["FACTORY_SCHEMA_LOCKSTEP"]
summary: >
  The generator clones the template-encore lean baseline, so it must not drift
  from the app invariants frozen there (001 architecture, 002 security/data) nor
  from the baseline's core-service and module-catalog shape. This spec stands up
  a cross-repo lockstep: a committed lockfile pins the upstream ref, the baseline
  core services, and the module catalog membership; a fail-visible CI gate
  fetches the baseline at the pinned ref and refuses any drift. The 001/002
  invariant-hash pin is DEFERRED to the Phase 3 handshake (001 changes in Phase 2
  when it absorbs the static-serving wiring from spec 010); the mechanism is
  fully wired and the invariant spec files are verified present, but the hashes
  are not enforced until Phase 3 flips the pin. Mirrors the OAP spec-212 pattern.
establishes:
  - "adapters/acme-vue-encore/scripts/lockstep/check.ts"
  - "adapters/acme-vue-encore/scripts/lockstep/check.test.ts"
  - "adapters/acme-vue-encore/scripts/lockstep/baseline.lock.json"
  - ".github/workflows/ci-lockstep.yml"
---

# 031. Generator/baseline lockstep: pin the generator to template-encore's frozen invariants

## 1. Purpose

factory-encore does not author the runnable application: it clones the
template-encore lean baseline and composes modules into it (spec 008). Two
classes of upstream change would silently break a generated app:

1. A change to the app's frozen invariants (001 architecture, 002
   security/data), which the generator assumes but does not own.
2. A reshape of the baseline (a renamed core service, a removed module) that the
   "lean baseline + compose" generator depends on structurally.

Neither lives in this repository, so neither is reachable by the in-repo
coupling gate. This spec binds them across the repository boundary, mirroring
the OAP spec-212 factory-schema-lockstep pattern.

## 2. Territory

This spec owns the lockstep checker, its committed lockfile, and the CI gate
that runs it. The app invariants it pins (001, 002) are authored in
template-encore; this spec pins their content, it does not redefine them. The
generator that consumes the baseline is owned by spec 008.

## 3. Behavior

#### FR-001: The committed lockfile is the single source of truth

`baseline.lock.json` MUST pin: `upstreamSource` (the template-encore remote),
`pinnedRef` (a full 40-hex commit SHA), `baselineStructure` (`coreServices` the
generator clones, and `modules` the catalog mirrors), and `invariantPin` (the
deferred-or-active 001/002 hash pin: a `status` of `deferred` or `pinned`, the
`specs` list covering at least 001 and 002, and a `hashes` map filled only when
pinned). Bumping any pin is a coupling-gated edit to this spec.

#### FR-002: Three-dimension verification

The checker MUST verify, against a baseline checkout at the pinned ref:

- **Invariant pin**: every `invariantPin.specs` path is present in the baseline.
  When `status` is `pinned`, the re-hashed spec.md must match the pinned hash; a
  mismatch is reported as `DRIFT` and fails. When `status` is `deferred`, the
  hash is NOT enforced; a visible notice records that the pin is wired but not
  yet active. A missing invariant spec fails in both states.
- **Baseline structure**: every `coreServices` path exists in the baseline.
- **Catalog binding**: every `modules` entry has a `manifest.json` both in this
  repo's catalog and in the baseline catalog.

#### FR-003: The invariant pin is deferred until the Phase 3 handshake

In Phase 1 `invariantPin.status` MUST be `deferred`. 001 changes in Phase 2 (it
absorbs the static-serving wiring relocated out of spec 010), so pinning its
current hash now would lock a value about to change. Phase 3 (after the template
session finalizes 001/002) flips `status` to `pinned`, fills `hashes`, and bumps
`pinnedRef` to the finalized baseline. The deferral is visible (a notice), never
a silent skip.

#### FR-004: Fail-visible, never skipped-green

A missing baseline source, an unreadable pin, a missing invariant spec, or any
verification failure MUST fail the gate with a surfaced error. The gate is never
skipped to a green result (OAP spec-212 FR-003 / AC-6 posture). In CI the
baseline is fetched by sparse checkout at the pinned ref from the public
template-encore remote; a fetch failure fails the gate.

#### FR-005: Local verifiability

The checker MUST resolve a baseline source from `--source`,
`TEMPLATE_ENCORE_SOURCE`, or a sibling `template-encore` checkout, so the
lockstep is runnable locally (`npm run lockstep`) and in CI with the same code.

## 4. Acceptance criteria

**AC-1.** `npm run lockstep` exits 0 against a template-encore checkout at the
pinned ref (invariant pin deferred), emitting a visible notice per deferred
invariant spec, and exits non-zero on any injected structural drift (missing
core service, missing catalog module, or a missing invariant spec).

**AC-2.** `vitest` covers each verification dimension: pinned-hash drift
detection, the deferred pin NOT enforcing hashes (notice only), a missing
invariant spec failing even when deferred, missing core service, and catalog
mismatch. It also asserts the committed lockfile is well-formed with
`invariantPin.status` = `deferred` and empty `hashes` in Phase 1.

**AC-3.** `ci-lockstep.yml` reads `pinnedRef` from the committed lockfile,
fetches the baseline at that ref, and runs the checker; a fetch or check failure
fails the job.

**AC-4.** Phase 3 readiness: flipping `invariantPin.status` to `pinned` and
filling `hashes` activates hash enforcement with no checker code change.

## 5. Out of scope

- **Authoring the invariants** (001, 002): owned upstream in template-encore.
- **Schema parity for the OAP contract schemas**: covered by OAP's own spec-212
  in the open-agentic-platform repository; this spec pins the app baseline, not
  the contract schemas.
- **Automatic ref bumping**: a pin bump is a deliberate, coupling-gated edit.
