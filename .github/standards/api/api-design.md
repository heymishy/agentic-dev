# API Design Standards

<!-- Fill in your REST API rules. Examples below — replace with your own. -->

## Versioning

[e.g. All endpoints are prefixed with /api/v1/. Breaking changes require a new version prefix.]

## Request / response envelope

[e.g. All responses use { data: ..., errors: [], meta: { page, total } }]

## HTTP status codes

[e.g. 200 OK, 201 Created, 400 Bad Request (validation), 401 Unauthenticated, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error]

## Error format

[e.g. { errors: [{ code: "VALIDATION_ERROR", field: "email", message: "..." }] }]

## Pagination

[e.g. Cursor-based. Query params: cursor, limit (max 100). Response meta includes nextCursor.]

## Authentication

[e.g. Bearer token in Authorization header. No API keys in query strings.]

## Naming conventions

[e.g. Plural nouns for resources: /users, /orders. kebab-case for multi-word segments.]
