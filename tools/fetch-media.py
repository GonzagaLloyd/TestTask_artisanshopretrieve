"""Recover the product / category images of the old shop from the Internet Archive.

content/images.json maps an original image URL to a file name in assets/media/.
The archive only holds part of those files, and often under another size variant
("…_300x300.webp") or the sister domain (artisanshop.de), so each URL is resolved
through the archive's CDX index first. Files are converted to WebP (max 900 px).

Resumable: files that already exist are skipped.   Usage:  python tools/fetch-media.py [workers]
Requires: Pillow (pip install pillow)
"""
import collections
import http.client
import io
import json
import re
import sys
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "media"
CACHE = ROOT / "tools" / ".cdx-media.json"
UA = {"User-Agent": "Mozilla/5.0 (artisanshop-recreation media recovery)"}
PREFIXES = [
    "www.artisanshop.ch/media/", "www.artisanshop.ch/thumbnail/",
    "www.artisanshop.de/media/", "www.artisanshop.de/thumbnail/",
    "cdn.artisanshop.de/media/", "cdn.artisanshop.de/thumbnail/",
]


_local = threading.local()


def _connection():
    """One persistent HTTPS connection per worker thread (the archive refuses bursts of new connections)."""
    if getattr(_local, "conn", None) is None:
        _local.conn = http.client.HTTPSConnection("web.archive.org", timeout=90)
    return _local.conn


def get(url, timeout=90, tries=6):
    parts = urllib.parse.urlsplit(url)
    target = parts.path + ("?" + parts.query if parts.query else "")
    for attempt in range(tries):
        try:
            conn = _connection()
            conn.request("GET", target, headers=UA)
            response = conn.getresponse()
            body = response.read()
            if response.status == 200:
                return body
            if response.status in (301, 302, 303, 307, 308):
                return get(urllib.parse.urljoin(url, response.getheader("Location")), timeout, tries - attempt)
            if response.status == 404:
                return None
            _local.conn = None
            time.sleep(4 * (attempt + 1))
        except Exception:
            _local.conn = None
            time.sleep(3 * (attempt + 1))
    return None


def load_index():
    if CACHE.exists():
        return json.loads(CACHE.read_text())
    rows = {}
    for prefix in PREFIXES:
        q = ("https://web.archive.org/cdx/search/cdx?url=%s&matchType=prefix&output=json"
             "&fl=original,timestamp&filter=statuscode:200&collapse=urlkey&limit=100000" % urllib.parse.quote(prefix))
        data = get(q, timeout=240)
        for original, ts in (json.loads(data)[1:] if data else []):
            rows[original] = ts
        print("index", prefix, len(rows), flush=True)
    CACHE.write_text(json.dumps(rows))
    return rows


def normalise(url):
    return re.sub(r"^https?://", "", re.sub(r"\?.*$", "", url)).replace("www.artisanshop.de", "www.artisanshop.ch")


def variant_key(url):
    name = re.sub(r"\?.*$", "", url).rsplit("/", 1)[-1]
    return re.sub(r"\.\w+$", "", re.sub(r"_\d+x\d+(?=\.\w+$)", "", name))


def pixel_hint(url):
    m = re.search(r"_(\d+)x\d+\.\w+", url)
    return int(m.group(1)) if m else 10_000          # originals beat thumbnails


def main():
    workers = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    images = json.loads((ROOT / "content" / "images.json").read_text(encoding="utf-8"))
    index = load_index()

    exact = collections.defaultdict(list)
    by_name = collections.defaultdict(list)
    for original, ts in index.items():
        exact[normalise(original)].append((original, ts))
        by_name[variant_key(original)].append((original, ts))

    jobs = []
    for source, filename in images.items():
        if (OUT / filename).exists():
            continue
        candidates = exact.get(normalise(source)) or by_name.get(variant_key(source)) or []
        if candidates:
            original, ts = max(candidates, key=lambda c: pixel_hint(c[0]))
            jobs.append((filename, original, ts))
    print(f"{len(images)} images referenced, {len(jobs)} to download, "
          f"{len(images) - len(jobs) - sum((OUT / f).exists() for f in images.values())} not in the archive", flush=True)

    OUT.mkdir(parents=True, exist_ok=True)
    done = threading.Lock()
    counters = {"ok": 0, "fail": 0}

    def work(job):
        filename, original, ts = job
        data = get(f"https://web.archive.org/web/{ts}id_/{original}")
        try:
            if not data:
                raise ValueError("empty")
            if filename.endswith(".svg"):
                (OUT / filename).write_bytes(data)
            else:
                image = Image.open(io.BytesIO(data))
                image.thumbnail((900, 900))
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGBA" if "transparency" in image.info else "RGB")
                image.save(OUT / filename, "WEBP", quality=82, method=4)
            key = "ok"
        except Exception:
            key = "fail"
        with done:
            counters[key] += 1
            total = counters["ok"] + counters["fail"]
            if total % 100 == 0:
                print(f"{total}/{len(jobs)}  ok={counters['ok']} fail={counters['fail']}", flush=True)

    with ThreadPoolExecutor(workers) as pool:
        list(pool.map(work, jobs))
    print(f"finished: ok={counters['ok']} fail={counters['fail']}", flush=True)


if __name__ == "__main__":
    main()
