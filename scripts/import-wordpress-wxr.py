#!/usr/bin/env python3
"""Import a WordPress WXR (.xml) export into data/wordpress JSON used by the app.

Usage:
  python3 scripts/import-wordpress-wxr.py [path/to/export.xml]
  python3 scripts/import-wordpress-wxr.py --enrich-rest

Defaults to the newest file in data/wordpress/exports/.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "wordpress"
EXPORTS = OUT / "exports"
SITE = "https://www.g100.in"
API = f"{SITE}/wp-json/wp/v2"

ITEM_RE = re.compile(rb"<item>(.*?)</item>", re.S)
META_RE = re.compile(
    r"<wp:postmeta>\s*<wp:meta_key><!\[CDATA\[(?P<key>.*?)\]\]></wp:meta_key>\s*"
    r"<wp:meta_value><!\[CDATA\[(?P<value>.*?)\]\]></wp:meta_value>\s*</wp:postmeta>",
    re.S,
)


def tag(item: str, name: str, default: str = "") -> str:
    m = re.search(
        rf"<{re.escape(name)}(?:\s[^>]*)?>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))</{re.escape(name)}>",
        item,
        re.S,
    )
    if not m:
        return default
    return m.group(1) if m.group(1) is not None else (m.group(2) or default)


def decode_entities(value: str = "") -> str:
    return html.unescape(value or "")


def classify(title: str, slug: str) -> str:
    t = title
    tl = t.lower()
    sl = (slug or "").lower()

    exact = {
        "about-us": "about_us",
        "about-founder": "founder",
        "global-president": "global_president",
        "presidents-advisory-council": "presidents_advisory",
        "g100-global-chairs-and-chapters": "global_chair",
        "country-clubs": "country_club",
        "denim-club-partners": "denim_club",
        "the-denim-club-dialogues": "denim_dialogues",
        "meetings": "meetings_hub",
        "home": "home",
    }
    if sl in exact:
        return exact[sl]

    if re.search(r"\bmeetings?\b|\bmeet & greet\b|\bmeet-greet\b", tl, re.I):
        return "meetings"

    patterns = [
        ("country_chair", r"\bcountry chairs?\b"),
        ("state_chair", r"\bstate chairs?\b"),
        ("city_chair", r"\bcity chairs?\b"),
        ("country_denim", r"\bcountry denim partners?\b"),
        ("state_denim", r"\bstate denim partners?\b"),
        ("city_denim", r"\bcity denim partners?\b"),
        ("country_advisory", r"\bcountry advisories?\b|\bcountry advisory councils?\b"),
        ("state_advisory", r"\bstate advisories?\b|\bstate advisory councils?\b"),
        ("city_advisory", r"\bcity advisories?\b|\bcity advisory councils?\b"),
        ("members", r"\bmembers?\b"),
        ("global_partner", r"\bglobal partners?\b"),
        ("country_partner", r"\bcountry partners?\b"),
        ("state_partner", r"\bstate partners?\b"),
        ("city_partner", r"\bcity partners?\b"),
    ]
    for key, pat in patterns:
        if re.search(pat, t, re.I):
            return key

    if re.search(r"\bWing\s*$", t) and not re.search(
        r"\b(Chair|Denim|Advisor|Advisory|Member|Partner|Region|Launch|Event|Meet)\b",
        t,
        re.I,
    ):
        return "wing"
    return "other"


def normalize_media_url(url: str, file_rel: str = "") -> str:
    u = (url or "").strip()
    if file_rel:
        return f"{SITE}/wp-content/uploads/{file_rel.lstrip('/')}"
    if not u:
        return ""
    if u.startswith("/home/") or u.startswith("/var/") or "public_html/wp-content" in u:
        m = re.search(r"wp-content/uploads/(.+)$", u)
        if m:
            return f"{SITE}/wp-content/uploads/{m.group(1)}"
    u = re.sub(
        r"^https?://localhost(?::\d+)?/G100/wp-content/",
        f"{SITE}/wp-content/",
        u,
        flags=re.I,
    )
    u = re.sub(r"^http://(www\.)?g100\.in/", f"{SITE}/", u, flags=re.I)
    if u.startswith("//"):
        u = "https:" + u
    return u


def extract_image_urls(html_content: str) -> list[str]:
    urls = re.findall(
        r'(?:src|href)=["\']([^"\']+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^"\']*)?)',
        html_content or "",
        flags=re.I,
    )
    urls += re.findall(
        r'(?:src|href)=["\'](https?://[^"\']+/wp-content/uploads/[^"\']+)',
        html_content or "",
        flags=re.I,
    )
    # Elementor JSON image urls
    urls += re.findall(
        r'https?://[^"\\\s]+/wp-content/uploads/[^"\\\s]+',
        html_content or "",
        flags=re.I,
    )
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        u = normalize_media_url(u)
        if not u or u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out


def to_iso(dt: str) -> str:
    dt = (dt or "").strip()
    if not dt:
        return ""
    if "T" in dt:
        return dt
    return dt.replace(" ", "T", 1)


def plain_excerpt(text: str, limit: int = 160) -> str:
    plain = re.sub(r"<[^>]+>", " ", text or "")
    plain = re.sub(r"\s+", " ", decode_entities(plain)).strip()
    if len(plain) <= limit:
        return plain
    return plain[: limit - 1].rstrip() + "…"


def parse_cf7_fields(content: str) -> tuple[str, list[dict]]:
    fields: list[dict] = []
    kind = "cf7"
    if "<select" in content or "<!DOCTYPE" in content or "<form" in content:
        kind = "html"
        for m in re.finditer(
            r'<label[^>]*for="([^"]+)"[^>]*>([^<]+)</label>\s*<(input|select|textarea)([^>]*)>(?:(.*?)</\3>)?',
            content,
            re.S | re.I,
        ):
            fid, label, tag_name, attrs, inner = (
                m.group(1),
                m.group(2).strip(),
                m.group(3).lower(),
                m.group(4),
                m.group(5) or "",
            )
            name_m = re.search(r'name="([^"]+)"', attrs)
            name = name_m.group(1) if name_m else fid
            if tag_name == "select":
                typ = "select"
            elif tag_name == "textarea":
                typ = "textarea"
            else:
                tm = re.search(r'type="([^"]+)"', attrs)
                typ = (tm.group(1) if tm else "text").lower()
                if typ == "tel":
                    typ = "number"
            ph = re.search(r'placeholder="([^"]*)"', attrs)
            opts = (
                [
                    o
                    for o in re.findall(r"<option(?:\s[^>]*)?>([^<]+)</option>", inner)
                    if not o.lower().startswith("select ")
                ]
                if typ == "select"
                else []
            )
            fields.append(
                {
                    "type": typ,
                    "name": name,
                    "required": "required" in attrs,
                    "placeholder": ph.group(1) if ph else None,
                    "options": opts,
                    "label": label,
                }
            )
        return kind, fields

    cut = content
    for marker in ["[_site_title]", "Message Body"]:
        i = cut.find(marker)
        if i > 100:
            cut = cut[:i]
            break
    for m in re.finditer(
        r"\[(text\*?|email\*?|url\*?|tel\*?|number\*?|textarea\*?|select\*?)(\s[^\]]*)\]",
        cut,
        re.I,
    ):
        typ_raw, rest = m.group(1), m.group(2)
        typ = re.sub(r"\*$", "", typ_raw).lower()
        name_m = re.match(r"\s+([a-zA-Z0-9_-]+)", rest)
        if not name_m:
            continue
        name = name_m.group(1)
        ph = re.search(r'placeholder\s+"([^"]*)"', rest)
        opts = re.findall(r'\n\s*"([^"]+)"', rest) or re.findall(r'"([^"]+)"', rest)
        if typ == "select":
            opts = [
                o
                for o in opts
                if not (ph and o == ph.group(1)) and not o.lower().startswith("select ")
            ]
        else:
            opts = []
        labels = {
            "text-152": "Name",
            "email-610": "Email",
            "url-420": "Website / LinkedIn",
            "url-610": "Website / LinkedIn",
            "sector-list": "Sector",
            "your-name": "Name",
            "your-email": "Email",
            "number-646": "Mobile Number",
            "your-message": "Bio",
        }
        fields.append(
            {
                "type": "email" if name == "your-email" and typ == "text" else typ,
                "name": name,
                "required": "*" in typ_raw,
                "placeholder": ph.group(1) if ph else None,
                "options": opts,
                "label": labels.get(name),
            }
        )
    return kind, fields


def ensure_contact_form(forms_out: list[dict]) -> None:
    if any(f["slug"] == "contact" for f in forms_out):
        return
    forms_out.append(
        {
            "id": 0,
            "title": "Contact Us",
            "slug": "contact",
            "kind": "custom",
            "fields": [
                {
                    "type": "text",
                    "name": "your-name",
                    "required": True,
                    "placeholder": "Your name",
                    "options": [],
                    "label": "Name",
                },
                {
                    "type": "email",
                    "name": "your-email",
                    "required": True,
                    "placeholder": "Your email",
                    "options": [],
                    "label": "Email",
                },
                {
                    "type": "text",
                    "name": "your-subject",
                    "required": True,
                    "placeholder": "Subject",
                    "options": [],
                    "label": "Subject",
                },
                {
                    "type": "textarea",
                    "name": "your-message",
                    "required": True,
                    "placeholder": "How can we help?",
                    "options": [],
                    "label": "Message",
                },
            ],
        }
    )


def resolve_export_path(arg: str | None) -> Path:
    if arg:
        path = Path(arg).expanduser().resolve()
        if not path.is_file():
            raise SystemExit(f"Export not found: {path}")
        return path
    downloads = Path.home() / "Downloads"
    candidates = sorted(
        list(EXPORTS.glob("*.xml")) + list(downloads.glob("*WordPress*.xml")),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        raise SystemExit(
            "No WXR .xml found. Pass a path or place one in data/wordpress/exports/"
        )
    return candidates[0]


def write_json(name: str, data: object, pretty: bool = False) -> None:
    path = OUT / name
    if pretty:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    else:
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {name}", flush=True)


def fetch_rest_pages() -> dict[int, dict]:
    """Pull rendered page HTML from the live REST API (Elementor-safe)."""
    per_page = 100
    out: dict[int, dict] = {}
    page = 1
    total_pages = 1
    while page <= total_pages:
        url = (
            f"{API}/pages?per_page={per_page}&page={page}"
            f"&orderby=id&order=asc&status=publish"
            f"&_fields=id,content,excerpt,featured_image_src,featured_media,link,modified"
        )
        req = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "User-Agent": "G100-WXR-Import/1.0"},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                total_pages = int(res.headers.get("X-WP-TotalPages") or 1)
                batch = json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 400 and page > 1:
                break
            raise
        for row in batch:
            out[int(row["id"])] = row
        print(f"rest pages: {len(out)} (page {page}/{total_pages})", flush=True)
        page += 1
    return out


def import_wxr(xml_path: Path, enrich_rest: bool) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    EXPORTS.mkdir(parents=True, exist_ok=True)

    # Keep a local copy under exports/ when importing from Downloads
    if xml_path.parent.resolve() != EXPORTS.resolve():
        dest = EXPORTS / xml_path.name
        if not dest.exists() or dest.stat().st_size != xml_path.stat().st_size:
            print(f"copying export → {dest}", flush=True)
            dest.write_bytes(xml_path.read_bytes())
        xml_path = dest

    print(f"Reading {xml_path} …", flush=True)
    raw = xml_path.read_bytes().replace(b"\x00", b"")  # PHP serialized protected props
    print(f"bytes={len(raw):,}", flush=True)

    pages_raw: list[dict] = []
    attachments_raw: list[dict] = []
    forms_raw: list[dict] = []
    thumbs: dict[int, int] = {}
    attached_files: dict[int, str] = {}
    elementor_blobs: dict[int, str] = {}

    item_count = 0
    for m in ITEM_RE.finditer(raw):
        item_count += 1
        item = m.group(1).decode("utf-8", "replace")
        post_type = tag(item, "wp:post_type")
        status = tag(item, "wp:status")
        pid = int(tag(item, "wp:post_id") or "0")
        if not pid:
            continue

        metas = {km.group("key"): km.group("value") for km in META_RE.finditer(item)}

        if post_type == "attachment":
            file_rel = metas.get("_wp_attached_file", "")
            attached_files[pid] = file_rel
            attachments_raw.append(
                {
                    "ID": str(pid),
                    "post_title": tag(item, "title"),
                    "post_name": tag(item, "wp:post_name"),
                    "post_mime_type": tag(item, "wp:post_mime_type"),
                    "post_parent": tag(item, "wp:post_parent") or "0",
                    "guid": tag(item, "guid"),
                    "post_date": tag(item, "wp:post_date"),
                }
            )
            continue

        if post_type == "wpcf7_contact_form" and status == "publish":
            forms_raw.append(
                {
                    "ID": str(pid),
                    "post_title": tag(item, "title"),
                    "post_content": tag(item, "content:encoded"),
                }
            )
            continue

        if post_type != "page" or status != "publish":
            continue

        content = tag(item, "content:encoded")
        if "_elementor_data" in metas:
            elementor_blobs[pid] = metas["_elementor_data"]
        if "_thumbnail_id" in metas and metas["_thumbnail_id"].isdigit():
            thumbs[pid] = int(metas["_thumbnail_id"])

        pages_raw.append(
            {
                "ID": str(pid),
                "post_author": tag(item, "dc:creator") or "1",
                "post_date": tag(item, "wp:post_date"),
                "post_content": content,
                "post_title": tag(item, "title"),
                "post_excerpt": tag(item, "excerpt:encoded"),
                "post_status": status,
                "post_name": tag(item, "wp:post_name"),
                "post_parent": tag(item, "wp:post_parent") or "0",
                "menu_order": tag(item, "wp:menu_order") or "0",
                "guid": tag(item, "guid"),
                "post_modified": tag(item, "wp:post_modified"),
                "link": tag(item, "link"),
            }
        )

        if item_count % 2000 == 0:
            print(
                f"scanned items={item_count} pages={len(pages_raw)} media={len(attachments_raw)}",
                flush=True,
            )

    print(
        f"parsed items={item_count} pages={len(pages_raw)} "
        f"attachments={len(attachments_raw)} forms={len(forms_raw)}",
        flush=True,
    )

    write_json("pages.raw.json", pages_raw)
    write_json("attachments.raw.json", attachments_raw)

    media = []
    for a in attachments_raw:
        aid = int(a["ID"])
        file_rel = attached_files.get(aid, "")
        url = normalize_media_url(a.get("guid") or "", file_rel)
        media.append(
            {
                "id": aid,
                "title": a.get("post_title") or "",
                "slug": a.get("post_name") or "",
                "mime": a.get("post_mime_type") or "",
                "parent": int(a.get("post_parent") or 0),
                "url": url,
                "file": file_rel,
                "date": a.get("post_date") or "",
            }
        )
    media.sort(key=lambda m: m["id"])
    write_json("media.json", media)
    media_by_id = {m["id"]: m for m in media}

    rest_by_id: dict[int, dict] = {}
    if enrich_rest:
        print("Enriching content_html from live WP REST API…", flush=True)
        try:
            rest_by_id = fetch_rest_pages()
        except Exception as e:
            print(f"REST enrich failed (continuing with WXR content): {e}", flush=True)

    by_role: dict[str, list] = defaultdict(list)
    pages_out: list[dict] = []

    for p in pages_raw:
        pid = int(p["ID"])
        title = decode_entities(p.get("post_title") or "")
        slug = p.get("post_name") or ""
        content = p.get("post_content") or ""
        excerpt = decode_entities(p.get("post_excerpt") or "")
        role = classify(title, slug)
        thumb_id = thumbs.get(pid)
        featured = None
        if thumb_id and thumb_id in media_by_id:
            featured = media_by_id[thumb_id]["url"]

        rest = rest_by_id.get(pid)
        if rest:
            rendered = (rest.get("content") or {}).get("rendered") or ""
            if len(rendered) > len(content):
                content = rendered
            rest_excerpt = decode_entities(
                re.sub(
                    r"<[^>]+>",
                    " ",
                    (rest.get("excerpt") or {}).get("rendered") or "",
                )
            )
            rest_excerpt = re.sub(r"\s+", " ", rest_excerpt).strip()
            if rest_excerpt:
                excerpt = rest_excerpt
            fis = rest.get("featured_image_src")
            if isinstance(fis, str) and fis:
                featured = normalize_media_url(fis)
            if not thumb_id and rest.get("featured_media"):
                thumb_id = int(rest["featured_media"])

        images = extract_image_urls(content)
        if pid in elementor_blobs:
            for u in extract_image_urls(elementor_blobs[pid]):
                if u not in images:
                    images.append(u)
        if featured:
            featured = normalize_media_url(featured)
            if featured not in images:
                images = [featured] + images
        if not featured:
            featured = next(
                (
                    u
                    for u in images
                    if re.search(r"\.(jpe?g|png|webp)(\?|$)", u, re.I)
                    and "uc_creative" not in u
                    and "/thumbs/" not in u
                    and "logo" not in u.lower()
                ),
                None,
            )

        link = (p.get("link") or "").strip()
        if not link:
            link = f"{SITE}/" if slug == "home" else f"{SITE}/{slug}/"

        if not excerpt:
            excerpt = plain_excerpt(content)

        item = {
            "id": pid,
            "title": title,
            "slug": slug,
            "url": link,
            "excerpt": excerpt,
            "content_html": content,
            "parent": int(p.get("post_parent") or 0),
            "menu_order": int(p.get("menu_order") or 0),
            "date": to_iso(p.get("post_date") or ""),
            "modified": to_iso(p.get("post_modified") or ""),
            "role": role,
            "featured_image": featured,
            "images": images[:40],
            "thumbnail_id": thumb_id,
        }
        pages_out.append(item)
        by_role[role].append(
            {
                "id": pid,
                "title": title,
                "slug": slug,
                "url": link,
                "featured_image": featured,
            }
        )

    pages_out.sort(key=lambda x: x["id"])
    write_json("pages.json", pages_out)
    write_json("pages-by-role.json", dict(by_role))

    hub_slugs = {
        "about-us",
        "about-founder",
        "global-president",
        "presidents-advisory-council",
        "g100-global-chairs-and-chapters",
        "country-clubs",
        "denim-club-partners",
        "the-denim-club-dialogues",
        "meetings",
        "home",
    }
    hubs = {p["slug"]: p for p in pages_out if p["slug"] in hub_slugs}
    write_json("hubs.json", hubs, pretty=True)

    wings = [
        p
        for p in pages_out
        if p["role"] == "wing"
        and re.search(r"\bWing\s*$", p["title"])
        and not re.search(
            r"\b(Advisories?|Chairs?|Region|Cameroon|Myanmar|Zambia|USA |UK |Global Advisories)\b",
            p["title"],
            re.I,
        )
    ]
    wings.sort(key=lambda x: x["title"])
    write_json("wings.json", wings)

    pages_index = [
        {
            "id": p["id"],
            "title": p["title"],
            "slug": p["slug"],
            "url": p["url"],
            "excerpt": p["excerpt"],
            "role": p["role"],
            "featured_image": p["featured_image"],
            "date": p["date"],
            "modified": p["modified"],
            "parent": p["parent"],
        }
        for p in pages_out
    ]
    write_json("pages-index.json", pages_index)
    write_json("slug-to-id.json", {p["slug"]: p["id"] for p in pages_out}, pretty=True)

    forms_out = []
    for row in forms_raw:
        title = row.get("post_title") or ""
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        kind, fields = parse_cf7_fields(row.get("post_content") or "")
        forms_out.append(
            {
                "id": int(row["ID"]),
                "title": title,
                "slug": slug,
                "kind": kind,
                "fields": fields,
            }
        )
    ensure_contact_form(forms_out)
    write_json("forms.json", forms_out, pretty=True)

    role_counts = {k: len(v) for k, v in sorted(by_role.items(), key=lambda x: -len(x[1]))}
    manifest = {
        "site": SITE,
        "database": "wordpress-wxr",
        "page_count": len(pages_out),
        "media_count": len(media),
        "role_counts": role_counts,
        "wings_count": len(wings),
        "hubs": list(hubs.keys()),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "source_export": xml_path.name,
        "source_total_pages": len(pages_out),
        "rest_enriched": bool(rest_by_id),
    }
    write_json("manifest.json", manifest, pretty=True)
    print(json.dumps(manifest, indent=2))
    print("done", OUT)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "xml",
        nargs="?",
        help="Path to WXR .xml (default: newest in exports/ or ~/Downloads)",
    )
    parser.add_argument(
        "--enrich-rest",
        action="store_true",
        default=True,
        help="Merge rendered HTML from live g100.in REST API (default: on)",
    )
    parser.add_argument(
        "--no-enrich-rest",
        action="store_true",
        help="Use only WXR post_content (no live REST merge)",
    )
    args = parser.parse_args()
    enrich = not args.no_enrich_rest
    import_wxr(resolve_export_path(args.xml), enrich_rest=enrich)


if __name__ == "__main__":
    main()
