# Makefile provides an API for CI related tasks
# Using the makefile is not required however CI
# uses the specific targets within the file.
# Therefore may be useful in ensuring a change
# is ready to pass CI checks.

.PHONY: all
all: check-fmt check-clippy test

.PHONY: release
release:
	$(eval BIN=$(shell sh -c "RUSTFLAGS='-D warnings' cargo test --no-run --locked --release -q --message-format=json | jq -r 'select(.executable != null) | .executable'"))
	@mv $(BIN) ./target/release/rust-ceramic-migration-tests

.PHONY: debug
debug:
	$(eval BIN=$(shell sh -c "cargo test --no-run --locked -q --message-format=json | jq -r 'select(.executable != null) | .executable'"))
	@mv $(BIN) ./target/debug/rust-ceramic-migration-tests

.PHONY: test
test:
	# Test with default features
	cargo test --locked
	# Test with all features
	cargo test --locked --all-features

.PHONY: check-fmt
check-fmt:
	cargo fmt --all -- --check

.PHONY: check-clippy
check-clippy:
	# Check with default features
	cargo clippy --workspace --all-targets -- -D warnings
	# Check with all features
	cargo clippy --workspace --all-targets --all-features -- -D warnings

.PHONY: publish-docker
publish-docker:
	./ci-scripts/publish.sh

