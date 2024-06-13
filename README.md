# Elite Dangerous Lore Explorer

Discover the [Elite Dangerous Lore Explorer](https://elitedangereuse.github.io/LoreExplorer/) now!

This uses the [Zettelkasten method](https://www.orgroam.com/manual.html#A-Brief-Introduction-to-the-Zettelkasten-Method) and org-roam to create a new approach to the official Elite Dangerous lore.

## Org-roam

Org-roam is a mode for Emacs that allows to create 

https://www.orgroam.com/

Org-roam is a tool for networked thought. It reproduces some of [Roam Research’s](https://roamresearch.com/) key features within [Org-mode](https://orgmode.org/).

Org-roam allows for effortless non-hierarchical note-taking: with Org-roam, notes flow naturally, making note-taking fun and easy. Org-roam augments the Org-mode syntax, and will work for anyone already using Org-mode for their personal wiki.

Org-roam leverages the mature ecosystem around Org-mode. For example, it has first-class support for [org-ref](https://github.com/jkitchin/org-ref) for citation management, and is able to piggyback off Org’s excellent LaTeX and source-block evaluation capabilities. 

## Editors: Emacs, VSCode, IDEA, Notepad...

Thankfully Emacs is not the only tool available to write Org-roam files.

Here are a list of resources to find the right tool for you to participate:
  * Emacs: [Org-roam](https://www.orgroam.com/)
  * VSCode: [VS Code Org Mode](https://vscode-org-mode.github.io/vscode-org-mode/)
  * JetBrains IDEA: [Org4Idea](https://plugins.jetbrains.com/plugin/7095-org4idea) plugin

In the end if you just want to edit files with Notepad it's fine as
everything is plain text.

The above tools are convenient to quickly create links between nodes
but if you just want to edit one node then any simple text editor will
do.

## Participation

We encourage and welcome contributions to this project! Whether you're submitting new content or improving existing documentation, please adhere to the following guidelines to ensure consistency and accuracy.

### Documentation Guidelines

1. **Canonical Lore Only**:
   - All contributions must be based on the official lore of **Elite Dangerous**. We accept only canonical information as established by the game developers, Frontier Developments.
   - Fan theories, non-canon content, and speculative material will not be accepted.

2. **References and Sources**:
   - Each piece of lore or information must be supported by references to official sources. Acceptable references include:
     - In-game content (missions, descriptions, etc.)
     - Official novels and publications
     - Frontier Developments' announcements, forums, and media
     - Elite Dangerous Codex and Galnet articles
   - Provide clear citations for any lore used. For example:
     ```markdown
     According to the [Elite Dangerous Codex](https://elite-dangerous.fandom.com/wiki/Codex), the Thargoids were first encountered in the year 3125.
     ```
   - If referencing specific game updates or patch notes, include the version and date.

3. **Contribution Process**:
   - Fork the repository and create a new branch for your work.
   - Ensure your content is well-structured and free of typographical errors.
   - Submit a pull request with a detailed description of your changes and the sources you have referenced.
   - Be prepared to engage in the review process, addressing any feedback and making necessary adjustments.

4. **Content Format**:
   - Use **org-roam** format for documentation.
   - **Headings**: Use the `*`, `**`, `***`, etc., hierarchy to structure your content clearly.
   - **Links**: Use org-mode links (`[[link][description]]`) to reference other notes and external resources.
   - **Properties**: Include properties and metadata relevant to your notes, such as `:ROAM_ALIASES:` for alternative titles and `:ROAM_TAGS:` for categorization.
   - **File Structure**: Organize your notes in a way that makes logical sense and facilitates easy navigation within the org-roam system.
   - **Graph Visualization**: Think about how your note will connect with others in the org-roam graph, ensuring it adds meaningful links and relationships.

### Example Submission in org-roam Format

```org
#+TITLE: The Empire
#+ROAM_ALIASES: Empire of Achenar, Imperial
#+ROAM_TAGS: faction, empire, elite-dangerous, lore
#+DATE: [2024-06-11 Tue]

* The Empire

The Empire, founded in 2292, is one of the three superpowers in the Elite Dangerous galaxy. Known for its aristocratic society and military strength, the Empire is a dominant force in galactic politics.

** Key Facts
- **Founded by**: Marlin Duval
- **Current Leader**: Emperor Arissa Lavigny-Duval
- **Capital**: Achenar
- **Notable Systems**: Cubeo, Cemiess

** Governance
The Empire is governed by an Emperor and a system of nobility. Loyalty and honor are central values, with a societal structure that rewards service to the state.

** Military
The Imperial Navy is a formidable force, instrumental in both defending the Empire's interests and in its expansionist policies.

*References*:
- [[https://elite-dangerous.fandom.com/wiki/Empire_(Major_Power)][Elite Dangerous Codex - The Empire]]
- [[https://elite-dangerous.fandom.com/wiki/Arissa_Lavigny-Duval][Elite Dangerous Codex - Arissa Lavigny-Duval]]
- [[https://community.elitedangerous.com/galnet][Galnet Articles on the Empire]]

For more detailed information, see the [[https://elite-dangerous.fandom.com/wiki/Empire_(Major_Power)][Empire entry on the Elite Dangerous Wiki]].
```
