import { Action, ActionPanel, Detail } from "@raycast/api";
import { FoodleRecipe, ParsedRecipe, LdPerson, LdImage } from "../utils/types";
import * as cheerio from "cheerio";
import { showFailureToast, useFetch } from "@raycast/utils";
import { ReactNode, useState } from "react";
import { Recipe } from "schema-dts";

export default function RecipeDetail(recipe: FoodleRecipe) {
  const {
    isLoading,
    data: html,
    error,
  } = useFetch(recipe.url, {
    parseResponse(response) {
      return response.text();
    },
    keepPreviousData: true,
    initialData: "",
  });
  const [jsonLdRecipe, setJsonLdRecipe] = useState(null as ParsedRecipe | null);

  if (error) {
    showFailureToast(error);
  }

  if (html !== "" && jsonLdRecipe == null) {
    extractRecipeFromHtml(html);
  }

  function extractRecipeFromHtml(html: string) {
    const $ = cheerio.load(html);
    const ldEntries = $("script[type='application/ld+json']");

    ldEntries.each((_, element) => {
      const jsonRaw = $(element).html();
      if (jsonRaw) {
        const jsonParsed = JSON.parse(jsonRaw);

        // check for single jsonLd which only contains a recipe
        let jsonLdRecipe = mapToJsonLdRecipe(jsonParsed as Recipe);

        if (jsonLdRecipe != null) {
          setJsonLdRecipe(jsonLdRecipe);
        } else {
          let ldEntries = [];

          if (Array.isArray(jsonParsed)) {
            // jsonLd with an array of jsonLds
            ldEntries = jsonParsed;
          } else if (jsonParsed["@graph"] && Array.isArray(jsonParsed["@graph"])) {
            // jsonLd-graph with an array of jsonLds
            ldEntries = jsonParsed["@graph"];
          }

          for (const entry of ldEntries) {
            // check for each entry if it is a recipe
            jsonLdRecipe = mapToJsonLdRecipe(entry as Recipe);
            if (jsonLdRecipe != null) {
              setJsonLdRecipe(jsonLdRecipe);
            }
          }
        }
      }
    });
  }

  const [markdown, metadata] = renderRecipe(recipe, jsonLdRecipe);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={recipe.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {metadata.map((item) => {
            return item;
          })}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={recipe.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function renderRecipe(recipe: FoodleRecipe, extracted: ParsedRecipe | null): [string, ReactNode[]] {
  const imageUrl = extracted && extracted.image ? extracted.image : recipe.imageUrl;

  let markdown: string = "# " + recipe.name + "\n\n![" + recipe.name + "](" + imageUrl + ")";

  if (extracted == null) {
    markdown += "\n\nCould not extract recipe data from the page. Please open the recipe in your browser\n\n";
  } else {
    if (extracted.description) {
      markdown += "\n\n## Description\n" + extracted.description + "\n\n";
    }

    if (extracted.ingredients) {
      markdown = markdown + "## Ingredients\n- ";
      if (Array.isArray(extracted.ingredients)) {
        markdown += extracted.ingredients.join("\n- ") + "\n\n";
      } else {
        markdown += extracted.ingredients + "\n\n";
      }
    }

    if (extracted.instructions) {
      markdown = markdown + "## Instructions\n";
      if (Array.isArray(extracted.instructions)) {
        markdown += Object.entries(extracted.instructions)
          .filter(([, howToStep]) => howToStep["@type"] === "HowToStep")
          .map(([, howToStep]) => `- ${howToStep.text}\n`)
          .join("");
      }
    }
  }

  const metadata = [];
  if (extracted) {
    if (extracted.author) {
      metadata.push(<Detail.Metadata.Label key="author" title="Author" text={extracted.author} />);
      metadata.push(<Detail.Metadata.Separator key="separator-author" />);
    }

    let hasTimeInfo = false;
    if (extracted.prepTime) {
      metadata.push(<Detail.Metadata.Label key="prepTime" title="Prep Time" text={extracted.prepTime} />);
      hasTimeInfo = true;
    }
    if (extracted.cookTime) {
      metadata.push(<Detail.Metadata.Label key="cookTime" title="Cook Time" text={extracted.cookTime} />);
      hasTimeInfo = true;
    }
    if (extracted.totalTime) {
      metadata.push(<Detail.Metadata.Label key="totalTime" title="Total Time" text={extracted.totalTime} />);
      hasTimeInfo = true;
    }
    if (hasTimeInfo) {
      metadata.push(<Detail.Metadata.Separator key="separator-timings" />);
    }

    if (extracted.recipeYield) {
      metadata.push(<Detail.Metadata.Label key="recipeYield" title="Yield" text={extracted.recipeYield} />);
    }
    if (extracted.recipeCategory) {
      metadata.push(<Detail.Metadata.Label key="recipeCategory" title="Category" text={extracted.recipeCategory} />);
    }
  }

  return [markdown, metadata];
}

function formatISODuration(isoDuration: string | null) {
  if (!isoDuration) return null;

  // Regular expression to parse the ISO 8601 duration
  const regex = /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/;
  const matches = isoDuration.match(regex);

  if (!matches) return "Invalid Duration";

  // Extracting the time units
  const [, years, months, weeks, days, hours, minutes, seconds] = matches.map((v) => parseInt(v) || 0);

  // Building a readable format
  const parts = [];
  if (years) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (weeks) parts.push(`${weeks} week${weeks > 1 ? "s" : ""}`);
  if (days) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (minutes) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
  if (seconds) parts.push(`${seconds} second${seconds > 1 ? "s" : ""}`);

  return parts.length > 0 ? parts.join(", ") : null;
}

function mapToJsonLdRecipe(json: Recipe): ParsedRecipe | null {
  if (json["@type"] == "Recipe") {
    return {
      name: json.name || "",
      author: json.author ? (typeof json.author == "object" ? (json.author as LdPerson).name : json.author) : "",
      prepTime: formatISODuration(json.prepTime as string) || json.prepTime,
      cookTime: formatISODuration(json.cookTime as string) || json.cookTime,
      totalTime: formatISODuration(json.totalTime as string) || json.totalTime,
      recipeYield: json.recipeYield ? json.recipeYield.toString() : "",
      recipeCategory: Array.isArray(json.recipeCategory) ? json.recipeCategory.join(", ") : json.recipeCategory || "",
      description: json.description || "",
      image: typeof json.image == "object" ? (json.image as LdImage).url : json.image,
      ingredients: json.recipeIngredient,
      instructions: json.recipeInstructions,
    } as ParsedRecipe;
  }

  return null;
}
