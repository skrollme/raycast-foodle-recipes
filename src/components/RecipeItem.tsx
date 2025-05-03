import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Recipe } from "../utils/types";

export default function RecipeItem({ recipe }: { recipe: Recipe }) {
  function accessories(recipe: Recipe) {
    const accessories = [];
    if (recipe.time) {
      accessories.push({ text: recipe.time, icon: Icon.Clock });
    }

    return accessories;
  }

  return (
    <List.Item
      key={recipe.url}
      title={recipe.name}
      subtitle={recipe.source}
      icon={recipe.image}
      accessories={accessories(recipe)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={recipe.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
