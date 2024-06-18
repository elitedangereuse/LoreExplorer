## Zaonce articles

Fetching source of truth for articles between 08 DEC 3306 and 12 FEB 3307:

```bash
$ wget https://cms.zaonce.net/en-GB/jsonapi/node/galnet_article
$ cat galnet_article | jq '.data | .[] | {title: .attributes.title, link: .links.self.href}'
```
