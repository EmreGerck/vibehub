-- One-shot cleanup for historical PII/credential leaks in UserErrorLog.payloadSnapshot.
--
-- The original sanitiser (commit 902d94e) used exact key matching against a small
-- set, so `ownerPassword` on /vendors/apply (and any other non-listed variant) was
-- captured in plaintext. The follow-up commit ships substring + case-insensitive
-- key matching; this migration scrubs anything that already leaked into the table.
--
-- We rewrite `body` in-place: any key whose lower-cased name contains a sensitive
-- substring (or matches a short exact-list) is replaced with "[redacted-historical]".
-- Other fields stay intact so the row remains useful for debugging.

UPDATE "UserErrorLog"
SET "payloadSnapshot" = jsonb_set(
  "payloadSnapshot",
  '{body}',
  COALESCE(
    (
      SELECT jsonb_object_agg(
        key,
        CASE
          WHEN lower(key) ~ '(password|token|secret|apikey|api_key|authorization|creditcard|cardnumber|cvv)'
            OR lower(key) IN ('code', 'otp', 'cookie', 'pin')
          THEN to_jsonb('[redacted-historical]'::text)
          ELSE value
        END
      )
      FROM jsonb_each("payloadSnapshot"->'body')
    ),
    '{}'::jsonb
  )
)
WHERE jsonb_typeof("payloadSnapshot"->'body') = 'object'
  AND EXISTS (
    SELECT 1
    FROM jsonb_each("payloadSnapshot"->'body') AS kv(key, value)
    WHERE lower(kv.key) ~ '(password|token|secret|apikey|api_key|authorization|creditcard|cardnumber|cvv)'
       OR lower(kv.key) IN ('code', 'otp', 'cookie', 'pin')
  );
