import { Image } from "@raycast/api";

export const baseUrl = "https://foodle.recipes/";

export interface Recipe {
  name: string;
  url: string;
  source: string;
  time: string;
  image: Image.ImageLike;
}

export enum Searchtype {
  Title = "t",
  Ingredient = "i",
}
