<script lang="ts" module>
  import Row from "./utils/Row.svelte";

  export { folderOpen, folderClosed };

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
  import type { WithClassify } from "./Root.svelte";

  let {
    model,
    depth = 0,
    heightOnDestroy,
    transitionTimeMs = 300,
    classify,
  }: {
    model: Folder.Model;
    depth?: number;
    heightOnDestroy?: (height: number) => void;
    transitionTimeMs?: number;
  } & WithClassify = $props();

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
  let childList = $state<HTMLUListElement>();
  let childFolderHeights = 0;

  $effect(() => {
    if (childList) childList.style.opacity = "1";
  });

  const createSlideAnimation = () => {
    let lastAnimationTrigger = 0;
    let animationVersion = Number.MIN_SAFE_INTEGER;
    const height = (target: HTMLElement) => {
      const { height } = target.getBoundingClientRect();
      const now = performance.now();

      const delta = now - lastAnimationTrigger;
      const elapsedRatio = Math.min(delta / transitionTimeMs, 1);
      const t = easeInOut.t(elapsedRatio);

      lastAnimationTrigger = now;
      return expanded ? height * (1 - t) : height * t;
    };
    return () => {
      if (!childContainer) return;

      if (transitionTimeMs === 0) {
        const {
          style,
          children: [child],
        } = childContainer;
        style.transition = "none";
        style.maxHeight = expanded ? "none" : "0px";
        if (child) (child as HTMLElement).style.opacity = expanded ? "1" : "0";
        return;
      }

      const from = px(height(childContainer));
      const to = px(
        expanded
          ? untrack(() => clientHeight) + childFolderHeights
          : (childFolderHeights = 0)
      );

      if (from === to) return;

      const {
        style,
        children: [child],
      } = childContainer;

      style.transition = "none";
      style.maxHeight = from;
      (child as HTMLElement).style.opacity = expanded ? "1" : "0";

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
  };

  $effect(createSlideAnimation());

  onMount(() => {
    if (model.parent.type !== "folder") return;
    const lastHeight = lastHeightByFolder.get(model) ?? 0;
    lastHeightByFolder.delete(model);
    if (!expandOnMount.has(model)) return;
    childFolderHeights = lastHeight;
    tick().then(() => (expanded = true));
  });

  onDestroy(() => {
    heightOnDestroy?.(clientHeight);
    lastHeightByFolder.set(model, clientHeight);
  });
</script>

<Row {model} {depth} {classify} bind:nameView bind:focused>
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
  <div bind:this={childContainer} style:will-change="max-height">
    {#if expanded}
      <ul
        bind:clientHeight
        out:fade={{ duration: transitionTimeMs + 100 }}
        style:opacity="0"
        style:transition="opacity {transitionTimeMs}ms ease-in-out"
        style:list-style="none"
        style:padding="0"
        style:margin="0"
      >
        {#each model.children as child}
          <li style:padding="0">
            {#if child.is<Folder.Model>("folder")}
              <Self
                model={child}
                depth={depth + 1}
                heightOnDestroy={(height) => (childFolderHeights += height)}
                {classify}
              />
            {:else}
              <File.Component
                model={child as File.Model}
                depth={depth + 1}
                {classify}
              />
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</Row>

{#snippet folderOpen()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--color, currentColor)"
    stroke-width="var(--stroke-width, 1.4)"
    stroke-linecap="round"
    stroke-linejoin="round"
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
    stroke="var(--color, currentColor)"
    stroke-width="var(--stroke-width, 1.4)"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    />
  </svg>
{/snippet}
