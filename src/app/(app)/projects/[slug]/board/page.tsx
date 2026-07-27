import { redirect } from "next/navigation";

// The message board is organization-wide now; old project board links land
// on the global board.
export default function ProjectMessageBoardPage() {
  redirect("/board");
}
