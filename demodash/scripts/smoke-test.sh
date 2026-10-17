#!/usr/bin/env bash
# End-to-end API smoke test against a running dev server with seeded data.
#   BASE=http://localhost:3000 bash scripts/smoke-test.sh
# NOTE: the booking endpoint is rate limited per IP (6 / 10 min); restart the dev server between repeated runs.
set -uo pipefail
BASE="${BASE:-http://localhost:3000}"
J='Content-Type: application/json'
pass=0; fail=0
jar() { echo "/tmp/dd-$1.jar"; }
check() { # name expected_status actual_status [body]
  if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "  ✓ $1"; else fail=$((fail+1)); echo "  ✗ $1 (expected $2, got $3) ${4:-}"; fi
}
req() { # jarname method path [json]  -> sets $STATUS, $BODY
  local out; out=$(curl -s -w '\n%{http_code}' -b "$(jar "$1")" -c "$(jar "$1")" -X "$2" -H "$J" ${4:+-d "$4"} "$BASE$3")
  STATUS="${out##*$'\n'}"; BODY="${out%$'\n'*}"
}
jget() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1" <<<"$BODY" 2>/dev/null || echo "None"; }
rm -f /tmp/dd-*.jar

echo "Public"
req anon GET /api/products; check "list products" 200 "$STATUS"; PID=$(jget "['products'][0]['id']")
req anon GET /api/products/$PID; check "product detail" 200 "$STATUS"
req anon GET "/api/products?segment=premium"; check "segment filter" 200 "$STATUS"

echo "Auth / RBAC"
req anon GET /api/admin/bookings; check "admin list needs login" 401 "$STATUS"
req admin POST /api/auth/login '{"identifier":"admin@demodash.local","password":"wrong"}'; check "bad password" 401 "$STATUS"
req admin POST /api/auth/login '{"identifier":"admin@demodash.local","password":"Admin@12345"}'; check "admin login" 200 "$STATUS"
req emp POST /api/auth/login '{"identifier":"employee@demodash.local","password":"Employee@12345"}'; check "employee login" 200 "$STATUS"
req rider POST /api/delivery/login '{"identifier":"9000000001","password":"Rider@12345"}'; check "delivery login (phone)" 200 "$STATUS"
req emp POST /api/delivery/login '{"identifier":"employee@demodash.local","password":"Employee@12345"}'; check "employee blocked from delivery login" 403 "$STATUS"
req rider GET /api/admin/bookings; check "delivery blocked from admin API" 403 "$STATUS"

echo "Customer booking"
PHONE=9$(printf '%09d' $((RANDOM*RANDOM % 1000000000)))
req anon POST /api/otp/send "{\"phone\":\"$PHONE\"}"; check "send phone otp" 200 "$STATUS"; CODE=$(jget "['devCode']")
req anon POST /api/otp/verify "{\"phone\":\"$PHONE\",\"code\":\"0000x\"}"; check "otp validation" 400 "$STATUS"
req anon POST /api/bookings "{\"productId\":\"$PID\",\"name\":\"Test Customer\",\"phone\":\"$PHONE\",\"address\":\"12 MG Road, Bengaluru 560001\"}"; check "booking without OTP rejected" 400 "$STATUS"
req anon POST /api/otp/verify "{\"phone\":\"$PHONE\",\"code\":\"$CODE\"}"; check "verify phone otp" 200 "$STATUS"; TOKEN=$(jget "['token']")
req anon POST /api/bookings "{\"productId\":\"$PID\",\"name\":\"Test Customer\",\"phone\":\"123\",\"address\":\"12 MG Road, Bengaluru 560001\",\"otpToken\":\"$TOKEN\"}"; check "invalid phone rejected" 400 "$STATUS"
req anon POST /api/bookings "{\"productId\":\"$PID\",\"name\":\"Test Customer\",\"phone\":\"$PHONE\",\"address\":\"12 MG Road, Bengaluru 560001\",\"lat\":12.9716,\"lng\":77.5946,\"otpToken\":\"$TOKEN\"}"; check "create booking" 201 "$STATUS"; CODE_B=$(jget "['code']")
req anon GET /api/bookings/$CODE_B; check "track booking" 200 "$STATUS"
echo "$BODY" | grep -q "$PHONE" && check "tracking hides customer phone" ok leak || check "tracking hides customer phone" ok ok
OTP=$(jget "['booking']['handoverOtp']"); [ "$OTP" = "None" ] && check "otp hidden while PENDING" ok ok || check "otp hidden while PENDING" ok shown
req anon GET /api/bookings/DD-NOPE0000; check "unknown booking" 404 "$STATUS"

echo "Admin flow"
req admin GET "/api/admin/bookings?q=$CODE_B"; check "search bookings" 200 "$STATUS"; BID=$(jget "['bookings'][0]['id']")
req admin GET /api/admin/delivery-people; DPID=$(jget "[0]" >/dev/null; python3 -c "import sys,json; print([p['id'] for p in json.load(sys.stdin)['deliveryPeople'] if p['phone']=='9000000001'][0])" <<<"$BODY")
req emp PATCH /api/admin/bookings/$BID/assign "{\"deliveryPersonId\":\"$DPID\"}"; check "employee cannot assign" 403 "$STATUS"
req emp PATCH /api/admin/bookings/$BID/outcome '{"outcome":"NOT_PURCHASED","notes":"x"}'; check "employee cannot set outcome" 403 "$STATUS"
req rider GET /api/delivery/assignments; check "rider sees assignments" 200 "$STATUS"
req admin PATCH /api/admin/bookings/$BID/assign "{\"deliveryPersonId\":\"$DPID\"}"; check "admin assigns" 200 "$STATUS"
req anon GET /api/bookings/$CODE_B; OTP=$(jget "['booking']['handoverOtp']"); [ "$OTP" != "None" ] && check "customer sees handover OTP once assigned" ok ok || check "customer sees OTP" ok none

