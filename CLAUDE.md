# factory-encore

`factory-encore` is an original, independent implementation of the Open Agentic
Platform (OAP) factory standard: a three-layer, technology-agnostic software
factory. Its `process/` and documentation are authored here; its `contract/`
mirrors the OAP open standard. Released under Apache-2.0. See `README.md` for the
architecture and `docs/oap-integration.md` for how the layers map onto OAP.

## What this repository is

- **`process/`** transforms business documents into a structured Build
  Specification through ordered pipeline stages. It never references any
  framework or language.
- **`contract/`** holds the formal interface schemas between process and
  implementation: Build Specification, Adapter Manifest, Verification Contract,
  Pipeline State, and Governance Envelope.
- **`adapters/`** is where pluggable, stack-specific implementations live. One
  adapter ships: `encore-vue` (Encore.ts + Vue 3 / PrimeVue / rauthy),
  specification-complete; its runnable scaffold source is a tracked follow-up.
  See `adapters/README.md`.

## Working rules

- **The contract is an open standard.** Only organization-agnostic and
  stack-agnostic concepts belong in `contract/`. The canonical home of the
  schemas is the OAP repository; this repository mirrors them. Do not fork or
  edit the schemas casually; mirror the canonical version. Anything
  organization- or stack-specific belongs in an adapter, never in the contract.
- **Keep the layers clean.** No framework or language names in `process/` or
  `contract/`. All technology specifics stay inside `adapters/<name>/`.
- **Plain content.** This repository is consumed by OAP. It is not its own
  Claude Code harness and carries no CI surface; there is intentionally no
  `.github/` workflow here.

## House style

- **No em dashes (U+2014).** Use a colon, semicolon, comma, parentheses, or two
  sentences. En dashes are acceptable only for numeric or section ranges.
- **LF line endings.** All text files use LF (`.gitattributes` enforces this).
  Do not let an editor rewrite them to CRLF.
