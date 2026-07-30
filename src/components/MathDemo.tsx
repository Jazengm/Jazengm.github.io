import { useId, useState } from "react";

export default function MathDemo() {
  const [steps, setSteps] = useState(6);
  const id = useId();
  const sequence = Array.from({ length: steps }, (_, index) => 1 / 2 ** index);

  return (
    <section className="math-demo quiet-card" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Interactive parameter sample</h2>
      <label htmlFor={`${id}-steps`}>Number of terms: {steps}</label>
      <input
        id={`${id}-steps`}
        type="range"
        min="2"
        max="12"
        value={steps}
        onChange={(event) => setSteps(Number(event.target.value))}
      />
      <div
        className="math-demo-bars"
        aria-label={`First ${steps} powers of one half`}
      >
        {sequence.map((value, index) => (
          <span
            key={index}
            title={`2^-${index} = ${value}`}
            style={{ height: `${Math.max(8, value * 100)}%` }}
          />
        ))}
      </div>
      <p>
        Partial sum:{" "}
        <output>
          {sequence.reduce((sum, value) => sum + value, 0).toFixed(5)}
        </output>
      </p>
    </section>
  );
}
