<script lang="ts" module>
  import { File, Folder } from "..";
  import { cssvar, type Vars } from "../Root.svelte";
  import { ContextMenu } from "../context";
  import type { Snippet } from "svelte";
  import { EditableName, type EditableNameSupportedVars } from "../name";

  export type SupportedVars = "--focus-background-color";
  const _var = cssvar<SupportedVars>();

  type Props = {
    model: File.Model | Folder.Model;
    icon: Snippet;
    focused?: boolean;
    nameView?: EditableName;
  } & Vars<SupportedVars | EditableNameSupportedVars>;
</script>

<script lang="ts">
  import type { Events } from "../models.svelte";

  let {
    model,
    icon,
    focused = $bindable(),
    nameView = $bindable(),
  }: Props = $props();

  let container = $state<HTMLElement>();

  $effect(() =>
    (model as Events.WithItemEvents).subscribe({
      "request focus toggle": () => (focused = !focused),
    })
  );
</script>

<ContextMenu
  {model}
  target={container}
  highlight={(condition) => nameView?.highlight(condition)}
  beforeAction={() => nameView?.edit(false, model.name)}
/>

<button
  bind:this={container}
  onclick={() => (model as Events.WithItemEvents).fire("clicked", model)}
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
      {@render icon()}
    </div>
    <EditableName {model} {focused} bind:this={nameView} />
  </span>
</button>
