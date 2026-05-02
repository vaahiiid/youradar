import { ScrollViewStyleReset } from "expo-router/html";
import React, { type PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; }

html, body, #root {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  margin: 0;
  padding: 0;
  background-color: #FFFFFF;
}

body {
  min-height: 100dvh;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

#root > div {
  max-width: 100%;
  overflow-x: hidden;
}

button, [role="button"], a, [tabindex] {
  outline: none !important;
  -webkit-tap-highlight-color: transparent;
}

button:focus, button:focus-visible,
[role="button"]:focus, [role="button"]:focus-visible,
a:focus, a:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

button, [role="button"], [role="tab"] {
  background-color: transparent !important;
  background-image: none !important;
}

[role="tablist"] [role="button"]:hover,
[role="tablist"] [role="button"]:active,
[role="tablist"] [role="button"]:focus {
  background-color: transparent !important;
  background-image: none !important;
  outline: none !important;
  box-shadow: none !important;
}
`;
