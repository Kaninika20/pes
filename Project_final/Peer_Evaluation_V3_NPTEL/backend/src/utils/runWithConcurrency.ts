export async function runWithConcurrency<T>(
  limit: number,
  tasks: (() => Promise<T>)[]
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = (async () => {
      const res = await task();
      results.push(res);
    })();

    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
