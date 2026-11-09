# Runtime Validation Report

**Generated:** 2026-11-10

**Target:** `v1/HtmlArtsV1.html`
**Scope:** Phase 5 validation tasks T017–T018 and current release-gate review

## Summary

| Step | Status | Exit code | Details |
|---|---|---:|---|
| Startup/build | PASS | 0 | Build produced the standalone artifact; Chrome opened it via `file://` and local IndexedDB became ready |
| Unit/build tests | PASS | 0 | `npm --prefix v1 test`: 26 checks passed |
| Chromium E2E | PASS | 0 | 15 Playwright tests passed on Google Chrome 156.0.8078.79 |
| Firefox E2E | PASS | 0 | 15 Playwright tests passed serially on Firefox 142.0.1 |
| WebKit E2E | BLOCKED | 1 | Playwright WebKit could not launch because host libraries are missing; installing system libraries requires unavailable sudo access |
| Legacy baseline checks | PASS | 0 | Before removing the old application, `node tests/verify-book-server.js` (4 checks) and `node tests/verify-quine-composition.js` (5 checks) passed |
| Dependency audit | PASS | 0 | `npm audit --prefix v1`: zero vulnerabilities |
| 500-document benchmark | PASS | 0 | Benchmark completed; current-host figures below |
| HTML import-size policy | PASS | 0 | Approved 5 MiB cap; exact boundary and oversize rejection are unit- and browser-tested |

**Overall:** NEEDS_SIGNOFF — implementation and exercised browser flows passed, but WebKit/Safari, broader assistive-technology review, and explicit T019 release approval remain open. The root index in the proposed `dev` changes forwards to v1; the `release` branch and Pages workflow remain unchanged.

## Environment

- OS: Ubuntu 24.04 host
- CPU/RAM: Intel Core i5-5200U, 4 logical CPUs; 11 GiB reported
- Node.js: 18.19.1
- Google Chrome: 156.0.8078.79
- Playwright: 1.56.1
- Firefox: Playwright Firefox 142.0.1
- WebKit: Playwright WebKit 26.0 downloaded, but not runnable on this host
- Docker: available; infrastructure tier is not applicable to this static, browser-native IndexedDB client
- Authentication: not applicable; the application has no account/authentication flow

WebKit launch failure reported missing `libWPEBackend-fdo-1.0.so.1`, `libWPEWebKit-2.0.so.1`, `libwoff2dec.so.1.0.2`, `libevent-2.1.so.7`, `libjxl.so.0.8`, `libavif.so.16`, and `libwpe-1.0.so.1`. `sudo -n apt-get install ...` was attempted and returned `sudo: a password is required`. This Linux host cannot run native Safari; Playwright WebKit would provide engine coverage, not a native Safari release claim.

## Browser Journeys

All 15 Playwright E2E tests passed in Chromium and Firefox. The Firefox suite passed when run serially:

1. Create a publication, save a note, navigate back, reopen, and verify persisted state.
2. Surface IndexedDB annotation-save failure without false success.
3. Create and feature a publication from Home; use a page template; filter Your Space.
4. Open and close About accessibly; verify focus restoration and narrow viewport layout.
5. Migrate a legacy publication and annotation without deleting source data.
6. Draw, persist, undo, redo, clear, and download pen annotations; verify saved text highlights restore.
7. Import HTML offline, neutralize executable content, confirm outbound links before navigation, accept exactly 5 MiB, and reject larger files without changing the library.
8. Navigate structured folios in order.
9. Edit existing publication HTML in Studio; verify same document identity, sanitized content, and retained annotation.
10. Reject a foreign-frame Studio message; accept and safely render a valid Studio export.
11. Create notes, edit catalog metadata, exchange metadata manifests, and remove items after confirmation.

The journeys include keyboard reader navigation, Escape handling, focus return, accessible control names, and narrow layouts at 320px and 375px. They are not a full screen-reader or assistive-technology audit.

