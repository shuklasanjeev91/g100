import { redirect } from "next/navigation"

type Props = {
  params: Promise<{ slug: string }>
}

/** Legacy `/content/[slug]` → canonical `/[slug]`. */
export default async function LegacyContentRedirect({ params }: Props) {
  const { slug } = await params
  redirect(`/${slug}`)
}
