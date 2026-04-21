# Useful commands

Remove links from the #+title property:

```bash
sed -i -E '/^#\+title:/ s/\[\[id:[^]]+\]\[([^]]+)\]\]/\1/g' *.org
```

Build the static graph explorer locally:

```bash
python3 src/build_graph_site.py --db src/org-roam.db --src-dir src --site-dir site --out-dir build/site
python3 -m http.server --directory build/site 8000
```
