<script lang="ts" module>
  import { defer } from "./utils";
  export { folderOpen, folderClosed };
  import { cssvar, type Vars } from "./Root.svelte";

  const opening = new Map<Entry<"folder">, ReturnType<typeof defer<void>>>();
  const expandOnMount = new Set<Entry<"folder">>();

  const trigger = (
    expanded: boolean,
    folder: Folder.Model,
    depth: "local" | "recursive"
  ) => {
    expanded ? opening.set(folder, defer()) : opening.delete(folder);
    if (folder.parent.type === "folder")
      expandOnMount[expanded ? "add" : "delete"](folder);
    if (depth === "recursive")
      for (const child of folder.children)
        if (child.is("folder"))
          trigger(expanded, child as Folder.Model, "recursive");
  };

  export type SupportedVars =
    | "--text-color"
    | "--focus-background-color"
    | "--icon-size"
    | "--icon-stroke-width";

  const _var = cssvar<SupportedVars>();
</script>

<script lang="ts">
  import { File, type Folder } from "./";
  import Self from "./Folder.svelte";
  import { fade } from "svelte/transition";
  import { EditableName, rename } from "./name";
  import { onDestroy, onMount, tick, untrack } from "svelte";
  import FolderSlideTransition from "./utils/folder-slide-transition.js";
  import { renderer } from "../snippet-renderer-suede/SnippetRenderer.svelte";
  import type { Entry } from "./models.svelte.js";

  let {
    model,
    heightOnDestroy,
  }: {
    model: Folder.Model;
    heightOnDestroy?: (height: number) => void;
  } & Vars<SupportedVars> = $props();

  let nameUI = $state<EditableName>();
  let topLevel = $state<HTMLElement>();
  let expanded = $state(false);
  let focused = $state(false);

  $effect(() => model.sort());
  $effect(() => model.propagate(model));

  $effect(() =>
    model.subscribe({
      "request rename": (config) => {
        if (model.readonly) return;
        const cursor = config?.cursor ?? model.name.length;
        nameUI
          ? rename(nameUI, cursor, config?.force)
          : tick().then(() => rename(nameUI!, cursor, config?.force));
      },
      "request focus": () => (focused = true),
      "request open": (depth) => trigger((expanded = true), model, depth),
      "request close": (depth) => trigger((expanded = false), model, depth),
      "request expansion toggle": (depth) =>
        trigger((expanded = !expanded), model, depth),
    })
  );

  let clientHeight = $state<number>(0);
  let childFolderHeights = 0;

  $effect(() => {
    if (!expanded) childFolderHeights = 0;
  });

  let childContainer = $state<HTMLElement>();
  let folderSlider: FolderSlideTransition;

  $effect(() => {
    if (!childContainer) return;
    folderSlider ??= new FolderSlideTransition(childContainer);
    const desired = expanded
      ? untrack(() => clientHeight) + childFolderHeights
      : (childFolderHeights = 0);
    console.log("desired height for", model.name, ":", desired);
    const deferred = expanded ? opening.get(model) : undefined;
    folderSlider.fire(expanded, deferred);
  });

  onMount(() => {
    if (model.parent.type !== "folder") return;
    if (!expandOnMount.has(model)) return;
    opening
      .get(model.parent as Folder.Model)!
      .promise.then(() => requestAnimationFrame(() => (expanded = true)));
  });

  onDestroy(() => heightOnDestroy?.(clientHeight));
</script>

<!-- <FsContextMenu
  addFile={() => add("file")} 
  addFolder={() => add("folder")}
  {nameUI}
  remove={_delete}
  target={topLevel}
  {name}
  beforeAction={() => nameUI?.edit(false, name)}
/> -->

<button
  onclick={() => model.fire("clicked", model)}
  style:color="inherit"
  style:background-color={focused
    ? _var("focus-background-color")
    : "transparent"}
  style:position="relative"
  style:width="100%"
  style:display="flex"
  style:border-color="transparent"
  bind:this={topLevel}
>
  <span
    style:width="100%"
    style:display="flex"
    style:align-items="center"
    style:gap="0.125rem"
  >
    <div style:flex-shrink="0">
      {#if expanded}
        {#if model.icon.open.current !== undefined}
          {@render renderer(model.icon.open)}
        {:else}
          {@render folderOpen()}
        {/if}
      {:else if model.icon.closed.current !== undefined}
        {@render renderer(model.icon.closed)}
      {:else}
        {@render folderClosed()}
      {/if}
    </div>
    {clientHeight}
    <EditableName {model} {focused} bind:this={nameUI} />
  </span>
</button>

<div bind:this={childContainer} style:--border-color={_var("text-color")}>
  {#if expanded}
    <ul
      bind:clientHeight
      out:fade={{ duration: FolderSlideTransition.DurationMs + 100 }}
    >
      {#each model.children as child, index}
        <li>
          {#if child.is<Folder.Model>("folder")}
            <Self
              model={child}
              heightOnDestroy={(height) => (childFolderHeights += height)}
            />
          {:else}
            <File.Component model={child as File.Model} />
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#snippet folderOpen()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width={_var("icon-stroke-width")}
    stroke-linecap="round"
    stroke-linejoin="round"
    style:border="none"
    style:outline="none"
    style:will-change="transform, opacity"
    style:backface-visibility="hidden"
    style:width={_var("icon-size")}
    style:height={_var("icon-size")}
  >
    <path
      d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"
    />
  </svg>
{/snippet}

{#snippet folderClosed()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width={_var("icon-stroke-width")}
    stroke-linecap="round"
    stroke-linejoin="round"
    style:width={_var("icon-size")}
    style:height={_var("icon-size")}
  >
    <path
      d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    />
  </svg>
{/snippet}

<style>
  ul {
    padding: 0rem 0 0 0.5rem;
    margin: 0 0 0 0.5rem;
    list-style: none;
  }

  li {
    padding: 0rem 1px 0rem 1px;
    border-left: 1px solid var(--border-color);
  }
</style>
