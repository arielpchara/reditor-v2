FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/package-lock.json ./web/
RUN npm ci && npm ci --prefix web
COPY . .
RUN npm run build:all

FROM node:20-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssh-server \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --create-home --shell /bin/bash demo \
  && echo 'demo:demo' | chpasswd \
  && mkdir -p /var/run/sshd /work

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY docker/sshd_config /etc/ssh/sshd_config
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/sample.yaml /opt/reditor/sample.yaml
RUN chmod +x /usr/local/bin/entrypoint.sh

VOLUME /work
EXPOSE 22

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["serve", "/work/config.yaml", "--host", "127.0.0.1", "--create"]
