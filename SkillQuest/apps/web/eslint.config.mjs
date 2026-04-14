import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    ignores: [".next/", "node_modules/"],
  },
  {
    // Relax strict rules introduced in react-hooks v7+ that flag
    // common patterns used throughout the existing codebase.
    // These can be tightened incrementally in future PRs.
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
];
export default config;
