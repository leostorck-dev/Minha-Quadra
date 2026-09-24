import { Temporal } from "@js-temporal/polyfill";

export function overlaps(
  existingStart: string,
  existingEnd: string,
  nextStart: string,
  nextEnd: string,
) {
  return (
    Temporal.Instant.compare(
      Temporal.Instant.from(existingStart),
      Temporal.Instant.from(nextEnd),
    ) < 0 &&
    Temporal.Instant.compare(
      Temporal.Instant.from(existingEnd),
      Temporal.Instant.from(nextStart),
    ) > 0
  );
}
