import { handleOracle } from './handler.js';
Deno.serve((request: Request) => handleOracle(request, (key: string) => Deno.env.get(key) || ''));
