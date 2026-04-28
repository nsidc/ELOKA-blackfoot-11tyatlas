import { VentoPlugin } from "eleventy-plugin-vento";
import { HtmlBasePlugin } from "@11ty/eleventy";
import fs from 'fs';
import path from 'path';

import cssnano from 'cssnano';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import htmlmin from "html-minifier-terser";

export default function (eleventyConfig) {
  const processor = postcss([
    //compile tailwind
    tailwindcss(),

    //minify tailwind css
    cssnano({
      preset: 'default',
    }),
  ]);

  eleventyConfig.addPlugin(VentoPlugin);

  eleventyConfig.addPassthroughCopy("src/public");
  eleventyConfig.addPassthroughCopy({"src/_data/links.json": "public/links.json"});

  eleventyConfig.addPlugin(HtmlBasePlugin);

  //compile tailwind before eleventy processes the files
  eleventyConfig.on('eleventy.before', async () => {
    const tailwindInputPath = path.resolve('./src/css/index.css');

    const tailwindOutputPath = './_site/css/index.css';

    const cssContent = fs.readFileSync(tailwindInputPath, 'utf8');

    const outputDir = path.dirname(tailwindOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const result = await processor.process(cssContent, {
      from: tailwindInputPath,
      to: tailwindOutputPath,
    });

    fs.writeFileSync(tailwindOutputPath, result.css);
  });

  eleventyConfig.addTransform("jsonmin", function (content) {
		// String conversion to handle `permalink: false`
		if ((this.page.outputPath || "").endsWith(".json")) {
			let minified = htmlmin.minify(content, {
				// useShortDoctype: true,
        minifyJS: true,
				removeComments: true,
				collapseWhitespace: true,
			});

			return minified;
		}

		// If not an HTML output, return content as-is
		return content;
	});

  return {
    dir: {
      input: "src",
    },
  };
}
