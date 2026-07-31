import { useMemo, useState } from "react";
import "../styles/publications.css";

export type PublicationRecord = {
  id: string;
  title: string;
  authors: string[];
  year: number | "TBA";
  venue?: string;
  status: "published" | "forthcoming" | "preprint" | "working-paper";
  type?: "article" | "book" | "chapter" | "thesis" | "note";
  abstract: string;
  shortAbstract?: string;
  tags: string[];
  preview?: { src: string; alt: string; width: number; height: number };
  links: Record<string, string>;
  placeholder: boolean;
};

type Props = {
  publications: PublicationRecord[];
  authorMatches: string[];
};

const linkLabels: Record<string, string> = {
  pdf: "PDF",
  doi: "DOI",
  arxiv: "arXiv",
  code: "Code",
  slides: "Slides",
  journal: "Journal",
};

function Preview({ publication }: { publication: PublicationRecord }) {
  return (
    <div className="publication-preview-content">
      {publication.preview && (
        <img
          src={publication.preview.src}
          alt={publication.preview.alt}
          width={publication.preview.width}
          height={publication.preview.height}
        />
      )}
      <p className="publication-preview-status">
        {publication.year} · {publication.status.replace("-", " ")}
        {publication.venue ? ` · ${publication.venue}` : ""}
      </p>
      {publication.placeholder && (
        <p className="placeholder-label">Fictional sample record</p>
      )}
      <p>{publication.shortAbstract ?? publication.abstract}</p>
      <ul className="tag-list" aria-label="Publication tags">
        {publication.tags.map((tag) => (
          <li className="tag" key={tag}>
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PublicationExplorer({
  publications,
  authorMatches,
}: Props) {
  const [type, setType] = useState("all");
  const [tag, setTag] = useState("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(publications[0]?.id ?? "");
  const [expandedId, setExpandedId] = useState("");

  const tags = useMemo(
    () =>
      [
        ...new Set(publications.flatMap((publication) => publication.tags)),
      ].sort(),
    [publications],
  );
  const types = useMemo(
    () =>
      [
        ...new Set(
          publications.map((publication) => publication.type ?? "other"),
        ),
      ].sort(),
    [publications],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return publications.filter((publication) => {
      const matchesType =
        type === "all" || (publication.type ?? "other") === type;
      const matchesTag = tag === "all" || publication.tags.includes(tag);
      const haystack = [
        publication.title,
        publication.abstract,
        publication.venue,
        ...publication.authors,
        ...publication.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return (
        matchesType && matchesTag && (!needle || haystack.includes(needle))
      );
    });
  }, [publications, query, tag, type]);
  const active =
    filtered.find((publication) => publication.id === activeId) ?? filtered[0];

  const resetFilters = () => {
    setType("all");
    setTag("all");
    setQuery("");
  };

  return (
    <section aria-labelledby="publication-list-heading">
      <h2 className="sr-only" id="publication-list-heading">
        Publication list
      </h2>
      <div
        className="publication-filters quiet-card"
        aria-label="Filter publications"
      >
        <label>
          <span>Keywords</span>
          <input
            type="search"
            value={query}
            placeholder="Title, author, or subject"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span>Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="all">All types</option>
            {types.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Tag</span>
          <select value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="all">All tags</option>
            {tags.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="button" onClick={resetFilters}>
          Clear
        </button>
      </div>

      <p className="publication-count" role="status">
        Showing {filtered.length} of {publications.length} publications, newest
        first.
      </p>

      <div className="publication-layout">
        <ol className="publication-list">
          {filtered.map((publication) => {
            const expanded = expandedId === publication.id;
            return (
              <li key={publication.id}>
                <article
                  className="publication-item"
                  tabIndex={0}
                  data-publication-item={publication.id}
                  aria-describedby={`${publication.id}-accessible-summary`}
                  onPointerEnter={() => setActiveId(publication.id)}
                  onFocus={() => setActiveId(publication.id)}
                >
                  <p className="publication-year">{publication.year}</p>
                  <div>
                    {publication.placeholder && (
                      <p className="placeholder-label">Fictional sample</p>
                    )}
                    <h3>{publication.title}</h3>
                    <p className="publication-authors">
                      {publication.authors.map((author, index) => (
                        <span key={author}>
                          {index > 0 && ", "}
                          {authorMatches.includes(author) ? (
                            <strong>{author}</strong>
                          ) : (
                            author
                          )}
                        </span>
                      ))}
                    </p>
                    <p className="publication-venue">
                      {publication.venue ??
                        publication.status.replace("-", " ")}
                    </p>
                    {Object.keys(publication.links).length > 0 && (
                      <ul
                        className="publication-links"
                        aria-label={`Links for ${publication.title}`}
                      >
                        {Object.entries(publication.links).map(
                          ([kind, href]) => (
                            <li key={kind}>
                              <a href={href}>{linkLabels[kind] ?? kind}</a>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                    <button
                      className="publication-expand"
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`${publication.id}-inline-preview`}
                      onClick={() =>
                        setExpandedId(expanded ? "" : publication.id)
                      }
                    >
                      {expanded ? "Hide preview" : "Show preview"}
                    </button>
                    <div
                      id={`${publication.id}-accessible-summary`}
                      className="sr-only"
                    >
                      {publication.abstract} Status: {publication.status}. Tags:{" "}
                      {publication.tags.join(", ")}.
                    </div>
                    <div
                      id={`${publication.id}-inline-preview`}
                      className="publication-inline-preview"
                      hidden={!expanded}
                    >
                      <Preview publication={publication} />
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>

        <aside className="publication-preview quiet-card" aria-live="polite">
          {active ? (
            <>
              <p className="eyebrow">Preview</p>
              <h3>{active.title}</h3>
              <Preview publication={active} />
            </>
          ) : (
            <p>No publication matches the current filters.</p>
          )}
        </aside>
      </div>
      {filtered.length === 0 && (
        <div className="empty-state">
          <p>No publication matches the current filters.</p>
          <button className="button" type="button" onClick={resetFilters}>
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
