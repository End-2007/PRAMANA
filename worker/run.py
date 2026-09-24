"""Worker entry point.

Trigger reversal is 25-40 minutes per artefact at 43 classes and leave-lot-out
retraining is hours, so assessments run here rather than inside an HTTP request.

The queue server is **Valkey**, not Redis. The client library is still called ``redis``
because that is the wire protocol's name; the server we ship is BSD-3-licensed. See
NOTICE for why the distinction matters enough to write down.
"""

from __future__ import annotations

import os
import sys
import time

from pramana.offline import assert_no_network


def main() -> int:
    if os.environ.get("PRAMANA_OFFLINE") == "1":
        # Fail loudly rather than quietly fetching something. Clause 2.2.6 is a
        # constraint on the running system, not only on the install.
        assert_no_network()

    queue_url = os.environ.get("PRAMANA_QUEUE_URL")
    if not queue_url:
        print("PRAMANA_QUEUE_URL is not set; nothing to consume.", file=sys.stderr)
        print(
            "The API falls back to in-process threads when no queue is configured, "
            "so a cold clone still runs without a broker.",
            file=sys.stderr,
        )
        return 1

    try:
        from redis import Redis  # wire protocol client; the SERVER is Valkey
        from rq import Queue, Worker
    except ImportError:
        print(
            "rq and redis are not installed. Install the api extra: "
            "pip install 'pramana[api]'",
            file=sys.stderr,
        )
        return 1

    for attempt in range(30):
        try:
            conn = Redis.from_url(queue_url)
            conn.ping()
            break
        except Exception as exc:  # noqa: BLE001
            print(f"  queue not ready ({exc}); retry {attempt + 1}/30", file=sys.stderr)
            time.sleep(2)
    else:
        print("queue never became ready", file=sys.stderr)
        return 1

    print(f"worker connected to {queue_url}; consuming 'assessments'", file=sys.stderr)
    Worker([Queue("assessments", connection=conn)], connection=conn).work()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
