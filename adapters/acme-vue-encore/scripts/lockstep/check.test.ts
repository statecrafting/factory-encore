import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  loadLockfile,
  sha256File,
  verifyInvariantPin,
  verifyBaselineStructure,
  verifyCatalogBinding,
  runCheck,
  resolveSource,
  ADAPTER_ROOT,
  type Lockfile,
} from './check'

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lockstep-'))
}

const SPEC_PATH = 'specs/001-encore-app-architecture/spec.md'

/** Build a synthetic baseline source plus a lockfile in the given pin status. */
function makeSyntheticBaseline(status: 'deferred' | 'pinned'): { source: string; lock: Lockfile } {
  const source = tmpDir()
  fs.mkdirSync(path.join(source, path.dirname(SPEC_PATH)), { recursive: true })
  fs.writeFileSync(path.join(source, SPEC_PATH), '# frozen invariant\n', 'utf-8')
  for (const svc of ['apps/api/auth', 'apps/api/db']) {
    fs.mkdirSync(path.join(source, svc), { recursive: true })
  }
  fs.mkdirSync(path.join(source, 'modules', 'security-core'), { recursive: true })
  fs.writeFileSync(path.join(source, 'modules', 'security-core', 'manifest.json'), '{}', 'utf-8')

  const lock: Lockfile = {
    upstreamSource: 'github.com/stagecraft-ing/template-encore',
    pinnedRef: 'deadbeef',
    invariantPin: {
      status,
      specs: [SPEC_PATH],
      hashes: status === 'pinned' ? { [SPEC_PATH]: sha256File(path.join(source, SPEC_PATH)) } : {},
    },
    baselineStructure: {
      coreServices: ['apps/api/auth', 'apps/api/db'],
      modules: ['security-core'],
    },
  }
  return { source, lock }
}

describe('lockstep checker (pure functions)', () => {
  it('passes when a pinned baseline matches the hashes and structure', () => {
    const { source, lock } = makeSyntheticBaseline('pinned')
    const adapterRoot = tmpDir()
    fs.mkdirSync(path.join(adapterRoot, 'modules', 'security-core'), { recursive: true })
    fs.writeFileSync(path.join(adapterRoot, 'modules', 'security-core', 'manifest.json'), '{}', 'utf-8')

    const result = runCheck({ source, adapterRoot, lock })
    expect(result.ok).toBe(true)
    expect(result.failures).toEqual([])
  })

  it('detects invariant-hash drift when pinned', () => {
    const { source, lock } = makeSyntheticBaseline('pinned')
    // Mutate the upstream invariant spec: its hash no longer matches the pin.
    fs.writeFileSync(path.join(source, SPEC_PATH), '# tampered invariant\n', 'utf-8')
    const { failures } = verifyInvariantPin(source, lock)
    expect(failures.length).toBe(1)
    expect(failures[0]).toContain('DRIFT')
  })

  it('does NOT enforce hashes when the pin is deferred (notice only)', () => {
    const { source, lock } = makeSyntheticBaseline('deferred')
    // Even a tampered spec passes while deferred: the mechanism is wired but the
    // hash is not yet enforced (it activates in Phase 3).
    fs.writeFileSync(path.join(source, SPEC_PATH), '# anything goes while deferred\n', 'utf-8')
    const { failures, notices } = verifyInvariantPin(source, lock)
    expect(failures).toEqual([])
    expect(notices.length).toBe(1)
    expect(notices[0]).toContain('DEFERRED')
  })

  it('still fails (even when deferred) if a pinned invariant spec is absent from the baseline', () => {
    const { source, lock } = makeSyntheticBaseline('deferred')
    fs.rmSync(path.join(source, SPEC_PATH), { force: true })
    const { failures } = verifyInvariantPin(source, lock)
    expect(failures.some((f) => f.includes('invariant spec missing'))).toBe(true)
  })

  it('detects a missing core service in the baseline', () => {
    const { source, lock } = makeSyntheticBaseline('deferred')
    fs.rmSync(path.join(source, 'apps/api/db'), { recursive: true, force: true })
    const failures = verifyBaselineStructure(source, lock)
    expect(failures.some((f) => f.includes('apps/api/db'))).toBe(true)
  })

  it('detects a module present in the baseline but missing from the generator catalog', () => {
    const { source, lock } = makeSyntheticBaseline('deferred')
    const adapterRoot = tmpDir() // empty catalog
    const failures = verifyCatalogBinding(adapterRoot, source, lock)
    expect(failures.some((f) => f.includes('generator catalog missing module'))).toBe(true)
  })
})

describe('lockstep checker (committed lockfile against the live baseline)', () => {
  const lock = loadLockfile()
  const source = resolveSource([])

  it('ships a well-formed committed lockfile with the invariant pin deferred (Phase 1)', () => {
    expect(lock.pinnedRef).toMatch(/^[0-9a-f]{40}$/)
    expect(lock.invariantPin.status).toBe('deferred')
    expect(lock.invariantPin.hashes).toEqual({})
    expect(lock.invariantPin.specs).toContain('specs/001-encore-app-architecture/spec.md')
    expect(lock.invariantPin.specs).toContain('specs/002-security-data-invariants/spec.md')
    expect(lock.baselineStructure.coreServices).toContain('apps/api/auth')
    expect(lock.baselineStructure.modules).toContain('user-management')
    // Every pinned module is present in this repo's own catalog.
    for (const m of lock.baselineStructure.modules) {
      expect(fs.existsSync(path.join(ADAPTER_ROOT, 'modules', m, 'manifest.json'))).toBe(true)
    }
  })

  it.runIf(source !== null)('the generator is in lockstep with the resolved baseline (pin deferred)', () => {
    const result = runCheck({ source: source as string })
    if (!result.ok) {
      throw new Error(`lockstep drift:\n${result.failures.join('\n')}`)
    }
    expect(result.ok).toBe(true)
    // While deferred, the invariant dimension emits notices, not failures.
    expect(result.notices.length).toBeGreaterThanOrEqual(2)
  })
})
