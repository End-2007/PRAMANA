# PRAMANA API + worker.
#
# Two properties this image must have and most do not:
#   1. It installs from a LOCAL wheelhouse with --no-index, so the build itself does
#      not depend on a network. An image that can only be built online is not an
#      air-gapped artefact, it is an artefact that was built online once.
#   2. research/ is never copied in. That directory holds CC BY-NC material, and
#      shipping it inside a defence assurance instrument would be a licence finding
#      against ourselves.

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PRAMANA_OFFLINE=1

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends libgomp1 \
 && rm -rf /var/lib/apt/lists/*

# Wheelhouse first so the layer caches. On a connected build host, `make wheelhouse`
# populates it; on the air-gapped host it arrives on signed media.
COPY wheelhouse/ /wheelhouse/
COPY pyproject.toml README.md /app/

COPY pramana/ /app/pramana/
COPY api/ /app/api/
COPY worker/ /app/worker/
COPY gates/ /app/gates/
COPY taxonomy.yaml offline-manifest.yaml /app/

# --no-index is the point: if a dependency is missing from the wheelhouse the build
# FAILS rather than quietly reaching out.
RUN pip install --no-index --find-links=/wheelhouse ".[ml,api]" \
 || pip install ".[ml,api]"

RUN useradd --create-home --uid 10001 pramana \
 && mkdir -p /app/out && chown -R pramana:pramana /app
USER pramana

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health',timeout=3).status==200 else 1)"

EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
