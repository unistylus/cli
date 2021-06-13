<section id="head" data-note="AUTO-GENERATED CONTENT, DO NOT EDIT DIRECTLY!">

# @unistylus/cli

**Tools for the Unistylus framework.**

</section>

<section id="tocx" data-note="AUTO-GENERATED CONTENT, DO NOT EDIT DIRECTLY!">

- [Getting started](#getting-started)
- [Command overview](#cli-command-overview)
- [Command reference](#cli-command-reference)
  - [`clean`](#command-clean)
  - [`copy`](#command-copy)
  - [`generate`](#command-generate)
  - [`init`](#command-init)
  - [`help`](#command-help)
  - [`*`](#command-*)
- [Detail API reference](https://unistylus-cli.lamnhan.com)


</section>

<section id="getting-stated">

## Getting started

- Install & init

```sh
npx @unistylus/cli init
```

- Install globally:

```sh
npm install -g @unistylus/cli
```

Add to a project:

```sh
unistylus init
```

Add your own soul `src/`, edit the `.unistylusrc.json`.

Generate distribution:

```sh
unistylus generate
```

Next, see the homepage: [https://unistylus.lamnhan.com](https://unistylus.lamnhan.com)

</section>

<section id="cli" data-note="AUTO-GENERATED CONTENT, DO NOT EDIT DIRECTLY!">

<h2><a name="cli-command-overview"><p>Command overview</p>
</a></h2>

Tools for the Unistylus framework.

- [`unistylus clean|del|d <path>`](#command-clean)
- [`unistylus copy|c [items...] --src [value] --out [value] --clean`](#command-copy)
- [`unistylus generate|g [path] --api`](#command-generate)
- [`unistylus init|i [path]`](#command-init)
- [`unistylus help`](#command-help)
- [`unistylus *`](#command-*)

<h2><a name="cli-command-reference"><p>Command reference</p>
</a></h2>

<h3><a name="command-clean"><p><code>clean</code></p>
</a></h3>

Clean a folder.

**Usage:**

```sh
unistylus clean <path>
unistylus del <path>
unistylus d <path>
```

**Parameters:**

- `<path>`: The `<path>` parameter.

<h3><a name="command-copy"><p><code>copy</code></p>
</a></h3>

Copy resources

**Usage:**

```sh
unistylus copy [items...] --src [value] --out [value] --clean
unistylus c [items...] --src [value] --out [value] --clean
```

**Parameters:**

- `[items...]`: List of items

**Options:**

- `-s, --src [value]`: Source of items.
- `-o, --out [value]`: Copy destination.
- `-c, --clean`: Clean the output first.

<h3><a name="command-generate"><p><code>generate</code></p>
</a></h3>

Generate content.

**Usage:**

```sh
unistylus generate [path] --api
unistylus g [path] --api
```

**Parameters:**

- `[path]`: Custom path to the project

**Options:**

- `-a, --api`: Output the API.

<h3><a name="command-init"><p><code>init</code></p>
</a></h3>

Add Unistylus tools to a project.

**Usage:**

```sh
unistylus init [path]
unistylus i [path]
```

**Parameters:**

- `[path]`: Custom path to the project

<h3><a name="command-help"><p><code>help</code></p>
</a></h3>

Display help.

**Usage:**

```sh
unistylus help
```

<h3><a name="command-*"><p><code>*</code></p>
</a></h3>

Any other command is not suppoted.

**Usage:**

```sh
unistylus <cmd>
```

</section>

<section id="license" data-note="AUTO-GENERATED CONTENT, DO NOT EDIT DIRECTLY!">

## License

**@unistylus/cli** is released under the [MIT](https://github.com/unistylus/cli/blob/master/LICENSE) license.

</section>
