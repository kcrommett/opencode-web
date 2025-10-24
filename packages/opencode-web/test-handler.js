const handler = await import("./dist/server/server.js");
const req = new Request("http://localhost:3000/");
try {
  const res = await handler.default.fetch(req);
  console.log("Response type:", res.constructor.name);
  console.log("Response status:", res.status);
  console.log("Response ok:", res.ok);
} catch (e) {
  console.error("Error:", e);
}
