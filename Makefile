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
# Name for the test suite image, without any tag
TEST_SUITE_IMAGE_NAME ?= public.ecr.aws/r5b3e0r5/3box/ceramic-tests-suite
# Full path of the test suite image with a tag
TEST_SUITE_IMAGE ?= ${TEST_SUITE_IMAGE_NAME}:${BUILD_TAG}

CARGO = RUSTFLAGS="-D warnings" cargo
CARGO_RUN = ${CARGO} run --locked --profile ${BUILD_PROFILE}
CARGO_BUILD = ${CARGO} build --locked --profile ${BUILD_PROFILE}


# Command to run the hermetic driver
# Defaults to using cargo run
HERMETIC_CMD ?= ${CARGO_RUN} --bin hermetic-driver --

PNPM = pnpm

.PHONY: all
all: check-fmt check-clippy test

.PHONY: build
build: release driver suite

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
	${CARGO_BUILD} -p hermetic-driver

.PHONY: suite
suite:
	cd suite && ${PNPM} install && ${PNPM} run build

.PHONY: check-fmt
check-fmt:
	${CARGO} fmt --all -- --check

.PHONY: check-clippy
check-clippy:
	# Check with default features
	${CARGO} clippy --workspace
	# Check with all features
	${CARGO} clippy --workspace --all-features

.PHONY: check-suite
check-suite:
	./ci-scripts/check_deps.sh

.PHONY: build-suite
build-suite:
	BUILD_PROFILE=${BUILD_PROFILE} IMAGE_NAME=${TEST_SUITE_IMAGE_NAME} NO_PUSH=true ./ci-scripts/publish_suite.sh ${BUILD_TAG}

.PHONY: publish-suite
publish-suite:
	BUILD_PROFILE=${BUILD_PROFILE} IMAGE_NAME=${TEST_SUITE_IMAGE_NAME} ./ci-scripts/publish_suite.sh ${BUILD_TAG}

# TODO Remove this target when the flavors are refactored away
.PHONY: publish-tests-property
publish-tests-property:
	BUILD_PROFILE=${BUILD_PROFILE} ./ci-scripts/publish_property.sh ${BUILD_TAG}

.PHONY: hermetic-tests
hermetic-tests:
	${HERMETIC_CMD} test \
		--network "${TEST_NETWORK}" \
		--flavor smoke \
		--suffix "${BUILD_TAG}" \
		--clean-up \
		--test-image ${TEST_SUITE_IMAGE}

# TODO Remove this target:
# Remove flavor concept from driver.
# We should have a single test suite with different kinds of tests
# within the suite.
.PHONY: prop-test
prop-test:
	# Run tests using BUILD_TAG image
	${HERMETIC_CMD} test \
		--network "${TEST_NETWORK}" \
		--flavor prop \
		--suffix "${BUILD_TAG}" \
		--clean-up \
		--test-image public.ecr.aws/r5b3e0r5/3box/ceramic-tests-property:${BUILD_TAG}
