# zugriff

CLI to communicate with the Deployment and General Purpose APIs.

## Install

After installation, the binary can be accessed through the `zugriff` command.

```zsh
cargo install --path . --locked
```

```zsh
cargo install zugriff
```

## Usage

These examples only include a subset of available commands and options. Run `zugriff --help` or `zugriff <command> --help` to retrieve more information.

```zsh
zugriff new demo && cd ./demo && npm i
```

```zsh
zugriff run --watch
```

```zsh
zugriff deploy --deploymentToken <TOKEN>
```
