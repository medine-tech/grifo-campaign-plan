"use client";
import Script from "next/script";
import { useRef } from "react";
import "swagger-ui-dist/swagger-ui.css";
declare global {
  interface Window {
    SwaggerUIBundle: (config: Record<string, unknown>) => unknown;
  }
}
export function ApiDocs() {
  const mount = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={mount} />
      <Script
        src="/vendor/swagger-ui-bundle.js"
        onReady={() => {
          if (mount.current)
            window.SwaggerUIBundle({
              domNode: mount.current,
              url: "/api/openapi.json",
              persistAuthorization: false,
              docExpansion: "list",
              deepLinking: true,
              displayRequestDuration: true,
              validatorUrl: null,
            });
        }}
      />
    </>
  );
}
