// Re-exported through a module so client components import a single string
// instead of inlining package.json everywhere.
import pkg from "../package.json";

export const version: string = pkg.version;
