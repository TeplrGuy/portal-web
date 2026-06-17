# portal-web

Frontend portal for the SDLC demo program.

## What it does

- Creates orders through `api-gateway`
- Tracks order timelines by `orderId`
- Surfaces correlation IDs and deployment metadata
- Links the runtime experience back to GitHub issues and repo evidence

## Environment variables

- `PORT` - HTTP port (default `3000`)
- `API_GATEWAY_URL` - Base URL for the API gateway
- `ENVIRONMENT_NAME` - Environment label shown in the UI
- `BUILD_SHA` - Release/build identifier shown in the UI
- `GITHUB_OWNER` - GitHub owner for repo links

## Run locally

```bash
npm install
npm start
```
