# Navigation

The Angular app routes map to these core views:

- `/dashboard`: overview and KPIs
- `/proxies`: proxy list and filters
- `/proxies/:id`: proxy details and statistics
- `/addProxies`: proxy import workflow
- `/rotating`: rotating proxy management
- `/scraper`: scrape source list
- `/scraper/:id`: scrape source details and related proxies
- `/checker/settings`: active workspace checker settings
- `/checker/judges`: active workspace judge settings
- `/workspace`: workspace capacity, details, members, and outgoing invitations
- `/invitations`: pending workspace invitations for the signed-in account
- `/account`: account and password actions
- `/notifications`: release/build notifications

Admin-only routes:

- `/global/checker`
- `/global/scraper`
- `/global/blacklist`
- `/plugins`
- `/plugins/geolite`
