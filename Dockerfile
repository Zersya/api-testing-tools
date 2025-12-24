# Dockerfile
FROM node:23.4.0

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun/bin/bun /usr/local/bin/bun

# create destination directory
RUN mkdir -p /home/node/app
WORKDIR /home/node/app

# update and install dependency
# RUN apk update && apk upgrade
# RUN apk add git

# copy the app, note .dockerignore
COPY . /home/node/app
RUN bun install
RUN bun run build

EXPOSE 3000

ENV NUXT_HOST=0.0.0.0

ENV NUXT_PORT=3000

CMD [ "bun", ".output/server/index.mjs" ]