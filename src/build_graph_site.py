#!/usr/bin/env python3

from __future__ import annotations

import argparse
import html
import json
import math
import re
import shlex
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
LIST_ITEM_RE = re.compile(r"^(\s*)([-+*]|\d+[.)])\s+(.*)$")


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
    community: str = ""
    refs: list[str] = field(default_factory=list)

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


def build_adjacency(notes: dict[str, Note], links: list[tuple[str, str]]) -> dict[str, set[str]]:
    adjacency = {node_id: set() for node_id in notes}
    for source, dest in links:
        adjacency[source].add(dest)
        adjacency[dest].add(source)
    return adjacency


def choose_community_label(
    note_id: str,
    adjacency: dict[str, set[str]],
    labels: dict[str, str],
    notes: dict[str, Note],
) -> str:
    neighbor_labels = Counter(labels[neighbor_id] for neighbor_id in adjacency[note_id])
    if not neighbor_labels:
        return labels[note_id]
    return max(
        neighbor_labels,
        key=lambda label: (
            neighbor_labels[label],
            sum(notes[neighbor_id].degree for neighbor_id in adjacency[note_id] if labels[neighbor_id] == label),
            -len(label),
            label,
        ),
    )


def choose_merge_target(
    members: list[str],
    adjacency: dict[str, set[str]],
    communities: dict[str, list[str]],
    node_to_community: dict[str, str],
    notes: dict[str, Note],
) -> str | None:
    boundary_scores: Counter[str] = Counter()
    for node_id in members:
        for neighbor_id in adjacency[node_id]:
            target = node_to_community[neighbor_id]
            if target != node_to_community[node_id]:
                boundary_scores[target] += 1
    if boundary_scores:
        return max(
            boundary_scores,
            key=lambda community_id: (
                boundary_scores[community_id],
                len(communities[community_id]),
                sum(notes[node_id].degree for node_id in communities[community_id]),
                community_id,
            ),
        )

    member_groups = Counter(notes[node_id].group for node_id in members if notes[node_id].group)
    if member_groups:
        dominant_group = member_groups.most_common(1)[0][0]
        matching = [community_id for community_id, node_ids in communities.items() if any(notes[node_id].group == dominant_group for node_id in node_ids)]
        if matching:
            return max(
                matching,
                key=lambda community_id: (
                    len(communities[community_id]),
                    sum(notes[node_id].degree for node_id in communities[community_id]),
                    community_id,
                ),
            )

    if not communities:
        return None
    return max(
        communities,
        key=lambda community_id: (
            len(communities[community_id]),
            sum(notes[node_id].degree for node_id in communities[community_id]),
            community_id,
        ),
    )


def detect_communities(notes: dict[str, Note], links: list[tuple[str, str]]) -> dict[str, list[str]]:
    adjacency = build_adjacency(notes, links)
    labels = {node_id: node_id for node_id in notes}
    node_order = [note.node_id for note in sorted(notes.values(), key=lambda note: (-note.degree, note.title.lower(), note.node_id))]

    for _ in range(16):
        changed = False
        for node_id in node_order:
            next_label = choose_community_label(node_id, adjacency, labels, notes)
            if next_label != labels[node_id]:
                labels[node_id] = next_label
                changed = True
        if not changed:
            break

    communities: dict[str, list[str]] = defaultdict(list)
    for node_id, label in labels.items():
        communities[label].append(node_id)

    min_size = max(10, round(math.sqrt(max(1, len(notes))) / 2))
    node_to_community = {node_id: label for label, node_ids in communities.items() for node_id in node_ids}

    while True:
        small_communities = [
            community_id
            for community_id, node_ids in communities.items()
            if len(node_ids) < min_size
        ]
        if not small_communities:
            break

        moved = False
        for community_id in sorted(small_communities, key=lambda item: (len(communities[item]), item)):
            members = communities.get(community_id)
            if not members or len(members) >= min_size:
                continue
            candidate_communities = {
                key: value
                for key, value in communities.items()
                if key != community_id
            }
            target = choose_merge_target(members, adjacency, candidate_communities, node_to_community, notes)
            if not target:
                continue
            communities[target].extend(members)
            for node_id in members:
                node_to_community[node_id] = target
            del communities[community_id]
            moved = True
        if not moved:
            break

    ordered_communities = sorted(
        communities.values(),
        key=lambda node_ids: (
            -len(node_ids),
            -sum(notes[node_id].degree for node_id in node_ids),
            min(node_ids),
        ),
    )
    final_communities: dict[str, list[str]] = {}
    for index, node_ids in enumerate(ordered_communities, start=1):
        community_id = f"community-{index:03d}"
        sorted_node_ids = sorted(
            node_ids,
            key=lambda node_id: (-notes[node_id].degree, notes[node_id].title.lower(), node_id),
        )
        final_communities[community_id] = sorted_node_ids
        for node_id in sorted_node_ids:
            notes[node_id].community = community_id

    return final_communities


