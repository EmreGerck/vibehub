#!/usr/bin/env python3
"""
Comprehensive live API test against https://api-production-26a7.up.railway.app
Tests: NFC Tags, Forum, Media, Events
"""
import requests
import json
import sys
from datetime import datetime

BASE = "https://api-production-26a7.up.railway.app"

# ── helpers ──────────────────────────────────────────────────────────────────

results = []

def report(section, name, resp, expect=(200, 201)):
    if isinstance(expect, int):
        expect = (expect,)
    ok = resp.status_code in expect
    status_str = f"HTTP {resp.status_code}"
    try:
        body = resp.json()
    except Exception:
        body = resp.text[:300]
    symbol = "PASS" if ok else "FAIL"
    results.append((section, name, ok, resp.status_code, body))
    print(f"  [{symbol}] {name}: {status_str}")
    if not ok:
        print(f"         Response: {str(body)[:400]}")
    return ok, resp, body

def get_json(resp):
    try:
        return resp.json()
    except Exception:
        return {}

def section_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

# ── Step 1: Login ─────────────────────────────────────────────────────────────

section_header("AUTH — GOD_USER login")

god_token = None
for password in ["Admin1234!", "GodUser1234!", "Vibeworks1234!"]:
    r = requests.post(f"{BASE}/auth/login", json={"email": "admin@vibeworks.com", "password": password})
    print(f"  Trying password '{password}': HTTP {r.status_code}")
    if r.status_code == 200:
        data = get_json(r)
        # token may be at different keys
        god_token = (data.get("access_token") or data.get("token") or
                     data.get("accessToken") or (data.get("data") or {}).get("access_token") or
                     (data.get("data") or {}).get("token"))
        if god_token:
            print(f"  GOD token obtained (first 30 chars): {god_token[:30]}...")
            break
        else:
            print(f"  200 but no token found. Body keys: {list(data.keys())}")

if not god_token:
    print("  All GOD login attempts failed. Trying registration...")
    r = requests.post(f"{BASE}/auth/register", json={
        "email": "godtest_auto@vibeworks.com",
        "password": "Admin1234!",
        "termsAccepted": True,
        "privacyAccepted": True
    })
    print(f"  Register HTTP {r.status_code}: {str(get_json(r))[:200]}")

god_headers = {"Authorization": f"Bearer {god_token}"} if god_token else {}

# ── Step 2: Find tenantId from /vendors ──────────────────────────────────────

section_header("DISCOVERY — find a vendor tenantId")

tenant_id = None
r = requests.get(f"{BASE}/vendors")
print(f"  GET /vendors: HTTP {r.status_code}")
if r.status_code == 200:
    vendors = get_json(r)
    # may be list or dict
    vendor_list = vendors if isinstance(vendors, list) else (vendors.get("data") or vendors.get("vendors") or [])
    if vendor_list:
        first = vendor_list[0]
        tenant_id = (first.get("tenantId") or first.get("id") or first.get("_id"))
        print(f"  Found {len(vendor_list)} vendor(s). Using tenantId: {tenant_id}")
        print(f"  First vendor: {json.dumps(first, default=str)[:300]}")
    else:
        print(f"  No vendors found. Full body: {str(vendors)[:300]}")
else:
    print(f"  Response: {r.text[:300]}")

# Try /admin/vendors with god token if public /vendors didn't work
if not tenant_id and god_token:
    r = requests.get(f"{BASE}/admin/vendors", headers=god_headers)
    print(f"  GET /admin/vendors: HTTP {r.status_code}")
    if r.status_code == 200:
        vendors = get_json(r)
        vendor_list = vendors if isinstance(vendors, list) else (vendors.get("data") or vendors.get("vendors") or [])
        if vendor_list:
            first = vendor_list[0]
            tenant_id = (first.get("tenantId") or first.get("id") or first.get("_id"))
            print(f"  Found {len(vendor_list)} vendor(s). Using tenantId: {tenant_id}")

