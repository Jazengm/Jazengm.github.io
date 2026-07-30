import { useState } from "react";

export type ResearchMapNode = {
  label: string;
  href: string;
  description: string;
  x: number;
  y: number;
};

type Props = {
  nodes: ResearchMapNode[];
};

export default function ResearchMap({ nodes }: Props) {
  const [active, setActive] = useState(nodes[0]?.label ?? "");
  const activeNode = nodes.find((node) => node.label === active) ?? nodes[0];

  return (
    <section className="research-map" aria-labelledby="research-map-title">
      <div className="research-map-copy">
        <p className="eyebrow">Explore</p>
        <h2 className="section-heading" id="research-map-title">
          A small atlas of the site
        </h2>
        <p id="research-map-detail" aria-live="polite">
          {activeNode?.description}
        </p>
      </div>
      <svg
        className="research-map-graphic"
        viewBox="0 0 720 310"
        role="img"
        aria-label="Connected paths to the main sections of the site"
      >
        <g className="research-map-lines" aria-hidden="true">
          {nodes.slice(1).map((node) => (
            <line
              key={`${nodes[0]?.label}-${node.label}`}
              x1={nodes[0]?.x}
              y1={nodes[0]?.y}
              x2={node.x}
              y2={node.y}
            />
          ))}
        </g>
        {nodes.map((node, index) => {
          const selected = node.label === active;
          return (
            <a
              key={node.label}
              href={node.href}
              data-map-node={node.label}
              className={selected ? "is-active" : undefined}
              aria-describedby="research-map-detail"
              onPointerEnter={() => setActive(node.label)}
              onFocus={() => setActive(node.label)}
              onClick={() => setActive(node.label)}
            >
              <circle cx={node.x} cy={node.y} r={index === 0 ? 23 : 18} />
              <text
                x={node.x}
                y={node.y + (index % 2 === 0 ? -31 : 36)}
                textAnchor="middle"
              >
                {node.label}
              </text>
            </a>
          );
        })}
      </svg>
      <ul
        className="research-map-links"
        aria-label="Site atlas text equivalent"
      >
        {nodes.map((node) => (
          <li key={node.label}>
            <a href={node.href} onFocus={() => setActive(node.label)}>
              <strong>{node.label}</strong>
              <span>{node.description}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
