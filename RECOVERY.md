# Bussin recovery copy

This is the complete camp-ready monorepo: frontend, server, shared package, database files, and the latest parent/driver interface.

The interface uses the final Anton transit-sign hierarchy, oversized 2×2 driver messages, a single location utility strip, crisp SVG bus/clock/message assets, 4px square panels, and the warm paper surface.

## Install and verify

```bash
npm install
npm run build
```

## Run

In one terminal:

```bash
npm run dev -w @bussin/server
```

In a second terminal:

```bash
npm run dev -w @bussin/frontend
```

Open http://localhost:5173/.
