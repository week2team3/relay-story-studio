import { Types } from "mongoose";
import { UserModel } from "@/models";

export async function loadAuthorNicknameMap(userIds: Array<Types.ObjectId | string>) {
  const uniqueUserIds = Array.from(new Set(userIds.map((userId) => userId.toString())));

  if (uniqueUserIds.length === 0) {
    return new Map<string, string>();
  }

  const authors = await UserModel.find({
    _id: {
      $in: uniqueUserIds
    }
  }).select({
    nickname: 1
  });

  return new Map(authors.map((author) => [author._id.toString(), author.nickname]));
}
