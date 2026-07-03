/**
 * Born-with output policy (the carry-forward classifier).
 *
 * This is the deterministic counterpart to the retired product-side
 * EXCLUDED_TOP_LEVEL hack. The carry-forward policy now lives WITH the
 * generator (its create-time home), not inside the product. It classifies
 * every entry of the template-encore baseline into exactly one of:
 *
 *   - kernel: the governance substrate a produced app is born with
 *     (standards/, spec-spine.toml, .claude/ dev skills, CODEMAP.md).
 *   - app: the runnable application plus the product-side specs that describe
 *     it (app-architecture and security/data invariants stay born-with the
 *     product, per the factory restructure).
 *   - generator-artifact: create-time machinery that must NEVER reach a
 *     produced app (the generator scripts, the module catalog, the create-time
 *     orchestration, the generator meta-specs, the compiled registries, and
 *     the governance tooling).
 *
 * The generator carries (kernel union app) and skips (generator-artifact),
 * then seeds a fresh specs/ from the Build Spec describing the produced app.
 *
 * A produced app is therefore born with: standards/ + spec-spine.toml + a
 * seeded specs/ + the .claude/ dev skills + CODEMAP.md, and carries none of
 * the generator, the module catalog, or the generator meta-specs.
 */

export type CarryDecision = 'kernel' | 'app' | 'generator-artifact'

// Top-level baseline entries that are create-time machinery: never carried
// into a produced app.
export const GENERATOR_ARTIFACT_TOP_LEVEL: ReadonlySet<string> = new Set([
  'scripts', // the generator itself
  'modules', // the module catalog
  'orchestration', // create-time from-spec orchestration
  '.derived', // compiled spec registry + codebase index. NOT carried: it is
  // regenerated per produced app at scaffold time over the produced tree;
  // carrying the template's copy would be stale (different specs/tools/etc.)
  // and fail the produced app's own `spec-spine index check`.
])

// The generator meta-specs (the specs that govern the generator / module
// system). A produced app carries the product / app specs under specs/ but
// NEVER these: they describe the create-time machinery, which the produced app
// does not contain. This set is the generator home's knowledge of its own
// meta-specs; it is kept in lockstep with specs/ in this repository.
export const GENERATOR_META_SPEC_IDS: ReadonlySet<string> = new Set([
  '001-module-manifest-schema',
  '002-encore-generator-core',
  '003-user-management-module',
  '004-dual-app-generator',
  '005-architecture-doc-governance',
])

// The born-with kernel: the governance substrate every produced app ships
// with, carried verbatim from the baseline. AGENTS.md is the vendor-neutral
// agent guide that is part of the kernel (read by every agent), not a
// template-dev artifact, so it is carried.
//
// `Makefile` and `tools/` are kernel, not generator machinery: the carried
// spec corpus and CI depend on them in the produced app. Spec 000-bootstrap
// `establishes: Makefile` (stripping it makes the produced app's
// `spec-spine index` emit I-004 for a missing file unit, so `index check`
// fails), and the carried `ci-supply-chain.yml` runs
// `tools/lint/workflow-pins.sh` (stripping `tools/` makes that step exit 127).
// The template's own `tools/` today is `tools/lint/` only.
export const BORN_WITH_KERNEL_TOP_LEVEL: ReadonlySet<string> = new Set([
  'standards',
  'spec-spine.toml',
  '.claude',
  'CODEMAP.md',
  'AGENTS.md',
  'Makefile',
  'tools',
])

// Skipped anywhere in the tree (at any depth), never carried.
export const SKIP_ANYWHERE: ReadonlySet<string> = new Set(['node_modules', '.git'])

/**
 * Classify a baseline entry by its path parts (relative to the baseline root,
 * forward-slash segments). The copy walk skips 'generator-artifact' entries and
 * carries 'kernel' and 'app' entries.
 */
export function classifyEntry(relParts: readonly string[]): CarryDecision {
  const top = relParts[0]
  if (top === undefined) return 'app'

  if (SKIP_ANYWHERE.has(top)) return 'generator-artifact'
  if (GENERATOR_ARTIFACT_TOP_LEVEL.has(top)) return 'generator-artifact'

  // The generator meta-specs are dropped from the carried specs/ corpus; the
  // rest of specs/ (the app-invariant and product specs) is born-with the app.
  if (top === 'specs') {
    const specId = relParts[1]
    if (specId !== undefined && GENERATOR_META_SPEC_IDS.has(specId)) {
      return 'generator-artifact'
    }
  }

  if (BORN_WITH_KERNEL_TOP_LEVEL.has(top)) return 'kernel'
  return 'app'
}

/** True when the baseline entry is carried into a produced app. */
export function isCarriedForward(relParts: readonly string[]): boolean {
  return classifyEntry(relParts) !== 'generator-artifact'
}
