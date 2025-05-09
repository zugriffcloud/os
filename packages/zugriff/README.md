# zugriff

This package is a wrapper around the [zugriff](https://crates.io/crates/zugriff) binary.

## Install

After installation, the binary can be accessed through the `zugriff` command.

```zsh
npm i --global zugriff
```

## Usage

These examples only include a subset of available commands and options. Run `zugriff --help` or `zugriff <command> --help` to retrieve more information.

```zsh
zugriff new demo && cd ./demo && npm i
```

```zsh
zugriff preview --watch
```

```zsh
zugriff deploy --deploymentToken <TOKEN>
```
