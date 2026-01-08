<script lang="ts" module>
  import type { File } from "./";
  import { type Vars, cssvar } from "./Root.svelte";
  export { symlinkIcon, fileIcon };

  const indexBeforeExtension = ({ name }: Pick<File.Model, "name">) => {
    const lastDot = name.lastIndexOf(".");
    return lastDot === -1 ? name.length : lastDot;
  };

  export type Supported =
    | "--focus-background-color"
    | "--icon-stroke-width"
    | "--icon-size"
    | "--focus-background-color";

  const _var = cssvar<Supported>();
</script>

<script lang="ts">
  import type { Entry, FileType } from "./models.svelte";
  import { EditableName, rename } from "./name";
  import { ContextMenu } from "./context";
  import { tick } from "svelte";
  import { renderer } from "../snippet-renderer-suede";

  let { model }: { model: File.Model } & Vars<Supported> = $props();

  let nameUI = $state<EditableName>();
  let topLevel = $state<HTMLElement>();
  let focused = $state(false);

  $effect(() =>
    (model as Entry<FileType>).subscribe({
      "request focus toggle": () => (focused = !focused),
      "request rename": (config) => {
        if (model.readonly) return;
        const cursor = config?.cursor ?? indexBeforeExtension(model);
        nameUI
          ? rename(nameUI!, cursor, config?.force)
          : tick().then(() => rename(nameUI!, cursor, config?.force));
      },
    })
  );
</script>

<ContextMenu
  {model}
  {nameUI}
  target={topLevel}
  beforeAction={() => nameUI?.edit(false, model.name)}
/>

<button
  bind:this={topLevel}
  onclick={() => model.fire("clicked", model)}
  style:color="inherit"
  style:background-color={focused
    ? _var("focus-background-color")
    : "transparent"}
  style:position="relative"
  style:display="flex"
  style:width="100%"
  style:border-radius="0.125rem"
  style:border-color="transparent"
>
  <span
    style:width="100%"
    style:display="flex"
    style:flex-direction="row"
    style:align-items="center"
    style:gap="0.125rem"
  >
    <div style:flex-shrink="0">
      {#if model.icon.current !== undefined}
        {@render renderer(model.icon)}
      {:else if model.type === "symlink"}
        {@render symlinkIcon()}
      {:else}
        {@render fileIcon()}
      {/if}
    </div>
    <EditableName {model} {focused} bind:this={nameUI} />
  </span>
</button>

{#snippet symlinkIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width={_var("icon-stroke-width")}
    style:width={_var("icon-size")}
    style:height={_var("icon-size")}
  >
    <g>
      <path
        fill-rule="evenodd"
        d="M3 3a2 2 0 012-2h9.982a2 2 0 011.414.586l4.018 4.018A2 2 0 0121 7.018V21a2 2 0 01-2 2H4.75a.75.75 0 010-1.5H19a.5.5 0 00.5-.5V8.5h-4a2 2 0 01-2-2v-4H5a.5.5 0 00-.5.5v6.25a.75.75 0 01-1.5 0V3zm12-.5v4a.5.5 0 00.5.5h4a.5.5 0 00-.146-.336l-4.018-4.018A.5.5 0 0015 2.5zm-5.692 12l-2.104-2.236a.75.75 0 111.092-1.028l3.294 3.5a.75.75 0 010 1.028l-3.294 3.5a.75.75 0 11-1.092-1.028L9.308 16H4.09a2.59 2.59 0 00-2.59 2.59v3.16a.75.75 0 01-1.5 0v-3.16a4.09 4.09 0 014.09-4.09h5.218z"
      />
    </g>
  </svg>
{/snippet}

{#snippet fileIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width={_var("icon-stroke-width")}
    style:width={_var("icon-size")}
    style:height={_var("icon-size")}
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
{/snippet}

<style>
  svg {
    will-change: transform, opacity;
    backface-visibility: hidden;
  }
</style>
