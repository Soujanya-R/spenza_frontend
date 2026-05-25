const subscriptionId = process.argv[2];
const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

if (!subscriptionId) {
  console.log("Usage: npm run send -- <subscriptionId>");
  process.exit(1);
}

const event = {
  type: "order.created",
  payload: {
    orderId: `ORD-${Date.now()}`,
    amount: 1299,
    currency: "INR",
    customer: "Demo User",
    sentAt: new Date().toISOString()
  }
};

async function main() {
  const response = await fetch(`${backendUrl}/webhooks/${subscriptionId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event)
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
