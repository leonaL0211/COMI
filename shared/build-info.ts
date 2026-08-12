export const appBuildId =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_COMI_BUILD_ID ??
  process.env.COMI_BUILD_ID ??
  "local-dev";

