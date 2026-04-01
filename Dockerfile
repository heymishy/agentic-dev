FROM node:20-alpine

WORKDIR /app

# The board server uses only Node.js built-in modules — no npm install needed.
COPY scripts/board-server.js ./scripts/

EXPOSE 3000

ENV QUEUE_ROOT=/app/queue

CMD ["node", "scripts/board-server.js"]
