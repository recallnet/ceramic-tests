#!/bin/bash
#
# Copy cache data into docker mount cache

if [ ! -f cache.tar ]
then
    echo "No cache found skipping"
    exit 0
fi


cat > Dockerfile << 'EOF'
FROM busybox:1

RUN mkdir -p /var/cache/
COPY ./cache.tar /var/cache/

ARG UID=1001
ARG GID=1001
# This mount command must be identical to the mount command in the real Dockerfile
# in order to reuse the same mount cache.
RUN --mount=type=cache,target=/home/builder/.cargo,uid=$UID,gid=$GID \
	--mount=type=cache,target=/home/builder/ceramic-tests/target,uid=$UID,gid=$GID \
    tar -xpf /var/cache/cache.tar -C /home/builder
EOF

docker buildx build  --tag cache:inject --load --progress plain .
rm Dockerfile
