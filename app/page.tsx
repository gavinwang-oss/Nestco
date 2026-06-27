import BrowseExperience from "@/components/BrowseExperience";

// The homepage IS the browse page — rendered at the root so the URL stays at
// nestco.ai (no /browse suffix). Unauthenticated visitors are sent to /login
// by RouteGuard.
export default function Home() {
  return <BrowseExperience />;
}
