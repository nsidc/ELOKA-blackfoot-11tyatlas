import { VentoPlugin } from "eleventy-plugin-vento";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(VentoPlugin);

  eleventyConfig.addPassthroughCopy("src/public");
  return {
    dir: {
      input: "src",
    },
  };
}
