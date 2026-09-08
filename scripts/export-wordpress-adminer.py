#!/usr/bin/env python3
"""Export G100 WordPress content from Cloudways Adminer into local JSON."""

from __future__ import annotations

import csv
import io
import json
import os
import re
import subprocess
import time
import urllib.parse
from pathlib import Path

BASE = "https://wordpress-623005-2068502.cloudwaysapps.com:8082/"
COOKIE = "/tmp/cw_cookies.txt"
OUT = Path(__file__).resolve().parents[1] / "data" / "wordpress"
SITE = "https://www.g100.in"

DB_USER = os.environ.get("G100_DB_USER", "sqhresdzec")
DB_PASS = os.environ.get("G100_DB_PASS", "")
DB_NAME = os.environ.get("G100_DB_NAME", "sqhresdzec")

token: str | None = None


def curl(url: str, data: str | None = None, out: str = "/tmp/cw_out.bin") -> bytes:
    cmd = ["curl", "-sk", "-c", COOKIE, "-b", COOKIE, "-o", out]
    if data is not None:
        cmd += ["-X", "POST", "--data-binary", data]
    cmd.append(url)
    subprocess.check_call(cmd)
    return Path(out).read_bytes()


def login() -> None:
    global token
    if not DB_PASS:
        raise SystemExit(
            "Set G100_DB_PASS (and optional G100_DB_USER / G100_DB_NAME) before running."
        )
    curl(BASE, None, "/tmp/cw_pre.html")
    curl(
        BASE,
        urllib.parse.urlencode(
            {
                "auth[driver]": "server",
                "auth[server]": "",
                "auth[username]": DB_USER,
                "auth[password]": DB_PASS,
                "auth[db]": DB_NAME,
                "auth[permanent]": "1",
            }
        ),
        "/tmp/cw_login_body",
    )
    page = curl(
        f"{BASE}?username={DB_USER}&db={DB_NAME}", None, "/tmp/cw_db.html"
    ).decode("utf-8", "replace")
    token = re.findall(r"name='token' value='([^']+)'", page)[0]
    print("logged in", flush=True)


def refresh_token() -> None:
    global token
    page = curl(
        f"{BASE}?username={DB_USER}&db={DB_NAME}&sql=",
        None,
        "/tmp/cw_sqlpage.html",
    ).decode("utf-8", "replace")
    found = re.findall(r"name='token' value='([^']+)'", page)
    if found:
        token = found[0]


def export_sql(sql: str) -> list[dict[str, str]]:
    global token
    assert token
    payload = urllib.parse.urlencode(
        {"query": sql, "token": token, "export": "csv.csv"}
    )
    raw = curl(
        f"{BASE}?username={DB_USER}&db={DB_NAME}&sql=",
        payload,
        "/tmp/cw_csv.bin",
    )
    refresh_token()
    if raw.startswith(b"\xef\xbb\xbf"):
        raw = raw[3:]
    text = raw.decode("utf-8", "replace")
    # If export failed and returned HTML
    if text.lstrip().startswith("<!"):
        raise RuntimeError(f"Export returned HTML: {text[:300]}")
    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    return list(reader)


def batched_export(sql_template: str, total: int, batch: int, label: str) -> list[dict]:
    rows: list[dict] = []
    for offset in range(0, total, batch):
        sql = sql_template.format(limit=batch, offset=offset)
        part = export_sql(sql)
        rows.extend(part)
        print(f"{label}: {len(rows)}/{total}", flush=True)
        time.sleep(0.15)
    return rows


def classify(title: str, slug: str) -> str:
    t = title
    tl = t.lower()
    sl = slug.lower()

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
    if re.search(r"\bmeetings?\b|\bmeet & greet\b|\bmeet-greet\b", tl, re.I):
        return "meetings"
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


