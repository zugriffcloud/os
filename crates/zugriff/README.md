# zugriff

The command-line interface for [zugriff](https://www.zugriff.eu).

## Installation

```zsh
git clone https://github.com/zugriffcloud/os.git
cd os/crates/zugriff
cargo install --path . --locked
```

```zsh
cargo install zugriff
```

## Usage

These examples only include a subset of available commands and options. Run `zugriff --help` or `zugriff <command> --help` to retrieve more information.

```zsh
zugriff create hono ./demo && cd ./demo && npm i
```

```zsh
zugriff preview --watch
```

```zsh
zugriff deploy --deploymentToken <TOKEN>
```
