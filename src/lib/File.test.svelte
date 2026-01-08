<script lang="ts">
  import { Sweater } from "./sweater-vest-suede";
  import { File, Folder, Root } from "../../release";

  class Pocket {
    root = new Root.Model();
    fontSize = 14;
  }
</script>

<Sweater
  body={async ({ set }) => {
    const root = Root.Model.From(
      "example.txt",
      [
        "Documents",
        [
          "notes.md",
          ["Photos", ["image.png"]],
          [
            "Videos",
            [
              "video.mp4",
              [
                "Clips",
                ["clip.avi", "clip2.avi", ["subs", ["sub1.srt", "sub2.srt"]]],
              ],
            ],
          ],
        ],
      ],
      "todo.txt",
      ["Music", ["song.mp3"]]
    );

    set({ root });
    root.subscribe({
      "child clicked": (child) => {
        if (child.is("folder")) child.fire("request expansion toggle", "local");
        else if (child.is("file") || child.is("symlink")) {
          child.fire("request focus toggle");
        }
      },
    });
  }}
>
  {#snippet vest({ root }: { root: Root.Model })}
    <div style="width: 400px">
      <Root.Component
        model={root}
        --background-color="lightgrey"
        --text-color="black"
      />
    </div>
  {/snippet}
</Sweater>
