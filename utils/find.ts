import type { Entry } from "./models.svelte";

export namespace Find {
  export type Query = { path: string } | { name: string };
  export type Result<T extends Query> = T extends { path: string }
    ? Entry | undefined
    : Entry[];
  export type SearchPriority = "depth" | "pseudo breadth";
}

export const byPath = (
  path: string,
  collection: Entry[],
  priority: Find.SearchPriority = "pseudo breadth"
): Entry | undefined => {
  let folders: Entry<"folder">[] | undefined = undefined;
  for (const node of collection) {
    if (node.path === path) return node;
    if (priority === "depth" && node.is("folder")) {
      const found = byPath(path, node.children, priority);
      if (found) return found;
    } else if (node.is("folder")) {
      folders ??= [];
      folders.push(node);
    }
  }
  if (priority === "pseudo breadth" && folders) {
    for (const folder of folders) {
      const found = byPath(path, folder.children, priority);
      if (found) return found;
    }
  }
  return undefined;
};

export const byName = (
  name: string,
  collection: Entry[],
  accumulator?: Entry[]
): Entry[] => {
  accumulator ??= [];
  for (const node of collection) {
    if (node.name === name) accumulator.push(node);
    if (node.is("folder")) byName(name, node.children, accumulator);
  }
  return accumulator;
};
