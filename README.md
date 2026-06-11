# Setup

1. Copy .env.example to .env

2. Start postgres

docker compose -f infra/docker-compose.yml up -d

3. Install dependencies

npm install

4. Run migrations

npx prisma migrate dev

5. Start API

npm run start:dev