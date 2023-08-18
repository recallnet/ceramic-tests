# Rust Ceramic Migration Tests

Tests needed to verify the migration from [Kubo](https://github.com/ceramicnetwork/go-ipfs-daemon) to
[rust-ceramic](https://github.com/3box/rust-ceramic) when used with
[Ceramic](https://github.com/ceramicnetwork/js-ceramic) nodes.

## Contributing

We are happy to accept small and large contributions, feel free to make a suggestion or submit a pull request.

Use the provided `Makefile` for basic actions to ensure your changes are ready for CI.

    $ make build
    $ make check-clippy
    $ make check-fmt

Using the makefile is not necessary during your development cycle, feel free to use the relevant cargo commands
directly. However, running `make` before publishing a PR will provide a good signal if your PR will pass CI.

## License

Fully open source and dual-licensed under MIT and Apache 2.
