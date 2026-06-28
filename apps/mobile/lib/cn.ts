type ClassValue = string | number | boolean | undefined | null | ClassValue[] | { [k: string]: unknown };

function flatten(input: ClassValue): string[] {
  if (!input) return [];
  if (typeof input === 'string') return [input];
  if (typeof input === 'number') return [String(input)];
  if (Array.isArray(input)) return input.flatMap(flatten);
  if (typeof input === 'object') {
    return Object.keys(input).filter((k) => Boolean((input as Record<string, unknown>)[k]));
  }
  return [];
}

export function cn(...inputs: ClassValue[]): string {
  return inputs.flatMap(flatten).join(' ').trim();
}
