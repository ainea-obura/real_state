// Helper function to format money
export const money = (x: number | undefined) => {
  if (!x) return "—";
  return `KES ${x.toLocaleString()}`;
};

// Helper function to format percentage
export const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};
