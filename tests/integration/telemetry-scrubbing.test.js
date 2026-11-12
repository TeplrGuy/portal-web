const test = require("node:test");
const assert = require("node:assert/strict");
const { scrubRequest } = require("../../src/telemetry");

function getAttributes(request) {
  const attributes = new Map();
  scrubRequest({ setAttribute: (key, value) => attributes.set(key, value) }, request);
  return attributes;
}

test("redacts absolute private URLs and query values from telemetry attributes", () => {
  const attributes = getAttributes({
    url: "https://inventory.internal/inventory/SKU-PRIVATE-SENTINEL?token=QUERY-PRIVATE-SENTINEL"
  });

  assert.equal(attributes.get("url.path"), "/[redacted]");
  assert.equal(attributes.get("http.route"), "/[redacted]");
  assert.equal(attributes.get("url.full"), "[redacted]");
  assert.equal(attributes.get("http.url"), "[redacted]");
  assert.equal(attributes.get("url.query"), "[redacted]");
  assert.doesNotMatch([...attributes.values()].join(" "), /PRIVATE-SENTINEL|inventory\.internal/);
});

test("normalizes order identifiers and strips query strings from route telemetry", () => {
  const attributes = getAttributes({
    url: "/api/orders/ORD-PRIVATE-SENTINEL?customer=CUST-PRIVATE-SENTINEL"
  });

  assert.equal(attributes.get("url.path"), "/api/orders/:orderId");
  assert.equal(attributes.get("http.route"), "/api/orders/:orderId");
  assert.equal(attributes.get("url.full"), "[redacted]");
  assert.equal(attributes.get("url.query"), "[redacted]");
  assert.doesNotMatch([...attributes.values()].join(" "), /PRIVATE-SENTINEL/);
});
