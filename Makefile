# Makefile provides an API for CI related tasks
# Using the makefile is not required however CI
# uses the specific targets within the file.
# Therefore may be useful in ensuring a change
# is ready to pass CI checks.

# Set Rust build profile, one of release or dev.
BUILD_PROFILE ?= release
# Unique identifier for builds and tags.
BUILD_TAG ?= dev-run
# Path to network to test against.
TEST_NETWORK ?= ./networks/basic-go-rust.yaml

CARGO = RUSTFLAGS="-D warnings" cargo
CARGO_RUN = ${CARGO} run --locked --profile ${BUILD_PROFILE}
CARGO_BUILD = ${CARGO} build --locked --profile ${BUILD_PROFILE}

# Command to run the test driver
# Defaults to using cargo run
DRIVER_CMD = ${CARGO_RUN} --bin ceramic-tests-driver --

.PHONY: all
all: check-fmt check-clippy test

.PHONY: build
build: release driver

.PHONY: release
release:
	./ci-scripts/build-test-binaries.sh release

.PHONY: dev
dev:
	./ci-scripts/build-test-binaries.sh dev

.PHONY: test
test:
	${CARGO} test --locked --all-features -- --nocapture

.PHONY: driver
driver:
	${CARGO_BUILD} -p ceramic-tests-driver

.PHONY: check-fmt
check-fmt:
	${CARGO} fmt --all -- --check

.PHONY: check-clippy
check-clippy:
	# Check with default features
	${CARGO} clippy --workspace
	# Check with all features
	${CARGO} clippy --workspace --all-features

.PHONY: publish-tests-property
publish-tests-property:
	BUILD_PROFILE=${BUILD_PROFILE} ./ci-scripts/publish_property.sh ${BUILD_TAG}

.PHONY: smoke-test
smoke-test:
	${DRIVER_CMD} test \
		--network "${TEST_NETWORK}" \
		--flavor smoke \
		--suffix "${BUILD_TAG}" \

.PHONY: prop-test
prop-test:
	# Run tests using BUILD_TAG image
	${DRIVER_CMD} test \
		--network "${TEST_NETWORK}" \
		--flavor prop \
		--suffix "${BUILD_TAG}" \
		--clean-up \
		--test-image public.ecr.aws/r5b3e0r5/3box/ceramic-tests-property:${BUILD_TAG}
