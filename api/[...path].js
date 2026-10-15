import { proxyRequest } from "../lib/vercel-proxy.js";

export default async function handler(req, res) {
  return proxyRequest(req, res);
}
