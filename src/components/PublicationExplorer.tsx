import { useState } from "react";
import type { CollectionEntry } from "astro:content";
import "../styles/publications.css";

type PublicationData = CollectionEntry<"publications">["data"];

export type PublicationRecord = Omit<
  PublicationData,
  "previewImage" | "previewImageAlt" | "links"
> & {
  id: string;
  preview?: { src: string; alt: string; width: number; height: number };
  links: Record<string, string>;
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
      <p>{publication.abstract}</p>
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
  const [activeId, setActiveId] = useState(publications[0]?.id ?? "");
  const [expandedId, setExpandedId] = useState("");
  const active =
    publications.find((publication) => publication.id === activeId) ??
    publications[0];

  return (
    <section aria-labelledby="publication-list-heading">
      <h2 className="sr-only" id="publication-list-heading">
        Article list
      </h2>
      <p className="publication-count">
        {publications.length} articles, newest first.
      </p>

      <div className="publication-layout">
        <ol className="publication-list">
          {publications.map((publication) => {
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
            <p>No publications available.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
