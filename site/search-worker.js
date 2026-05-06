function normalize(text) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenStartsWith(tokens, term) {
  return tokens.some((token) => token.startsWith(term));
}

let docs = [];

function findExcerpt(text, terms) {
  const plainText = String(text || "").replace(/\s+/g, " ").trim();
  if (!plainText) {
    return "";
  }
  const lowerText = plainText.toLowerCase();
  const firstTerm = terms.find((term) => term && lowerText.includes(term));
  const matchIndex = firstTerm ? lowerText.indexOf(firstTerm) : 0;
  const start = Math.max(0, matchIndex - 70);
  const end = Math.min(plainText.length, matchIndex + 170);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < plainText.length ? "..." : "";
  return `${prefix}${plainText.slice(start, end).trim()}${suffix}`;
}

function scoreDoc(doc, terms, rawQuery, mode) {
  let score = 0;
  let hasMatch = false;
  let matchType = "";
  const titleTokens = doc.titleNorm.split(" ");
  const aliasTokens = doc.aliasNorms.flatMap((alias) => alias.split(" "));
  const tagTokens = doc.tagNorms;
  const contentNorm = doc.contentNorm || doc.snippetNorm || "";

  if (doc.titleNorm === rawQuery) {
    score += 140;
    hasMatch = true;
    matchType = "title";
  }
  if (doc.aliasNorms.includes(rawQuery)) {
    score += 110;
    hasMatch = true;
    matchType = matchType || "alias";
  }
  if (doc.titleNorm.startsWith(rawQuery)) {
    score += 85;
    hasMatch = true;
    matchType = matchType || "title";
  }

  let contentHits = 0;
  for (const term of terms) {
    if (!term) continue;
    if (tokenStartsWith(titleTokens, term)) {
      score += 40;
      hasMatch = true;
      matchType = matchType || "title";
    } else if (doc.titleNorm.includes(term)) {
      score += 24;
      hasMatch = true;
      matchType = matchType || "title";
    }

    if (aliasTokens.some((token) => token.startsWith(term))) {
      score += 32;
      hasMatch = true;
      matchType = matchType || "alias";
    } else if (doc.aliasNorms.some((alias) => alias.includes(term))) {
      score += 18;
      hasMatch = true;
      matchType = matchType || "alias";
    }

    if (tagTokens.some((tag) => tag === term)) {
      score += 22;
      hasMatch = true;
      matchType = matchType || "tag";
    } else if (tagTokens.some((tag) => tag.startsWith(term))) {
      score += 12;
      hasMatch = true;
      matchType = matchType || "tag";
    }

    if (mode === "content" && contentNorm.includes(term)) {
      contentHits += 1;
      score += 10;
      hasMatch = true;
      if (!matchType || matchType === "tag") {
        matchType = "content";
      }
    }
  }

  if (terms.length > 1 && terms.every((term) => doc.titleNorm.includes(term))) {
    score += 30;
    hasMatch = true;
  }
  if (mode === "content" && terms.length > 1 && contentHits === terms.length) {
    score += 28;
    hasMatch = true;
  }

  if (!hasMatch) {
    return {
      score: 0,
      matchType: "",
      excerpt: "",
    };
  }

  score += Math.min(doc.degree || 0, 30) * 0.4;
  return {
    score,
    matchType,
    excerpt: mode === "content" && contentHits > 0 ? findExcerpt(doc.content || doc.snippet || "", terms) : "",
  };
}

function search(query, mode = "title") {
  const rawQuery = normalize(query);
  if (!rawQuery) {
    return { results: [], suggestion: null, exactIds: [], query, mode };
  }

  const terms = rawQuery.split(" ");
  const results = [];
  const exactIds = [];

  for (const doc of docs) {
    const { score, matchType, excerpt } = scoreDoc(doc, terms, rawQuery, mode);
    if (score > 0) {
      results.push({ doc, score, matchType, excerpt });
    }
    if (doc.titleNorm === rawQuery || doc.aliasNorms.includes(rawQuery)) {
      exactIds.push(doc.id);
    }
  }

  results.sort((left, right) => (
    right.score - left.score
    || right.doc.degree - left.doc.degree
    || left.doc.title.localeCompare(right.doc.title)
  ));
  const suggestion = (
    results.find(({ doc }) => doc.titleNorm.startsWith(rawQuery) || doc.aliasNorms.some((alias) => alias.startsWith(rawQuery)))
    || results[0]
    || null
  );
  return {
    results: results.map(({ doc, score, matchType, excerpt }) => ({
      id: doc.id,
      title: doc.title,
      group: doc.group,
      degree: doc.degree,
      score,
      matchType,
      excerpt,
    })),
    suggestion: suggestion ? { id: suggestion.doc.id, title: suggestion.doc.title } : null,
    exactIds,
    query,
    mode,
  };
}

self.onmessage = (event) => {
  const { type, payload } = event.data;
  if (type === "init") {
    docs = payload.docs || [];
    self.postMessage({ type: "ready" });
    return;
  }

  if (type === "query") {
    self.postMessage({ type: "results", payload: search(payload.query || "", payload.mode || "title") });
  }
};
