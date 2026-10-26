import { compareIndex } from "../../lib/compare-index";

export const GET = () => new Response(JSON.stringify(compareIndex("en")), { headers: { "Content-Type": "application/json; charset=utf-8" } });
