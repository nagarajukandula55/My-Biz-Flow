/** Runs async work with a bounded number of in-flight tasks. */
export async function runWithConcurrency<T, R>(items: T[], worker: (item: T) => Promise<R>, concurrency = 5): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function consume() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, consume));
  return results;
}
