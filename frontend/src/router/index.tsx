import { useRoutes } from "react-router-dom"
import Home from "../pages/Home"
import CollectionsPage from "../pages/CollectionsPage"
import BookmarksPage from "../pages/BookmarksPage"
import AppLayout from "../components/layouts/AppLayout"

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
