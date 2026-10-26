import { finderData } from "../../lib/finder";

export const GET = () => new Response(JSON.stringify(finderData("en")), { headers: { "Content-Type": "application/json; charset=utf-8" } });
