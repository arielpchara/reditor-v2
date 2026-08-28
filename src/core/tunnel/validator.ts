export const isValidPort = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= 65535;

export const isValidTarget = (target: string): boolean => {
  const trimmed = target.trim();
  return trimmed.length > 0 && !trimmed.startsWith('-');
};
