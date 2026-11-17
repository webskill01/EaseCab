-- "amravati" in our groups = Amravati Enclave (Panchkula), not Amravati, Maharashtra.
-- Re-point anything resolved to the Maharashtra row, strip its aliases and retire it.
-- The row stays (inactive) so nothing referencing it breaks; the seed adds the
-- 'amravati' / 'amravati enclave' aliases to Panchkula.
WITH mh AS (SELECT id FROM cities WHERE canonical_name = 'Amravati' AND state = 'Maharashtra'),
     pkl AS (SELECT id FROM cities WHERE canonical_name = 'Panchkula' AND state = 'Haryana' LIMIT 1)
UPDATE rides SET pickup_city_id = (SELECT id FROM pkl) WHERE pickup_city_id IN (SELECT id FROM mh);

WITH mh AS (SELECT id FROM cities WHERE canonical_name = 'Amravati' AND state = 'Maharashtra'),
     pkl AS (SELECT id FROM cities WHERE canonical_name = 'Panchkula' AND state = 'Haryana' LIMIT 1)
UPDATE rides SET drop_city_id = (SELECT id FROM pkl) WHERE drop_city_id IN (SELECT id FROM mh);

WITH mh AS (SELECT id FROM cities WHERE canonical_name = 'Amravati' AND state = 'Maharashtra'),
     pkl AS (SELECT id FROM cities WHERE canonical_name = 'Panchkula' AND state = 'Haryana' LIMIT 1)
UPDATE posted_rides SET from_city_id = (SELECT id FROM pkl) WHERE from_city_id IN (SELECT id FROM mh);

WITH mh AS (SELECT id FROM cities WHERE canonical_name = 'Amravati' AND state = 'Maharashtra'),
     pkl AS (SELECT id FROM cities WHERE canonical_name = 'Panchkula' AND state = 'Haryana' LIMIT 1)
UPDATE posted_rides SET to_city_id = (SELECT id FROM pkl) WHERE to_city_id IN (SELECT id FROM mh);

UPDATE unresolved_city_strings SET suggested_city_id = NULL
WHERE suggested_city_id IN (SELECT id FROM cities WHERE canonical_name = 'Amravati' AND state = 'Maharashtra');

UPDATE users SET notify_geo_city_id = NULL
WHERE notify_geo_city_id IN (SELECT id FROM cities WHERE canonical_name = 'Amravati' AND state = 'Maharashtra');

DELETE FROM city_aliases
WHERE city_id IN (SELECT id FROM cities WHERE canonical_name = 'Amravati' AND state = 'Maharashtra');

UPDATE cities SET is_active = false WHERE canonical_name = 'Amravati' AND state = 'Maharashtra';
