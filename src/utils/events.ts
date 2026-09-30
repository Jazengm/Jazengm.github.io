/** ISO calendar dates compare without timezone conversion. Ongoing events stay current. */
export function partitionEvents<
  T extends { id: string; data: { start: string; end: string } },
>(events: T[], asOf: string) {
  const chronological = [...events].sort(
    (a, b) =>
      a.data.start.localeCompare(b.data.start) || a.id.localeCompare(b.id),
  );
  return {
    current: chronological.filter(({ data }) => data.end >= asOf),
    past: chronological.filter(({ data }) => data.end < asOf).reverse(),
  };
}