def resolve_note_path(raw_path: str, src_dir: Path) -> Path:
    candidate = Path(raw_path)
    if candidate.exists():
        return candidate
    fallback = src_dir / candidate.name
    return fallback


def parse_roam_aliases(raw_value: str) -> list[str]:
    value = clean_db_text(raw_value).strip()
    if not value:
        return []
    try:
        return [token.strip() for token in shlex.split(value) if token.strip()]
    except ValueError:
        return [value]


def parse_roam_refs(raw_value: str) -> list[str]:
    value = clean_db_text(raw_value).strip()
    if not value:
        return []
    return [token.strip() for token in value.split() if token.strip()]


def parse_file_note_metadata(path: Path) -> tuple[str, str, list[str], list[str], list[str]]:
    node_id = ""
    title = ""
    tags: list[str] = []
    aliases: list[str] = []
    refs: list[str] = []
    in_properties = False

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line == ":PROPERTIES:":
            in_properties = True
            continue
        if in_properties:
            if line == ":END:":
                in_properties = False
                continue
            if line.startswith(":ID:"):
                node_id = line[len(":ID:"):].strip()
            elif line.startswith(":ROAM_ALIASES:"):
                aliases = parse_roam_aliases(line[len(":ROAM_ALIASES:"):].strip())
            elif line.startswith(":ROAM_REFS:"):
                refs = parse_roam_refs(line[len(":ROAM_REFS:"):].strip())
            continue

        if raw_line.startswith("#+title:"):
            title = raw_line[len("#+title:"):].strip()
            continue
        if raw_line.startswith("#+filetags:"):
            tags = [tag for tag in raw_line[len("#+filetags:"):].strip().split(":") if tag]
            continue

        if node_id and title:
            break

    return node_id, title, tags, aliases, refs


def load_notes(db_path: Path, src_dir: Path) -> tuple[dict[str, Note], list[tuple[str, str]]]:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row

    notes: dict[str, Note] = {}
    tags: dict[str, list[str]] = defaultdict(list)
    aliases: dict[str, list[str]] = defaultdict(list)
    file_tags: dict[str, list[str]] = {}
    file_aliases: dict[str, list[str]] = {}
    file_refs: dict[str, list[str]] = {}

    for row in connection.execute("SELECT id, file, COALESCE(title, '') AS title FROM nodes"):
        node_id = clean_db_text(row["id"])
        note_path = resolve_note_path(clean_db_text(row["file"]), src_dir)
        title = clean_db_text(row["title"]).strip() or note_path.stem
        notes[node_id] = Note(node_id=node_id, title=title, file=note_path)

    for note_path in sorted(src_dir.glob("*.org")):
        if note_path.name.startswith(".#"):
            continue
        node_id, title, parsed_tags, parsed_aliases, parsed_refs = parse_file_note_metadata(note_path)
        if not node_id:
            continue
        file_tags[node_id] = parsed_tags
        file_aliases[node_id] = parsed_aliases
        file_refs[node_id] = parsed_refs
        if node_id in notes:
            if title:
                notes[node_id].title = title
            continue
        notes[node_id] = Note(
            node_id=node_id,
            title=title or note_path.stem,
            file=note_path,
        )

    for row in connection.execute("SELECT node_id, tag FROM tags WHERE tag IS NOT NULL AND tag != ''"):
        node_id = clean_db_text(row["node_id"])
        if node_id in notes:
            tags[node_id].append(clean_db_text(row["tag"]))

    for row in connection.execute("SELECT node_id, alias FROM aliases WHERE alias IS NOT NULL AND alias != ''"):
        node_id = clean_db_text(row["node_id"])
        if node_id in notes:
            aliases[node_id].append(clean_db_text(row["alias"]))

    links: list[tuple[str, str]] = []
    link_pairs: set[tuple[str, str]] = set()

    def add_link(source: str, dest: str) -> None:
        if source not in notes or dest not in notes or (source, dest) in link_pairs:
            return
        link_pairs.add((source, dest))
        links.append((source, dest))
        notes[source].outbound += 1
        notes[dest].inbound += 1

    for node_id in notes:
        text = notes[node_id].file.read_text(encoding="utf-8")
        for match in ORG_LINK_RE.finditer(text):
            target = match.group(1)
            if not target.startswith("id:"):
                continue
            add_link(node_id, target[3:])

    for node_id, note in notes.items():
        # File tags are the source of truth during local edits; the org-roam DB
        # can lag until it is refreshed by Emacs.
        note.tags = sorted(dict.fromkeys([*tags[node_id], *file_tags.get(node_id, [])]))
        note.aliases = sorted(dict.fromkeys(aliases[node_id] or file_aliases.get(node_id, [])))
        note.refs = list(dict.fromkeys(file_refs.get(node_id, [])))

    connection.close()
    return notes, links


