<script lang="ts" module>
  import diff from "fast-diff";

  type YjsDelta = { insert: string } | { retain: number } | { delete: number };

  // from: https://dev.to/priolo/synchronizing-collaborative-text-editing-with-yjs-and-websockets-1dco
  const diffToDelta = (diffed: ReturnType<typeof diff>): YjsDelta[] =>
    diffed
      .map(
        ([op, value]) =>
          ({
            [diff.INSERT]: { insert: value },
            [diff.EQUAL]: { retain: value.length },
            [diff.DELETE]: { delete: value.length },
          })[op]!,
      )
      .filter(Boolean);

  const diffAsDelta = ({ from, to }: Record<"from" | "to", string>) =>
    diffToDelta(diff(from, to));

  class Sync {
    readonly name: Y.Text;

    constructor(model: File.Model | Folder.Model, yDoc: Y.Doc) {
      this.name = yDoc.getText(model.path + "-name");
      const subscribeOnSync = () => {
        this.name.observe((event) => {
          const update = this.name.toString();
          if (model.name !== update) model.name = update;
        });
        yDoc.off("sync", subscribeOnSync);
      };
      if (yDoc.isSynced) subscribeOnSync();
      else yDoc.on("sync", subscribeOnSync);
    }
  }

  class FileWithSync extends File.Model {
    readonly sync: Sync;

    constructor(
      yDoc: Y.Doc,
      ...args: ConstructorParameters<typeof File.Model>
    ) {
      super(...args);
      this.sync = new Sync(this, yDoc);
    }
  }

  class FolderWithSync extends Folder.Model {
    readonly sync: Sync;

    constructor(
      yDoc: Y.Doc,
      ...args: ConstructorParameters<typeof Folder.Model>
    ) {
      super(...args);
      this.sync = new Sync(this, yDoc);
    }
  }

  class RootWithSyncChildren extends Root.Model {
    constructor(...args: ConstructorParameters<typeof Root.Model>) {
      super(...args);
      this.subscribe({
        "child renamed": (child, from, to) => {
          const { sync } = child as FileWithSync | FolderWithSync;
          const deltas = [
            diffAsDelta({ from: sync.name.toString(), to: from }),
            diffAsDelta({ from, to }),
          ];
          for (const delta of deltas) sync.name.applyDelta(delta);
        },
      });
    }
  }
</script>

<script lang="ts">
  import { Sweater } from "./sweater-vest-suede";
  import { Root, File, Folder } from "../../release";
  import * as Y from "yjs";
  import { WebsocketProvider } from "y-websocket";

  const host = "localhost";
  const port = 1234;

  const params = new URLSearchParams(window.location.search);

  const useIframe = params.get("use-iframe") === "true";
</script>

{#if useIframe}
  <Sweater
    body={async ({ set }) => {
      const doc = new Y.Doc();
      const wsProvider = new WebsocketProvider(
        `ws://${host}:${port}`,
        "my-roomname",
        doc,
        {
          disableBc: true,
        },
      );

      wsProvider.on("status", (event) => {
        console.log(event.status); // logs "connected" or "disconnected"
      });
      wsProvider.on("sync", (isSynced: boolean) => {
        doc.emit("sync", [isSynced, doc]);
      });

      const root = Root.Model.Initialize(
        {
          root: () => new RootWithSyncChildren(),
          file: (_, name, parent) => new FileWithSync(doc, { name, parent }),
          folder: (_, name, parent) =>
            new FolderWithSync(doc, { name, parent }),
        },
        "example.txt",
        ["Documents", ["a.txt", "notes.md"]],
        "todo.txt",
        ["Music", ["song.mp3"]],
      );

      set({ root });
      root.subscribe({
        "child add finalized": (entry) => {
          console.log("Added:", entry.name);
          if (entry.is("file")) entry.fire("request focus toggle");
        },
        "child clicked": (child) => {
          if (child.is("folder"))
            child.fire("request expansion toggle", "local");
          else if (child.is("file")) {
            child.fire("request focus toggle");
          }
        },
      });
    }}
  >
    {#snippet vest({ root }: { root: Root.Model })}
      <div style="display: flex; flex-direction: row; align-items: flex-start;">
        <div
          style="width: 100px; height: 200px; margin: 8px; border: 1px solid black;"
        >
          <Root.DefaultStyle
            model={root}
            --color="grey"
            --background-color="white"
            --font-size={"1rem"}
          />
        </div>
      </div>
    {/snippet}
  </Sweater>
{:else}
  Run local server: <code>HOST={host} PORT={port} npx y-websocket</code>

  <div
    style:display="flex"
    style:flex-direction="row"
    style:align-items="flex-start"
  >
    <iframe
      title="File Test"
      src={window.location.pathname + "?use-iframe=true"}
      style="width: 50%; height: 100%; margin: 8px; border: 1px solid black;"
    ></iframe>
    <iframe
      title="File Test"
      src={window.location.pathname + "?use-iframe=true"}
      style="width: 50%; height: 100%; margin: 8px; border: 1px solid black;"
    ></iframe>
  </div>
{/if}
