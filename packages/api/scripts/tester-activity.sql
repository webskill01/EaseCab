-- Tester engagement for the Play closed test (Sept 2026).
--
-- There is no last_login_at column on users, so "activity" is inferred from what the
-- app actually writes: contact reveals, posted rides, and push-token registrations.
-- A tester who only browses the feed shows no row activity — treat contacts/posts as
-- the signal and a missing profile as "installed but never really used".
--
-- Run: paste into the Supabase SQL editor. Edit the phone list below (E.164, +91...).

WITH testers(phone) AS (
  VALUES
    ('+919876543210'),   -- Play reviewer account — keep first, do not remove
    ('+91XXXXXXXXX2'),
    ('+91XXXXXXXXX3'),
    ('+91XXXXXXXXX4'),
    ('+91XXXXXXXXX5'),
    ('+91XXXXXXXXX6'),
    ('+91XXXXXXXXX7'),
    ('+91XXXXXXXXX8'),
    ('+91XXXXXXXXX9'),
    ('+91XXXXXXXX10'),
    ('+91XXXXXXXX11'),
    ('+91XXXXXXXX12')
),
a AS (
  SELECT
    t.phone,
    u.id,
    u.name,
    u.created_at,
    (SELECT count(*)              FROM ride_contacts      x WHERE x.user_id  = u.id) AS contacts,
    (SELECT max(x.contacted_at)   FROM ride_contacts      x WHERE x.user_id  = u.id) AS last_contact,
    (SELECT count(*)              FROM posted_rides       x WHERE x.posted_by = u.id) AS posts,
    (SELECT max(x.created_at)     FROM posted_rides       x WHERE x.posted_by = u.id) AS last_post,
    (SELECT count(*)              FROM push_subscriptions x WHERE x.user_id  = u.id) AS devices
  FROM testers t
  LEFT JOIN users u ON u.phone = t.phone AND u.is_deleted = false
)
SELECT
  phone,
  CASE
    WHEN id IS NULL   THEN '** NEVER SIGNED UP **'
    WHEN name IS NULL THEN '(no profile yet)'
    ELSE name
  END                                                        AS tester,
  created_at::date                                           AS joined,
  contacts,
  posts,
  devices,
  GREATEST(last_contact, last_post)::date                    AS last_active,
  CASE
    WHEN id IS NULL                              THEN 'CALL THEM — never installed/logged in'
    WHEN contacts = 0 AND posts = 0              THEN 'CALL THEM — logged in, zero activity'
    WHEN GREATEST(last_contact, last_post) < now() - interval '3 days'
                                                 THEN 'nudge — quiet 3+ days'
    ELSE 'ok'
  END                                                        AS action
FROM a
ORDER BY
  (id IS NULL) DESC,                        -- never signed up first
  (contacts + posts) ASC,                   -- then least active
  GREATEST(last_contact, last_post) ASC NULLS FIRST;
