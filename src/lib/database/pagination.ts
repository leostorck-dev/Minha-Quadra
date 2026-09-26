// Keyset pages avoid the API row cap and oversized lists of IDs in URLs.
export async function collectById<T extends { id: string }>(
  read: (
    after: string | null,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
  message: string,
): Promise<T[]> {
  const rows: T[] = [];
  let after: string | null = null;
  for (;;) {
    const result = await read(after);
    if (result.error || !result.data) throw new Error(message);
    if (!result.data.length) return rows;
    const next = result.data.at(-1)!.id;
    if (after !== null && next <= after) throw new Error(message);
    rows.push(...result.data);
    after = next;
  }
}