def assign_positions(notes: dict[str, Note], communities: dict[str, list[str]]) -> None:
    groups = sorted({choose_group(note.tags) for note in notes.values()})
    for note in notes.values():
        note.group = choose_group(note.tags)
        note.color = color_for_group(note.group, groups)

    ordered_communities = list(communities.items())
    community_radius = max(900.0, len(ordered_communities) * 95.0)

    for community_index, (community_id, node_ids) in enumerate(ordered_communities):
        angle = community_index * (2 * math.pi / max(1, len(ordered_communities)))
        center_x = math.cos(angle) * community_radius
        center_y = math.sin(angle) * community_radius
        dominant_groups = Counter(notes[node_id].group for node_id in node_ids if notes[node_id].group)
        dominant_group = dominant_groups.most_common(1)[0][0] if dominant_groups else "misc"

        sorted_node_ids = sorted(
            node_ids,
            key=lambda node_id: (-notes[node_id].degree, notes[node_id].title.lower(), node_id),
        )
        for node_index, node_id in enumerate(sorted_node_ids):
            note = notes[node_id]
            local_angle = node_index * 2.399963229728653
            local_radius = 18.0 * math.sqrt(node_index + 1)
            note.x = round(center_x + math.cos(local_angle) * local_radius, 2)
            note.y = round(center_y + math.sin(local_angle) * local_radius, 2)
            note.size = score_size(note.degree)
            if note.group == "misc":
                note.color = color_for_group(dominant_group, groups)


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
            if stripped.lower() in {"#+begin_quote", "#+end_quote"}:
                output.append(stripped.lower())
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


def headings_match_title(heading_text: str, title: str) -> bool:
    return normalize(strip_org_markup(heading_text)) == normalize(title)


def render_list_block(entries: list[tuple[int, str, str]]) -> tuple[str, list[str]]:
    plain_text_items: list[str] = []

    def list_tag(marker: str) -> str:
        return "ol" if re.match(r"\d", marker) else "ul"

    def build_list(start_index: int, base_indent: int) -> tuple[str, int]:
        current_tag = list_tag(entries[start_index][1])
        items_html: list[str] = []
        index = start_index

        while index < len(entries):
            indent, marker, text = entries[index]
            if indent < base_indent:
                break
            if indent != base_indent or list_tag(marker) != current_tag:
                break

            plain_text_items.append(strip_org_markup(text))
            item_html = apply_inline_markup(text)
            index += 1

            nested_html: list[str] = []
            while index < len(entries) and entries[index][0] > base_indent:
                nested_block, index = build_list(index, entries[index][0])
                nested_html.append(nested_block)

            items_html.append(f"<li>{item_html}{''.join(nested_html)}</li>")

        return f"<{current_tag}>{''.join(items_html)}</{current_tag}>", index

    blocks: list[str] = []
    index = 0
    while index < len(entries):
        block_html, index = build_list(index, entries[index][0])
        blocks.append(block_html)

    return "".join(blocks), plain_text_items


