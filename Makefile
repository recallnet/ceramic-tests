# Makefile provides an API for CI related tasks
# Using the makefile is not required however CI
# uses the specific targets within the file.
# Therefore may be useful in ensuring a change
# is ready to pass CI checks.

.PHONY: all
all: check-fmt check-clippy test

.PHONY: build
build: release

.PHONY: release
release:
	./ci-scripts/build-test-binaries.sh release

.PHONY: debug
debug:
	./ci-scripts/build-test-binaries.sh debug

.PHONY: test
test:
	cargo test --locked --all-features -- --nocapture

.PHONY: check-fmt
check-fmt:
	cargo fmt --all -- --check

.PHONY: check-clippy
check-clippy:
	# Check with default features
	cargo clippy --workspace -- -D warnings
	# Check with all features
	cargo clippy --workspace --all-features -- -D warnings

.PHONY: publish-docker
publish-docker:
	./ci-scripts/publish.sh

