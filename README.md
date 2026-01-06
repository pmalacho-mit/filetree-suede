# Filetree-suede

This repo is a [suede dependency](https://github.com/pmalacho-mit/suede). 

To see the installable source code, please checkout the [release branch](https://github.com/pmalacho-mit/filetree-suede/tree/release).

## Installation

```bash
bash <(curl https://suede.sh/install-release) --repo pmalacho-mit/filetree-suede
```

<details>
<summary>
See alternative to using <a href="https://github.com/pmalacho-mit/suede#suedesh">suede.sh</a> script proxy
</summary>

```bash
bash <(curl https://raw.githubusercontent.com/pmalacho-mit/suede/refs/heads/main/scripts/install-release.sh) --repo pmalacho-mit/filetree-suede
```

</details>

```ts
export const join = (...parts: string[]) =>
  parts
    .map((part, index, { length }) =>
      index === 0
        ? part.replace(/\/+$/, "")
        : index === length - 1
        ? part.replace(/^\/+/, "")
        : part.replace(/^\/+|\/+$/g, "")
    )
    .filter(Boolean)
    .join("/");
```

FsType = "file" | "folder" | "root"

File
- type
- icon: renderable snippet
- name = $state("")
- parent: WithNodes
- path = $derived(join(parent.path, this.name))
- constructor(parent) {
  this.parent = $state(parent);
}


yjsTrack(model, yDoc, id, { name: "" })

