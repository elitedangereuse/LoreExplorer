#!/usr/bin/env python3

from __future__ import annotations

import argparse
import html
import json
import math
import re
import shutil
import sqlite3
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


PALETTE = [
    "#ff6b6b",
    "#4ecdc4",
    "#ffe66d",
    "#5dade2",
    "#48c9b0",
    "#f5b041",
    "#af7ac5",
    "#ec7063",
    "#45b39d",
    "#f4d03f",
    "#5499c7",
    "#58d68d",
]

PRIORITY_GROUPS = [
    "Empire",
    "Federation",
    "Alliance",
    "Thargoid",
    "Guardian",
    "System",
    "Individual",
    "CommunityGoal",
    "Permit",
    "ship",
    "beacon",
    "Commander",
]

ORG_LINK_RE = re.compile(r"\[\[([^\]]+)\](?:\[([^\]]+)\])?\]")
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}


@dataclass
class Note:
    node_id: str
    title: str
    file: Path
    tags: list[str] = field(default_factory=list)
    aliases: list[str] = field(default_factory=list)
    inbound: int = 0
    outbound: int = 0
    group: str = "misc"
    x: float = 0.0
    y: float = 0.0
    size: float = 4.0
    color: str = "#5dade2"
    snippet: str = ""

    @property
    def degree(self) -> int:
        return self.inbound + self.outbound


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a static graph site from org-roam data.")
    parser.add_argument("--db", default="src/org-roam.db", help="Path to org-roam.db")
    parser.add_argument("--src-dir", default="src", help="Directory containing .org files")
    parser.add_argument("--site-dir", default="site", help="Directory containing static site assets")
    parser.add_argument("--out-dir", default="build/site", help="Output directory")
    return parser.parse_args()


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def clean_db_text(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if len(text) >= 2 and text[0] == '"' and text[-1] == '"':
        text = text[1:-1]
    return text


def score_size(degree: int) -> float:
    return round(4.0 + min(12.0, math.log2(degree + 2) * 2.3), 2)


def choose_group(tags: Iterable[str]) -> str:
    tags = list(dict.fromkeys(tags))
    for preferred in PRIORITY_GROUPS:
        if preferred in tags:
            return preferred
    for tag in tags:
        if tag == "galnet":
            continue
        if tag.isdigit():
            continue
        return tag
    return "misc"


def color_for_group(group: str, groups: list[str]) -> str:
    index = groups.index(group) % len(PALETTE)
    return PALETTE[index]


def resolve_note_path(raw_path: str, src_dir: Path) -> Path:
    candidate = Path(raw_path)
    if candidate.exists():
        return candidate
    fallback = src_dir / candidate.name
    return fallback


def load_notes(db_path: Path, src_dir: Path) -> tuple[dict[str, Note], list[tuple[str, str]]]:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row

    notes: dict[str, Note] = {}
    tags: dict[str, list[str]] = defaultdict(list)
    aliases: dict[str, list[str]] = defaultdict(list)

    for row in connection.execute("SELECT id, file, COALESCE(title, '') AS title FROM nodes"):
        node_id = clean_db_text(row["id"])
        note_path = resolve_note_path(clean_db_text(row["file"]), src_dir)
        title = clean_db_text(row["title"]).strip() or note_path.stem
        notes[node_id] = Note(node_id=node_id, title=title, file=note_path)

    for row in connection.execute("SELECT node_id, tag FROM tags WHERE tag IS NOT NULL AND tag != ''"):
        node_id = clean_db_text(row["node_id"])
        if node_id in notes:
            tags[node_id].append(clean_db_text(row["tag"]))

    for row in connection.execute("SELECT node_id, alias FROM aliases WHERE alias IS NOT NULL AND alias != ''"):
        node_id = clean_db_text(row["node_id"])
        if node_id in notes:
            aliases[node_id].append(clean_db_text(row["alias"]))

    links: list[tuple[str, str]] = []
    for row in connection.execute("SELECT source, dest, type FROM links"):
        if clean_db_text(row["type"]) != "id":
            continue
        source = clean_db_text(row["source"])
        dest = clean_db_text(row["dest"])
        if source in notes and dest in notes:
            links.append((source, dest))
            notes[source].outbound += 1
            notes[dest].inbound += 1

    for node_id, note in notes.items():
        note.tags = sorted(dict.fromkeys(tags[node_id]))
        note.aliases = sorted(dict.fromkeys(aliases[node_id]))

    connection.close()
    return notes, links


def assign_positions(notes: dict[str, Note]) -> None:
    groups = sorted({choose_group(note.tags) for note in notes.values()})
    group_offsets: dict[str, tuple[float, float]] = {}
    large_radius = max(900.0, len(groups) * 85.0)

    for index, group in enumerate(groups):
        angle = index * (2 * math.pi / max(1, len(groups)))
        group_offsets[group] = (
            math.cos(angle) * large_radius,
            math.sin(angle) * large_radius,
        )

    bucketed: dict[str, list[Note]] = defaultdict(list)
    for note in notes.values():
        note.group = choose_group(note.tags)
        bucketed[note.group].append(note)

    for group in groups:
        bucket = sorted(
            bucketed[group],
            key=lambda note: (-note.degree, note.title.lower(), note.node_id),
        )
        offset_x, offset_y = group_offsets[group]
        for index, note in enumerate(bucket):
            angle = index * 2.399963229728653
            radius = 20.0 * math.sqrt(index + 1)
            note.x = round(offset_x + math.cos(angle) * radius, 2)
            note.y = round(offset_y + math.sin(angle) * radius, 2)
            note.size = score_size(note.degree)
            note.color = color_for_group(group, groups)


def strip_metadata(lines: list[str]) -> list[str]:
    output: list[str] = []
    in_properties = False
    for line in lines:
        stripped = line.rstrip("\n")
        if stripped == ":PROPERTIES:":
            in_properties = True
            continue
        if in_properties:
            if stripped == ":END:":
                in_properties = False
            continue
        if stripped.startswith("#+"):
            continue
        output.append(stripped)
    return output


def normalize_file_target(target: str) -> str:
    raw_target = target[5:] if target.startswith("file:") else target
    return Path(raw_target).as_posix().lstrip("./")


def is_image_target(target: str) -> bool:
    return Path(normalize_file_target(target)).suffix.lower() in IMAGE_SUFFIXES


def link_text(target: str, label: str | None) -> str:
    if label:
        return label
    if target.startswith("id:"):
        return target[3:]
    if target.startswith("file:"):
        return Path(normalize_file_target(target)).stem.replace("_", " ")
    return target


def render_org_link(target: str, label: str | None) -> str:
    text = link_text(target, label)
    if target.startswith("id:"):
        node_id = html.escape(target[3:])
        return f'<a href="#" data-node-id="{node_id}">{html.escape(text)}</a>'
    if target.startswith("http://") or target.startswith("https://"):
        href = html.escape(target, quote=True)
        return f'<a href="{href}" target="_blank" rel="noreferrer">{html.escape(text)}</a>'
    if target.startswith("file:"):
        href = html.escape(normalize_file_target(target), quote=True)
        if is_image_target(target):
            return f'<img class="note-inline-image" src="{href}" alt="{html.escape(text)}" loading="lazy" />'
        return f'<a href="{href}" target="_blank" rel="noreferrer">{html.escape(text)}</a>'
    href = html.escape(target, quote=True)
    return f'<a href="{href}">{html.escape(text)}</a>'


def convert_org_links(text: str) -> str:
    return ORG_LINK_RE.sub(lambda match: render_org_link(match.group(1), match.group(2)), text)


def strip_org_markup(text: str) -> str:
    text = ORG_LINK_RE.sub(lambda match: link_text(match.group(1), match.group(2)), text)
    text = re.sub(r"(^|[\s(])\*([^*]+)\*([\s).,;:!?]|$)", r"\1\2\3", text)
    text = re.sub(r"(^|[\s(])/([^/]+)/([\s).,;:!?]|$)", r"\1\2\3", text)
    text = re.sub(r"[=~]([^=~]+)[=~]", r"\1", text)
    return text


def apply_inline_markup(text: str) -> str:
    placeholders: list[str] = []

    def stash_link(match: re.Match[str]) -> str:
        placeholders.append(render_org_link(match.group(1), match.group(2)))
        return f"@@LINK{len(placeholders) - 1}@@"

    text = ORG_LINK_RE.sub(stash_link, text)
    escaped = html.escape(text)
    escaped = re.sub(r"(^|[\s(])\*([^*]+)\*([\s).,;:!?]|$)", r"\1<strong>\2</strong>\3", escaped)
    escaped = re.sub(r"(^|[\s(])/([^/]+)/([\s).,;:!?]|$)", r"\1<em>\2</em>\3", escaped)
    escaped = re.sub(r"=([^=]+)=", r"<code>\1</code>", escaped)
    escaped = re.sub(r"~([^~]+)~", r"<code>\1</code>", escaped)
    for index, link_html in enumerate(placeholders):
        escaped = escaped.replace(f"@@LINK{index}@@", link_html)
    return escaped


def render_org_note(note: Note) -> str:
    if not note.file.exists():
        return (
            f'<article class="note-body">'
            f"<h1>{html.escape(note.title)}</h1>"
            f'<p class="note-warning">Source file not found: {html.escape(str(note.file))}</p>'
            f"</article>"
        )

    raw_lines = note.file.read_text(encoding="utf-8").splitlines()
    lines = strip_metadata(raw_lines)
    blocks: list[str] = []
    paragraph_lines: list[str] = []
    list_items: list[str] = []
    plain_text_lines: list[str] = []

    def flush_paragraph() -> None:
        nonlocal paragraph_lines
        if not paragraph_lines:
            return
        text = " ".join(part.strip() for part in paragraph_lines if part.strip())
        if text:
            plain_text_lines.append(strip_org_markup(text))
            css_class = "note-date" if re.fullmatch(r"/[^/]+/", text) else "note-paragraph"
            blocks.append(f'<p class="{css_class}">{apply_inline_markup(text)}</p>')
        paragraph_lines = []

    def flush_list() -> None:
        nonlocal list_items
        if not list_items:
            return
        items = "".join(f"<li>{apply_inline_markup(item)}</li>" for item in list_items)
        blocks.append(f"<ul>{items}</ul>")
        plain_text_lines.extend(strip_org_markup(item) for item in list_items)
        list_items = []

    for line in lines:
        if not line.strip():
            flush_paragraph()
            flush_list()
            continue

        heading_match = re.match(r"^(\*+)\s+(.*)$", line)
        if heading_match:
            flush_paragraph()
            flush_list()
            level = min(len(heading_match.group(1)), 6)
            heading_text = heading_match.group(2).strip()
            plain_text_lines.append(strip_org_markup(heading_text))
            blocks.append(f"<h{level}>{apply_inline_markup(heading_text)}</h{level}>")
            continue

        list_match = re.match(r"^[-+]\s+(.*)$", line)
        if list_match:
            flush_paragraph()
            list_items.append(list_match.group(1).strip())
            continue

        paragraph_lines.append(line)

    flush_paragraph()
    flush_list()

    snippet_source = " ".join(plain_text_lines)
    note.snippet = snippet_source[:240].strip()

    alias_html = ""
    if note.aliases:
        alias_html = (
            '<div class="note-aliases"><span class="meta-label">Aliases</span>'
            + "".join(f'<span class="tag alias">{html.escape(alias)}</span>' for alias in note.aliases)
            + "</div>"
        )

    return (
        '<article class="note-body">'
        f"<header><h1>{html.escape(note.title)}</h1>"
        f"{alias_html}</header>"
        f"<section>{''.join(blocks)}</section>"
        "</article>"
    )


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def build_site(db_path: Path, src_dir: Path, site_dir: Path, out_dir: Path) -> None:
    if out_dir.exists():
        shutil.rmtree(out_dir)
    shutil.copytree(site_dir, out_dir)
    image_dir = src_dir / "img"
    if image_dir.exists():
        shutil.copytree(image_dir, out_dir / "img", dirs_exist_ok=True)

    notes, links = load_notes(db_path, src_dir)
    assign_positions(notes)

    notes_dir = out_dir / "notes"
    notes_dir.mkdir(parents=True, exist_ok=True)

    node_payload = []
    search_payload = []

    group_counter = Counter(note.group for note in notes.values())
    sorted_notes = sorted(notes.values(), key=lambda note: note.title.lower())

    for note in sorted_notes:
        rendered_html = render_org_note(note)
        (notes_dir / f"{note.node_id}.html").write_text(rendered_html, encoding="utf-8")

        node_payload.append(
            {
                "id": note.node_id,
                "title": note.title,
                "x": note.x,
                "y": note.y,
                "size": note.size,
                "color": note.color,
                "group": note.group,
                "degree": note.degree,
                "inbound": note.inbound,
                "outbound": note.outbound,
                "tags": note.tags,
                "aliases": note.aliases,
            }
        )

        search_payload.append(
            {
                "id": note.node_id,
                "title": note.title,
                "aliases": note.aliases,
                "tags": note.tags,
                "group": note.group,
                "degree": note.degree,
                "snippet": note.snippet,
                "titleNorm": normalize(note.title),
                "aliasNorms": [normalize(alias) for alias in note.aliases],
                "tagNorms": [normalize(tag) for tag in note.tags],
                "snippetNorm": normalize(note.snippet),
            }
        )

    edge_payload = [{"source": source, "target": dest} for source, dest in links]

    meta_payload = {
        "nodeCount": len(node_payload),
        "edgeCount": len(edge_payload),
        "groupCount": len(group_counter),
        "topGroups": group_counter.most_common(12),
    }

    write_json(out_dir / "data" / "graph.json", {"nodes": node_payload, "edges": edge_payload, "meta": meta_payload})
    write_json(out_dir / "data" / "search-docs.json", search_payload)
    write_json(out_dir / "data" / "meta.json", meta_payload)


def main() -> None:
    args = parse_args()
    build_site(
        db_path=Path(args.db),
        src_dir=Path(args.src_dir),
        site_dir=Path(args.site_dir),
        out_dir=Path(args.out_dir),
    )


if __name__ == "__main__":
    main()
