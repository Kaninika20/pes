
class FlowNetwork {
  adj: Record<string, string[]> = {};
  capacity: Record<string, Record<string, number>> = {};

  addEdge(u: string, v: string, cap: number) {
    if (!this.adj[u]) this.adj[u] = [];
    if (!this.adj[v]) this.adj[v] = [];
    this.adj[u].push(v);
    this.adj[v].push(u);
    if (!this.capacity[u]) this.capacity[u] = {};
    if (!this.capacity[v]) this.capacity[v] = {};
    this.capacity[u][v] = cap;
    this.capacity[v][u] = 0;
  }

  bfs(s: string, t: string, parent: Record<string, string>): boolean {
    const visited = new Set<string>();
    const queue: string[] = [s];
    visited.add(s);
    while (queue.length) {
      const u = queue.shift()!;
      for (const v of this.adj[u]) {
        if (!visited.has(v) && this.capacity[u][v] > 0) {
          visited.add(v);
          parent[v] = u;
          if (v === t) return true;
          queue.push(v);
        }
      }
    }
    return false;
  }

  maxFlow(s: string, t: string): [number, [string, string][]] {
    const parent: Record<string, string> = {};
    let flow = 0;
    const assignments: [string, string][] = [];

    while (this.bfs(s, t, parent)) {
      let pathFlow = Infinity;
      let v = t;
      while (v !== s) {
        const u = parent[v];
        pathFlow = Math.min(pathFlow, this.capacity[u][v]);
        v = u;
      }

      v = t;
      while (v !== s) {
        const u = parent[v];
        this.capacity[u][v] -= pathFlow;
        this.capacity[v][u] += pathFlow;
        v = u;
      }

      flow += pathFlow;
    }

    for (const u in this.adj) {
      for (const v of this.adj[u]) {
        if (u.startsWith("E_") && v.startsWith("R_") && this.capacity[v][u] === 1) {
          assignments.push([u.slice(2), v.slice(2)]);
        }
      }
    }

    return [flow, assignments];
  }
}

export function assignEvaluationsFlow(
  studentIds: string[],
  k: number
): [boolean, [string, string][]] {
  const n = studentIds.length;
  const source = "SRC";
  const sink = "SNK";
  const G = new FlowNetwork();

  for (const sid of studentIds) {
    G.addEdge(source, `E_${sid}`, k);
    G.addEdge(`R_${sid}`, sink, k);
  }

  for (const u of studentIds) {
    for (const v of studentIds) {
      if (u !== v) {
        G.addEdge(`E_${u}`, `R_${v}`, 1);
      }
    }
  }

  const [flow, pairs] = G.maxFlow(source, sink);
  const success = flow === n * k;
  return [success, pairs];
}
