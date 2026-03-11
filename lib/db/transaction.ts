import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";

export async function withTransaction<T>(work: (session: mongoose.ClientSession) => Promise<T>) {
  await connectToDatabase();

  const session = await mongoose.startSession();

  try {
    let result: T | undefined;

    await session.withTransaction(async () => {
      result = await work(session);
    });

    if (result === undefined) {
      throw new Error("Transaction completed without a result.");
    }

    return result;
  } finally {
    await session.endSession();
  }
}
