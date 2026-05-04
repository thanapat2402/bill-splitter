#!/bin/bash

get_json_value() {
  echo "$1" | grep -o "\"$2\":[^,}]*" | head -1 | cut -d':' -f2 | sed 's/"//g'
}

echo "Step 1: CREATE TRIP"
CREATE_RESP=$(curl -s -i -X POST https://edpcqatatjkfgjxnogvq.functions.supabase.co/create-trip \
  -H "Content-Type: application/json" \
  -d '{"data":{"schemaVersion":1,"persons":["Alice","Bob"],"expenses":[{"id":1,"name":"Dinner","amount":200,"subExpenses":[],"paidBy":"Alice","splitAmong":["Alice","Bob"],"date":"2026-04-21T18:00:00.000Z"}]}}')

CREATE_STATUS=$(echo "$CREATE_RESP" | grep HTTP | awk '{print $2}')
CREATE_BODY=$(echo "$CREATE_RESP" | sed -n '/{/,/}/p' | tr -d '\n\r')
echo "Status: $CREATE_STATUS"
echo "Body: $CREATE_BODY"

EDIT_TOKEN=$(get_json_value "$CREATE_BODY" "editToken")
VIEW_TOKEN=$(get_json_value "$CREATE_BODY" "viewToken")
INITIAL_VERSION=$(get_json_value "$CREATE_BODY" "version")

echo "Tokens - View: $VIEW_TOKEN, Edit: $EDIT_TOKEN, Version: $INITIAL_VERSION"

echo -e "\nStep 3: LOAD TRIP (VIEW TOKEN)"
LOAD1_RESP=$(curl -s -i -X POST https://edpcqatatjkfgjxnogvq.functions.supabase.co/load-trip -H "Content-Type: application/json" -d "{\"token\":\"$VIEW_TOKEN\"}")
echo "Status: $(echo "$LOAD1_RESP" | grep HTTP | awk '{print $2}')"
echo "Body: $(echo "$LOAD1_RESP" | sed -n '/{/,/}/p')"

echo -e "\nStep 4: GET TRIP VERSION (EDIT TOKEN)"
VER_RESP=$(curl -s -i -X POST https://edpcqatatjkfgjxnogvq.functions.supabase.co/get-trip-version -H "Content-Type: application/json" -d "{\"token\":\"$EDIT_TOKEN\"}")
echo "Status: $(echo "$VER_RESP" | grep HTTP | awk '{print $2}')"
echo "Body: $(echo "$VER_RESP" | sed -n '/{/,/}/p')"

echo -e "\nStep 5: SAVE TRIP (EDIT TOKEN, 220 amount)"
SAVE_RESP=$(curl -s -i -X POST https://edpcqatatjkfgjxnogvq.functions.supabase.co/save-trip \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$EDIT_TOKEN\",\"expectedVersion\":$INITIAL_VERSION,\"data\":{\"schemaVersion\":1,\"persons\":[\"Alice\",\"Bob\"],\"expenses\":[{\"id\":1,\"name\":\"Dinner\",\"amount\":220,\"subExpenses\":[],\"paidBy\":\"Alice\",\"splitAmong\":[\"Alice\",\"Bob\"],\"date\":\"2026-04-21T18:00:00.000Z\"}]}}")
echo "Status: $(echo "$SAVE_RESP" | grep HTTP | awk '{print $2}')"
echo "Body: $(echo "$SAVE_RESP" | sed -n '/{/,/}/p')"

echo -e "\nStep 6: LOAD TRIP AGAIN (VIEW TOKEN)"
LOAD2_RESP=$(curl -s -i -X POST https://edpcqatatjkfgjxnogvq.functions.supabase.co/load-trip -H "Content-Type: application/json" -d "{\"token\":\"$VIEW_TOKEN\"}")
echo "Status: $(echo "$LOAD2_RESP" | grep HTTP | awk '{print $2}')"
echo "Body: $(echo "$LOAD2_RESP" | sed -n '/{/,/}/p')"
