import { fuzzyMatch } from "../utils/helpers";

export default function HighlightedName({ name, query, accentColor }) {
  if (!query) return <span>{name}</span>;

  const q = query.toLowerCase(),
    lower = name.toLowerCase(),
    subIdx = lower.indexOf(q);

  if (subIdx !== -1)
    return (
      <span>
        {name.slice(0, subIdx)}
        <span style={{ color: accentColor, fontWeight: 700 }}>
          {name.slice(subIdx, subIdx + q.length)}
        </span>
        {name.slice(subIdx + q.length)}
      </span>
    );

  const { indices } = fuzzyMatch(query, name);
  const s = new Set(indices);

  return (
    <span>
      {name.split("").map((ch, i) =>
        s.has(i) ? (
          <span key={i} style={{ color: accentColor, fontWeight: 700 }}>
            {ch}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        )
      )}
    </span>
  );
}
