#!/usr/bin/env python3
"""
Comprehensive live API test against https://api-production-26a7.up.railway.app
Tests: NFC Tags, Forum, Media, Events
"""
import requests
import json
import sys

BASE = "https://api-production-26a7.up.railway.app"

results = []

def get_token(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        data = r.json()
        return data["data"]["accessToken"], data["data"]["user"]
    return None, None

def report(section, name, resp, expect=(200, 201)):
    if isinstance(expect, int):
        expect = (expect,)
    ok = resp.status_code in expect
    try:
        body = resp.json()
    except Exception:
        body = resp.text[:400]
    symbol = "PASS" if ok else "FAIL"
    results.append((section, name, ok, resp.status_code, body))
    short_name = name[:65]
    print(f"  [{symbol}] {short_name}: HTTP {resp.status_code}")
    if not ok:
        msg = body.get("message", "") if isinstance(body, dict) else str(body)[:200]
        print(f"         Error: {msg}")
    return ok, resp, body

def get_json(resp):
    try:
        return resp.json()
    except Exception:
        return {}

def section_header(title):
    print(f"\n{'='*65}")
    print(f"  {title}")
    print('='*65)

# ── AUTH ──────────────────────────────────────────────────────────────────────

section_header("AUTH — Obtaining tokens")

god_token, god_user = get_token("god@merchstage.io", "God@MerchStage2025!")
if god_token:
    print(f"  [OK] GOD_USER token obtained — email: {god_user['email']}, role: {god_user['role']}")
else:
    print("  [FAIL] Could not obtain GOD_USER token!")
    sys.exit(1)

god_headers = {"Authorization": f"Bearer {god_token}", "Content-Type": "application/json"}

# Vendor token — register a new test vendor user
vendor_email = "vendor_live_test@vibeworks.com"
vendor_password = "Vendor1234!"

vendor_token, vendor_user = get_token(vendor_email, vendor_password)
if not vendor_token:
    # register
    r = requests.post(f"{BASE}/auth/register", json={
        "email": vendor_email,
        "password": vendor_password,
        "termsAccepted": True,
        "privacyAccepted": True
    })
    if r.status_code in (200, 201):
        vendor_token, vendor_user = get_token(vendor_email, vendor_password)

if vendor_token:
    print(f"  [OK] Vendor token obtained — email: {vendor_user['email']}, role: {vendor_user['role']}")
else:
    print("  [WARN] Could not obtain vendor token — will use GOD token as fallback")
    vendor_token = god_token
    vendor_user = god_user

vendor_headers = {"Authorization": f"Bearer {vendor_token}", "Content-Type": "application/json"}

# ── DISCOVERY — get a real tenantId ──────────────────────────────────────────

section_header("DISCOVERY — vendor tenantId")

r = requests.get(f"{BASE}/vendors")
print(f"  GET /vendors: HTTP {r.status_code}")
vendors = r.json()
vendor_items = vendors.get("data", {}).get("items", [])
if not vendor_items:
    vendor_items = vendors.get("data", []) if isinstance(vendors.get("data"), list) else []

tenant_id = None
if vendor_items:
    first_vendor = vendor_items[0]
    tenant_id = first_vendor.get("id")
    print(f"  Found {len(vendor_items)} vendors. Using tenantId: {tenant_id} ({first_vendor.get('displayName')})")
else:
    print(f"  No vendors found in response: {str(vendors)[:200]}")
    tenant_id = "unknown-tenant"

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE AREA 1: NFC TAGS
# ══════════════════════════════════════════════════════════════════════════════

section_header("NFC TAGS (admin-only, GOD_USER token)")

# 1. GET /nfc/tags
r = requests.get(f"{BASE}/nfc/tags", headers=god_headers)
ok, _, body = report("NFC", "1. GET /nfc/tags", r, (200,))
existing_tags = []
if ok:
    data = body.get("data", body)
    existing_tags = data if isinstance(data, list) else (data.get("items") or data.get("tags") or [])
    if isinstance(existing_tags, dict):
        existing_tags = []
    print(f"         Found {len(existing_tags)} existing tag(s)")

# 2. POST /nfc/tags
r = requests.post(f"{BASE}/nfc/tags", headers=god_headers, json={
    "name": "Test Tag",
    "destinationUrl": "https://vibeworks.com.tr"
})
ok, _, body = report("NFC", "2. POST /nfc/tags — create tag", r, (200, 201))
nfc_id = None
if ok and isinstance(body, dict):
    data = body.get("data", body)
    nfc_id = data.get("id") or data.get("_id") if isinstance(data, dict) else None
    if not nfc_id:
        nfc_id = body.get("id") or body.get("_id")
    print(f"         Created tag id: {nfc_id}")

if not nfc_id and existing_tags:
    nfc_id = existing_tags[0].get("id") or existing_tags[0].get("_id")
    print(f"         Fallback to existing tag id: {nfc_id}")

# 3. GET /nfc/redirect/{tagId}
if nfc_id:
    r = requests.get(f"{BASE}/nfc/redirect/{nfc_id}", headers=god_headers, allow_redirects=False)
    report("NFC", f"3. GET /nfc/redirect/{{tagId}}", r, (200, 301, 302, 307, 308))
else:
    print("  [SKIP] 3. GET /nfc/redirect/{tagId} — no tag id available")
    results.append(("NFC", "3. GET /nfc/redirect/{tagId}", False, 0, "SKIPPED — no tag id"))

# 4. PATCH /nfc/tags/{id}
if nfc_id:
    r = requests.patch(f"{BASE}/nfc/tags/{nfc_id}", headers=god_headers, json={
        "destinationUrl": "https://vibeworks.com.tr/shop"
    })
    report("NFC", f"4. PATCH /nfc/tags/{{id}}", r, (200, 201))
else:
    print("  [SKIP] 4. PATCH /nfc/tags/{id}")
    results.append(("NFC", "4. PATCH /nfc/tags/{id}", False, 0, "SKIPPED"))

# 5. POST /nfc/tags/{id}/reset-count
if nfc_id:
    r = requests.post(f"{BASE}/nfc/tags/{nfc_id}/reset-count", headers=god_headers)
    report("NFC", f"5. POST /nfc/tags/{{id}}/reset-count", r, (200, 201))
else:
    print("  [SKIP] 5. POST /nfc/tags/{id}/reset-count")
    results.append(("NFC", "5. POST /nfc/tags/{id}/reset-count", False, 0, "SKIPPED"))

# 6. DELETE /nfc/tags/{id}
if nfc_id:
    r = requests.delete(f"{BASE}/nfc/tags/{nfc_id}", headers=god_headers)
    report("NFC", f"6. DELETE /nfc/tags/{{id}}", r, (200, 201, 204))
else:
    print("  [SKIP] 6. DELETE /nfc/tags/{id}")
    results.append(("NFC", "6. DELETE /nfc/tags/{id}", False, 0, "SKIPPED"))

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE AREA 2: FORUM
# ══════════════════════════════════════════════════════════════════════════════

section_header("FORUM (public read, auth required to post)")

# 1. GET /forum/{tenantId}/topics
r = requests.get(f"{BASE}/forum/{tenant_id}/topics")
ok, _, body = report("FORUM", f"1. GET /forum/{{tenantId}}/topics", r, (200,))
existing_topics = []
if ok:
    data = body.get("data", body)
    existing_topics = data if isinstance(data, list) else (data.get("items") or data.get("topics") or [])
    if isinstance(existing_topics, dict):
        existing_topics = []
    print(f"         Found {len(existing_topics)} topic(s)")

# 2. POST /forum/{tenantId}/topics
r = requests.post(f"{BASE}/forum/{tenant_id}/topics", headers=god_headers, json={
    "title": "Test topic",
    "body": "Hello forum!"
})
ok, _, body = report("FORUM", f"2. POST /forum/{{tenantId}}/topics — create topic", r, (200, 201))
topic_id = None
if ok and isinstance(body, dict):
    data = body.get("data", body)
    topic_id = (data.get("id") or data.get("_id")) if isinstance(data, dict) else None
    if not topic_id:
        topic_id = body.get("id") or body.get("_id")
    print(f"         Created topic id: {topic_id}")

if not topic_id and existing_topics:
    t = existing_topics[0]
    topic_id = t.get("id") or t.get("_id")
    print(f"         Fallback to existing topic id: {topic_id}")

# 3. GET /forum/topics/{topicId}
if topic_id:
    r = requests.get(f"{BASE}/forum/topics/{topic_id}")
    report("FORUM", f"3. GET /forum/topics/{{topicId}}", r, (200,))
else:
    print("  [SKIP] 3. GET /forum/topics/{topicId}")
    results.append(("FORUM", "3. GET /forum/topics/{topicId}", False, 0, "SKIPPED"))

# 4. POST /forum/topics/{topicId}/replies
if topic_id:
    r = requests.post(f"{BASE}/forum/topics/{topic_id}/replies", headers=god_headers, json={
        "body": "Test reply"
    })
    report("FORUM", f"4. POST /forum/topics/{{topicId}}/replies", r, (200, 201))
else:
    print("  [SKIP] 4. POST /forum/topics/{topicId}/replies")
    results.append(("FORUM", "4. POST /forum/topics/{topicId}/replies", False, 0, "SKIPPED"))

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE AREA 3: MEDIA
# ══════════════════════════════════════════════════════════════════════════════

section_header("MEDIA (admin endpoints)")

# 1. GET /admin/media/{tenantId}
r = requests.get(f"{BASE}/admin/media/{tenant_id}", headers=god_headers)
ok, _, body = report("MEDIA", f"1. GET /admin/media/{{tenantId}}", r, (200,))
existing_media = []
if ok:
    data = body.get("data", body)
    existing_media = data if isinstance(data, list) else (data.get("items") or data.get("media") or [])
    if isinstance(existing_media, dict):
        existing_media = []
    print(f"         Found {len(existing_media)} media item(s)")

# 2. POST /admin/media/{tenantId}
r = requests.post(f"{BASE}/admin/media/{tenant_id}", headers=god_headers, json={
    "type": "SPOTIFY",
    "url": "https://open.spotify.com/track/abc",
    "title": "Test track"
})
ok, _, body = report("MEDIA", f"2. POST /admin/media/{{tenantId}} — create", r, (200, 201))
media_id = None
if ok and isinstance(body, dict):
    data = body.get("data", body)
    media_id = (data.get("id") or data.get("_id")) if isinstance(data, dict) else None
    if not media_id:
        media_id = body.get("id") or body.get("_id")
    print(f"         Created media id: {media_id}")

if not media_id and existing_media:
    m = existing_media[0]
    media_id = m.get("id") or m.get("_id")
    print(f"         Fallback to existing media id: {media_id}")

# 3. PATCH /admin/media/{id}
if media_id:
    r = requests.patch(f"{BASE}/admin/media/{media_id}", headers=god_headers, json={
        "title": "Updated"
    })
    report("MEDIA", f"3. PATCH /admin/media/{{id}}", r, (200, 201))
else:
    print("  [SKIP] 3. PATCH /admin/media/{id}")
    results.append(("MEDIA", "3. PATCH /admin/media/{id}", False, 0, "SKIPPED"))

# 4. DELETE /admin/media/{id}
if media_id:
    r = requests.delete(f"{BASE}/admin/media/{media_id}", headers=god_headers)
    report("MEDIA", f"4. DELETE /admin/media/{{id}}", r, (200, 201, 204))
else:
    print("  [SKIP] 4. DELETE /admin/media/{id}")
    results.append(("MEDIA", "4. DELETE /admin/media/{id}", False, 0, "SKIPPED"))

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE AREA 4: EVENTS
# ══════════════════════════════════════════════════════════════════════════════

section_header("EVENTS (admin write, public read)")

# 1. GET /admin/events
r = requests.get(f"{BASE}/admin/events", headers=god_headers)
ok, _, body = report("EVENTS", "1. GET /admin/events", r, (200,))
existing_events = []
if ok:
    data = body.get("data", body)
    existing_events = data if isinstance(data, list) else (data.get("items") or data.get("events") or [])
    if isinstance(existing_events, dict):
        existing_events = []
    print(f"         Found {len(existing_events)} event(s)")

# 2. POST /admin/events
r = requests.post(f"{BASE}/admin/events", headers=god_headers, json={
    "tenantId": tenant_id,
    "title": "Test Concert",
    "href": "https://biletino.com",
    "provider": "BILETINO",
    "date": "2026-08-01T18:00:00Z",
    "active": True
})
ok, _, body = report("EVENTS", "2. POST /admin/events — create", r, (200, 201))
event_id = None
if ok and isinstance(body, dict):
    data = body.get("data", body)
    event_id = (data.get("id") or data.get("_id")) if isinstance(data, dict) else None
    if not event_id:
        event_id = body.get("id") or body.get("_id")
    print(f"         Created event id: {event_id}")

if not event_id and existing_events:
    e = existing_events[0]
    event_id = e.get("id") or e.get("_id")
    print(f"         Fallback to existing event id: {event_id}")

# 3. GET /vendors/{tenantId}/events (public)
r = requests.get(f"{BASE}/vendors/{tenant_id}/events")
report("EVENTS", f"3. GET /vendors/{{tenantId}}/events — public", r, (200,))

# 4. PATCH /admin/events/{id}
if event_id:
    r = requests.patch(f"{BASE}/admin/events/{event_id}", headers=god_headers, json={
        "title": "Updated Concert"
    })
    report("EVENTS", f"4. PATCH /admin/events/{{id}}", r, (200, 201))
else:
    print("  [SKIP] 4. PATCH /admin/events/{id}")
    results.append(("EVENTS", "4. PATCH /admin/events/{id}", False, 0, "SKIPPED"))

# 5. DELETE /admin/events/{id}
if event_id:
    r = requests.delete(f"{BASE}/admin/events/{event_id}", headers=god_headers)
    report("EVENTS", f"5. DELETE /admin/events/{{id}}", r, (200, 201, 204))
else:
    print("  [SKIP] 5. DELETE /admin/events/{id}")
    results.append(("EVENTS", "5. DELETE /admin/events/{id}", False, 0, "SKIPPED"))

# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY TABLE
# ══════════════════════════════════════════════════════════════════════════════

section_header("SUMMARY")

total = len(results)
passed = sum(1 for r in results if r[2])
failed = total - passed

print(f"\n  Total: {total}  |  Passed: {passed}  |  Failed: {failed}\n")
print(f"  {'#':<3} {'Section':<8} {'Test':<52} {'Result':<6} {'HTTP'}")
print(f"  {'-'*3} {'-'*8} {'-'*52} {'-'*6} {'-'*6}")
for i, (sec, name, ok, code, body) in enumerate(results, 1):
    sym = "PASS" if ok else ("SKIP" if code == 0 else "FAIL")
    short = name[:50]
    print(f"  {i:<3} {sec:<8} {short:<52} {sym:<6} {code if code else '-':>4}")

print(f"\n  Pass rate: {passed}/{total} ({100*passed//total}%)" if total else "")
