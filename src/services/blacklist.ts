import { AbstractList, Item } from "./abstract-list";
import { Blacklist as BlacklistModel } from "../models/blacklist";
export class Blacklist extends AbstractList {

  public async add(item: Item): Promise<void> {
    await BlacklistModel.add(item.provider, item.ip, item.note);
  }

  public remove(item: Item): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public contains(item: Item): Promise<boolean> {
    return BlacklistModel.contains(item.provider, item.ip);
  }
}

export const blacklist = new Blacklist();