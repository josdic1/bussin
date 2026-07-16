# Bussin — Railway deployment

This build serves the React frontend and Express API from one Railway service.
Railway runs the safe database initializer before each deployment and checks
`/api/health` before considering the deployment healthy.

## Required Railway services

1. One empty service named `bussin`.
2. One PostgreSQL service in the same Railway project.

## Required variables on the `bussin` service

- `NODE_ENV=production`
- `DATABASE_URL` — add this as a reference to the PostgreSQL service's
  `DATABASE_URL` variable.
- `PARENT_ACCESS_CODE`
- `DRIVER_ACCESS_CODE`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `OPENROUTESERVICE_API_KEY`
- `JCC_ADDRESS`

Do not set `PORT` or `VITE_API_URL`. Railway supplies the port and the frontend
uses the same public origin as the API.

## Deploy from the project directory

```bash
npm install -g @railway/cli
railway login
railway init
railway add --database postgres
railway add --service bussin
railway service bussin
railway open
```

In the Railway dashboard, add the required variables to the `bussin` service.
Then return to the terminal:

```bash
railway up --service bussin
railway domain --service bussin
```

Open the generated HTTPS domain. Parent is `/`; Driver is `/driver`.

## Verify

```bash
curl -fsS https://YOUR-DOMAIN.railway.app/api/health
```

Expected result: JSON containing `"ok":true`.
