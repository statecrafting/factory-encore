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

One adapter ships: **`encore-vue`** (Encore.ts + Vue 3 / PrimeVue / rauthy OIDC),
specification-complete. Its runnable scaffold source is a tracked follow-up, so
it documents the stack but is not yet Create-eligible. See `adapters/README.md`.
The framework core (process + contract) is complete and adapter-ready.

## Directory structure

```
factory-encore/
├── process/
│   ├── stages/      pipeline stage definitions (pre-flight through handoff)
│   ├── agents/      focused agent prompts (orchestrators + stage agents)
│   ├── skills/      cross-stage validation rules
│   └── governance-envelope.yaml
├── contract/
│   ├── schemas/     the five contract schemas + stage-output schemas
│   └── examples/    worked Build Specification and stage-output examples
├── adapters/        pluggable, technology-specific implementations (none yet)
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
