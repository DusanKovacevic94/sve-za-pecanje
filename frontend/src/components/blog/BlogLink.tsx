import type { ComponentProps } from "react";

// Full document navigation deliberately avoids prefetched/visited Router Cache
// snapshots after unpublish. Every blog navigation rechecks canonical publication.
export function BlogLink(props: ComponentProps<"a">) {
  return <a {...props} />;
}
