import { redirect } from "next/navigation";

export default function NewSongPage() {
  redirect("/editor?id=new");
}
