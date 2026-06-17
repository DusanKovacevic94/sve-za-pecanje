# Deployment

1. Provision a VPS.
2. Install Docker and Docker Compose.
3. Point DNS to the server.
4. Copy `.env.example` to `.env` and replace secrets.
5. Use production URLs and SMTP/S3 credentials.
6. Start services:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

7. Run migrations and seed shared data:

```bash
make migrate
make seed
make create-admin EMAIL=admin@example.com USERNAME=admin PASSWORD=Admin123!
```

8. Confirm:

- `GET /health`
- Homepage loads
- Registration email appears in provider logs
- Admin can approve/reject listings

Backups should include daily PostgreSQL dumps and object storage backups.

