# factory-encore

A technology-agnostic software factory framework. `factory-encore` separates the
**process** of building software (requirements, design, specification) from the
**implementation** (frameworks, languages, code patterns) by placing a formal
**contract** between the two. The process turns business documents into a
structured, frozen Build Specification; an adapter turns that specification into
a running application.

This repository is an original, independent implementation of the
[Open Agentic Platform](https://github.com/stagecraft-ing/open-agentic-platform)
(OAP) factory standard. The contract schemas mirror that published standard; the
process layer and documentation are authored here. Released under Apache-2.0
(see `LICENSE` and `NOTICE`).

## Three layers

```
┌───────────────────────────────────────────────┐
│  PROCESS   universal, technology-agnostic       │
│  Pipeline stages that transform business        │
│  documents into a Build Specification.          │
│  Never names a framework or language.           │
├───────────────────────────────────────────────┤
│  CONTRACT  formal interface schemas             │
│  Build Specification, Adapter Manifest,         │
│  Verification Contract, Pipeline State,         │
│  Governance Envelope.                           │
├───────────────────────────────────────────────┤
│  ADAPTER   pluggable, technology-specific       │
│  One implementation per stack. Declares its     │
│  capabilities, commands, agents, and patterns.  │
└───────────────────────────────────────────────┘
```

### Process layer (`process/`)

Universal pipeline stages that read raw business documentation and emit
structured, technology-free specifications. The process layer runs requirement
analysis, service design, data modeling, and API/UI specification; produces a
Build Specification (not code); enforces cross-stage consistency at validation
gates; and persists durable pipeline state for resumability. It never references
or assumes any specific technology.

The stages run in order: pre-flight, business requirements, service
requirements, data model, API specification, UI specification, and adapter
handoff, with an optional client-documentation stage that never blocks the
build.

### Contract layer (`contract/`)

Formal schemas that define the interface between process and implementation:

- **Build Specification** (`build-spec.schema.yaml`) is the factory's output:
  what resources exist, what operations are available, what pages display them,
  and what rules govern them. Completely technology-free.
- **Adapter Manifest** (`adapter-manifest.schema.yaml`) is what an adapter
  declares: its stack, capabilities, supported auth methods, build commands,
  directory conventions, agents, and pattern locations.
- **Verification Contract** (`verification.schema.yaml`) is what must pass at
  each gate: pre-flight checks, per-stage gates, scaffolding gates, and final
  validation.
- **Pipeline State** (`pipeline-state.schema.yaml`) is durable execution state
  for resumability: stage progress, scaffolding status, verification results,
  and an audit trail.
- **Governance Envelope** (`governance-envelope.schema.yaml`) is the admission
  brief a process files: its objective class, ceilings, human-in-the-loop gate
  predicates, and the artifacts it emits.

The contract is an open standard. Its canonical home is the OAP repository; this
repository mirrors it so the process and any adapter can be developed against a
stable interface.

### Adapter layer (`adapters/`)

Pluggable implementations, one per technology stack. An adapter is self-contained:
a manifest declaring its capabilities, focused agent prompts, code-generation
patterns, validation rules, and a scaffold source. Adding a stack means adding an
adapter; the process and contract layers never change.

One adapter ships: **`acme-vue-encore`** (Encore.ts + Vue 3 / PrimeVue / rauthy
OIDC). It is also the **create-time home** of that product: it carries the
deterministic generator (`scripts/`), the module catalog (`modules/`), the
create-time orchestration (`orchestration/`), and the specs that govern them.
The generator clones the `template-encore` lean baseline via `--source` and
composes the requested modules in ("lean baseline + compose"). See
`adapters/README.md`.

Because it now carries governed code, this repository has a kernel: a
`package.json` (tsx + vitest), a spec-spine corpus under `specs/` with its
`standards/`, and a resilient CI surface under `.github/workflows/` whose
terminal `ci-gate` aggregates the governance gate, the generator tests, the
cross-repo lockstep, and an AI PR review.

## Directory structure

```
factory-encore/
├── process/         universal pipeline (pre-flight through handoff)
│   ├── stages/      pipeline stage definitions
│   ├── agents/      focused agent prompts (orchestrators + stage agents)
│   ├── skills/      cross-stage validation rules
│   └── governance-envelope.yaml
├── contract/        the five contract schemas + stage-output schemas
│   ├── schemas/
│   └── examples/    worked Build Specification and stage-output examples
├── adapters/
│   └── acme-vue-encore/   the Encore.ts + Vue 3 adapter AND its create-time home
│       ├── manifest.yaml  adapter declaration (identity: acme-vue-encore)
│       ├── scripts/        the deterministic generator (+ lockstep, + tests)
│       ├── modules/        the module catalog
│       ├── orchestration/  create-time from-spec skills + template orchestrator
│       ├── agents/         code-generation agent prompts
│       └── patterns/       code-generation patterns
├── specs/           generator meta-specs (kernel, generator, lockstep, docs)
├── standards/       spec-spine constitution + contract
├── spec-spine.toml  governance config
├── package.json     generator toolchain (tsx + vitest)
├── .github/workflows/   resilient CI surface (terminal ci-gate)
└── docs/            architecture, how-to, and OAP integration
```

## Principles

1. **The factory never generates code.** It produces a Build Specification.
   Adapters generate code.
2. **Each agent has bounded context.** No agent holds the whole pipeline in
   memory; each reads one specification slice and one pattern and produces one
   artifact.
3. **Validation is automated, not self-assessed.** The adapter declares
   build/test/lint commands; a verification harness runs them.
4. **Build, test, fix loops.** Each feature is scaffolded, verified, and retried,
   not batch-generated and hoped to work.
5. **Durable state enables resumability.** Pipeline state is persisted after each
   step; recovery reads state and continues from the last checkpoint.

## License

Apache License 2.0. See `LICENSE` and `NOTICE`.
