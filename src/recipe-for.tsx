import { List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { Searchtype } from "./utils/types";
import { parseRecipes, fetchItems } from "./utils/fetcher";
import RecipeItem from "./components/RecipeItem";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data: html, error } = fetchItems(Searchtype.Title, searchText);
  const recipes = html ? parseRecipes(html) : null;

  if (error) {
    showFailureToast(error);
  }

  return (
    <List isLoading={isLoading} throttle={true} searchText={searchText} onSearchTextChange={setSearchText}>
      {recipes?.map((recipe) => RecipeItem({ recipe }))}
    </List>
  );
}
