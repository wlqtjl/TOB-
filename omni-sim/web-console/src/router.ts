/**
 * Simple hash-based SPA router for the Omni-Sim Web Console.
 *
 * Routes are defined as patterns like "/entity/:id" and matched against
 * the URL hash (e.g. #/entity/3). Supports parameter extraction.
 */

export type RouteHandler = (params: Record<string, string>) => void;

interface RouteEntry {
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: RouteEntry[] = [];
  private currentPath = "";

  /** Register a route. Path patterns support :param placeholders. */
  on(path: string, handler: RouteHandler): void {
    const paramNames: string[] = [];
    const regexStr = path.replace(/:(\w+)/g, (_match, name: string) => {
      paramNames.push(name);
      return "([^/]+)";
    });
    this.routes.push({
      pattern: new RegExp(`^${regexStr}$`),
      paramNames,
      handler,
    });
  }

  /** Programmatic navigation. */
  navigate(path: string): void {
    window.location.hash = `#${path}`;
  }

  /** Resolve the current hash to a route handler. */
  resolve(): void {
    const hash = window.location.hash.slice(1) || "/";
    this.currentPath = hash;

    for (const route of this.routes) {
      const match = hash.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        route.handler(params);
        this.updateNavActive(hash);
        return;
      }
    }

    // Fallback: navigate to dashboard
    if (hash !== "/") {
      this.navigate("/");
    }
  }

  /** Get current route path. */
  get path(): string {
    return this.currentPath;
  }

  /** Start listening to hash changes. */
  start(): void {
    window.addEventListener("hashchange", () => this.resolve());
    this.resolve();
  }

  /** Update active state on nav links. */
  private updateNavActive(hash: string): void {
    document.querySelectorAll(".nav-link").forEach((el) => {
      const href = el.getAttribute("href") ?? "";
      const linkPath = href.startsWith("#") ? href.slice(1) : href;
      // Match exact or prefix for sub-routes
      const isActive =
        linkPath === hash ||
        (linkPath !== "/" && hash.startsWith(linkPath));
      el.classList.toggle("nav-active", isActive);
    });
  }
}
