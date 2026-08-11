const port = process.env.CHROME_DEBUG_PORT || "9224";
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const tab = tabs.find((entry) => entry.type === "page" && entry.url.includes("/product/"));
if (!tab?.webSocketDebuggerUrl) throw new Error("Product test tab was not found.");

const socket = new WebSocket(tab.webSocketDebuggerUrl);
const pending = new Map();
let messageId = 0;
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
};
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++messageId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  return result.result.value;
};
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const waitFor = async (expression, timeout = 10_000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await wait(200);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
};

await send("Runtime.enable");
await waitFor("Boolean(document.querySelector('.product-actions .button.primary'))");
await evaluate("localStorage.removeItem('nora-trimtex-cart'); location.reload(); true");
await waitFor("Boolean(document.querySelector('.product-actions .button.primary'))");
await wait(1_000);
await evaluate("document.querySelector('.product-actions .button.primary').click(); true");
await waitFor("JSON.parse(localStorage.getItem('nora-trimtex-cart') || '[]').length === 1");
await evaluate("document.querySelector('[data-cart-target]').click(); true");
await waitFor("Boolean(document.querySelector('.drawer-item-image img'))");
await waitFor("document.querySelector('.drawer-item-image img').complete");

const result = await evaluate(`(() => {
  const source = document.querySelector('.product-detail-image img');
  const cartImage = document.querySelector('.drawer-item-image img');
  const stored = JSON.parse(localStorage.getItem('nora-trimtex-cart') || '[]')[0];
  return {
    sourceVisible: Boolean(source && source.getBoundingClientRect().width > 0 && getComputedStyle(source).visibility !== 'hidden'),
    cartImageLoaded: Boolean(cartImage && cartImage.complete && cartImage.naturalWidth > 0),
    cartImageSource: cartImage?.getAttribute('src') || '',
    storedImage: stored?.image || '',
    itemCount: document.querySelectorAll('.drawer-item').length,
  };
})()`);

socket.close();
console.log(JSON.stringify(result, null, 2));
if (!result.sourceVisible || !result.cartImageLoaded || result.itemCount !== 1 || !result.storedImage) process.exitCode = 1;
