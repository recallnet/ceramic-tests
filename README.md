# Rust Ceramic Migration Tests

Tests needed to verify the migration from [Kubo](https://github.com/ceramicnetwork/go-ipfs-daemon) to
[rust-ceramic](https://github.com/3box/rust-ceramic) when used with
[Ceramic](https://github.com/ceramicnetwork/js-ceramic) nodes.

## Design

This crate provides two entities:

* A test driver (`ceramic-tests-driver`).
* A set of tests to run (`ceramic-tests-property`).

The `ceramic-tests-driver` handles creating a network and running an test image against the network.

The set of tests are compiled into a docker image that can run as a job within the network.
If the job exits without error the tests have passed.

## Flavors

There are several test flavors:

* Property based tests
* Smoke tests

More will be added over time.

The property based tests, test a specific property of a network (i.e. writes can be read).
These tests do not assume any network topology.
Property tests live in this repo as Rust integration tests, see the `/property/tests` directory.

The smoke tests, test specific behaviors of a network end to end.
These tests do not assume any network topology.
Smoke tests live outside of this repo.


## Running tests locally

Tests are run in CI via the build docker image. However locally its useful to be able to run the tests without doing an image build.
There are some helpful scripts in this repo to make testing locally possible:

    # Create the network
    kubectl apply -f networks/basic-rust.yaml

    # Wait for network to be ready then,
    # port forward local ports into each ceramic node.
    # We `source` the script so it can export the env vars.
    source ./port-forward.sh

    # Run cargo test locally using the newly exported env vars.
    # Optionaly you can use `make test`
    cargo test

>NOTE: The port-forward script will leave `kubectl` process running in the background to forward the ports.
The script kills those processes and creates new ones. However if you need you can kill them directly.
The script should be run anytime a pod in the network restarts.


### Visualizing Topology

When debugging a test failure it can be helpful to visualize the current network topology.
Use this script:

    node topology.mjs

The script will create a `topology.svg` (view it in a browser) of how each of the nodes are connected to one another.

## Using make

Make provides targets for each flavor of test, i.e. `make smoke-test` or `make prop-test`.
These targets leverage the `ceramic-tests-driver` to create the network and run the test image.

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
