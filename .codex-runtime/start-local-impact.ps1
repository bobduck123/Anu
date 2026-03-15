$env:PORT = "5005"
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/anu_falak_test?schema=falak"
$env:DIRECT_URL = "postgresql://postgres:postgres@localhost:5433/anu_falak_test?schema=falak"
$env:SHADOW_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/anu_falak_shadow?schema=falak"
$env:JWT_SECRET_KEY = "falak-local-verification-secret"
$env:BETA_ALLOW_PLACEHOLDER_INFRA = "true"

cmd /c npm run dev
