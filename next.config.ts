import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

const nextConfig: NextConfig = {
  output: "standalone",
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // Allow MDX compilation from content directory via server components
  serverExternalPackages: ["@mdx-js/mdx", "@mdx-js/react"],
};

export default withMDX(nextConfig);
