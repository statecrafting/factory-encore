# Adapters

An adapter implements the factory for exactly one technology stack. It is the
only layer that names a framework, a language, or a file path. The process and
contract layers never change when an adapter is added or removed.

## What an adapter contains

Each adapter is a self-contained directory `adapters/<name>/`:

- `manifest.yaml`, conformant to `contract/schemas/adapter-manifest.schema.yaml`,
  declaring the stack, capabilities, supported auth methods, build and test
  commands, directory conventions, the agents it ships, the locations of its code
  patterns, a scaffold source, and a `governance:` sub-envelope.
- `agents/`, the focused code-generation agents the scaffolding orchestrator
  invokes (data, API, UI, configure, trim, and any optional reviewer or seed
  generator the manifest declares).
- `patterns/`, concrete code-generation patterns the agents follow.
- `validation/`, the stack-specific invariants checked during final validation.

The factory binds a run to an adapter at pre-flight and confirms, once the
deployment variant is known at Stage 2, that the adapter can satisfy the run's
variant and auth methods before any scaffolding begins.

## Status

**No concrete adapter ships in this repository yet.** The framework core (process
and contract) is complete and adapter-ready. The first adapter is a tracked
follow-up: it requires a clean, public scaffold-source repository so that the
adapter is both independently authored and usable by anyone who clones it. Until
that source exists, shipping an adapter here would either depend on a private
repository or carry stack content that is not yet cleared for publication.

To contribute an adapter, follow `docs/how-to.md` ("Adding an adapter") and the
Adapter Manifest schema.
