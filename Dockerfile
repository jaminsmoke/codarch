# syntax=docker/dockerfile:1

# La app web viaja dentro del CLI: la imagen es una instalación de `codarch`
# con la web ya compilada. No hay un servidor nuevo (ADR 0044).

FROM node:22-bookworm AS build

WORKDIR /src

# tree-sitter compila un binding nativo; el resto de la imagen no lo necesita.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY . .

# Sin los scripts de instalación no se descarga Electron (no hace falta aquí).
RUN npm ci --ignore-scripts
RUN npm rebuild esbuild tree-sitter tree-sitter-javascript tree-sitter-typescript

RUN npm run web:build
RUN npm run build:cli

# El paquete del CLI ya lleva `web/` dentro. Se instala aparte para que el
# runtime copie una carpeta autocontenida, sin depender de npm global.
#
# npm 12 bloquea los install scripts que no estén cubiertos por `allowScripts`.
# El paquete publicado no puede traer esta lista (depende de cómo se instale),
# así que la pone la imagen antes de instalar. Si cambian las versiones de los
# bindings nativos, hay que actualizar estas cuatro claves.
RUN mkdir -p /opt/codarch \
  && printf '%s\n' '{"private":true,"allowScripts":{"tree-sitter@0.25.1":true,"tree-sitter@0.21.1":true,"tree-sitter-javascript@0.23.1":true,"tree-sitter-typescript@0.23.2":true}}' > /opt/codarch/package.json \
  && cd apps/cli/dist \
  && npm pack --pack-destination /tmp \
  && npm install --prefix /opt/codarch --no-audit --no-fund /tmp/codarch-*.tgz

FROM node:22-bookworm-slim AS runtime

LABEL org.opencontainers.image.title="CodArch Web" \
  org.opencontainers.image.description="La app web de CodArch en un contenedor local" \
  org.opencontainers.image.source="https://github.com/jaminsmoke/codarch" \
  org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production

# El análisis lee el churn y el historial con git; el runtime lo necesita.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/* \
  && git config --system --add safe.directory /workspace \
  && mkdir -p /workspace \
  && chown node:node /workspace

COPY --from=build /opt/codarch /opt/codarch

WORKDIR /workspace
USER node

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4173/data/meta.json').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

STOPSIGNAL SIGTERM

ENTRYPOINT ["node", "/opt/codarch/node_modules/codarch/index.js"]
CMD ["serve", "/workspace", "--host", "0.0.0.0", "--port", "4173"]
