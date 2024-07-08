# Useful commands

Remove links from the #+title property:

```bash
sed -i -E '/^#\+title:/ s/\[\[id:[^]]+\]\[([^]]+)\]\]/\1/g' *.org
```
