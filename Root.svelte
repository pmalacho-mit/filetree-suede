<script lang="ts" module>
  const vars = {
    /**
     * Size of icons used throughout the file tree.
     */
    "--icon-size": "1.5rem",
    "--icon-stroke-width": "1.4",
    "--font-size": "1rem",
    "--editing-outline-color": "green",
    "--focus-background-color": "rgba(59, 130, 246, 0.3)",
    "--background-color": "grey",
    "--text-color": "blue",
  };

  type SupportedVars = typeof vars;
  type Var = keyof SupportedVars;

  export type Vars<K extends Var = Var> = Partial<Pick<SupportedVars, K>>;

  type WithoutLeadingDash<T extends string> = T extends `--${infer R}` ? R : T;
  const withLeadingDash = <T extends string>(varName: WithoutLeadingDash<T>) =>
    `--${varName}` as const;

  export const cssvar =
    <T extends Var>() =>
    <Default = any,>(varName: WithoutLeadingDash<T>, _default?: Default) =>
      `var(${withLeadingDash(varName)}, ${_default ?? vars[withLeadingDash(varName)]})` as const;

  const _var = cssvar<Var>();
</script>

<script lang="ts">
  import { slide } from "svelte/transition";
  import { type Root, Folder, File } from "./";

  let { model }: { model: Root.Model } & Vars = $props();

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
  style:z-index="50"
  style:display="flex"
  style:height="100%"
  style:width="100%"
  style:flex-direction="column"
  style:padding="0rem"
  style:outline="none !important"
  bind:this={container}
>
  {#each model.children as child}
    <div
      transition:slide={{ duration: 300 }}
      style:font-size={_var("font-size")}
      style:color={_var("text-color")}
      style:background-color={_var("background-color")}
    >
      {#if child.is<Folder.Model>("folder")}
        <Folder.Component model={child} />
      {:else}
        <File.Component model={child as File.Model} />
      {/if}
    </div>
  {/each}
</div>
