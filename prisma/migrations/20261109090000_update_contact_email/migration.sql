-- Data-only: replace the old public contact address with the current one in stored site content.
UPDATE "HomepageContent"
SET "footerContactEmail" = 'herbalschool26@gmail.com'
WHERE "footerContactEmail" = 'hello@herbalhealthseminars.com';

UPDATE "ContentPage"
SET "body" = REPLACE("body", 'hello@herbalhealthseminars.com', 'herbalschool26@gmail.com')
WHERE "body" LIKE '%hello@herbalhealthseminars.com%';
