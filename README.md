# Rust Ceramic Migration Tests

Tests needed to verify the migration from [Kubo](https://github.com/ceramicnetwork/go-ipfs-daemon) to
[rust-ceramic](https://github.com/3box/rust-ceramic) when used with
[Ceramic](https://github.com/ceramicnetwork/js-ceramic) nodes.


## Running tests locally

Tests are run in CI via the build docker image. However locally its useful to be able to run the tests without doing an image build.
There are some helpful scripts in this repo to make testing locally possible:

    # Create the network
    kubectl apply -f network.yaml

    # Wait for network to be ready then,
    # port forward local ports into each ceramic node.
    # We `source` the script so it can export the env vars.
    source ./port-forward.sh

    # Run cargo test locally using the newly exported env vars.
    cargo test

>NOTE: The port-forward script will leave `kubectl` process running in the background to forward the ports.
The script kills those processes and creates new ones. However if you need you can kill them directly.
The script should be run anytime a pod in the network restarts.

When debugging a test failure it can be helpful to visualize the current network topology.
Use this script:

    node topology.mjs

The script will create a `topology.svg` (view it in a browser) of how each of the nodes are connected to one another.


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
