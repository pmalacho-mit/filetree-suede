<script lang="ts" module>
  export { folderOpen, folderClosed };
  import { cssvar, type Vars } from "./Root.svelte";

  const expandOnMount = new WeakSet<Entry<"folder">>();
  const lastHeightByFolder = new WeakMap<Folder.Model, number>();

  const trigger = (
    expanded: boolean,
    folder: Folder.Model,
    depth: "local" | "recursive"
  ) => {
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
  import { renderer } from "../snippet-renderer-suede/SnippetRenderer.svelte";
  import type { Entry } from "./models.svelte.js";
  import { easeInOut, px } from "./utils/";
  import Row from "./utils/Row.svelte";

  let {
    model,
    heightOnDestroy,
    transitionTimeMs = 400,
  }: {
    model: Folder.Model;
    heightOnDestroy?: (height: number) => void;
    transitionTimeMs?: number;
  } & Vars<SupportedVars> = $props();

  let nameView = $state<EditableName>();
  let expanded = $state(false);
  let focused = $state(false);

  $effect(() => model.sort());
  $effect(() => model.propagate(model));

  $effect(() =>
    model.subscribe({
      "request rename": (config) => {
        if (model.readonly) return;
        const cursor = config?.cursor ?? model.name.length;
        nameView
          ? rename(nameView, cursor, config?.force)
          : tick().then(() => rename(nameView!, cursor, config?.force));
      },
      "request focus": () => (focused = true),
      "request open": (depth) => trigger((expanded = true), model, depth),
      "request close": (depth) => trigger((expanded = false), model, depth),
      "request expansion toggle": (depth) =>
        trigger((expanded = !expanded), model, depth),
    })
  );

  let clientHeight = $state(0);
  let childContainer = $state<HTMLElement>();

  let childFolderHeights = 0;
  let lastAnimationTrigger = 0;
  let animationVersion = Number.MIN_SAFE_INTEGER;

  const calculateStartingHeight = () => {
    const { height } = childContainer!.getBoundingClientRect();
    const now = performance.now();

    const delta = now - lastAnimationTrigger;
    const elapsedRatio = Math.min(delta / transitionTimeMs, 1);
    const t = easeInOut.t(elapsedRatio);

    lastAnimationTrigger = now;
    return expanded ? height * (1 - t) : height * t;
  };

  const animation = () => {
    if (!childContainer) return;

    const from = px(calculateStartingHeight());
    const to = px(
      expanded
        ? untrack(() => clientHeight) + childFolderHeights
        : (childFolderHeights = 0)
    );

    if (from === to) return;

    const { style } = childContainer;
    style.transition = "none";
    style.maxHeight = from;

    requestAnimationFrame(() => {
      style.transition = `max-height ${transitionTimeMs}ms ${easeInOut.id}`;
      style.maxHeight = to;
    });

    const version = ++animationVersion;
    if (!expanded) return;
    const unset = () => {
      if (version === animationVersion) style.maxHeight = "none";
      childContainer!.removeEventListener("transitionend", unset);
    };
    childContainer.addEventListener("transitionend", unset);
  };

  $effect(animation);

  onMount(() => {
    if (model.parent.type !== "folder") return;
    const lastHeight = lastHeightByFolder.get(model) ?? 0;
    lastHeightByFolder.delete(model);
    if (!expandOnMount.has(model)) return;
    childFolderHeights = lastHeight;
    expanded = true;
  });

  onDestroy(() => {
    heightOnDestroy?.(clientHeight);
    lastHeightByFolder.set(model, clientHeight);
  });
</script>

<Row {model} bind:nameView bind:focused>
  {#snippet icon()}
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
  {/snippet}
</Row>

<div
  bind:this={childContainer}
  style:--border-color={_var("text-color")}
  style:overflow="hidden"
  style:will-change="max-height"
>
  {#if expanded}
    <ul bind:clientHeight out:fade={{ duration: transitionTimeMs + 100 }}>
      {#each model.children as child}
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
