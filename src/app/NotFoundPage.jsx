// src/app/NotFoundPage.tsx
// 404 Not Found page with theme-compliant design and "Go home" navigation link
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../shared/ui";
export function NotFoundPage() {
    useEffect(() => {
        document.title = "Not found | CodeLens";
    }, []);
    return (<div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none" style={{
            background: "rgb(var(--color-bg))",
            color: "rgb(var(--color-text))",
        }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-2xl" style={{
            background: "rgb(var(--color-surface))",
            border: "1px solid rgb(var(--color-border))",
        }}>
        🔍
      </div>

      <h1 className="text-3xl font-extrabold font-display tracking-tight mb-2">
        Page Not Found
      </h1>

      <p className="text-sm max-w-md mb-8 leading-relaxed" style={{ color: "rgb(var(--color-text-muted))" }}>
        The page you are looking for does not exist or has been moved. Check the URL or return to CodeLens home.
      </p>

      <Link to="/">
        <Button size="md" variant="primary">
          ← Return to Home
        </Button>
      </Link>
    </div>);
}
