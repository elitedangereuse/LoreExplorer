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

function scoreDoc(doc, terms, rawQuery) {
  let score = 0;
  const titleTokens = doc.titleNorm.split(" ");
  const aliasTokens = doc.aliasNorms.flatMap((alias) => alias.split(" "));
  const tagTokens = doc.tagNorms;

  if (doc.titleNorm === rawQuery) score += 140;
  if (doc.aliasNorms.includes(rawQuery)) score += 110;
  if (doc.titleNorm.startsWith(rawQuery)) score += 85;

  for (const term of terms) {
    if (!term) continue;
    if (tokenStartsWith(titleTokens, term)) score += 40;
    else if (doc.titleNorm.includes(term)) score += 24;

    if (aliasTokens.some((token) => token.startsWith(term))) score += 32;
    else if (doc.aliasNorms.some((alias) => alias.includes(term))) score += 18;

    if (tagTokens.some((tag) => tag === term)) score += 22;
    else if (tagTokens.some((tag) => tag.startsWith(term))) score += 12;

    if (doc.snippetNorm.includes(term)) score += 5;
  }

  if (terms.length > 1 && terms.every((term) => doc.titleNorm.includes(term))) {
    score += 30;
  }

  score += Math.min(doc.degree || 0, 30) * 0.4;
  return score;
}

function search(query) {
  const rawQuery = normalize(query);
  if (!rawQuery) {
    return { results: [], suggestion: null, exactIds: [] };
  }

  const terms = rawQuery.split(" ");
  const results = [];
  const exactIds = [];

  for (const doc of docs) {
    const score = scoreDoc(doc, terms, rawQuery);
    if (score > 0) {
      results.push({ ...doc, score });
    }
    if (doc.titleNorm === rawQuery || doc.aliasNorms.includes(rawQuery)) {
      exactIds.push(doc.id);
    }
  }

  results.sort((left, right) => right.score - left.score || right.degree - left.degree || left.title.localeCompare(right.title));
  const suggestion = results.find((doc) => doc.titleNorm.startsWith(rawQuery) || doc.aliasNorms.some((alias) => alias.startsWith(rawQuery))) || results[0] || null;
  return {
    results,
    suggestion: suggestion ? { id: suggestion.id, title: suggestion.title } : null,
    exactIds,
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
    self.postMessage({ type: "results", payload: search(payload.query || "") });
  }
};
