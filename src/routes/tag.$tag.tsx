import { createFileRoute, redirect } from "@tanstack/react-router";
import { legacyTagRedirectParams } from "../utils/legacyTagRoute";

// Keeps old /tag/<category>%2F<name> links working by sending them to the tagged view.
export const Route = createFileRoute("/tag/$tag")({
  beforeLoad: ({ params }) => {
    const target = legacyTagRedirectParams(params.tag);
    if (target === undefined) {
      throw redirect({ to: "/", replace: true });
    }

    throw redirect({ to: "/tagged/$category/$name", params: target, replace: true });
  },
});