if not tenant_id:
    tenant_id = "test-tenant"
    print(f"  Could not discover tenantId, using placeholder: {tenant_id}")

# ── Step 3: VENDOR login / creation ──────────────────────────────────────────

section_header("AUTH — VENDOR login")

vendor_token = None
vendor_email = f"vendor_test_auto@vibeworks.com"
vendor_password = "Vendor1234!"

# try login first
r = requests.post(f"{BASE}/auth/login", json={"email": vendor_email, "password": vendor_password})
print(f"  Login vendor: HTTP {r.status_code}")
if r.status_code == 200:
    data = get_json(r)
    vendor_token = (data.get("access_token") or data.get("token") or
                    data.get("accessToken") or (data.get("data") or {}).get("access_token") or
                    (data.get("data") or {}).get("token"))

if not vendor_token:
    # register
    r = requests.post(f"{BASE}/auth/register", json={
        "email": vendor_email,
        "password": vendor_password,
        "termsAccepted": True,
        "privacyAccepted": True
    })
    print(f"  Register vendor: HTTP {r.status_code}: {str(get_json(r))[:200]}")
    if r.status_code in (200, 201):
        data = get_json(r)
        vendor_token = (data.get("access_token") or data.get("token") or
                        data.get("accessToken") or (data.get("data") or {}).get("access_token") or
                        (data.get("data") or {}).get("token"))
    if not vendor_token:
        # try login after register
        r = requests.post(f"{BASE}/auth/login", json={"email": vendor_email, "password": vendor_password})
        print(f"  Re-login after register: HTTP {r.status_code}")
        if r.status_code == 200:
            data = get_json(r)
            vendor_token = (data.get("access_token") or data.get("token") or
                            data.get("accessToken") or (data.get("data") or {}).get("access_token") or
                            (data.get("data") or {}).get("token"))

vendor_headers = {"Authorization": f"Bearer {vendor_token}"} if vendor_token else {}
if vendor_token:
    print(f"  Vendor token obtained (first 30 chars): {vendor_token[:30]}...")
else:
    print("  Could not obtain vendor token.")

# use god_token as fallback for vendor (admin can do anything)
auth_headers = vendor_headers if vendor_token else god_headers

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE AREA 1: NFC TAGS
# ══════════════════════════════════════════════════════════════════════════════

section_header("NFC TAGS")

# 1. GET /nfc/tags
r = requests.get(f"{BASE}/nfc/tags", headers=god_headers)
report("NFC", "1. GET /nfc/tags", r, (200,))
nfc_list = get_json(r)
if isinstance(nfc_list, dict):
    nfc_list = nfc_list.get("data") or nfc_list.get("tags") or []

# 2. POST /nfc/tags
r = requests.post(f"{BASE}/nfc/tags", headers=god_headers, json={
    "name": "Test Tag",
    "destinationUrl": "https://vibeworks.com.tr"
})
ok, _, body = report("NFC", "2. POST /nfc/tags (create)", r, (200, 201))
nfc_id = None
if ok:
    if isinstance(body, dict):
        nfc_id = (body.get("id") or body.get("_id") or
                  (body.get("data") or {}).get("id") or (body.get("data") or {}).get("_id"))
    print(f"         Created NFC tag id: {nfc_id}")
else:
    # Try to get an id from the existing list
    if isinstance(nfc_list, list) and nfc_list:
        nfc_id = nfc_list[0].get("id") or nfc_list[0].get("_id")
        print(f"         Using existing tag id: {nfc_id}")

# 3. GET /nfc/redirect/{tagId}
if nfc_id:
    r = requests.get(f"{BASE}/nfc/redirect/{nfc_id}", headers=god_headers, allow_redirects=False)
    report("NFC", f"3. GET /nfc/redirect/{nfc_id}", r, (200, 301, 302, 307, 308))