## Offline, Accessibility, and Performance

- Offline import/read journey passed with HTTP(S) requests blocked.
- Keyboard, focus, accessible-name, and narrow-layout checks passed in both available engines.
- A broader assistive-technology and representative-device review was not performed.
- Current 500-document benchmark on Chrome 156.0.8078.79:

| Measurement | Samples | Median |
|---|---|---:|
| Catalog reload, 500 documents | 302, 275, 316 ms | 302 ms |
| Search, one result among 500 | 182.7, 60.3, 45.1, 45.2, 73.4 ms | 60.3 ms |
| Reader open, 1 KiB content | 270.6, 104.7, 158.8, 152.3, 167.6 ms | 158.8 ms |
| Reader open, 50 KiB content | 301.4, 259.7, 129.2, 161.5, 340.0 ms | 259.7 ms |
| Reader open, 250 KiB content | 162.5, 261.0, 227.1, 221.5, 284.7 ms | 227.1 ms |

These are environment-specific measurements, not universal latency guarantees. The current benchmark had visibly higher variance than the prior run; no fixed performance threshold was established.

## Imported HTML Size Probe

On the current Chrome host, plain-text HTML imports completed successfully:

| Input size | Import result | Elapsed |
|---:|---|---:|
| 1 MiB | Imported and saved | 470 ms |
| 5 MiB | Imported and saved | 1,743 ms |
| 10 MiB | Imported and saved | 3,358 ms |

These are one-time pre-limit observations using simple text-only documents. The product owner selected a 5 MiB maximum; the import flow now accepts files up to and including 5 MiB and rejects larger files before reading them. The measurements do **not** establish performance for complex markup, data images, or lower-memory devices. Inputs are never silently truncated.

## Validation Verdict

```yaml
environment:
  docker: AVAILABLE — daemon responds; infra tier not applicable to this client
  node: AVAILABLE — v18.19.1
  playwright: PARTIAL — 1.56.1; Chromium and Firefox run, WebKit dependencies unavailable
  infra-tier: NOT_APPLICABLE — browser-native IndexedDB; no service or external database
  browser-tier: PARTIAL — Playwright Chromium and Firefox passed; WebKit blocked; native Safari unavailable on Linux
startup: PASS — build then open v1/HtmlArtsV1.html via file://; IndexedDB-ready status observed
integration: PASS — 26 unit/build checks passed; npm test exit_code: 0
e2e-chromium: PASS — 15/15 tests passed on Google Chrome 156.0.8078.79
e2e-firefox: PASS — 15/15 tests passed on Playwright Firefox 142.0.1 with --test-concurrency=1
e2e-webkit: BLOCKED — exit_code: 1, browser launch failed on missing host libraries; sudo installation unavailable
legacy-baseline-checks: PASS — exit_code: 0 before legacy source removal, passed: 9, failed: 0
dependency-audit: PASS — exit_code: 0, vulnerabilities: 0
performance: PASS — exit_code: 0, 500-document benchmark completed; no fixed SLO established
import-size: PASS — 5 MiB maximum selected; exact-boundary acceptance and >5 MiB pre-read rejection covered
overall: NEEDS_SIGNOFF — T019 release approval, broader accessibility review, and WebKit/Safari coverage remain open; release branch and Pages workflow unchanged
```

The default-concurrency Firefox run had two UI-wait timeouts under browser contention (13/15 passed); each affected test passed in isolation, and the complete 15-test suite passed when serialized. Keep Firefox validation serialized in this environment.

## Remaining Release Gates

- Resolve WebKit host dependencies and rerun browser journeys, or explicitly accept the browser-coverage gap; native Safari requires a supported Safari host.
- Complete a broader accessibility/assistive-technology review.
- Validate the selected 5 MiB limit with complex content and on lower-memory representative devices.
- Obtain explicit product-owner approval before changing any deployment entrypoint.
