import { type IWithEvents, WithEvents } from "../with-events-suede";
import { mixin } from "../mixin-suede";
import { renderable } from "../snippet-renderer-suede";
import { type Find, byName, byPath } from "./utils/find";
import type { Snippet } from "svelte";
import { fileIcon, symlinkIcon } from "./File.svelte";
import { folderOpen, folderClosed } from "./Folder.svelte";
import type { Items } from "./context";

export type FileType = "file" | "symlink";
export type Type = FileType | "folder" | "root";

export type ItemType = Exclude<Type, "root">;
type ParentType = Exclude<Type, FileType>;

export namespace Events {
  export type Item = {
    clicked: [Entry];
    "request rename": [config: { cursor?: number; force?: string } | undefined];
    "request focus toggle": [];
    renamed: [Entry];
    reparented: [Entry];
  };

  export type Parent = {
    "child clicked": [entry: Entry, index: number];
    "child renamed": [entry: Entry, index: number];
    "request open": [depth: "recursive" | "local"];
    "request close": [depth: "recursive" | "local"];
    "request expansion toggle": [depth: "recursive" | "local"];
  };

  export type WithItemEvents = IWithEvents<Item>;
}

export type Entry<T extends Type = ItemType> = {
  type: T;
} & (T extends "root"
  ? Parent &
      IWithEvents<Events.Parent> & {
        /** Root-specific properties */
        name?: undefined;
        path?: undefined;
      }
  : {
      name: string;
      path: string;
      parent: Entry<ParentType>;
      readonly: boolean;
      remove(): void;
      getContextMenuItems?: (self: Entry<T>) => Items;
      is<Target extends Entry<T>, T extends Type = Target["type"]>(
        query: T
      ): this is Target;
    } & (T extends "folder"
      ? Parent &
          IWithEvents<Events.Parent & Events.Item> & {
            /** Folder-specific properties */
            icon: {
              closed: renderable.Returns<"single", "optional">;
              open: renderable.Returns<"single", "optional">;
            };
          }
      : IWithEvents<Events.Item> & {
          /** File-like-specific properties */
          icon: renderable.Returns<"single", "optional">;
        }));

const is = <T extends Type>(
  entry: Pick<Entry, "type">,
  query: T
): this is Entry<T> => entry.type === query;

type Parent = {
  children: Entry[];
  isNameUnique: (name: string) => boolean;
  getUniqueName: (candidate: string) => string;
  walk: (fn: (node: Parent["children"][number]) => void) => void;
  find: <T extends Find.Query>(query: T) => Find.Result<T>;
  sort(): void;
  propagate(parent: IWithEvents<Events.Parent>): () => void;
  add<const T extends Entry<ItemType> | Entry<ItemType>[]>(
    item: T,
    index?: number
  ): T;
};

type WithoutEvents<T> = Omit<T, keyof IWithEvents<any>>;

type ParentConstructorArgs = Partial<
  Pick<ParentBase, "validNameContent" | "getNameVariant">
>;

namespace Defaults {
  type Parent = Pick<ParentConstructorArgs, "getNameVariant">;
  type Item = Pick<
    ItemConstructor.Args<ItemType>,
    "defaultNameForType" | "defaultFileIcon" | "defaultFolderIcon"
  >;
  export type All = Required<Parent & Item>;
}

const defaults: Defaults.All = {
  getNameVariant: (current: string, attempt: number) => {
    const dot = current.lastIndexOf(".");
    const id = `(${attempt + 1})`;
    return dot === -1
      ? current + id
      : current.slice(0, dot) + id + current.slice(dot);
  },
  defaultNameForType: (type: ItemType) => type,
  defaultFileIcon: (type: "file" | "symlink") => {
    switch (type) {
      case "file":
        return fileIcon;
      case "symlink":
        return symlinkIcon;
    }
  },
  defaultFolderIcon: (state: "open" | "closed") => {
    switch (state) {
      case "open":
        return folderOpen;
      case "closed":
        return folderClosed;
    }
  },
};

const attach = {
  type: <T extends Type>(type: T, target: any): target is { type: T } =>
    Boolean((target.type = type as T)),
};

class ParentBase implements WithoutEvents<Parent> {
  children = $state(new Array<Entry>());

  readonly validNameContent?: (candidate: string) => true | string;
  readonly getNameVariant?: (current: string, attempt: number) => string;

  constructor({
    validNameContent,
    getNameVariant,
  }: ParentConstructorArgs = {}) {
    this.validNameContent = validNameContent;
    this.getNameVariant = getNameVariant;
  }

  isNameUnique(name: string) {
    return !this.children.some((child) => child.name === name);
  }

  getUniqueName(candidate: string) {
    let counter = 0;
    while (true) {
      const result = this.validNameContent?.(candidate);
      if (typeof result === "string") candidate = result;
      if (this.isNameUnique(candidate)) return candidate;
      candidate =
        this.getNameVariant?.(candidate, counter) ??
        defaults.getNameVariant(candidate, counter);
      counter++;
    }
  }

  walk(fn: (node: Entry) => void) {
    for (const child of this.children) {
      fn(child);
      if (child.is("folder")) child.walk(fn);
    }
  }

  find<T extends Find.Query>(query: T) {
    return (
      "path" in query
        ? byPath(query.path, this.children)
        : byName(query.name, this.children)
    ) as Find.Result<T>;
  }

