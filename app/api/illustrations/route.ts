import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { COOKIE, isValidToken } from "@/lib/auth";

/* Lets the browser upload an illustration directly to Vercel Blob
   (so it skips the function and its 4.5 MB limit). Session required. */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await isValidToken((await cookies()).get(COOKIE)?.value))) throw new Error("Not signed in");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
          maximumSizeInBytes: 15 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
