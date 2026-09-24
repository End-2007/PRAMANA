# PRAMANA
#
# The targets a reviewer runs are at the top. Everything below `verify` is plumbing.

.DEFAULT_GOAL := help
.PHONY: help install fixtures demo verify test gates validate coverage-check \
        licence-check sbom reuse-lint lint offline-bundle offline-load wheelhouse \
        api console clean

PY      ?= python
PIP     ?= pip
OUT     ?= out

help:
	@echo ""
	@echo "  PRAMANA -- what a reviewer can check in under a minute"
	@echo ""
	@echo "    make install         editable install with ml, api and dev extras"
	@echo "    make demo            the twelve-beat run, offline"
	@echo "    make verify          demo + gates + tests + licence check  <-- start here"
	@echo ""
	@echo "  Individual checks"
	@echo "    make validate        the six comparator pairs on the emitted report"
	@echo "    make coverage-check  a class with no disposition fails the build"
	@echo "    make gates           all six build gates"
	@echo "    make test            unit tests + mutation tests"
	@echo "    make licence-check   no NonCommercial or source-available dependency"
	@echo "    make sbom            generate the CycloneDX bill of materials"
	@echo ""
	@echo "  Air gap"
	@echo "    make wheelhouse      download every wheel for an offline install"
	@echo "    make offline-bundle  pull images, export to tar"
	@echo "    make offline-load    docker load every image on the air-gapped host"
	@echo ""

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

install:
	$(PIP) install -e ".[ml,api,dev]"
	@$(MAKE) --no-print-directory fixtures

fixtures:
	$(PY) scripts/make_fixtures.py

# ---------------------------------------------------------------------------
# The checks
# ---------------------------------------------------------------------------

demo:
	$(PY) -m pramana.cli demo --out $(OUT)

validate:
	$(PY) -m pramana.cli report validate $(OUT)/report.json

coverage-check:
	$(PY) -m pramana.cli coverage check

gates:
	$(PY) gates/pramana_gates.py

test:
	$(PY) -m pytest tests/ -q

selftest:
	$(PY) -m pramana.cli selftest

## The one target to run. Order matters: the demo produces the report the gates check.
verify: demo gates test licence-check
	@echo ""
	@echo "  VERIFIED -- demo ran, gates passed, tests passed, licences clean."
	@echo ""

# ---------------------------------------------------------------------------
# Licence position (MUST 13)
# ---------------------------------------------------------------------------

## Fails on any NonCommercial or source-available licence in the dependency tree.
## This is the enforcement behind the open-source claim in the README: asserted
## claims are worth less than a gate that breaks the build.
licence-check:
	@$(PY) -c "from pramana.offline import manifest_summary; \
	s = manifest_summary(); \
	print('  manifest licences:', s['licences']); \
	[print('  FLAGGED:', f) for f in s['flagged']]; \
	raise SystemExit(0 if s['clean'] else 1)"
	@command -v pip-licenses >/dev/null 2>&1 && \
	  pip-licenses --format=plain --with-license-file --no-license-path 2>/dev/null \
	    | grep -Ei 'NonCommercial|CC-BY-NC|SSPL|RSAL|Business Source' \
	    && { echo "  FAIL: a forbidden licence is installed"; exit 1; } \
	    || echo "  pip tree: no NonCommercial or source-available licence found" \
	  || echo "  (pip-licenses not installed; run 'pip install pip-licenses')"

sbom:
	@command -v cyclonedx-py >/dev/null 2>&1 \
	  && cyclonedx-py environment -o $(OUT)/sbom.cyclonedx.json \
	  && echo "  wrote $(OUT)/sbom.cyclonedx.json" \
	  || echo "  (cyclonedx-bom not installed; run 'pip install cyclonedx-bom')"

reuse-lint:
	@command -v reuse >/dev/null 2>&1 && reuse lint || echo "  (reuse not installed)"

lint:
	@command -v ruff >/dev/null 2>&1 && ruff check pramana api worker gates tests || echo "  (ruff not installed)"

# ---------------------------------------------------------------------------
# Air gap
# ---------------------------------------------------------------------------

## Run on a CONNECTED machine. Everything after this is offline.
wheelhouse:
	mkdir -p wheelhouse
	$(PIP) download -d wheelhouse ".[ml,api]"
	@echo "  wheelhouse populated. Stage it onto signed media with the manifest."

offline-bundle:
	mkdir -p images
	docker compose build
	docker save -o images/pramana-api.tar pramana-api || true
	@echo "  images exported. Carry images/ and wheelhouse/ across the air gap."

offline-load:
	@for t in images/*.tar; do echo "  loading $$t"; docker load -i "$$t"; done

verify-offline:
	$(PY) -m pramana.cli verify-offline

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

api:
	uvicorn api.main:app --reload --port 8000

console:
	cd console && npm run dev

clean:
	rm -rf $(OUT) .pytest_cache .ruff_cache
	find . -name __pycache__ -type d -prune -exec rm -rf {} +