def render_quote_block(lines: list[str]) -> tuple[str, list[str]]:
    blocks: list[str] = []
    plain_text_blocks: list[str] = []
    paragraph_lines: list[str] = []

    def flush_quote_paragraph() -> None:
        nonlocal paragraph_lines
        if not paragraph_lines:
            return
        text = " ".join(part.strip() for part in paragraph_lines if part.strip())
        if text:
            plain_text_blocks.append(strip_org_markup(text))
            blocks.append(f'<p class="note-quote-paragraph">{apply_inline_markup(text)}</p>')
        paragraph_lines = []

    for line in lines:
        if not line.strip():
            flush_quote_paragraph()
            continue
        paragraph_lines.append(line)

    flush_quote_paragraph()
    if not blocks:
        return "", []
    return '<blockquote class="note-quote">' + "".join(blocks) + "</blockquote>", plain_text_blocks


def reference_source_label(url: str) -> str:
    lowered = url.lower()
    if "cms.zaonce.net" in lowered:
        return "GalNet"
    if "community.elitedangerous.com" in lowered:
        return "GalNet archive"
    if "elite-dangerous.fandom.com" in lowered:
        return "Fandom"
    if "inara.cz" in lowered:
        return "Inara"
    if "forums.frontier.co.uk" in lowered:
        return "Frontier forum"
    if "canonn.science" in lowered:
        return "Canonn"
    if "antixenoinitiative.com" in lowered:
        return "AXI"
    if "edsm.net" in lowered:
        return "EDSM"
    if "archive.org" in lowered:
        return "Archive"
    if "wikipedia.org" in lowered:
        return "Wikipedia"
    match = re.match(r"^https?://([^/]+)", url, flags=re.IGNORECASE)
    return match.group(1) if match else "Reference"


def render_reference_links(refs: list[str]) -> str:
    if not refs:
        return ""
    seen_labels: Counter[str] = Counter()
    links: list[str] = []
    for ref in refs:
        label = reference_source_label(ref)
        seen_labels[label] += 1
        display = label if seen_labels[label] == 1 else f"{label} {seen_labels[label]}"
        links.append(
            f'<a class="reference-link" href="{html.escape(ref, quote=True)}" target="_blank" rel="noopener noreferrer">'
            f"{html.escape(display)}</a>"
        )
    return (
        '<div class="note-references">'
        '<span class="meta-label">References</span>'
        '<div class="note-reference-list">'
        + "".join(links)
        + "</div></div>"
    )


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
    list_entries: list[tuple[int, str, str]] = []
    quote_lines: list[str] = []
    plain_text_lines: list[str] = []
    in_quote = False

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
        nonlocal list_entries
        if not list_entries:
            return
        list_html, list_plain_text = render_list_block(list_entries)
        blocks.append(list_html)
        plain_text_lines.extend(list_plain_text)
        list_entries = []

    def flush_quote() -> None:
        nonlocal quote_lines
        if not quote_lines:
            return
        quote_html, quote_plain_text = render_quote_block(quote_lines)
        if quote_html:
            blocks.append(quote_html)
            plain_text_lines.extend(quote_plain_text)
        quote_lines = []

    for line in lines:
        if line == "#+begin_quote":
            flush_paragraph()
            flush_list()
            in_quote = True
            quote_lines = []
            continue

        if line == "#+end_quote":
            flush_quote()
            in_quote = False
            continue

        if in_quote:
            quote_lines.append(line)
            continue

        if not line.strip():
            flush_paragraph()
            flush_list()
            continue

        heading_match = re.match(r"^(\*+)\s+(.*)$", line)
        if heading_match:
            flush_paragraph()
            flush_list()
            heading_text = heading_match.group(2).strip()
            if not blocks and headings_match_title(heading_text, note.title):
                continue
            level = min(len(heading_match.group(1)) + 1, 6)
            plain_text_lines.append(strip_org_markup(heading_text))
            blocks.append(f"<h{level}>{apply_inline_markup(heading_text)}</h{level}>")
            continue

        list_match = LIST_ITEM_RE.match(line)
        if list_match:
            flush_paragraph()
            indent = len(list_match.group(1).expandtabs(4))
            list_entries.append((indent, list_match.group(2), list_match.group(3).strip()))
            continue

        paragraph_lines.append(line)

    flush_paragraph()
    flush_list()
    flush_quote()

    snippet_source = " ".join(plain_text_lines)
    note.snippet = snippet_source[:240].strip()

    alias_html = ""
    if note.aliases:
        alias_html = (
            '<div class="note-aliases"><span class="meta-label">Aliases</span>'
            + "".join(f'<span class="tag alias">{html.escape(alias)}</span>' for alias in note.aliases)
            + "</div>"
        )
    refs_html = render_reference_links(note.refs)

    return (
        '<article class="note-body">'
        f"<header><h1>{html.escape(note.title)}</h1>"
        f"{alias_html}</header>"
        f"{refs_html}"
        f"<section>{''.join(blocks)}</section>"
        "</article>"
    )


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.tmp")
    temp_path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    temp_path.replace(path)


