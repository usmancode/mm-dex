FROM node:alpine

# Install Git FIRST (as root)
RUN apk update && apk add --no-cache git

# Then configure permissions
RUN mkdir -p /usr/src/node-app && chown -R node:node /usr/src/node-app

WORKDIR /usr/src/node-app

COPY package.json yarn.lock ./

# Switch to non-root user AFTER system dependencies
USER node

RUN yarn install --pure-lockfile

COPY --chown=node:node . .

EXPOSE 3000