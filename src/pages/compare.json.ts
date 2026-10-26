import { compareIndex } from "../lib/compare-index";

export const GET = () => new Response(JSON.stringify(compareIndex("ar")), { headers: { "Content-Type": "application/json; charset=utf-8" } });