def write_text_atomic(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.tmp")
    temp_path.write_text(content, encoding="utf-8")
    temp_path.replace(path)


def build_site(db_path: Path, src_dir: Path, site_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    shutil.copytree(site_dir, out_dir, dirs_exist_ok=True)
    image_dir = src_dir / "img"
    if image_dir.exists():
        shutil.copytree(image_dir, out_dir / "img", dirs_exist_ok=True)

    notes, links = load_notes(db_path, src_dir)
    communities = detect_communities(notes, links)
    assign_positions(notes, communities)

    notes_dir = out_dir / "notes"
    notes_dir.mkdir(parents=True, exist_ok=True)
    written_note_names: set[str] = set()

    node_payload = []
    community_payload = []
    search_payload = []

    group_counter = Counter(note.group for note in notes.values())
    sorted_notes = sorted(notes.values(), key=lambda note: note.title.lower())

    for note in sorted_notes:
        rendered_html = render_org_note(note)
        note_name = f"{note.node_id}.html"
        written_note_names.add(note_name)
        write_text_atomic(notes_dir / note_name, rendered_html)

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
                "community": note.community,
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
    community_edges = Counter()

    for source, dest in links:
        source_community = notes[source].community
        dest_community = notes[dest].community
        if not source_community or not dest_community or source_community == dest_community:
            continue
        left, right = sorted((source_community, dest_community))
        community_edges[(left, right)] += 1

    community_groups = sorted({choose_group(note.tags) for note in notes.values()})
    ordered_communities = list(communities.items())
    community_radius = max(620.0, len(ordered_communities) * 48.0)

    for community_index, (community_id, node_ids) in enumerate(ordered_communities):
        community_notes = [notes[node_id] for node_id in node_ids]
        hub = max(community_notes, key=lambda note: (note.degree, note.title.lower(), note.node_id))
        community_group_counter = Counter(note.group for note in community_notes if note.group)
        dominant_group = community_group_counter.most_common(1)[0][0] if community_group_counter else "misc"
        angle = community_index * (2 * math.pi / max(1, len(ordered_communities)))
        x = round(math.cos(angle) * community_radius, 2)
        y = round(math.sin(angle) * community_radius, 2)
        internal_edge_count = sum(
            1
            for source, dest in links
            if notes[source].community == community_id and notes[dest].community == community_id
        )
        community_payload.append(
            {
                "id": community_id,
                "title": f"{dominant_group} · {hub.title}" if dominant_group != "misc" else hub.title,
                "x": x,
                "y": y,
                "size": round(14.0 + math.sqrt(len(node_ids)) * 3.6, 2),
                "color": color_for_group(dominant_group, community_groups),
                "group": dominant_group,
                "nodeCount": len(node_ids),
                "edgeCount": internal_edge_count,
                "hubId": hub.node_id,
                "hubTitle": hub.title,
            }
        )

    community_edge_payload = [
        {
            "source": source,
            "target": target,
            "weight": weight,
        }
        for (source, target), weight in sorted(community_edges.items(), key=lambda item: (-item[1], item[0][0], item[0][1]))
    ]

    meta_payload = {
        "nodeCount": len(node_payload),
        "edgeCount": len(edge_payload),
        "groupCount": len(group_counter),
        "communityCount": len(community_payload),
        "topGroups": group_counter.most_common(12),
    }

    write_json(
        out_dir / "data" / "graph.json",
        {
            "nodes": node_payload,
            "edges": edge_payload,
            "communityNodes": community_payload,
            "communityEdges": community_edge_payload,
            "meta": meta_payload,
        },
    )
    write_json(out_dir / "data" / "search-docs.json", search_payload)
    write_json(out_dir / "data" / "meta.json", meta_payload)

    for stale_note in notes_dir.glob("*.html"):
        if stale_note.name not in written_note_names:
            stale_note.unlink()


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
