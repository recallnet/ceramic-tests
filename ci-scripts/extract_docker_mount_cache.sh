#!/bin/bash
#
# Copy mounted cache data out of docker so it can be cached via Github actions

cat > Dockerfile << 'EOF'
FROM busybox:1
ARG UID=1001
ARG GID=1001
# This mount command must be identical to the mount command in the real Dockerfile
# in order to reuse the same mount cache.
RUN --mount=type=cache,target=/home/builder/.cargo,uid=$UID,gid=$GID \
	--mount=type=cache,target=/home/builder/ceramic-tests/target,uid=$UID,gid=$GID \
    mkdir -p /var/cache/ && \
    tar -cf /var/cache/cache.tar -C /home/builder .cargo ceramic-tests/target
EOF

docker buildx build  --tag cache:extract --load --progress plain .
docker rm -f cache-container
docker create --name cache-container cache:extract
docker cp cache-container:/var/cache/cache.tar ./cache.tar

rm Dockerfile