  sort() {
    this.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  propagate(parent: IWithEvents<Events.Parent>) {
    return WithEvents.Collect(
      this.children as any as WithEvents<Events.Item & Events.Parent>[]
    ).subscribe({
      clicked: (child, _, index) => parent.fire("child clicked", child, index),
      renamed: (child, _, index) => parent.fire("child renamed", child, index),
      "child clicked": (child, index) =>
        parent.fire("child clicked", child, index),
      "child renamed": (child, index) =>
        parent.fire("child renamed", child, index),
    });
  }

  add<const T extends Entry<ItemType> | Entry<ItemType>[]>(
    item: T,
    index?: number
  ): T {
    if (index === undefined)
      Array.isArray(item)
        ? this.children.push(...item)
        : this.children.push(item);
    else
      Array.isArray(item)
        ? this.children.splice(index, 0, ...item)
        : this.children.splice(index, 0, item);
    return item;
  }
}

namespace ItemConstructor {
  type RequiredFromEntry<T extends ItemType> = Required<
    Pick<Entry<T>, "type" | "parent">
  >;

  type PartialFromEntry<T extends ItemType> = Partial<
    Pick<Entry<T>, "name" | "parent" | "readonly" | "getContextMenuItems">
  >;

  type Factories = Partial<{
    defaultNameForType: (type: ItemType) => string;
    defaultFileIcon(type: FileType): string | Snippet<[]>;
    defaultFolderIcon(state: "open" | "closed"): string | Snippet<[]>;
  }>;

  type Renderables<T extends ItemType> = Partial<
    Exclude<
      T extends "folder"
        ? renderable.Initial<Entry<"folder">["icon"]>
        : renderable.Initial<Pick<Entry<Exclude<ItemType, "folder">>, "icon">>,
      undefined
    >
  >;

  export type Args<T extends ItemType> = RequiredFromEntry<T> &
    PartialFromEntry<T> &
    Factories &
    Renderables<T>;
}

class ItemBase<T extends ItemType> implements WithoutEvents<Entry> {
  name: string;
  parent: Entry<ParentType>;
  readonly icon: Entry<T>["icon"];
  readonly type: T;
  readonly path: string;
  readonly readonly: boolean;
  readonly getContextMenuItems?: Entry<T>["getContextMenuItems"];

  constructor({
    type,
    name,
    parent,
    readonly,
    renderables,
    defaultFileIcon,
    defaultFolderIcon,
    defaultNameForType,
    getContextMenuItems,
  }: ItemConstructor.Args<T>) {
    this.type = type;
    this.readonly = readonly ?? false;
    this.getContextMenuItems = getContextMenuItems;
    this.parent = $state(parent);
    this.name = $state(
      name ??
        this.parent.getUniqueName(
          defaultNameForType?.(type) ?? defaults.defaultNameForType(type)
        )
    );
    this.path = $derived(`${this.parent.path ?? ""}/${this.name}`);

    if (this.is("folder")) {
      this.icon = { open: renderable("single"), closed: renderable("single") };
      if (renderables)
        renderable.init(this.icon, { renderables } as renderable.Initial<
          Entry<"folder">["icon"]
        >);
      else {
        const getIcon = defaultFolderIcon ?? defaults.defaultFolderIcon;
        this.icon.open.set((r) => r(getIcon("open") as Snippet<[]>));
        this.icon.closed.set((r) => r(getIcon("closed") as Snippet<[]>));
      }
    } else {
      this.icon = renderable("single");
      if (renderables) {
        type FileRenderables = Pick<Entry<FileType>, "icon">;
        renderable.init(
          this as FileRenderables,
          { renderables } as renderable.Initial<FileRenderables>
        );
      } else {
        const getIcon = defaultFileIcon ?? defaults.defaultFileIcon;
        this.icon.set((r) => r(getIcon(type as FileType) as Snippet<[]>));
      }
    }
  }

  is<Target extends Entry<T>, T extends Type = Target["type"]>(
    query: T
  ): this is Target {
    return is(this, query);
  }

  remove(): void {
    const { children } = this.parent;
    const self = this as any as Entry;
    children.splice(children.indexOf(self), 1);
  }

  interface() {
    return this as any as Entry<T>;
  }
}

namespace Serialized {
  type File = string;
  type Folder = [name: string, children: Entry[]];
  export type Entry = File | Folder;
}

export class Root
  extends mixin([ParentBase, WithEvents<Events.Parent>])
  implements Entry<"root">
{
  readonly type = "root";

  constructor(args?: ParentConstructorArgs) {
    super([args]);
  }

  static From(...entries: Serialized.Entry[]): Root {
    const root = new Root();

    const build = (node: Serialized.Entry, parent: Entry<ParentType>) => {
      if (typeof node === "string") {
        const file = new File({ name: node, parent });
        parent.add(file);
      } else {
        const [name, children] = node;
        const folder = new Folder({ name, parent });
        parent.add(folder);
        for (const child of children) build(child, folder);
      }
    };

    for (const entry of entries) build(entry, root);
    return root;
  }
}

export class File
  extends mixin([ItemBase<"file">, WithEvents<Events.Item>])
  implements Entry<"file">
{
  constructor(args: Omit<ItemConstructor.Args<"file">, "type">) {
    if (attach.type("file", args)) super([args]);
  }
}

export class Symlink
  extends mixin([ItemBase<"symlink">, WithEvents<Events.Item>])
  implements Entry<"symlink">
{
  constructor(args: Omit<ItemConstructor.Args<"symlink">, "type">) {
    if (attach.type("symlink", args)) super([args]);
  }
}

export class Folder
  extends mixin([
    ItemBase<"folder">,
    ParentBase,
    WithEvents<Events.Item & Events.Parent>,
  ])
  implements Entry<"folder">
{
  constructor(
    args: Omit<ItemConstructor.Args<"folder">, "type"> & ParentConstructorArgs
  ) {
    if (attach.type("folder", args)) super([args], [args]);
  }
}
