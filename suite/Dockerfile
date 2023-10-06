FROM node:16-alpine

RUN npm install -g pnpm

WORKDIR /app

RUN apk add --no-cache curl

COPY package.json pnpm-*.yaml jest.config.json tsconfig.json ./

# install all npm dependencies including dev dependencies
RUN pnpm install

# copy all files not excluded by .dockerignore of current directory to docker container
COPY src/ ./src

RUN pnpm run build

# allow local imports without file ending - see: https://nodejs.org/api/esm.html
# ENV NODE_OPTIONS="--experimental-specifier-resolution=node"

ENV SUITE "all"
ENV DELAY 0

CMD ["pnpm", "run", "start"]
