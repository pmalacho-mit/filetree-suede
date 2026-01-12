<script lang="ts" module>
  import Root, { type Props as RootProps } from "./Root.svelte";

  type CssVariables = {
    "--name-input-outline-color": string;
    "--folder-track-color": string;
    "--folder-track-width": string;
    "--folder-track-style": string;
    "--background-color": string;
    "--font-size": string;
    "--color": string;
    "--row-icon-size": string;
    "--row-icon-stroke-width": string;
    "--row-focused-background-color": string;
    "--row-hover-background-color": string;
    "--row-item-gap": string;
    "--row-item-padding-y": string;
    "--row-item-padding-x": string;
  };

  /**
   * Props for DefaultStyle component
   *
   * NOTE: 'classify' prop is omitted because DefaultStyle is implemented assuming no class-name customization.
   */
  export type Props = Omit<RootProps, "classify"> & Partial<CssVariables>;
</script>

<script lang="ts">
  let { model, ...vars }: Props = $props();
</script>

<div
  style={Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ")}
>
  <Root {model} />
</div>

<style>
  div :global(.root-container) {
    color: var(--color, black);
    background-color: var(--background-color, white);
    font-size: var(--font-size, 1rem);
  }

  div :global(.name-highlighted),
  div :global(.name-input:focus) {
    outline-color: var(--name-input-outline-color, skyblue);
  }

  div :global(.row-indentation) {
    padding: var(--row-item-padding-y, 0.25rem)
      var(--row-item-padding-x, 0.25rem);
    gap: var(--row-item-gap, 0.25rem);
  }

  div :global(.row-indentation),
  div :global(.row-inner-track) {
    border-left-width: var(--folder-track-width, 1px);
    border-left-style: var(--folder-track-style, solid);
    border-left-color: var(--folder-track-color, var(--color, black));
  }

  div :global(.row-name.row-focused) {
    background-color: var(
      --row-focused-background-color,
      lightsteelblue
    ) !important;
  }

  div :global(.row-name:hover),
  div :global(.row-name.row-name-overflow-hover) {
    background-color: var(--row-hover-background-color, lightgrey);
  }

  div :global(.row-icon) {
    margin-left: 0.125rem;
    --size: var(--row-icon-size, 1.4rem);
    --stroke-width: var(--row-icon-stroke-width, 0.125rem);
  }

  :global(.name-overflow-tooltip) {
    z-index: 2;
  }
</style>