def extract_image_urls(html_content: str) -> list[str]:
    urls = re.findall(
        r'(?:src|href)=["\']([^"\']+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^"\']*)?)',
        html_content,
        flags=re.I,
    )
    # also wp-content/uploads without extension edge cases
    urls += re.findall(
        r'(?:src|href)=["\'](https?://[^"\']+/wp-content/uploads/[^"\']+)',
        html_content,
        flags=re.I,
    )
    # dedupe preserve order
    seen = set()
    out = []
    for u in urls:
        if u.startswith("//"):
            u = "https:" + u
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    login()

    page_count = int(export_sql(
        "SELECT COUNT(*) AS c FROM wp_posts WHERE post_type='page' AND post_status='publish'"
    )[0]["c"])
    att_count = int(export_sql(
        "SELECT COUNT(*) AS c FROM wp_posts WHERE post_type='attachment'"
    )[0]["c"])
    print(f"pages={page_count} attachments={att_count}", flush=True)

    pages = batched_export(
        """
        SELECT ID, post_author, post_date, post_content, post_title, post_excerpt,
               post_status, post_name, post_parent, menu_order, guid, post_modified
        FROM wp_posts
        WHERE post_type='page' AND post_status='publish'
        ORDER BY ID
        LIMIT {limit} OFFSET {offset}
        """,
        page_count,
        50,
        "pages",
    )
    (OUT / "pages.raw.json").write_text(json.dumps(pages))

    attachments = batched_export(
        """
        SELECT ID, post_title, post_name, post_mime_type, post_parent, guid, post_date
        FROM wp_posts
        WHERE post_type='attachment'
        ORDER BY ID
        LIMIT {limit} OFFSET {offset}
        """,
        att_count,
        200,
        "attachments",
    )
    (OUT / "attachments.raw.json").write_text(json.dumps(attachments))

    # Featured images + attached files for pages
    page_ids = [p["ID"] for p in pages]
    thumbs: dict[str, str] = {}
    # Query in chunks of ids
    for i in range(0, len(page_ids), 200):
        chunk = ",".join(page_ids[i : i + 200])
        rows = export_sql(
            f"""
            SELECT post_id, meta_value
            FROM wp_postmeta
            WHERE meta_key='_thumbnail_id' AND post_id IN ({chunk})
            """
        )
        for r in rows:
            thumbs[r["post_id"]] = r["meta_value"]
        print(f"thumbnails: {len(thumbs)}", flush=True)

    # Map attachment id -> url (guid) and file path
    att_by_id = {a["ID"]: a for a in attachments}
    attached_files: dict[str, str] = {}
    for i in range(0, len(attachments), 300):
        chunk_ids = ",".join(a["ID"] for a in attachments[i : i + 300])
        rows = export_sql(
            f"""
            SELECT post_id, meta_value
            FROM wp_postmeta
            WHERE meta_key='_wp_attached_file' AND post_id IN ({chunk_ids})
            """
        )
        for r in rows:
            attached_files[r["post_id"]] = r["meta_value"]
        print(f"attached_files: {len(attached_files)}", flush=True)

    # Build media index
    media = []
    for a in attachments:
        aid = a["ID"]
        file_rel = attached_files.get(aid, "")
        url = a.get("guid") or ""
        if file_rel and not url.startswith("http"):
            url = f"{SITE}/wp-content/uploads/{file_rel}"
        elif file_rel and "wp-content/uploads" not in url:
            # prefer CDN-style path from file
            url = f"{SITE}/wp-content/uploads/{file_rel}"
        media.append(
            {
                "id": int(aid),
                "title": a.get("post_title") or "",
                "slug": a.get("post_name") or "",
                "mime": a.get("post_mime_type") or "",
                "parent": int(a.get("post_parent") or 0),
                "url": url,
                "file": file_rel,
                "date": a.get("post_date") or "",
            }
        )
    (OUT / "media.json").write_text(json.dumps(media))
    media_by_id = {m["id"]: m for m in media}

    # Build pages dataset
    by_role: dict[str, list] = {}
    pages_out = []
    for p in pages:
        pid = int(p["ID"])
        title = p.get("post_title") or ""
        slug = p.get("post_name") or ""
        content = p.get("post_content") or ""
        role = classify(title, slug)
        thumb_id = thumbs.get(str(pid))
        featured = None
        if thumb_id and int(thumb_id) in media_by_id:
            featured = media_by_id[int(thumb_id)]["url"]
        images = extract_image_urls(content)
        if featured and featured not in images:
            images = [featured] + images
        item = {
            "id": pid,
            "title": title,
            "slug": slug,
            "url": f"{SITE}/{slug}/",
            "excerpt": p.get("post_excerpt") or "",
            "content_html": content,
            "parent": int(p.get("post_parent") or 0),
            "menu_order": int(p.get("menu_order") or 0),
            "date": p.get("post_date") or "",
            "modified": p.get("post_modified") or "",
            "role": role,
            "featured_image": featured,
            "images": images[:40],
            "thumbnail_id": int(thumb_id) if thumb_id else None,
        }
        pages_out.append(item)
        by_role.setdefault(role, []).append(
            {
                "id": pid,
                "title": title,
                "slug": slug,
                "url": item["url"],
                "featured_image": featured,
            }
        )

    (OUT / "pages.json").write_text(json.dumps(pages_out))
    (OUT / "pages-by-role.json").write_text(json.dumps(by_role))

    # Core hub pages with full content kept separately for fast load
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
    (OUT / "hubs.json").write_text(json.dumps(hubs, indent=2))

    # Wings list
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
    (OUT / "wings.json").write_text(json.dumps(wings))

    # Contact Form 7 definitions (join / denim / signup)
    cf7_rows = export_sql(
        """
        SELECT ID, post_title, post_content
        FROM wp_posts
        WHERE post_type='wpcf7_contact_form' AND post_status='publish'
        """
    )
    forms_out = []
    for row in cf7_rows:
        content = row.get("post_content") or ""
        title = row.get("post_title") or ""
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        fields: list[dict] = []
        if "<select" in content or "<!DOCTYPE" in content or "<form" in content:
            for m in re.finditer(
                r'<label[^>]*for="([^"]+)"[^>]*>([^<]+)</label>\s*<(input|select|textarea)([^>]*)>(?:(.*?)</\3>)?',
                content,
                re.S | re.I,
            ):
                fid, label, tag, attrs, inner = (
                    m.group(1),
                    m.group(2).strip(),
                    m.group(3).lower(),
                    m.group(4),
                    m.group(5) or "",
                )
                name_m = re.search(r'name="([^"]+)"', attrs)
                name = name_m.group(1) if name_m else fid
                if tag == "select":
                    typ = "select"
                elif tag == "textarea":
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
        else:
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
                        if not (ph and o == ph.group(1))
                        and not o.lower().startswith("select ")
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
        forms_out.append(
            {
                "id": int(row["ID"]),
                "title": title,
                "slug": slug,
                "kind": "html" if "<select" in content or "<!DOCTYPE" in content else "cf7",
                "fields": fields,
            }
        )
    # Always ensure a contact form exists for the Next app
    if not any(f["slug"] == "contact" for f in forms_out):
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
    (OUT / "forms.json").write_text(json.dumps(forms_out, indent=2))
    print(f"forms: {len(forms_out)}", flush=True)

    manifest = {
        "site": SITE,
        "database": DB_NAME,
        "page_count": len(pages_out),
        "media_count": len(media),
        "role_counts": {k: len(v) for k, v in sorted(by_role.items(), key=lambda x: -len(x[1]))},
        "wings_count": len(wings),
        "hubs": list(hubs.keys()),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(json.dumps(manifest, indent=2))
    print("done", OUT)


if __name__ == "__main__":
    main()
