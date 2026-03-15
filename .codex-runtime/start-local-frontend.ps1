$env:PORT = "3001"
$env:NEXT_PUBLIC_SITE_URL = "http://localhost:3001"
$env:NEXT_PUBLIC_API_BASE = "http://localhost:5000"
$env:NEXT_PUBLIC_IMPACT_API_BASE = "http://localhost:5005"
$env:NEXT_PUBLIC_FALAK_TENANT_ID = "11111111-1111-4111-8111-111111111111"

cmd /c npm run dev
