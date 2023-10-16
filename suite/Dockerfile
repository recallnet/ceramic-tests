FROM node:16-alpine

RUN npm install -g pnpm

WORKDIR /app

RUN apk add --no-cache curl jq

COPY package.json pnpm-*.yaml jest.config.json tsconfig.json entrypoint.sh update.sh ./

# install all npm dependencies including dev dependencies
RUN pnpm install

# copy all files not excluded by .dockerignore of current directory to docker container
COPY src/ ./src

RUN pnpm run build

ENTRYPOINT ["/app/entrypoint.sh", "run", "start"]