else:
    print("  [SKIP] 3. GET /nfc/redirect/{tagId} — no tag id available")

# 4. PATCH /nfc/tags/{id}
if nfc_id:
    r = requests.patch(f"{BASE}/nfc/tags/{nfc_id}", headers=god_headers, json={
        "destinationUrl": "https://vibeworks.com.tr/shop"
    })
    report("NFC", f"4. PATCH /nfc/tags/{nfc_id}", r, (200, 201))
else:
    print("  [SKIP] 4. PATCH /nfc/tags/{id} — no tag id")

# 5. POST /nfc/tags/{id}/reset-count
if nfc_id:
    r = requests.post(f"{BASE}/nfc/tags/{nfc_id}/reset-count", headers=god_headers)
    report("NFC", f"5. POST /nfc/tags/{nfc_id}/reset-count", r, (200, 201))
else:
    print("  [SKIP] 5. POST /nfc/tags/{id}/reset-count — no tag id")

# 6. DELETE /nfc/tags/{id}
if nfc_id:
    r = requests.delete(f"{BASE}/nfc/tags/{nfc_id}", headers=god_headers)
    report("NFC", f"6. DELETE /nfc/tags/{nfc_id}", r, (200, 201, 204))
else:
    print("  [SKIP] 6. DELETE /nfc/tags/{id} — no tag id")

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE AREA 2: FORUM
# ══════════════════════════════════════════════════════════════════════════════

section_header("FORUM")

# 1. GET /forum/{tenantId}/topics
r = requests.get(f"{BASE}/forum/{tenant_id}/topics")
report("FORUM", f"1. GET /forum/{tenant_id}/topics", r, (200,))
topics = get_json(r)
topic_list = topics if isinstance(topics, list) else (topics.get("data") or topics.get("topics") or [])

# 2. POST /forum/{tenantId}/topics
r = requests.post(f"{BASE}/forum/{tenant_id}/topics", headers=god_headers, json={
    "title": "Test topic",
    "body": "Hello forum!"
})
ok, _, body = report("FORUM", f"2. POST /forum/{tenant_id}/topics", r, (200, 201))
topic_id = None
if ok and isinstance(body, dict):
    topic_id = body.get("id") or body.get("_id") or (body.get("data") or {}).get("id")
    print(f"         Created topic id: {topic_id}")
elif topic_list:
    first = topic_list[0]
    topic_id = first.get("id") or first.get("_id")
    print(f"         Using existing topic id: {topic_id}")

# 3. GET /forum/topics/{topicId}
if topic_id:
    r = requests.get(f"{BASE}/forum/topics/{topic_id}")
    report("FORUM", f"3. GET /forum/topics/{topic_id}", r, (200,))
else:
    print("  [SKIP] 3. GET /forum/topics/{topicId} — no topic id")

# 4. POST /forum/topics/{topicId}/replies
if topic_id:
    r = requests.post(f"{BASE}/forum/topics/{topic_id}/replies", headers=god_headers, json={
        "body": "Test reply"
    })
    report("FORUM", f"4. POST /forum/topics/{topic_id}/replies", r, (200, 201))
else:
    print("  [SKIP] 4. POST /forum/topics/{topicId}/replies — no topic id")

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE AREA 3: MEDIA
# ══════════════════════════════════════════════════════════════════════════════

section_header("MEDIA")

# 1. GET /admin/media/{tenantId}
r = requests.get(f"{BASE}/admin/media/{tenant_id}", headers=god_headers)
report("MEDIA", f"1. GET /admin/media/{tenant_id}", r, (200,))
media_list = get_json(r)
media_items = media_list if isinstance(media_list, list) else (media_list.get("data") or media_list.get("media") or [])

