// The release number shown in the app (RADiTrack Guide → Data & privacy).
// It comes from package.json, so bump "version" there as part of each release (docs/RELEASING.md).
import packageJson from "../package.json";

export const APP_VERSION = packageJson.version;
export const APP_VERSION_LABEL = `RADiTrack v${APP_VERSION}`;
