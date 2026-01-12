<script lang="ts" module>
  export type WithClassify = {
    /**
     * Used to create unique class names for the components of this libary,
     * likely by prefixing or suffixing the default class names (provided as the argument `className`).
     *
     * This is useful in case something else defines a conflicting class name globally.
     * @param className
     */
    classify?: (className: string) => string;
  };

  export type Classify = WithClassify["classify"] | WithClassify;

  type ClassNames = Record<string, string | ((...args: any[]) => string)>;

  export const classified = <const T extends ClassNames>(
    classify: Classify,
    classes: T
  ): T => {
    if (classify === undefined) return classes;
    if (typeof classify === "function")
      return Object.fromEntries(
        Object.entries(classes).map(([key, value]) => [
          key,
          typeof value === "function"
            ? (...args: any[]) => classify(value(...args))
            : classify(value),
        ])
      ) as T;
    else if (typeof classify === "object")
      return classified(classify.classify, classes);
    else return classes;
  };

  export const Classes = (classify?: Classify) =>
    classified(classify, {
      container: "root-container",
    });

  export type Props = { model: Root.Model } & WithClassify;
</script>

<script lang="ts">
  import { slide } from "svelte/transition";
  import { type Root, Folder, File } from "./";

  let { model, classify }: Props = $props();

  const classes = $derived(Classes(classify));

  $effect(() => model.sort());
  $effect(() => model.propagate(model));

  let container = $state<HTMLElement>();
</script>

<!-- <FsContextMenu
  addFile={() => (editingTarget = writeChild(root.children, "file", "", write))}
  addFolder={() =>
    (editingTarget = writeChild(root.children, "folder", "", write))}
  target={container}
  atCursor={true}
/> -->

<div
  bind:this={container}
  class={classes.container}
  style:display="flex"
  style:height="100%"
  style:width="100%"
  style:flex-direction="column"
  style:padding="0rem"
  style:outline="none"
  style:overflow-x="visible"
>
  {#each model.children as child}
    <div transition:slide={{ duration: 300 }}>
      {#if child.is<Folder.Model>("folder")}
        <Folder.Component model={child} />
      {:else}
        <File.Component model={child as File.Model} />
      {/if}
    </div>
  {/each}
</div>
