import { useRoutes } from "react-router-dom"

import AppLayout from "../components/layouts/AppLayout"
import Home from "@/pages/home"
import CollectionsPage from "@/pages/collection/collectionsPage"
import BookmarksPage from "@/pages/bookmark/bookmarksPage"


export default function Router() {
  const element = useRoutes([
    {
      element: <AppLayout />,
      children: [
        {
          path: "/",
          element: <Home />,
        },
        {
          path: "/collections",
          element: <CollectionsPage />,
        },
        {
          path: "/bookmarks",
          element: <BookmarksPage />,
        }
      ]
    },
  ])
  return (
    element
  )
}
