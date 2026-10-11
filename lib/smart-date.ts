import { parseDate } from "chrono-node";
import { isValid, parseISO } from "date-fns";
export function spokenDeadline(raw: string, reference: Date): Date | null {
  if (!raw.trim() || /^(Not specified|Unassigned)$/i.test(raw.trim()))
    return null;
  const iso = parseISO(raw);
  if (isValid(iso)) return iso;
  const result = parseDate(raw.replace(/^by\s+/i, ""), reference, {
    forwardDate: true,
  });
  return result && isValid(result) ? result : null;
}