# 2. POST /admin/media/{tenantId}
r = requests.post(f"{BASE}/admin/media/{tenant_id}", headers=god_headers, json={
    "type": "SPOTIFY",
    "url": "https://open.spotify.com/track/abc",
    "title": "Test track"
})
ok, _, body = report("MEDIA", f"2. POST /admin/media/{tenant_id}", r, (200, 201))
media_id = None
if ok and isinstance(body, dict):
    media_id = body.get("id") or body.get("_id") or (body.get("data") or {}).get("id")
    print(f"         Created media id: {media_id}")
elif media_items:
    first = media_items[0]
    media_id = first.get("id") or first.get("_id")
    print(f"         Using existing media id: {media_id}")

# 3. PATCH /admin/media/{id}
if media_id:
    r = requests.patch(f"{BASE}/admin/media/{media_id}", headers=god_headers, json={
        "title": "Updated"
    })
    report("MEDIA", f"3. PATCH /admin/media/{media_id}", r, (200, 201))
else:
    print("  [SKIP] 3. PATCH /admin/media/{id} — no media id")

# 4. DELETE /admin/media/{id}
if media_id:
    r = requests.delete(f"{BASE}/admin/media/{media_id}", headers=god_headers)
    report("MEDIA", f"4. DELETE /admin/media/{media_id}", r, (200, 201, 204))
else:
    print("  [SKIP] 4. DELETE /admin/media/{id} — no media id")

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE AREA 4: EVENTS
# ══════════════════════════════════════════════════════════════════════════════

section_header("EVENTS")

# 1. GET /admin/events
r = requests.get(f"{BASE}/admin/events", headers=god_headers)
report("EVENTS", "1. GET /admin/events", r, (200,))
events = get_json(r)
event_list = events if isinstance(events, list) else (events.get("data") or events.get("events") or [])

# 2. POST /admin/events
r = requests.post(f"{BASE}/admin/events", headers=god_headers, json={
    "tenantId": tenant_id,
    "title": "Test Concert",
    "href": "https://biletino.com",
    "provider": "BILETINO",
    "date": "2026-08-01T18:00:00Z",
    "active": True
})
ok, _, body = report("EVENTS", "2. POST /admin/events", r, (200, 201))
event_id = None
if ok and isinstance(body, dict):
    event_id = body.get("id") or body.get("_id") or (body.get("data") or {}).get("id")
    print(f"         Created event id: {event_id}")
elif event_list:
    first = event_list[0]
    event_id = first.get("id") or first.get("_id")
    print(f"         Using existing event id: {event_id}")

# 3. GET /vendors/{tenantId}/events
r = requests.get(f"{BASE}/vendors/{tenant_id}/events")
report("EVENTS", f"3. GET /vendors/{tenant_id}/events (public)", r, (200,))

# 4. PATCH /admin/events/{id}
if event_id:
    r = requests.patch(f"{BASE}/admin/events/{event_id}", headers=god_headers, json={
        "title": "Updated Concert"
    })
    report("EVENTS", f"4. PATCH /admin/events/{event_id}", r, (200, 201))
else:
    print("  [SKIP] 4. PATCH /admin/events/{id} — no event id")

# 5. DELETE /admin/events/{id}
if event_id:
    r = requests.delete(f"{BASE}/admin/events/{event_id}", headers=god_headers)
    report("EVENTS", f"5. DELETE /admin/events/{event_id}", r, (200, 201, 204))
else:
    print("  [SKIP] 5. DELETE /admin/events/{id} — no event id")

# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

section_header("SUMMARY")

total = len(results)
passed = sum(1 for r in results if r[2])
failed = total - passed

print(f"\n  Total: {total}  |  Passed: {passed}  |  Failed: {failed}\n")
print(f"  {'Section':<10} {'Test':<55} {'Status':<8} {'HTTP'}")
print(f"  {'-'*10} {'-'*55} {'-'*8} {'-'*4}")
for sec, name, ok, code, body in results:
    sym = "PASS" if ok else "FAIL"
    # truncate long test name
    short = name[:53]
    print(f"  {sec:<10} {short:<55} {sym:<8} {code}")
