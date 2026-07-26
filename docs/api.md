# API

Base path: `/api/v1`

Common response:

```json
{ "data": {}, "meta": {} }
```

Common error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Podaci nisu ispravni.",
    "details": {}
  }
}
```

Implemented endpoint groups:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/verify-email`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /categories`
- `GET /categories/{slug}`
- `GET /categories/cities`
- `GET /brands`
- `GET /listings`
- `GET /listings/{slug}`
- `POST /listings`
- `PATCH /listings/{id}`
- `DELETE /listings/{id}`
- `POST /listings/{id}/archive`
- `POST /listings/{id}/mark-sold`
- `POST /listings/{id}/favorite`
- `DELETE /listings/{id}/favorite`
- `POST /listings/{id}/report`
- `POST /listings/{id}/images`
- `GET /saved-searches`
- `POST /saved-searches`
- `DELETE /saved-searches/{id}`
- `GET /conversations`
- `GET /conversations/{id}`
- `POST /listings/{id}/messages`
- `POST /conversations/{id}/messages`
- `PATCH /conversations/{id}/preferences`
- `POST /conversations/{id}/block`
- `DELETE /conversations/{id}/block`
- `POST /conversations/{id}/reports`
- `POST /reviews`
- `GET /users/profile/{username}`
- `GET /users/me/listings`
- `PATCH /users/me/profile`
- `POST /users/me/phone-verification/request`
- `POST /users/me/phone-verification/confirm`
- `GET /admin/dashboard`
- `GET /admin/listings`
- `POST /admin/listings/{id}/approve`
- `POST /admin/listings/{id}/reject`
- `POST /admin/listings/{id}/feature`
- `GET /admin/users`
- `POST /admin/users/{id}/suspend`
- `GET /admin/reports`
- `POST /admin/reports/{id}/resolve`
