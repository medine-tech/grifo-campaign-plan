import assert from "node:assert/strict";
import { test } from "node:test";
import { entryLink, safeReturnPath } from "../src/lib/onboarding";

test("login keeps a known island or tool destination from the public guide", () => {
  for (const path of [
    "/dashboard",
    "/members",
    "/tokens",
    "/onboarding",
    "/islands/cazadores",
    "/islands/seguimiento",
    "/islands/ideas",
    "/islands/competencia",
    "/islands/ventas",
    "/islands/administracion",
    "/islands/referidos",
  ]) {
    const url = new URL(entryLink(path), "https://grifo.example");
    assert.equal(url.origin, "https://grifo.example");
    assert.equal(url.pathname, "/login");
    assert.equal(safeReturnPath(url.searchParams.get("next")), path);
  }
});

test("untrusted return destinations cannot create open redirects or login loops", () => {
  for (const input of [
    undefined,
    null,
    ["/tokens"],
    "/login",
    "/register",
    "https://attacker.example",
    "//attacker.example",
    "/\\attacker.example",
    "javascript:alert(1)",
    "%2F%2Fattacker.example",
    "/islands/../login",
    "/tokens?next=//attacker.example",
    "/tokens#secret",
    "/islands/unknown",
    "/dashboard\r\nLocation: https://attacker.example",
  ]) {
    assert.equal(safeReturnPath(input), "/dashboard");
  }
});
