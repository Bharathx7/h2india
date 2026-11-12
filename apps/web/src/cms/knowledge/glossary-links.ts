// Automatic glossary links (step 4.4): the first mention of each glossary term in an article's body becomes a
// "glossaryTerm" node, which ArticleBody renders with the hover-card (424:7500). Pure, so it runs on the server
// for every article page and is tested on its own. Headings, links and code are left alone.

export interface LinkableTerm {
  term: string;
  slug: string;
  expansion?: string | null;
  short: string;
  /** The term and its aliases. */
  match: string[];
}

export interface GlossaryNode {
  type: "glossaryTerm";
  version: 1;
  text: string;
  format: number;
  term: string;
  slug: string;
  definition: string;
}

interface Node {
  type: string;
  text?: string;
  format?: number | string;
  children?: Node[];
  [key: string]: unknown;
}

const CODE = 16;
const SKIP = new Set(["heading", "link", "autolink", "code", "block", "inlineBlock", "upload", "relationship"]);

/** "Request for Selection: the tender document…", as on the card. */
export function definitionOf(t: Pick<LinkableTerm, "expansion" | "short">): string {
  return t.expansion ? `${t.expansion}: ${t.short}` : t.short;
}

/** Acronyms and names (RfS, PEM, SIGHT) match exactly; ordinary words match in any case. */
const exactCase = (word: string) => word.slice(1) !== word.slice(1).toLowerCase();

function escape(word: string) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface Matcher {
  regex: RegExp;
  find: (found: string) => LinkableTerm | undefined;
}

function matcher(terms: LinkableTerm[]): Matcher | null {
  const exact = new Map<string, LinkableTerm>();
  const loose = new Map<string, LinkableTerm>();
  for (const t of terms) {
    for (const w of t.match) {
      const word = w.trim();
      if (word.length < 2) continue;
      if (exactCase(word)) exact.set(word, t);
      else if (!loose.has(word.toLowerCase())) loose.set(word.toLowerCase(), t);
    }
  }
  const words = [...exact.keys(), ...loose.keys()].sort((a, b) => b.length - a.length);
  if (words.length === 0) return null;
  return {
    regex: new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.map(escape).join("|")})(?![\\p{L}\\p{N}])`, "giu"),
    find: (found) => exact.get(found) ?? loose.get(found.toLowerCase()),
  };
}

/** Returns a copy of the editor state with first mentions linked. The input is not changed. */
export function linkGlossary<T>(state: T, terms: LinkableTerm[]): T {
  const m = matcher(terms);
  if (!m || !state || typeof state !== "object") return state;
  const used = new Set<string>();

  const splitText = (node: Node): Node[] => {
    const text = node.text ?? "";
    const format = typeof node.format === "number" ? node.format : 0;
    if (!text || format & CODE) return [node];
    const out: Node[] = [];
    let last = 0;
    m.regex.lastIndex = 0;
    for (let hit = m.regex.exec(text); hit; hit = m.regex.exec(text)) {
      const term = m.find(hit[0]);
      if (!term || used.has(term.slug)) continue;
      used.add(term.slug);
      if (hit.index > last) out.push({ ...node, text: text.slice(last, hit.index) });
      const linked: GlossaryNode = {
        type: "glossaryTerm",
        version: 1,
        text: hit[0],
        format,
        term: term.term,
        slug: term.slug,
        definition: definitionOf(term),
      };
      out.push(linked as unknown as Node);
      last = hit.index + hit[0].length;
    }
    if (out.length === 0) return [node];
    if (last < text.length) out.push({ ...node, text: text.slice(last) });
    return out;
  };

  const walk = (node: Node): Node => {
    if (!node.children || SKIP.has(node.type)) return node;
    const children: Node[] = [];
    for (const child of node.children) {
      if (child.type === "text") children.push(...splitText(child));
      else children.push(walk(child));
    }
    return { ...node, children };
  };

  const root = (state as { root?: Node }).root;
  if (!root) return state;
  return { ...state, root: walk(root) };
}