echo "Delivery flow"
req rider GET /api/delivery/assignments; check "assignment visible to rider" 200 "$STATUS"; echo "$BODY" | grep -q '"otp"' && check "delivery payload hides OTP" ok leak || check "delivery payload hides OTP" ok ok
req rider PATCH /api/delivery/assignments/$BID/status '{"status":"ARRIVED"}'; check "cannot skip OUT_FOR_DEMO" 409 "$STATUS"
req rider PATCH /api/delivery/assignments/$BID/status '{"status":"OUT_FOR_DEMO"}'; check "on the way" 200 "$STATUS"
req rider PATCH /api/delivery/location '{"lat":12.96,"lng":77.59}'; check "post location" 200 "$STATUS"
req anon GET /api/bookings/$CODE_B; ETA=$(jget "['booking']['etaMinutes']"); [ "$ETA" != "None" ] && check "customer sees ETA ($ETA min)" ok ok || check "ETA" ok none
req rider PATCH /api/delivery/assignments/$BID/status '{"status":"ARRIVED"}'; check "arrived" 200 "$STATUS"
req rider PATCH /api/delivery/assignments/$BID/status '{"status":"DEMO_IN_PROGRESS"}'; check "demo blocked before OTP" 409 "$STATUS"
req rider POST /api/delivery/assignments/$BID/verify-otp '{"otp":"abcd"}'; check "malformed otp" 400 "$STATUS"
req anon GET /api/bookings/$CODE_B; REALOTP=$(jget "['booking']['handoverOtp']")
WRONG=$([ "$REALOTP" = "1234" ] && echo 4321 || echo 1234)
req rider POST /api/delivery/assignments/$BID/verify-otp "{\"otp\":\"$WRONG\"}"; check "wrong otp" 400 "$STATUS"
req rider POST /api/delivery/assignments/$BID/verify-otp "{\"otp\":\"$REALOTP\"}"; check "correct otp" 200 "$STATUS"
req rider PATCH /api/delivery/assignments/$BID/status '{"status":"DEMO_IN_PROGRESS"}'; check "demo started" 200 "$STATUS"
req rider PATCH /api/delivery/assignments/$BID/status '{"status":"COMPLETED","outcome":"PURCHASED_OFFLINE"}'; check "purchase needs amount" 400 "$STATUS"
req rider PATCH /api/delivery/assignments/$BID/status '{"status":"COMPLETED","outcome":"PURCHASED_OFFLINE","saleAmount":9200,"notes":"Paid cash"}'; check "completed: purchased" 200 "$STATUS"
req anon POST /api/bookings/$CODE_B/rating '{"rating":5,"comment":"Great"}'; check "customer rates" 200 "$STATUS"
req anon POST /api/bookings/$CODE_B/rating '{"rating":4}'; check "double rating blocked" 409 "$STATUS"

echo "Analytics (employee)"
req emp GET /api/admin/analytics/products; check "product analytics" 200 "$STATUS"
python3 - <<PY
import json
d=json.loads('''$BODY''')
row=[p for p in d['products'] if p['product_id']=='$PID'][0]
print("   ", {k:row[k] for k in ['total_demo_bookings','completed_demos','purchases','not_purchased','pending','conversion_rate','revenue']})
PY
req emp GET /api/admin/analytics/products/$PID/bookings; check "product drill-down" 200 "$STATUS"
req emp GET /api/admin/analytics/summary; check "summary" 200 "$STATUS"
req emp GET "/api/admin/bookings?outcome=PURCHASED_OFFLINE&from=2020-01-01&to=2099-01-01"; check "filters" 200 "$STATUS"

echo "Products (RBAC)"
NEWP='{"brand":"Test","model":"Phone","price":9999,"ramStorage":"4GB / 64GB","color":"Black","images":[],"specs":{"Display":"6in"}}'
req emp POST /api/admin/products "$NEWP"; check "employee creates product" 201 "$STATUS"; NID=$(jget "['product']['id']")
req emp PATCH /api/admin/products/$NID '{"price":10999,"demoAvailable":false}'; check "employee edits product" 200 "$STATUS"
req anon GET /api/products/$NID; check "new product visible to public" 200 "$STATUS"
req emp DELETE /api/admin/products/$NID; check "employee cannot delete" 403 "$STATUS"
req admin DELETE /api/admin/products/$NID; check "admin deletes" 200 "$STATUS"
RIDER_PHONE=9$(printf '%09d' $((RANDOM*RANDOM % 1000000000)))
req admin POST /api/admin/users "{\"role\":\"DELIVERY\",\"name\":\"New Rider\",\"phone\":\"$RIDER_PHONE\",\"password\":\"Passw0rd!x\"}"; check "admin creates rider" 201 "$STATUS"
req emp GET /api/admin/users; check "employee cannot list users" 403 "$STATUS"

echo; echo "passed=$pass failed=$fail"; [ "$fail" = 0 ]
