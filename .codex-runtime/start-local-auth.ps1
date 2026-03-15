$env:FLASK_ENV = "development"
$env:SECRET_KEY = "flora-fauna-local-core-secret-2026-keep-this-local"
$env:JWT_SECRET_KEY = "falak-local-verification-secret"
$env:DATABASE_URL = "sqlite:///site.db"
$env:ALPHA_PUBLIC = "true"
$env:ALPHA_SEED = "true"
$env:ALPHA_AUTH_OPTIONAL = "false"
$env:CORS_ORIGINS = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"

python -m flask --app app run --host 0.0.0.0 --port 5000
