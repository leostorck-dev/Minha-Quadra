export async function saveAndRefresh(
  save: () => Promise<unknown>,
  refresh: () => Promise<unknown>,
) {
  await save();
  try {
    await refresh();
    return { refreshed: true };
  } catch {
    // A failed read must not turn a confirmed payment into a failed payment.
    return { refreshed: false };
  }
}
