import { Recipe, baseUrl, Searchtype } from "./types";
import * as cheerio from "cheerio";
import { Icon, Image } from "@raycast/api";
import { URLSearchParams } from "node:url";
import { useFetch } from "@raycast/utils";

export function parseRecipes(html: string): Recipe[] {
  const $ = cheerio.load(html);
  const results = $("#results");
  const recipes: Recipe[] = [];

  results.find("a").each((_, el) => {
    const href = $(el).attr("href");
    const name = $(el).find("h2").text().trim() || $(el).text().trim();
    const source = $(el).find("cite").text().trim();

    if (name) {
      const recipe = {
        name: name,
        url: href || "",
        image: Icon.Document,
        source: source,
        time: "",
      } as Recipe;

      const time = $(el).find("time");
      if (time) {
        const timeText = time.text().trim();
        if (timeText) {
          recipe.time = timeText;
        }
      }

      const image = $(el).find('div[class="img"]');
      if (image) {
        const css = image.attr("style");
        if (css) {
          const match = css.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/);

          if (match) {
            recipe.image = {
              source: baseUrl + match[1],
              mask: Image.Mask.RoundedRectangle,
            };
          }
        }
      }

      recipes.push(recipe);
    }
  });

  return recipes;
}

export function fetchItems(searchtype: Searchtype, searchText: string) {
  const searchParams = new URLSearchParams({
    f: searchtype,
    q: searchText,
  });

  return useFetch(baseUrl + "?" + searchParams.toString(), {
    parseResponse(response) {
      return response.text();
    },
    keepPreviousData: true,
    initialData: [],
  });
}
