import { useRoutes } from "react-router-dom"

import AppLayout from "../components/layouts/AppLayout"
import Home from "@/pages/home"
import CollectionsPage from "@/pages/collection/collectionsPage"
import BookmarksPage from "@/pages/bookmark/bookmarksPage"
import { ProtectedRoute } from "@/stores/auth"


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
          element: <ProtectedRoute />,
          children: [
            {
              path: "/collections",
              element: <CollectionsPage />,
            },
            {
              path: "/bookmarks",
              element: <BookmarksPage />,
            },
          ],
        },
      ]
    },
  ])
  return (
    element
  )
}
