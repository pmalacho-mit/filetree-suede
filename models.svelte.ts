import { type IWithEvents, WithEvents } from "../with-events-suede";
import { mixin } from "../mixin-suede";
import { type Find, byName, byPath } from "./find";

type Type = "file" | "folder" | "root";

const attachType = <T extends Type>(
  type: T,
  target: any
): target is { type: T } => Boolean((target.type = type as T));

type ItemType = Exclude<Type, "root">;
type ParentType = Exclude<Type, "file">;

namespace Events {
  export type Item = {
    clicked: [];
  };

  export type Parent = {
    childClicked: [Entry];
    expand: [depth: "recursive" | "local"];
  };
}

export type Entry<T extends Type = ItemType> = {
  type: T;
} & (T extends "root"
  ? Parent & {
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
      getContextMenuItems?: (self: Entry<T>) => unknown[];
      is<T extends Type>(query: T): this is Entry<T>;
    } & (T extends "folder"
      ? Parent & {
          /** Folder-specific properties */
        }
      : {
          /** File-specific properties */
        }) &
      IWithEvents<Events.Item>);

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
} & IWithEvents<Events.Parent>;

type WithoutEvents<T> = Omit<T, keyof IWithEvents<any>>;

type ParentConstructorArgs = Partial<
  Pick<ParentBase, "validNameContent" | "getNameVariant">
>;

const defaults: Required<
  Pick<ParentConstructorArgs, "getNameVariant"> &
    Pick<ItemConstructorArgs<ItemType>, "defaultNameForType">
> = {
  getNameVariant: (current: string, attempt: number) => {
    const dot = current.lastIndexOf(".");
    const id = `(${attempt + 1})`;
    return dot === -1
      ? current + id
      : current.slice(0, dot) + id + current.slice(dot);
  },
  defaultNameForType: (type: ItemType) => type,
};

class ParentBase implements WithoutEvents<Parent> {
  readonly validNameContent?: (candidate: string) => true | string;
  readonly getNameVariant?: (current: string, attempt: number) => string;

  constructor({
    validNameContent,
    getNameVariant,
  }: ParentConstructorArgs = {}) {
    this.validNameContent = validNameContent;
    this.getNameVariant = getNameVariant;
  }

  children = $state(new Array<Entry>());

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
}

type ItemConstructorArgs<T extends ItemType> = Pick<
  Entry<T>,
  "type" | "parent"
> &
  Partial<
    Pick<Entry<T>, "name" | "parent" | "readonly" | "getContextMenuItems"> & {
      defaultNameForType: (type: ItemType) => string;
    }
  >;

class ItemBase<T extends ItemType> implements WithoutEvents<Entry> {
  name: string;
  parent: Entry<ParentType>;
  readonly type: T;
  readonly path: string;
  readonly readonly: boolean;
  readonly getContextMenuItems?: Entry<T>["getContextMenuItems"];

  constructor({
    type,
    name,
    parent,
    readonly,
    defaultNameForType,
    getContextMenuItems,
  }: ItemConstructorArgs<T>) {
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
  }

  is<Query extends Type>(query: Query): this is Entry<Query> {
    return is(this, query);
  }

  remove(): void {
    const { children } = this.parent;
    const self = this as any as Entry;
    children.splice(children.indexOf(self), 1);
  }
}

export class Root
  extends mixin([ParentBase, WithEvents<Events.Parent>])
  implements Entry<"root">
{
  readonly type = "root";

  constructor(args?: ParentConstructorArgs) {
    super([args]);
  }
}

export class File
  extends mixin([ItemBase<"file">, WithEvents<Events.Item>])
  implements Entry<"file">
{
  constructor(args: Omit<ItemConstructorArgs<"file">, "type">) {
    if (attachType("file", args)) super([args]);
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
    args: Omit<ItemConstructorArgs<"folder">, "type"> & ParentConstructorArgs
  ) {
    if (attachType("folder", args)) super([args], [args]);
  }
}
